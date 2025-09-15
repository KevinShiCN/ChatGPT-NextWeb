import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { getServerSideConfig } from "@/app/config/server";
import { ApiPath, GEMINI_BASE_URL, ModelProvider } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";

const serverConfig = getServerSideConfig();

export async function handle(
  req: NextRequest,
  { params }: { params: { provider: string; path: string[] } },
) {
  console.log("[Google Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const authResult = auth(req, ModelProvider.GeminiPro);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  const bearToken =
    req.headers.get("x-goog-api-key") || req.headers.get("Authorization") || "";
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();

  const apiKey = token ? token : serverConfig.googleApiKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: true,
        message: `missing GOOGLE_API_KEY in server env vars`,
      },
      {
        status: 401,
      },
    );
  }
  try {
    const response = await request(req, apiKey);
    return response;
  } catch (e) {
    console.error("[Google] ", e);
    console.error("[Google] Error details:", {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
    });
    return NextResponse.json(
      {
        error: true,
        message: `Google API 请求失败: ${e.message || e.toString()}`,
        details: e.name || "UnknownError",
      },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long requests

async function request(req: NextRequest, apiKey: string) {
  const controller = new AbortController();

  let baseUrl = serverConfig.googleUrl || GEMINI_BASE_URL;

  let path = `${req.nextUrl.pathname}`.replaceAll(ApiPath.Google, "");

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );
  const fetchUrl = `${baseUrl}${path}${
    req?.nextUrl?.searchParams?.get("alt") === "sse" ? "?alt=sse" : ""
  }`;

  console.log("[Fetch Url] ", fetchUrl);
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "x-goog-api-key":
        req.headers.get("x-goog-api-key") ||
        (req.headers.get("Authorization") ?? "").replace("Bearer ", ""),
    },
    method: req.method,
    body: req.body,
    // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // 记录响应状态
    console.log("[Google] Response status:", res.status, res.statusText);

    // 如果不是成功状态码，记录详细信息
    if (!res.ok) {
      const errorText = await res.clone().text();
      console.error("[Google] API Error Response:", {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
        url: fetchUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (fetchError) {
    console.error("[Google] Fetch Error:", {
      name: fetchError.name,
      message: fetchError.message,
      stack: fetchError.stack,
      url: fetchUrl,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `网络请求失败: ${fetchError.message || fetchError.toString()}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

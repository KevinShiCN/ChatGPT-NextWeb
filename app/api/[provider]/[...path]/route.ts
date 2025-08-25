import { ApiPath } from "@/app/constant";
import { NextRequest } from "next/server";
import { handle as openaiHandler } from "../../openai";
import { handle as azureHandler } from "../../azure";
import { handle as googleHandler } from "../../google";
import { handle as anthropicHandler } from "../../anthropic";
import { handle as baiduHandler } from "../../baidu";
import { handle as bytedanceHandler } from "../../bytedance";
import { handle as alibabaHandler } from "../../alibaba";
import { handle as moonshotHandler } from "../../moonshot";
import { handle as stabilityHandler } from "../../stability";
import { handle as iflytekHandler } from "../../iflytek";
import { handle as deepseekHandler } from "../../deepseek";
import { handle as siliconflowHandler } from "../../siliconflow";
import { handle as xaiHandler } from "../../xai";
import { handle as chatglmHandler } from "../../glm";
import { handle as proxyHandler } from "../../proxy";
import { handle as ai302Handler } from "../../302ai";
import {
  logRequest,
  extractModelFromRequest,
  extractUserMessagesFromBody,
  extractResponseText,
  generateRequestId,
  isSystemGeneratedRequest,
} from "../../../utils/request-logger";

async function handle(
  req: NextRequest,
  { params }: { params: { provider: string; path: string[] } },
) {
  const startTime = Date.now();
  const apiPath = `/api/${params.provider}`;
  const requestId = generateRequestId();

  console.log(
    `[${params.provider} Route] params `,
    params,
    `RequestID: ${requestId}`,
  );

  let requestBody = "";
  let messageLength = 0;
  let model: string | undefined;
  let userMessages = "";

  try {
    // 读取请求体以获取模型信息和消息长度
    if (req.method === "POST" && req.body) {
      requestBody = await req.text();
      messageLength = requestBody.length;
      model = extractModelFromRequest(requestBody, req.url, params.provider);
      userMessages = extractUserMessagesFromBody(requestBody);

      // 创建新的Request对象，因为原始body已被消费
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: requestBody,
      });
    }

    let response: Response;

    switch (apiPath) {
      case ApiPath.Azure:
        response = await azureHandler(req, { params });
        break;
      case ApiPath.Google:
        response = await googleHandler(req, { params });
        break;
      case ApiPath.Anthropic:
        response = await anthropicHandler(req, { params });
        break;
      case ApiPath.Baidu:
        response = await baiduHandler(req, { params });
        break;
      case ApiPath.ByteDance:
        response = await bytedanceHandler(req, { params });
        break;
      case ApiPath.Alibaba:
        response = await alibabaHandler(req, { params });
        break;
      // case ApiPath.Tencent: using "/api/tencent"
      case ApiPath.Moonshot:
        response = await moonshotHandler(req, { params });
        break;
      case ApiPath.Stability:
        response = await stabilityHandler(req, { params });
        break;
      case ApiPath.Iflytek:
        response = await iflytekHandler(req, { params });
        break;
      case ApiPath.DeepSeek:
        response = await deepseekHandler(req, { params });
        break;
      case ApiPath.XAI:
        response = await xaiHandler(req, { params });
        break;
      case ApiPath.ChatGLM:
        response = await chatglmHandler(req, { params });
        break;
      case ApiPath.SiliconFlow:
        response = await siliconflowHandler(req, { params });
        break;
      case ApiPath.OpenAI:
        response = await openaiHandler(req, { params });
        break;
      case ApiPath["302.AI"]:
        response = await ai302Handler(req, { params });
        break;
      default:
        response = await proxyHandler(req, { params });
    }

    const responseTime = Date.now() - startTime;

    // 拦截响应以记录内容
    const interceptedResponse = await interceptResponse(
      response,
      async (responseContent) => {
        // 检查是否为系统自动生成的请求，如果是则跳过记录
        if (isSystemGeneratedRequest(userMessages)) {
          console.log("[Request Logger] Skipping system generated request");
          return;
        }

        // 提取纯文本响应内容
        const cleanResponseText = extractResponseText(
          responseContent,
          params.provider,
        );

        // 记录成功请求
        await logRequest(
          req,
          params.provider,
          model,
          messageLength,
          response.status,
          responseTime,
          userMessages,
          cleanResponseText,
          undefined, // 无错误信息
          requestId,
        );
      },
    );

    return interceptedResponse;
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    console.error(`[${params.provider} Route] Error:`, error);

    // 记录失败请求
    if (!isSystemGeneratedRequest(userMessages)) {
      await logRequest(
        req,
        params.provider,
        model,
        messageLength,
        500,
        responseTime,
        userMessages,
        undefined,
        error?.message || "Unknown error",
        requestId,
      );
    }

    // 重新抛出错误
    throw error;
  }
}

// 响应拦截器函数
async function interceptResponse(
  response: Response,
  onContent: (content: string) => Promise<void>,
): Promise<Response> {
  if (!response.body) {
    await onContent("");
    return response;
  }

  const contentType = response.headers.get("content-type") || "";

  // 如果是流式响应
  if (
    contentType.includes("text/plain") ||
    contentType.includes("text/event-stream")
  ) {
    let fullContent = "";

    const readable = new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader();

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              // 流结束，记录完整内容
              onContent(fullContent).catch(console.error);
              controller.close();
              return;
            }

            const chunk = new TextDecoder().decode(value);
            fullContent += chunk;

            // 将数据传递给客户端
            controller.enqueue(value);

            return pump();
          });
        }

        pump().catch((error) => {
          console.error("Stream pump error:", error);
          controller.error(error);
        });
      },
    });

    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } else {
    // 非流式响应，直接读取内容
    try {
      const content = await response.text();
      await onContent(content);

      return new Response(content, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("Response interception error:", error);
      await onContent("");
      return response;
    }
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
export const maxDuration = 300;
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];

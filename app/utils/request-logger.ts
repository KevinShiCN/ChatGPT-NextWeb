import { NextRequest } from "next/server";

export interface RequestLog {
  timestamp: number;
  requestTime: string; // 新增：人类可读的请求时间
  userIp: string;
  userAgent: string;
  provider: string;
  model?: string;
  messageLength: number;
  responseStatus: number;
  responseTime: number;
  errorMessage?: string;
  sessionId?: string;
  requestId: string;
  requestContent?: string; // 用户请求内容
  responseContent?: string; // AI响应内容
}

export interface UpstashRequestLoggerConfig {
  restUrl: string;
  token: string;
}

class UpstashRequestLogger {
  private config: UpstashRequestLoggerConfig;

  constructor(config: UpstashRequestLoggerConfig) {
    this.config = config;
  }

  private async redisCommand(command: string[], body?: any): Promise<any> {
    const response = await fetch(`${this.config.restUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(
        `Upstash Redis error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.result;
  }

  async logRequest(log: RequestLog): Promise<void> {
    try {
      const logKey = `request_log:${log.requestId}`;
      const dateKey = `logs_by_date:${this.getDateString(log.timestamp)}`;
      const hourKey = `logs_by_hour:${this.getHourString(log.timestamp)}`;

      // 存储完整日志记录
      await this.redisCommand([
        "HSET",
        logKey,
        "timestamp",
        log.timestamp.toString(),
        "requestTime",
        log.requestTime,
        "userIp",
        log.userIp,
        "userAgent",
        log.userAgent,
        "provider",
        log.provider,
        "model",
        log.model || "",
        "messageLength",
        log.messageLength.toString(),
        "responseStatus",
        log.responseStatus.toString(),
        "responseTime",
        log.responseTime.toString(),
        "errorMessage",
        log.errorMessage || "",
        "sessionId",
        log.sessionId || "",
        "requestContent",
        log.requestContent || "",
        "responseContent",
        log.responseContent || "",
      ]);

      // 添加到日期索引
      await this.redisCommand([
        "ZADD",
        dateKey,
        log.timestamp.toString(),
        log.requestId,
      ]);

      // 添加到小时索引
      await this.redisCommand([
        "ZADD",
        hourKey,
        log.timestamp.toString(),
        log.requestId,
      ]);

      // 设置TTL (30天)
      await this.redisCommand(["EXPIRE", logKey, (30 * 24 * 3600).toString()]);
      await this.redisCommand(["EXPIRE", dateKey, (30 * 24 * 3600).toString()]);
      await this.redisCommand(["EXPIRE", hourKey, (30 * 24 * 3600).toString()]);

      console.log(
        `[Request Logger] Logged request ${log.requestId} for ${log.provider}`,
      );
    } catch (error) {
      console.error("[Request Logger] Failed to log request:", error);
      // 不抛出异常，避免影响正常API请求
    }
  }

  private getDateString(timestamp: number): string {
    return new Date(timestamp).toISOString().split("T")[0]; // YYYY-MM-DD
  }

  private getHourString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  }
}

// 全局实例
let loggerInstance: UpstashRequestLogger | null = null;

function getLogger(): UpstashRequestLogger {
  if (!loggerInstance) {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!restUrl || !token) {
      throw new Error("Upstash Redis configuration is missing");
    }

    loggerInstance = new UpstashRequestLogger({ restUrl, token });
  }

  return loggerInstance;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function extractUserIP(req: NextRequest): string {
  // 按优先级顺序获取用户IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

export function isSystemGeneratedRequest(requestContent: string): boolean {
  // 检测系统自动生成的请求
  const systemPatterns = [
    "使用四到五个字直接返回这句话的简要主题",
    "简要总结一下对话内容",
    "用作后续的上下文提示",
    "summarize",
    "title generation",
  ];

  return systemPatterns.some((pattern) => requestContent.includes(pattern));
}

export function extractModelFromRequestBody(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body);
    return parsed.model;
  } catch {
    return undefined;
  }
}

export function extractModelFromRequest(
  body: string,
  url: string,
  provider: string,
): string | undefined {
  // 首先尝试从请求体中提取（适用于OpenAI等）
  const modelFromBody = extractModelFromRequestBody(body);
  if (modelFromBody) {
    return modelFromBody;
  }

  // 对于Google，模型信息在URL路径中：v1beta/models/{modelName}:streamGenerateContent
  if (provider === "google") {
    try {
      const urlPath = new URL(url).pathname;
      const modelMatch = urlPath.match(/\/models\/([^:\/]+)/);
      if (modelMatch && modelMatch[1]) {
        return modelMatch[1];
      }
    } catch (error) {
      console.error("[Extract Model] URL parsing error:", error);
    }
  }

  return undefined;
}

export function extractUserMessagesFromBody(body: string): string {
  try {
    const parsed = JSON.parse(body);

    // 调试日志：打印请求体的结构
    console.log(
      "[Extract User Messages] Request body keys:",
      Object.keys(parsed),
    );

    // Google Gemini 格式: { "contents": [{"parts": [{"text": "..."}]}] }
    if (parsed.contents && Array.isArray(parsed.contents)) {
      console.log("[Extract User Messages] Detected Google Gemini format");
      console.log(
        "[Extract User Messages] Contents structure:",
        JSON.stringify(parsed.contents, null, 2),
      );

      const messages = parsed.contents
        .map((content: any) => {
          if (content.parts && Array.isArray(content.parts)) {
            return content.parts
              .filter((part: any) => part.text)
              .map((part: any) => part.text)
              .join(" ");
          }
          return "";
        })
        .filter((content: string) => content.trim().length > 0)
        .join("\n---\n");

      console.log("[Extract User Messages] Extracted messages:", messages);
      return messages;
    }

    // 腾讯混元格式: { "Messages": [{"Role": "user", "Content": "..."}] }
    if (parsed.Messages && Array.isArray(parsed.Messages)) {
      console.log("[Extract User Messages] Detected Tencent format");
      return parsed.Messages.filter((msg: any) => msg.Role === "user")
        .map((msg: any) => msg.Content)
        .filter((content: string) => content && content.trim().length > 0)
        .join("\n---\n");
    }

    // OpenAI/Anthropic/百度等格式: { "messages": [{"role": "user", "content": "..."}] }
    if (parsed.messages && Array.isArray(parsed.messages)) {
      console.log("[Extract User Messages] Detected OpenAI/Anthropic format");
      return parsed.messages
        .filter((msg: any) => msg.role === "user")
        .map((msg: any) => {
          if (typeof msg.content === "string") {
            return msg.content;
          } else if (Array.isArray(msg.content)) {
            // 处理多模态内容或Anthropic格式
            return msg.content
              .filter((item: any) => item.type === "text" && item.text)
              .map((item: any) => item.text)
              .join(" ");
          }
          return "";
        })
        .filter((content: string) => content.trim().length > 0)
        .join("\n---\n");
    }

    // 通用文本字段提取
    if (parsed.prompt && typeof parsed.prompt === "string") {
      console.log("[Extract User Messages] Detected prompt field");
      return parsed.prompt;
    }

    if (parsed.input && typeof parsed.input === "string") {
      console.log("[Extract User Messages] Detected input field");
      return parsed.input;
    }

    console.log("[Extract User Messages] No matching format found");
    return "";
  } catch (error) {
    console.error("[Extract User Messages] Parse error:", error);
    return "";
  }
}

export function extractResponseText(
  responseContent: string,
  provider: string,
): string {
  try {
    // 如果响应内容为空，直接返回
    if (!responseContent || responseContent.trim() === "") {
      return "";
    }

    // Google Gemini 流式响应处理
    if (provider === "google") {
      const textParts: string[] = [];

      // 按行分割，处理每个 data: 块
      const lines = responseContent.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
          try {
            const jsonStr = line.slice(6); // 移除 "data: " 前缀
            const data = JSON.parse(jsonStr);

            // 提取 Google Gemini 格式的文本
            if (data.candidates && Array.isArray(data.candidates)) {
              for (const candidate of data.candidates) {
                if (candidate.content && candidate.content.parts) {
                  for (const part of candidate.content.parts) {
                    if (part.text) {
                      textParts.push(part.text);
                    }
                  }
                }
              }
            }
          } catch (e) {
            // 忽略解析错误的行
          }
        }
      }

      return textParts.join("");
    }

    // OpenAI 流式响应处理
    if (provider === "openai") {
      const textParts: string[] = [];
      const lines = responseContent.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);

            if (data.choices && Array.isArray(data.choices)) {
              for (const choice of data.choices) {
                if (choice.delta && choice.delta.content) {
                  textParts.push(choice.delta.content);
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      return textParts.join("");
    }

    // Anthropic 流式响应处理
    if (provider === "anthropic") {
      const textParts: string[] = [];
      const lines = responseContent.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);

            if (
              data.type === "content_block_delta" &&
              data.delta &&
              data.delta.text
            ) {
              textParts.push(data.delta.text);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      return textParts.join("");
    }

    // 非流式响应处理 - 尝试解析JSON格式
    try {
      const parsed = JSON.parse(responseContent);

      // OpenAI 标准响应格式
      if (
        parsed.choices &&
        Array.isArray(parsed.choices) &&
        parsed.choices[0]?.message?.content
      ) {
        return parsed.choices[0].message.content;
      }

      // Anthropic 响应格式
      if (parsed.content && Array.isArray(parsed.content)) {
        return parsed.content
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text)
          .join("");
      }

      // Google Gemini 非流式响应
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        const texts = [];
        for (const candidate of parsed.candidates) {
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                texts.push(part.text);
              }
            }
          }
        }
        return texts.join("");
      }

      // 如果有 text 字段，直接返回
      if (parsed.text && typeof parsed.text === "string") {
        return parsed.text;
      }
    } catch (e) {
      // 如果不是JSON，可能就是纯文本，直接返回
      return responseContent;
    }

    // 如果都无法解析，返回原内容（但截断过长的内容）
    return responseContent.length > 5000
      ? responseContent.substring(0, 5000) + "...[内容过长已截断]"
      : responseContent;
  } catch (error) {
    console.error("[Extract Response Text] Error:", error);
    return responseContent.substring(0, 1000) + "...[解析失败]";
  }
}

export async function logRequest(
  req: NextRequest,
  provider: string,
  model: string | undefined,
  messageLength: number,
  responseStatus: number,
  responseTime: number,
  requestContent?: string,
  responseContent?: string,
  errorMessage?: string,
  requestId?: string,
): Promise<void> {
  try {
    const logger = getLogger();
    const now = Date.now();

    const log: RequestLog = {
      requestId: requestId || generateRequestId(),
      timestamp: now,
      requestTime: new Date(now).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      userIp: extractUserIP(req),
      userAgent: req.headers.get("user-agent") || "unknown",
      provider,
      model,
      messageLength,
      responseStatus,
      responseTime,
      requestContent,
      responseContent,
      errorMessage,
      sessionId: req.headers.get("x-session-id") || undefined,
    };

    await logger.logRequest(log);
  } catch (error) {
    console.error("[Request Logger] Error in logRequest:", error);
    // 不抛出异常，确保不影响API正常功能
  }
}

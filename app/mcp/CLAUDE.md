# MCP 协议模块

[根目录](../../CLAUDE.md) > [app](../) > **mcp**

> 最后更新: 2025-11-19 21:24:38
> 模块版本: 1.0
> 模块类型: MCP 协议客户端实现

---

## 变更记录 (Changelog)

### 2025-11-19 21:24:38
- 初始化模块文档
- 记录 MCP 协议客户端接口与工具管理

---

## 模块职责

本模块实现了 **Model Context Protocol (MCP)** 客户端，为 NextChat 提供工具调用能力。MCP 是一种标准化协议，允许 AI 模型通过统一接口调用外部工具（如文件操作、数据库查询、API 调用等）。

**核心功能**：
- MCP 服务器连接管理（支持多服务器并发）
- 工具列表获取与缓存
- 工具调用请求执行
- 服务器状态监控（active/paused/error/initializing）
- 配置持久化（`mcp_config.json`）

**应用场景**：
- AI 对话中调用外部工具（如执行代码、查询天气、操作文件等）
- 扩展 AI 能力边界，支持自定义插件

---

## 入口与启动

### 主要入口文件

| 文件 | 职责 | 导出接口 |
|-----|------|---------|
| `client.ts` | MCP 客户端底层封装 | `createClient`, `removeClient`, `listTools`, `executeRequest` |
| `actions.ts` | 服务端业务逻辑（"use server"） | 服务器管理、工具调用、配置文件操作 |
| `types.ts` | TypeScript 类型定义 | MCP 消息类型、服务器配置、客户端数据结构 |
| `utils.ts` | 工具函数 | MCP JSON 提取（从 Markdown 代码块） |
| `logger.ts` | 日志记录器 | `MCPClientLogger` 类 |

### 初始化流程

```typescript
// 1. 系统启动时调用（在某处自动触发）
await initializeMcpSystem();
  → 读取 mcp_config.json
  → 遍历所有服务器配置
  → 为每个 active 服务器创建客户端
  → 异步获取工具列表并缓存到 clientsMap

// 2. 客户端创建过程
createClient(clientId, serverConfig)
  → 使用 StdioClientTransport（标准输入输出传输）
  → 连接到外部 MCP 服务器进程（command + args）
  → 返回 Client 实例

// 3. 工具列表获取
listTools(client)
  → 调用 MCP SDK 的 listTools() 方法
  → 返回工具描述（name, description, inputSchema）
```

---

## 对外接口

### Server Actions（服务端接口）

所有接口均标记为 `"use server"`，在 Next.js App Router 中作为服务端函数调用。

#### 1. 系统初始化
```typescript
initializeMcpSystem(): Promise<McpConfigData>
```
- 初始化所有 MCP 服务器客户端
- 自动跳过已初始化的系统（幂等性）

#### 2. 服务器管理
```typescript
// 添加/更新服务器
addMcpServer(clientId: string, config: ServerConfig): Promise<McpConfigData>

// 暂停服务器（关闭客户端但保留配置）
pauseMcpServer(clientId: string): Promise<McpConfigData>

// 恢复服务器（重新初始化客户端）
resumeMcpServer(clientId: string): Promise<void>

// 移除服务器（删除配置和客户端）
removeMcpServer(clientId: string): Promise<McpConfigData>

// 重启所有客户端
restartAllClients(): Promise<McpConfigData>
```

#### 3. 状态查询
```typescript
// 获取所有服务器状态
getClientsStatus(): Promise<Record<string, ServerStatusResponse>>

// 获取单个服务器的工具列表
getClientTools(clientId: string): Promise<ListToolsResponse | null>

// 获取所有服务器的工具列表
getAllTools(): Promise<Array<{ clientId: string; tools: ListToolsResponse }>>

// 获取可用客户端数量
getAvailableClientsCount(): Promise<number>

// 检查 MCP 是否启用（读取环境变量）
isMcpEnabled(): Promise<boolean>
```

#### 4. 工具调用
```typescript
executeMcpAction(
  clientId: string,
  request: McpRequestMessage
): Promise<McpResponseMessage>
```
- 执行 MCP 工具调用请求
- 请求格式遵循 JSON-RPC 2.0 规范

#### 5. 配置管理
```typescript
getMcpConfigFromFile(): Promise<McpConfigData>
```
- 读取 `app/mcp/mcp_config.json`
- 失败时返回默认空配置

---

## 关键依赖与配置

### NPM 依赖
```json
{
  "@modelcontextprotocol/sdk": "^0.x.x",
  "zod": "^3.x.x"  // 用于运行时类型验证
}
```

### 配置文件
**路径**: `app/mcp/mcp_config.json`（被 `.gitignore` 忽略）

**默认模板**: `mcp_config.default.json`

**结构**:
```typescript
{
  "mcpServers": {
    "server-id": {
      "command": "node",        // 启动命令
      "args": ["path/to/server.js"],  // 启动参数
      "env": {                  // 可选环境变量
        "API_KEY": "xxx"
      },
      "status": "active" | "paused" | "error"  // 服务器状态
    }
  }
}
```

### 环境变量
通过 `app/config/server.ts` 读取：
```typescript
enableMcp: boolean  // 全局开关
```

---

## 数据模型

### 核心类型

#### ServerConfig（服务器配置）
```typescript
interface ServerConfig {
  command: string;          // 启动命令（如 "node", "python"）
  args: string[];           // 启动参数
  env?: Record<string, string>;  // 环境变量
  status?: "active" | "paused" | "error";
}
```

#### McpClientData（客户端数据）
```typescript
type McpClientData =
  | { client: null; tools: null; errorMsg: null }       // 初始化中
  | { client: Client; tools: ListToolsResponse; errorMsg: null }  // 活跃
  | { client: null; tools: null; errorMsg: string }     // 错误
```

#### McpRequestMessage（MCP 请求）
遵循 JSON-RPC 2.0 规范：
```typescript
interface McpRequestMessage {
  jsonrpc?: "2.0";
  id?: string | number;
  method: "tools/call" | string;  // 方法名
  params?: Record<string, unknown>;  // 参数
}
```

#### McpResponseMessage（MCP 响应）
```typescript
interface McpResponseMessage {
  jsonrpc?: "2.0";
  id?: string | number;
  result?: Record<string, unknown>;  // 成功结果
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
```

---

## 测试与质量

### 测试状态
- **单元测试**: ❌ 未实现
- **人工测试**: ✅ 通过开发者手动验证
- **集成测试**: ❌ 未覆盖

### 质量控制
- 使用 Zod 进行运行时类型验证
- 完善的错误处理与日志记录
- 状态机模式管理服务器生命周期

---

## 常见问题 (FAQ)

### Q1: MCP 服务器如何启动？
A: 通过 `StdioClientTransport` 以子进程方式启动外部服务器，使用标准输入输出通信。配置中的 `command` 和 `args` 决定启动方式。

### Q2: 如何添加新的 MCP 服务器？
A: 调用 `addMcpServer(clientId, config)` 接口，配置会自动写入 `mcp_config.json`，并初始化客户端。

### Q3: 服务器状态有哪些？
A:
- `undefined`: 配置不存在或客户端未初始化
- `initializing`: 正在连接中
- `active`: 已连接且可用
- `paused`: 已暂停（手动停止）
- `error`: 连接失败或运行错误

### Q4: 工具调用如何传递参数？
A: 通过 `McpRequestMessage.params` 字段，格式由具体工具的 `inputSchema` 定义。

### Q5: 如何在对话中提取 MCP 请求？
A: 使用 `utils.ts` 中的 `extractMcpJson()` 函数，从 Markdown 代码块中解析 `json:mcp:{clientId}` 格式的内容。

---

## 相关文件清单

### 核心文件（6个）
- `client.ts` - MCP 客户端底层实现
- `actions.ts` - 服务端业务逻辑（386行）
- `types.ts` - TypeScript 类型定义（181行）
- `utils.ts` - 工具函数（12行）
- `logger.ts` - 日志记录器
- `mcp_config.default.json` - 默认配置模板

### 配置文件（不在版本控制中）
- `mcp_config.json` - 实际配置文件（被 `.gitignore` 忽略）

---

## 架构设计

### 模块分层
```
┌─────────────────────────────────────┐
│  UI Layer (components)              │
│  - MCP 配置界面                      │
│  - 工具调用触发                      │
└──────────────┬──────────────────────┘
               │ Server Actions
┌──────────────▼──────────────────────┐
│  Business Layer (actions.ts)        │
│  - 服务器管理                        │
│  - 工具调用编排                      │
│  - 配置持久化                        │
└──────────────┬──────────────────────┘
               │ SDK API
┌──────────────▼──────────────────────┐
│  SDK Layer (client.ts)              │
│  - MCP Client 封装                   │
│  - Transport 管理                    │
└──────────────┬──────────────────────┘
               │ Stdio IPC
┌──────────────▼──────────────────────┐
│  External MCP Servers (子进程)      │
│  - 文件服务器                        │
│  - 数据库服务器                      │
│  - 自定义工具服务器                  │
└─────────────────────────────────────┘
```

### 状态管理
- 使用 `Map<string, McpClientData>` 维护运行时客户端状态
- 配置持久化到 JSON 文件（不使用数据库）
- 客户端初始化为异步过程（防止阻塞启动）

---

## 依赖关系

### 被依赖模块
- `app/config/server` - 读取环境变量（`enableMcp`）
- `app/constant` - 可能使用的常量定义

### 依赖的外部服务
- **MCP 服务器进程**：外部独立运行的 MCP 实现
- **文件系统**：读写 `mcp_config.json`

---

## 注意事项

1. **安全性**：MCP 服务器可执行任意命令，需谨慎配置 `command` 和 `args`
2. **进程管理**：服务器以子进程运行，异常退出时客户端会报错
3. **并发限制**：单个服务器客户端不支持并发请求（MCP 协议限制）
4. **配置文件**：`mcp_config.json` 不应提交到版本控制（包含敏感信息）
5. **错误恢复**：服务器错误后需手动调用 `resumeMcpServer()` 重试

---

**文档维护说明**
- 本文档由 AI 工具自动生成
- MCP 协议规范参考: https://spec.modelcontextprotocol.io/
- 更新时同步修改根级 `CLAUDE.md` 的模块索引

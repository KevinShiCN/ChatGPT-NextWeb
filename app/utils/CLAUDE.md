# 工具函数模块

[根目录](../../CLAUDE.md) > [app](../) > **utils**

> 最后更新: 2025-11-19 21:24:38
> 模块版本: 1.0
> 模块类型: 纯函数工具库

---

## 变更记录 (Changelog)

### 2025-11-19 21:24:38
- 初始化模块文档
- 记录 23 个工具文件的接口与职责

---

## 模块职责

本模块是项目的**公共工具函数库**，提供跨模块复用的纯函数和辅助类。所有工具均设计为无副作用或最小副作用，支持前端和后端复用。

**核心功能**：
- 数据格式化与转换
- 存储持久化（IndexedDB、WebDAV、Upstash）
- 对象操作（深拷贝、合并、克隆）
- 状态管理辅助（Zustand 封装）
- 加密与哈希（HMAC）
- 请求日志记录
- 音频处理（TTS）
- 第三方平台集成（百度、腾讯、Cloudflare）

---

## 入口与启动

### 主要入口文件
**无单一入口**，所有工具均按功能分文件，独立导入使用。

### 文件清单与职责（23个文件）

| 文件 | 主要功能 | 关键导出 |
|-----|---------|---------|
| `clone.ts` | 对象深拷贝与校验 | `deepClone<T>()`, `ensure()` |
| `format.ts` | 数据格式化 | `prettyObject()`, `chunks()` |
| `merge.ts` | 对象深度合并 | `merge()` |
| `object.ts` | 对象工具函数 | 对象操作相关 |
| `store.ts` | Zustand 持久化封装 | `createPersistStore()` |
| `sync.ts` | 状态同步工具 | `getLocalAppState()`, `mergeAppState()` |
| `indexedDB-storage.ts` | IndexedDB 适配器 | `indexedDBStorage` |
| `cloud/webdav.ts` | WebDAV 云同步客户端 | `createWebDavClient()` |
| `cloud/upstash.ts` | Upstash Redis 客户端 | Upstash 集成 |
| `cloud/index.ts` | 云存储统一接口 | 云存储抽象层 |
| `auth-settings-events.ts` | 认证设置事件 | 事件发布/订阅 |
| `audio.ts` | 音频处理 | 音频工具函数 |
| `baidu.ts` | 百度 API 签名 | `signBaiduRequest()` |
| `tencent.ts` | 腾讯 API 签名 | `signTencentRequest()` |
| `cloudflare.ts` | Cloudflare API | Cloudflare 集成 |
| `hmac.ts` | HMAC 加密 | `hmacSHA256()` |
| `token.ts` | Token 计数 | `estimateTokenCount()` |
| `model.ts` | 模型工具函数 | 模型选择/验证 |
| `chat.ts` | 聊天工具函数 | 消息处理辅助 |
| `stream.ts` | 流处理工具 | 流式数据处理 |
| `request-logger.ts` | 请求日志记录器 | 日志记录工具 |
| `ms_edge_tts.ts` | 微软 Edge TTS | `createTTSClient()` |
| `hooks.ts` | React Hooks | 自定义 Hooks |

---

## 对外接口

### 1. 数据操作工具

#### `clone.ts`
```typescript
// 深拷贝对象（使用 JSON 序列化）
deepClone<T>(obj: T): T

// 验证对象必填字段
ensure<T>(obj: T, keys: Array<keyof T>): boolean
```

#### `format.ts`
```typescript
// 格式化对象为 JSON 代码块
prettyObject(msg: any): string

// 将字符串按字节切分（用于超长消息分段）
chunks(s: string, maxBytes?: number): Generator<string>
```

#### `merge.ts`
```typescript
// 深度合并对象（修改 target）
merge(target: any, source: any): void
```

#### `object.ts`
对象操作相关函数（具体接口需读取文件确认）

---

### 2. 存储持久化工具

#### `store.ts` - Zustand 持久化封装
```typescript
createPersistStore<T, M>(
  state: T,                    // 初始状态
  methods: (set, get) => M,    // 状态方法
  persistOptions: PersistOptions  // 持久化配置
): StoreApi<T & M & MakeUpdater<T>>

// 返回的 Store 自动添加：
// - lastUpdateTime: 最后更新时间戳
// - markUpdate(): 标记更新
// - update(updater): 批量更新
// - _hasHydrated: 是否完成水合
```

#### `indexedDB-storage.ts`
```typescript
// IndexedDB 存储适配器（符合 Zustand storage 接口）
const indexedDBStorage: StateStorage = {
  getItem: (name: string) => Promise<string | null>
  setItem: (name: string, value: string) => Promise<void>
  removeItem: (name: string) => Promise<void>
}
```

#### `cloud/webdav.ts`
```typescript
createWebDavClient(store: SyncStore): {
  check(): Promise<boolean>              // 检查连接
  get(key: string): Promise<string>      // 获取备份
  set(key: string, value: string): Promise<void>  // 保存备份
  headers(): Record<string, string>      // 生成认证头
  path(path: string, proxyUrl?: string): string  // 构建 URL
}
```

#### `cloud/upstash.ts`
Upstash Redis 云存储客户端（具体接口需读取文件确认）

---

### 3. 状态同步工具

#### `sync.ts`
```typescript
// 获取非函数字段
getNonFunctionFileds<T>(obj: T): NonFunctionFields<T>

// 获取本地应用状态（所有 Store）
getLocalAppState(): AppState

// 设置本地应用状态
setLocalAppState(appState: AppState): void

// 合并本地和远程状态
mergeAppState(localState: AppState, remoteState: AppState): AppState

// 按时间戳合并
mergeWithUpdate<T>(localState: T, remoteState: T): T
```

**AppState 结构**:
```typescript
type AppState = {
  [StoreKey.Chat]: ChatStoreState
  [StoreKey.Access]: AccessStoreState
  [StoreKey.Config]: ConfigStoreState
  [StoreKey.Mask]: MaskStoreState
  [StoreKey.Prompt]: PromptStoreState
}
```

---

### 4. 加密与签名工具

#### `hmac.ts`
```typescript
// HMAC-SHA256 加密
hmacSHA256(message: string, secret: string): string
```

#### `baidu.ts`
```typescript
// 百度 API 请求签名
signBaiduRequest(
  apiKey: string,
  secretKey: string,
  timestamp: number
): string
```

#### `tencent.ts`
```typescript
// 腾讯云 API 签名（Signature v3）
signTencentRequest(
  secretId: string,
  secretKey: string,
  service: string,
  action: string,
  payload: object
): Record<string, string>  // 返回签名头
```

---

### 5. 其他工具

#### `token.ts`
```typescript
// 估算文本 Token 数量
estimateTokenCount(text: string, model?: string): number
```

#### `ms_edge_tts.ts`
```typescript
// 创建微软 Edge TTS 客户端
createTTSClient(): {
  synthesize(text: string, voice: string): Promise<ArrayBuffer>
}
```

#### `request-logger.ts`
请求日志记录器（具体接口需读取文件确认）

#### `hooks.ts`
React 自定义 Hooks（具体 Hooks 需读取文件确认）

---

## 关键依赖与配置

### NPM 依赖
```json
{
  "zustand": "^4.x.x",              // 状态管理
  "idb-keyval": "^6.x.x",           // IndexedDB 封装
  "spark-md5": "^3.x.x",            // MD5 哈希
  "markdown-to-txt": "^2.x.x"       // Markdown 转文本
}
```

### 平台依赖
- **浏览器 API**：IndexedDB、WebCrypto
- **Node.js API**：`fs/promises`（仅云同步相关）

---

## 数据模型

### 关键类型

#### PersistOptions（存储配置）
```typescript
interface PersistOptions {
  name: string;                    // 存储键名
  storage?: StateStorage;          // 存储适配器（默认 indexedDBStorage）
  partialize?: (state) => Partial<State>;  // 过滤持久化字段
  onRehydrateStorage?: (state) => void;    // 水合回调
}
```

#### StateStorage（存储接口）
```typescript
interface StateStorage {
  getItem(name: string): string | null | Promise<string | null>
  setItem(name: string, value: string): void | Promise<void>
  removeItem(name: string): void | Promise<void>
}
```

#### WebDAVConfig（WebDAV 配置）
```typescript
interface WebDAVConfig {
  endpoint: string;    // WebDAV 服务器地址
  username: string;    // 用户名
  password: string;    // 密码
}
```

---

## 测试与质量

### 测试状态
- **单元测试**: ❌ 未实现
- **集成测试**: ❌ 未覆盖
- **人工测试**: ✅ 通过生产环境验证

### 质量保障
- 所有工具函数设计为纯函数或明确副作用
- 使用 TypeScript 严格模式保证类型安全
- 关键函数添加错误处理（如网络请求）

---

## 常见问题 (FAQ)

### Q1: `deepClone` 和原生 `structuredClone` 的区别？
A: `deepClone` 使用 `JSON.parse(JSON.stringify())`，不支持 `Date`、`Function`、循环引用。优先使用浏览器原生 `structuredClone`（兼容性允许时）。

### Q2: `createPersistStore` 自动添加了哪些字段？
A:
- `lastUpdateTime`: 最后更新时间戳
- `_hasHydrated`: 是否完成水合
- `markUpdate()`: 标记更新时间
- `update(updater)`: 批量更新状态

### Q3: WebDAV 同步如何工作？
A: 通过 `/api/webdav/` 代理路由发送请求，服务端转发到配置的 WebDAV 服务器，避免跨域问题。

### Q4: `chunks()` 函数的应用场景？
A: 用于将超长文本按字节切分，避免单次请求超过 API 限制（如某些模型的 token 限制）。

### Q5: `mergeAppState` 的合并策略是什么？
A:
- **Chat**: 按会话 ID 合并，消息按时间排序
- **Prompt/Mask**: 对象键合并，本地优先
- **Config/Access**: 按 `lastUpdateTime` 合并，新数据覆盖旧数据

---

## 相关文件清单

### 核心工具（8个）
- `clone.ts` - 对象深拷贝
- `format.ts` - 数据格式化
- `merge.ts` - 对象合并
- `object.ts` - 对象操作
- `store.ts` - Zustand 持久化
- `sync.ts` - 状态同步
- `hooks.ts` - React Hooks
- `chat.ts` - 聊天辅助

### 存储相关（4个）
- `indexedDB-storage.ts` - IndexedDB 适配器
- `cloud/index.ts` - 云存储抽象
- `cloud/webdav.ts` - WebDAV 客户端
- `cloud/upstash.ts` - Upstash 客户端

### 加密与签名（3个）
- `hmac.ts` - HMAC 加密
- `baidu.ts` - 百度签名
- `tencent.ts` - 腾讯签名

### 音频与流（3个）
- `audio.ts` - 音频处理
- `ms_edge_tts.ts` - Edge TTS
- `stream.ts` - 流处理

### 其他工具（5个）
- `token.ts` - Token 计数
- `model.ts` - 模型工具
- `cloudflare.ts` - Cloudflare API
- `request-logger.ts` - 请求日志
- `auth-settings-events.ts` - 认证事件

---

## 架构设计

### 模块分类
```
utils/
├── 数据操作层
│   ├── clone.ts      - 深拷贝
│   ├── format.ts     - 格式化
│   ├── merge.ts      - 合并
│   └── object.ts     - 对象操作
│
├── 存储持久化层
│   ├── store.ts              - Zustand 封装
│   ├── sync.ts               - 状态同步
│   ├── indexedDB-storage.ts  - IndexedDB
│   └── cloud/
│       ├── webdav.ts         - WebDAV
│       ├── upstash.ts        - Redis
│       └── index.ts          - 统一接口
│
├── 加密与签名层
│   ├── hmac.ts       - HMAC
│   ├── baidu.ts      - 百度签名
│   └── tencent.ts    - 腾讯签名
│
├── 音频处理层
│   ├── audio.ts          - 音频工具
│   └── ms_edge_tts.ts    - Edge TTS
│
└── 其他工具层
    ├── token.ts          - Token 计数
    ├── model.ts          - 模型选择
    ├── chat.ts           - 聊天辅助
    ├── stream.ts         - 流处理
    ├── hooks.ts          - React Hooks
    ├── request-logger.ts - 请求日志
    └── cloudflare.ts     - Cloudflare
```

### 使用模式

#### 模式 1：纯函数工具
```typescript
import { deepClone, prettyObject } from "@/app/utils/clone";
import { prettyObject } from "@/app/utils/format";

const copy = deepClone(original);
const formatted = prettyObject(data);
```

#### 模式 2：Zustand 持久化
```typescript
import { createPersistStore } from "@/app/utils/store";

export const useMyStore = createPersistStore(
  { count: 0 },
  (set, get) => ({
    increment: () => set({ count: get().count + 1 }),
  }),
  {
    name: "my-store",
    version: 1,
  }
);
```

#### 模式 3：云同步客户端
```typescript
import { createWebDavClient } from "@/app/utils/cloud/webdav";

const client = createWebDavClient(syncStore);
await client.set("backup-key", JSON.stringify(state));
const backup = await client.get("backup-key");
```

---

## 依赖关系

### 被依赖模块（高频）
- `app/store/*` - 所有 Store 模块（使用 `createPersistStore`）
- `app/components/*` - UI 组件（使用 Hooks、格式化工具）
- `app/api/*` - API 路由（使用签名工具）
- `app/client/*` - 客户端 SDK（使用 Token 计数、流处理）

### 依赖的外部模块
- `app/constant` - 常量定义（`STORAGE_KEY`）
- `app/typing` - 类型定义（`Updater` 等）
- `app/store` - Store 类型（`SyncStore` 等）

---

## 注意事项

1. **深拷贝限制**：`deepClone` 不支持 `Function`、`Date`、`Map`、`Set` 等非 JSON 类型
2. **IndexedDB 异步**：所有 IndexedDB 操作均为异步，需等待 Promise
3. **WebDAV 代理**：WebDAV 请求通过 `/api/webdav/` 代理，避免直接暴露凭据
4. **状态合并策略**：`mergeAppState` 会**修改** `localState`，注意副作用
5. **Token 计数精度**：`estimateTokenCount` 为估算值，实际值以 API 返回为准

---

## 扩展建议

1. **添加单元测试**：关键工具函数（clone、merge、sync）需覆盖边界情况
2. **优化深拷贝**：使用 `structuredClone` 替代 JSON 序列化
3. **统一错误处理**：网络相关工具应返回统一的错误类型
4. **TypeDoc 文档**：为所有导出函数添加 JSDoc 注释
5. **性能优化**：`chunks` 函数可优化为流式处理

---

**文档维护说明**
- 本文档由 AI 工具自动生成
- 工具函数数量较多，建议按功能分类查阅
- 更新时同步修改根级 `CLAUDE.md` 的模块索引

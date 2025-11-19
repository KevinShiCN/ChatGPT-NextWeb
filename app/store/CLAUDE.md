# app/store 模块文档

[根目录](../../CLAUDE.md) > [app](..) > **store**

---

## 变更记录

### 2025-11-19 21:05:15

- 初始化模块文档
- 记录所有状态Store定义

---

## 模块职责

`app/store` 是基于 **Zustand** 的全局状态管理模块，负责：

1. 管理应用全局状态（聊天、配置、用户数据等）
2. 持久化状态到浏览器存储（LocalStorage + IndexedDB）
3. 提供React Hooks式的状态访问
4. 处理状态迁移和版本升级

**特点**: 轻量级、无Provider包裹、支持中间件（持久化、DevTools）

---

## 对外接口

### Store导出列表

在 `index.ts` 统一导出：

```typescript
export * from "./chat"; // 聊天会话状态
export * from "./update"; // 应用更新状态
export * from "./access"; // 访问控制状态
export * from "./config"; // 应用配置状态
export * from "./plugin"; // 插件状态
```

### Store使用方式

```typescript
import { useChatStore, useAccessStore, useAppConfig } from "@/app/store";

// 在React组件中使用
function MyComponent() {
  const chatStore = useChatStore();
  const sessions = chatStore.sessions;
  const currentSession = chatStore.currentSession();

  const accessStore = useAccessStore();
  const isAuthed = accessStore.isAuthorized();

  const config = useAppConfig();
  const theme = config.theme;
}
```

---

## 入口与启动

### 主要Store文件

| 文件        | Store名称        | 职责                           |
| ----------- | ---------------- | ------------------------------ |
| `chat.ts`   | `useChatStore`   | 聊天会话、消息管理（核心）     |
| `config.ts` | `useAppConfig`   | 应用配置（主题、模型默认值等） |
| `access.ts` | `useAccessStore` | 访问控制（API密钥、访问码）    |
| `mask.ts`   | `useMaskStore`   | 预设面具管理                   |
| `prompt.ts` | `usePromptStore` | 提示词管理                     |
| `plugin.ts` | `usePluginStore` | 插件管理                       |
| `sync.ts`   | `useSyncStore`   | 云同步配置                     |
| `update.ts` | `useUpdateStore` | 应用更新状态                   |
| `sd.ts`     | `useSDStore`     | Stable Diffusion图像生成       |

### 初始化流程

```typescript
// 使用createPersistStore工具函数创建持久化Store
export const useChatStore = createPersistStore(
  { ...DEFAULT_CHAT_STATE },
  (set, get) => ({
    // actions
  }),
  {
    name: StoreKey.Chat,
    version: 3.1,
    migrate(state, version) {
      // 版本迁移逻辑
    },
  },
);
```

---

## 关键依赖与配置

### 依赖项

- `zustand`: 状态管理核心库 (v4.3.8)
- `idb-keyval`: IndexedDB存储
- `nanoid`: 生成唯一ID
- `spark-md5`: 哈希计算

### 存储键定义

在 `app/constant.ts` 中定义：

```typescript
export enum StoreKey {
  Chat = "chat-next-web-store",
  Plugin = "chat-next-web-plugin",
  Access = "access-control",
  Config = "app-config",
  Mask = "mask-store",
  Prompt = "prompt-store",
  Update = "chat-update",
  Sync = "sync",
  SdList = "sd-list",
  Mcp = "mcp-store",
}
```

### 持久化策略

使用 `app/utils/store.ts` 中的 `createPersistStore`:

- **小数据**: LocalStorage（配置、访问控制）
- **大数据**: IndexedDB（聊天记录）
- **版本迁移**: 支持数据结构升级

---

## 数据模型

### ChatStore 核心类型

```typescript
// 聊天消息
export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  model?: ModelType;
  tools?: ChatMessageTool[];
  audio_url?: string;
  isMcpResponse?: boolean;
};

// 聊天会话
export interface ChatSession {
  id: string;
  topic: string;
  memoryPrompt: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  mask: Mask;
}

// 消息统计
export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}
```

### AccessStore 类型

```typescript
interface AccessStore {
  accessCode: string;
  useCustomConfig: boolean;

  // 各服务商配置
  openaiApiKey: string;
  openaiUrl: string;
  anthropicApiKey: string;
  googleApiKey: string;
  // ... 其他服务商

  // actions
  isAuthorized: () => boolean;
  isValidOpenAI: () => boolean;
  enabledAccessControl: () => boolean;
}
```

### ConfigStore 类型

```typescript
interface ConfigStore {
  theme: "light" | "dark" | "auto";
  tightBorder: boolean;
  sendPreviewBubble: boolean;
  enableAutoGenerateTitle: boolean;
  sidebarWidth: number;
  fontSize: number;
  fontFamily: string;

  // 模型默认配置
  modelConfig: ModelConfig;
  // ... 更多配置
}
```

---

## 核心逻辑

### 1. ChatStore Actions

```typescript
const useChatStore = createPersistStore({
  sessions: [],
  currentSessionIndex: 0,
}, (set, get) => ({
  // 创建新会话
  newSession(mask?: Mask) {
    const session = createEmptySession();
    if (mask) {
      session.mask = mask;
      session.topic = mask.name;
    }
    set({ sessions: [session, ...get().sessions] });
  },

  // 发送消息
  async onUserInput(content: string, attachImages?: string[]) {
    const session = get().currentSession();
    const message = createMessage({ role: "user", content });
    session.messages.push(message);
    // 调用AI API
    await get().getSessionResponse(session);
  },

  // 获取AI响应
  async getSessionResponse(session: ChatSession) {
    const api = getClientApi(provider);
    await api.chat({
      messages: session.messages,
      config: modelConfig,
      onUpdate: (message, chunk) => {
        // 流式更新
      },
      onFinish: (message) => {
        // 保存响应
      },
    });
  },

  // 删除消息
  deleteMessage(sessionId: string, messageId: string) { ... },

  // 清空会话
  clearSessions() { ... },

  // 总结标题
  summarizeSession() { ... },
}));
```

### 2. 状态持久化工具

`app/utils/store.ts`:

```typescript
export function createPersistStore<T>(
  defaultState: T,
  actions: (set, get) => Actions,
  options: PersistOptions,
) {
  return create<T & Actions>()(
    persist(
      (set, get) => ({
        ...defaultState,
        ...actions(set, get),
      }),
      {
        name: options.name,
        version: options.version,
        storage: createJSONStorage(() => safeLocalStorage()),
        migrate: options.migrate,
      },
    ),
  );
}
```

### 3. IndexedDB存储

`app/utils/indexedDB-storage.ts`:

```typescript
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export const indexedDBStorage = {
  getItem: async (name: string) => {
    const value = await idbGet(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await idbSet(name, value);
  },
  removeItem: async (name: string) => {
    await idbDel(name);
  },
};
```

---

## 测试与质量

### 测试策略

- **手动测试**: 根据项目要求，由开发者手动测试状态管理逻辑
- **测试场景**:
  - 创建/删除会话
  - 发送消息并接收响应
  - 配置修改和持久化
  - 数据迁移升级

### 调试技巧

**在浏览器中查看Store状态**

```javascript
// DevTools Console
JSON.parse(localStorage.getItem("chat-next-web-store"));
JSON.parse(localStorage.getItem("app-config"));
JSON.parse(localStorage.getItem("access-control"));
```

**使用Zustand DevTools**（需安装Redux DevTools扩展）

**手动触发Store action**

```javascript
// 在Console中
window.__chatStore = useChatStore.getState();
window.__chatStore.newSession();
```

---

## 常见问题 (FAQ)

### Q1: 如何清空所有本地数据？

在浏览器DevTools Console中：

```javascript
localStorage.clear();
indexedDB.deleteDatabase("chatgpt-next-web");
location.reload();
```

### Q2: 数据迁移失败怎么办？

1. 检查 `migrate` 函数是否正确处理新旧版本
2. 可以手动修改 `localStorage` 中的 `version` 字段
3. 严重情况下清空数据重新开始

### Q3: 为什么使用两种存储？

- **LocalStorage**: 存取快速，适合小数据（配置、访问控制）
- **IndexedDB**: 容量大，适合大数据（聊天记录可达数MB）

### Q4: 如何添加新的Store字段？

1. 修改默认状态对象
2. 增加版本号
3. 在 `migrate` 函数中处理旧数据
4. 添加相应的actions

### Q5: Store状态丢失如何排查？

1. 检查浏览器存储是否被清空（隐私模式、清理工具）
2. 检查存储键名是否正确（`StoreKey`枚举）
3. 检查是否有JSON解析错误
4. 查看控制台是否有存储限额警告

---

## 相关文件清单

```
app/store/
├── index.ts       # 统一导出
├── chat.ts        # 聊天会话Store（核心）
├── config.ts      # 应用配置Store
├── access.ts      # 访问控制Store
├── mask.ts        # 面具Store
├── prompt.ts      # 提示词Store
├── plugin.ts      # 插件Store
├── sync.ts        # 云同步Store
├── update.ts      # 更新状态Store
└── sd.ts          # SD图像生成Store

app/utils/
├── store.ts               # createPersistStore工具
└── indexedDB-storage.ts   # IndexedDB存储封装
```

---

## 开发注意事项

1. **不可变更新**: Zustand使用Immer，但仍建议明确返回新状态
2. **选择性订阅**: 使用 `useStore(selector)` 避免不必要的重渲染
3. **异步Action**: 使用 `async/await`，注意错误处理
4. **版本迁移**: 新增字段时必须增加版本号和迁移逻辑
5. **类型安全**: 使用泛型定义完整的Store类型

```typescript
// 推荐的使用方式
const theme = useAppConfig((state) => state.theme);
const sessions = useChatStore((state) => state.sessions);

// 避免：订阅整个Store
const config = useAppConfig(); // 任何字段变化都会重渲染
```

---

**文档维护**: 添加新Store或修改状态结构时，需同步更新此文档。

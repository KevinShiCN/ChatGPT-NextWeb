# src-tauri 模块文档

[根目录](../CLAUDE.md) > **src-tauri**

---

## 变更记录

### 2025-11-19 21:05:15
- 初始化模块文档
- 记录Tauri桌面应用架构

---

## 模块职责

`src-tauri` 是**Tauri桌面客户端后端**，负责：
1. 提供桌面应用窗口管理
2. 调用系统原生API（文件系统、剪贴板、通知等）
3. 处理桌面端特殊需求（流式响应代理）
4. 管理窗口状态持久化

**技术栈**: Rust 2021 edition + Tauri 1.5.x

---

## 对外接口

### Tauri Commands

通过 `#[tauri::command]` 暴露给前端调用：

```rust
// src/stream.rs
#[tauri::command]
pub async fn stream_fetch(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<Vec<u8>, String> {
    // 实现流式HTTP请求
}
```

**前端调用方式**:
```typescript
import { invoke } from "@tauri-apps/api/tauri";

const result = await invoke("stream_fetch", {
  url: "https://api.openai.com/v1/chat/completions",
  method: "POST",
  headers: { "Authorization": "Bearer xxx" },
  body: JSON.stringify(payload),
});
```

### Tauri插件

- `tauri-plugin-window-state`: 窗口状态持久化（位置、大小）

---

## 入口与启动

### 主入口: src/main.rs

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod stream;

fn main() {
  tauri::Builder::default()
    // 注册command
    .invoke_handler(tauri::generate_handler![stream::stream_fetch])
    // 添加插件
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

### 模块结构

```
src-tauri/
├── src/
│   ├── main.rs        # 主入口
│   └── stream.rs      # 流式请求模块
├── Cargo.toml         # Rust依赖配置
├── tauri.conf.json    # Tauri应用配置
├── build.rs           # 构建脚本
└── icons/             # 应用图标
```

---

## 关键依赖与配置

### Cargo依赖 (Cargo.toml)

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "1.5.4", features = [
    "http-all",
    "notification-all",
    "fs-all",
    "clipboard-all",
    "dialog-all",
    "shell-open",
    "updater",
    "window-close",
    "window-hide",
    "window-maximize",
    "window-minimize",
    "window-set-icon",
    "window-set-ignore-cursor-events",
    "window-set-resizable",
    "window-show",
    "window-start-dragging",
    "window-unmaximize",
    "window-unminimize",
] }
tauri-plugin-window-state = { git = "https://github.com/tauri-apps/plugins-workspace", branch = "v1" }
percent-encoding = "2.3.1"
reqwest = "0.11.18"
futures-util = "0.3.30"
bytes = "1.7.2"

[build-dependencies]
tauri-build = { version = "1.5.1", features = [] }

[features]
custom-protocol = ["tauri/custom-protocol"]
```

### Tauri配置 (tauri.conf.json)

关键配置项：
```json
{
  "build": {
    "beforeDevCommand": "yarn dev",
    "beforeBuildCommand": "yarn build",
    "devPath": "http://localhost:3000",
    "distDir": "../out"
  },
  "package": {
    "productName": "NextChat",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "http": { "all": true },
      "fs": { "all": true },
      "clipboard": { "all": true },
      "notification": { "all": true },
      "dialog": { "all": true },
      "shell": { "open": true },
      "window": { "all": true }
    },
    "windows": [{
      "title": "NextChat",
      "width": 1200,
      "height": 800,
      "resizable": true,
      "fullscreen": false
    }]
  }
}
```

---

## 数据模型

### 流式请求参数

```rust
// stream.rs
#[tauri::command]
pub async fn stream_fetch(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<Vec<u8>, String>
```

**参数说明**:
- `url`: 目标URL
- `method`: HTTP方法（GET/POST等）
- `headers`: 请求头映射
- `body`: 可选的请求体（JSON字符串）

**返回值**: `Result<Vec<u8>, String>`
- 成功: 返回响应字节流
- 失败: 返回错误信息

---

## 核心逻辑

### 流式HTTP请求 (src/stream.rs)

```rust
use bytes::Bytes;
use futures_util::StreamExt;
use reqwest::{Client, Method};
use std::collections::HashMap;
use std::str::FromStr;

#[tauri::command]
pub async fn stream_fetch(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<Vec<u8>, String> {
    // 1. 创建HTTP客户端
    let client = Client::new();

    // 2. 解析HTTP方法
    let method = Method::from_str(&method).map_err(|e| e.to_string())?;

    // 3. 构建请求
    let mut request_builder = client.request(method, &url);

    // 添加请求头
    for (key, value) in headers {
        request_builder = request_builder.header(key, value);
    }

    // 添加请求体
    if let Some(body_str) = body {
        request_builder = request_builder.body(body_str);
    }

    // 4. 发送请求
    let response = request_builder
        .send()
        .await
        .map_err(|e| e.to_string())?;

    // 5. 流式读取响应
    let mut stream = response.bytes_stream();
    let mut result = Vec::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => result.extend_from_slice(&bytes),
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok(result)
}
```

**设计目的**: 解决浏览器环境下流式响应的限制（某些CORS或网络策略问题），通过Rust后端代理实现更可靠的流式请求。

---

## 测试与质量

### 测试策略
- **手动测试**: 在桌面应用中测试各项功能
- **测试场景**:
  - 窗口打开/关闭/最小化/最大化
  - 流式请求代理
  - 文件系统操作
  - 剪贴板读写
  - 系统通知
  - 窗口状态持久化

### 调试技巧

**启用Rust调试日志**
```bash
RUST_LOG=debug yarn app:dev
```

**查看Tauri DevTools**
```rust
#[cfg(debug_assertions)]
tauri::Builder::default()
    .plugin(tauri_plugin_devtools::init())
```

**测试单个Command**
```typescript
// 在浏览器Console中
import { invoke } from "@tauri-apps/api/tauri";
invoke("stream_fetch", { url: "https://example.com", method: "GET" })
  .then(console.log)
  .catch(console.error);
```

---

## 常见问题 (FAQ)

### Q1: 如何添加新的Tauri Command？
1. 在 `src/` 创建新模块或在现有模块中添加函数
2. 添加 `#[tauri::command]` 宏
3. 在 `main.rs` 的 `invoke_handler` 中注册
4. 重新编译

### Q2: 为什么需要流式请求代理？
某些网络环境或CORS策略限制浏览器直接发起流式请求，通过Rust后端代理可以绕过限制，提供更稳定的体验。

### Q3: 如何打包桌面应用？
```bash
yarn app:build

# 输出在 src-tauri/target/release/bundle/
```

### Q4: 如何更新应用图标？
替换 `src-tauri/icons/` 目录下的图标文件，然后运行：
```bash
yarn tauri icon path/to/icon.png
```

### Q5: 如何启用自动更新？
1. 在 `tauri.conf.json` 配置 `updater`
2. 设置更新服务器URL
3. 使用Tauri命令签名发布包

---

## 相关文件清单

```
src-tauri/
├── src/
│   ├── main.rs        # Tauri应用主入口
│   └── stream.rs      # 流式HTTP请求模块
│
├── Cargo.toml         # Rust依赖配置
├── Cargo.lock         # 依赖锁定
├── tauri.conf.json    # Tauri应用配置
├── build.rs           # 构建脚本
│
└── icons/             # 应用图标资源
    ├── 32x32.png
    ├── 128x128.png
    ├── icon.icns      # macOS
    ├── icon.ico       # Windows
    └── icon.png       # Linux

相关文件：
├── package.json       # 包含Tauri CLI命令
└── .taurignore        # Tauri打包忽略规则
```

---

## 开发注意事项

1. **跨平台兼容**: 注意Windows/macOS/Linux的差异
2. **权限管理**: 最小化`allowlist`权限，仅启用必需功能
3. **错误处理**: Rust中使用`Result`类型，前端处理错误
4. **性能优化**: 避免阻塞主线程，使用`async`异步
5. **安全考虑**: 验证前端传入的参数，防止注入攻击

```rust
// 推荐模式
#[tauri::command]
pub async fn safe_command(input: String) -> Result<String, String> {
    // 1. 验证输入
    if input.is_empty() {
        return Err("Input cannot be empty".to_string());
    }

    // 2. 异步操作
    let result = tokio::task::spawn(async move {
        // 处理逻辑
    }).await.map_err(|e| e.to_string())?;

    // 3. 返回结果
    Ok(result)
}
```

---

## 构建与发布

### 本地开发
```bash
yarn app:dev
```

### 生产构建
```bash
yarn app:build

# 输出目录
# src-tauri/target/release/bundle/
```

### 支持平台
- Windows: `.msi` / `.exe`
- macOS: `.dmg` / `.app`
- Linux: `.deb` / `.AppImage`

### 代码签名（可选）
Windows/macOS发布时建议进行代码签名，提升用户信任度。配置见Tauri官方文档。

---

**文档维护**: 添加新Command或修改Tauri配置时，需同步更新此文档。

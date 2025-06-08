# Vercel 部署通知配置

本项目支持在 Vercel 部署完成后自动发送通知，通过 [Bark](https://github.com/Finb/Bark) 服务将部署状态推送到您的 iOS 设备。

## 配置方法

### 方法一：使用 GitHub Actions 工作流

当项目通过 GitHub 与 Vercel 集成部署时，可以使用我们提供的 GitHub Actions 工作流自动发送部署成功通知。

1. 工作流文件位于 `.github/workflows/vercel-deploy-notification.yml`
2. 默认情况下，当 Vercel 部署到生产环境成功时，会自动发送通知

### 方法二：使用 Vercel 构建钩子

项目在 Vercel 平台构建完成后会自动执行 `postbuild` 脚本，发送部署通知。

1. 构建钩子脚本位于 `scripts/vercel-build-hook.js`
2. 您可以通过 Vercel 的环境变量自定义通知内容

## 环境变量设置

在 Vercel 项目设置中，可以添加以下环境变量来自定义通知：

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `BARK_TOKEN` | Bark 推送服务的 Token | xkjJ655M94DX66TmeDXYxW |
| `BARK_TITLE` | 通知标题 | NextChat项目已重新部署 |
| `BARK_GROUP` | 通知分组 | Vercel |

## 手动触发通知

如需手动触发通知，可以直接访问以下 URL：

```
https://api.day.app/xkjJ655M94DX66TmeDXYxW/NextChat项目已重新部署?group=Vercel
```

或者运行以下命令：

```bash
node scripts/vercel-build-hook.js
```

## 自定义通知内容

您可以修改 `scripts/vercel-build-hook.js` 文件，自定义通知的内容和格式。 
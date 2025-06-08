# Vercel 部署通知配置

本项目支持在 Vercel 部署完成后自动发送通知，通过 [Bark](https://github.com/Finb/Bark) 服务将部署状态推送到您的 iOS 设备。

## 配置方法：使用 GitHub Actions 工作流

当项目通过 GitHub 与 Vercel 集成部署时，使用 GitHub Actions 工作流自动发送部署成功通知。

1. 工作流文件位于 `.github/workflows/vercel-deploy-notification.yml`
2. 默认情况下，当 Vercel 部署到生产环境成功时，会自动发送通知

## 手动触发通知

如需手动触发通知，可以直接访问以下 URL：

```
https://api.day.app/xkjJ655M94DX66TmeDXYxW/NextChat项目已重新部署?group=Vercel
```

## 自定义通知内容

如需自定义通知内容，可以修改 `.github/workflows/vercel-deploy-notification.yml` 文件中的 curl 命令，更改 URL 参数。 
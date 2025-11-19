# 解决 Vercel Edge Runtime 超时限制方案

**创建时间**: 2025-11-19
**需求来源**: Gemini 2.5 Pro 长时间思考任务（100-500 秒）超过 Edge Runtime 30 秒限制
**目标**: 支持 100-500 秒的 AI 推理任务，确保用户体验流畅

---

## 问题分析

### 当前状态
- **Runtime**: Edge Runtime（全球边缘节点，冷启动快）
- **超时限制**: 30 秒（Vercel Free Plan）
- **实际需求**: 100-500 秒（取决于上下文长度和模型性能）

### 痛点
1. Gemini 2.5 Pro 深度思考模式会超时
2. 长上下文对话会因超时中断
3. 用户体验差，无法完成复杂推理任务

---

## 解决方案

### 方案 1: 切换到 Node.js Runtime（推荐）⭐

**优点**:
- ✅ 支持更长超时（Vercel Pro: 60s, Hobby: 10s, 可配置 maxDuration）
- ✅ 实施简单，只需修改 2 行代码
- ✅ 与上游代码差异最小

**缺点**:
- ⚠️ 冷启动稍慢（~100-300ms）
- ⚠️ 无边缘节点加速

**配置要求**:
```typescript
// app/api/google.ts
export const runtime = "nodejs";
export const maxDuration = 300; // 5 分钟（根据 Vercel 计划调整）
```

**Vercel 计划限制**:
| 计划 | Node.js 最大超时 |
|------|-----------------|
| Hobby | 10 秒 |
| Pro | 60 秒 |
| Enterprise | 900 秒（15 分钟）|

---

### 方案 2: 使用 Vercel Serverless Functions

**优点**:
- ✅ 更长超时（根据计划不同）
- ✅ 不受 Edge Runtime 限制

**缺点**:
- ⚠️ 需要重构 API 路由结构
- ⚠️ 代码改动较大

**实施步骤**:
1. 将 `app/api/google.ts` 移至 `pages/api/google.ts`（Pages Router）
2. 或保持在 App Router，但使用 `export const runtime = "nodejs"`

---

### 方案 3: 客户端轮询 + 异步任务队列（复杂）

**优点**:
- ✅ 不受任何超时限制
- ✅ 可支持极长时间任务（小时级别）

**缺点**:
- ❌ 实施复杂，需要引入任务队列（Redis/Database）
- ❌ 需要大幅修改前后端代码
- ❌ 增加基础设施成本

**架构**:
```
客户端 → 提交任务 → 返回 task_id
      ↓
   轮询状态 → 任务队列 → Worker 执行
      ↓
   获取结果 ← 完成通知
```

---

### 方案 4: 使用外部服务（终极方案）

**选项 A: Cloudflare Workers**
- ✅ CPU 时间无限制（仅计费模式下）
- ✅ 全球边缘网络
- ⚠️ 需要迁移部署平台

**选项 B: 自建 Node.js 服务器**
- ✅ 完全无限制
- ✅ 完全控制
- ⚠️ 需要维护服务器

---

## 推荐实施方案

### 🎯 阶段 1: 快速修复（推荐立即实施）

**目标**: 最小代码改动，快速解决超时问题

**具体操作**:
```typescript
// 文件: app/api/google.ts
// 只修改这两行
export const runtime = "nodejs";
export const maxDuration = 300; // 根据你的 Vercel 计划调整
```

**注意事项**:
1. 如果你是 **Vercel Hobby Plan**，`maxDuration` 最大只能设置为 10 秒（不够用）
2. 需要升级到 **Vercel Pro Plan**（$20/月）才能使用 60 秒超时
3. 如果需要 300 秒，需要 **Enterprise Plan**

**检查你的 Vercel 计划**:
```bash
# 访问 https://vercel.com/account/billing
# 查看当前计划和限制
```

---

### 🎯 阶段 2: 优化用户体验（后续可选）

**目标**: 超时任务的优雅降级处理

**实施方案**:
1. **前端添加进度提示**:
   ```typescript
   // 检测流式响应慢速时，显示"正在深度思考..."
   if (timeElapsed > 30000) {
     showThinkingIndicator();
   }
   ```

2. **添加超时重试机制**:
   ```typescript
   // 如果接近超时，自动分片重试
   if (estimatedTime > maxDuration) {
     splitRequestIntoChunks();
   }
   ```

3. **服务端添加超时预警**:
   ```typescript
   // 接近超时时提前返回部分结果
   if (elapsedTime > maxDuration * 0.9) {
     return partialResponse();
   }
   ```

---

### 🎯 阶段 3: 长期架构优化（可选）

**目标**: 支持任意长度的推理任务

**实施方案**: 采用 **方案 3**（异步任务队列）

**技术栈**:
- 任务队列: BullMQ + Redis（Upstash）
- 前端: 轮询或 WebSocket 实时更新
- 后端: Worker 进程处理长任务

**预估工作量**: 5-10 天

---

## 实施计划

### Sprint 1: 快速修复（1 小时）

**任务列表**:
1. ✅ 修改 `app/api/google.ts` 的 runtime 和 maxDuration
2. ✅ 测试部署到 Vercel
3. ✅ 验证 Gemini 2.5 Pro 长时间思考任务

**验收标准**:
- [ ] 100 秒以内的推理任务不超时
- [ ] Vercel 日志显示正确的 runtime
- [ ] 用户可完成长对话

---

### Sprint 2: 用户体验优化（可选，1-2 天）

**任务列表**:
1. 前端添加"正在深度思考"进度条
2. 添加预估时间显示
3. 超时时友好错误提示

**验收标准**:
- [ ] 用户看到实时进度反馈
- [ ] 超时时不会突然中断

---

### Sprint 3: 长期架构（可选，5-10 天）

**任务列表**:
1. 引入 Redis 任务队列
2. 实现异步任务提交/轮询机制
3. 前端 UI 改造
4. 压力测试

**验收标准**:
- [ ] 支持 500+ 秒推理任务
- [ ] 系统稳定可靠

---

## 风险评估

### 高风险
- ⚠️ **Vercel 计划限制**: 如果你是 Hobby Plan，无法使用长超时
  - **缓解措施**: 检查计划并考虑升级

### 中风险
- ⚠️ **成本增加**: Pro Plan 需要付费
  - **缓解措施**: 评估使用频率，考虑其他部署平台

### 低风险
- ⚠️ **冷启动延迟**: Node.js Runtime 比 Edge 慢 100-300ms
  - **缓解措施**: 可接受的延迟，用户感知不明显

---

## 决策建议

### 立即执行（推荐）✅
```typescript
// 修改 app/api/google.ts
export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro Plan
```

### 验证计划
```bash
# 1. 登录 Vercel Dashboard
# 2. 检查当前计划
# 3. 如果是 Hobby，考虑升级到 Pro（$20/月）
```

### 后续优化
- 如果 60 秒不够，考虑：
  - 升级到 Enterprise Plan（300-900 秒）
  - 或迁移到 Cloudflare Workers
  - 或自建 Node.js 服务器

---

## 参考资料

- [Vercel Runtime 文档](https://vercel.com/docs/functions/runtimes)
- [Vercel 计划对比](https://vercel.com/pricing)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Gemini 2.5 Pro 深度思考模式](https://ai.google.dev/gemini-api/docs/thinking)

---

**下一步**: 你确认要我实施 **阶段 1: 快速修复** 吗？我会修改 `google.ts` 并提交代码。

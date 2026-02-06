## 排查结论（先解决连接问题）
- **health 自检“返回空”** 的高概率原因：Kling/Jimeng 的 `generate()` 直接读 `data.data.task_id`，如果第三方响应字段变了或结构不匹配，会导致 `request_id` 变成 `undefined`，但代码仍返回“submit ok”，于是看起来“没有返回内容”。
- **实际生成常失败** 的高概率原因：`/api/generate` **没有显式指定 Node.js runtime**，而 Kling/Jimeng 依赖 `jsonwebtoken/aws4`，在 Edge 环境会报错或行为不稳定；health 已强制 nodejs，所以“自检 OK，生成失败”的症状会出现。
- **Jimeng 查询接口 Action 可疑**：`checkStatus()` 仍用 `Action=CVProcess`，注释里也表明不确定。若 Action 不正确会导致“提交成功但查询失败”。

## 计划（先修连接问题，再改 UI 展示）
### 1) 修复连接问题（优先）
- 在 [generate/route.ts](file:///Users/bytedance/Desktop/demo/app/api/generate/route.ts) 加 `export const runtime = "nodejs"`，保证与 health 一致。
- 在 Kling/Jimeng 的 `generate()` 增加 **task_id 强校验**：缺失就抛错并带上原始响应，避免“OK但空”的假阳性。
- 在 Jimeng `checkStatus()` 校正为官方 SDK 对应的正确 Action（从你提供的文档和 SDK 逻辑对齐）。

### 2) 再优化自检展示
- `health` 接口返回结构增加：`requestId`/`endpoint`/`rawResponse` 的精简字段，方便复制。
- 自检前端：LLM 结果过长时折叠与可复制输出，避免超出容器。

确认后我开始修复实现。
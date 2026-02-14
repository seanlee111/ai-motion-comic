# [OPEN] Fal AI 三个模型图生图参考图未生效（证据驱动调试）

## 症状
- 现象：使用 Fal AI 的 3 个模型（`fal-flux-dev` / `fal-flux-schnell` / `fal-fast-sdxl`）生图时，上传/选择的参考图似乎没有被用于图生图。
- 期望：当分镜里存在参考图（资产库选择 + 分镜上传）时，Fal 的调用应走图生图路径，并把参考图以 Fal API 要求的字段传给上游；生成结果能进入右侧 Preview（已改为默认进入 Preview）。

## 假设（可证伪）
1. 前端虽传了 `image_url`/`image_urls`，但 `/api/generate` 到 Fal provider 的参数丢失或字段名不匹配，导致 Fal 实际走文生图。
2. Fal provider 发送给 Fal 的 payload 字段不符合该模型/端点要求（例如应为 `image_url` / `image` / `image_prompt`），导致参考图被忽略。
3. 参考图为 `data:`（base64）或 `blob:` URL，Fal 端点只接受公网 URL，导致上游无法拉取/静默忽略。
4. 选用的 Fal endpoint（queue/sync）与返回处理不匹配，导致我们以为完成但实际上没有按图生图执行或未正确轮询。
5. mode/日志显示为图生图但仅来自前端自填字段，上游实际返回/执行路径不同。

## 采集计划
- 在 `/api/generate` 与 `FalProvider` 增加调试上报点（HTTP POST 到 Debug Server），记录：收到的图片类型与数量、发送给 Fal 的 endpoint 与关键 payload 字段、Fal 返回结构（sync/async）。
- 本地复现：分别用（A）公网 URL 参考图（B）data URL 参考图（C）混合，分别调用 3 个 Fal 模型，采集日志。

## 会话信息
- debug sessionId：`fal-ref-20260214`


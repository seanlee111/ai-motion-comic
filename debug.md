# [OPEN] Jimeng 图生图参考图未生效（证据驱动调试）

## 症状
- 现象：Activity Logs 里显示 Jimeng 调用为 image-to-image（带参考图参数），但生成结果视觉上更像 text-to-image（未参考输入图）。
- 期望：即梦模型在图生图时，必须同时参考：资产库选择的图片（Scene/Character）+ 分镜页上传的图片（Custom Uploads）。

## 假设（可证伪）
1. 前端没有把参考图真正传到 `/api/generate`（例如字段名不对、数组为空、被压缩逻辑清空）。
2. `/api/generate` 收到参考图，但传给 Jimeng 的字段名/结构不符合 Ark/Volcengine 要求（例如应为 `image` 而非 `image_urls`）。
3. 分镜页上传图是 `data:` base64，而 Jimeng/Ark 只接受可公网访问的 URL，导致后端静默忽略参考图。
4. 即梦 legacy 端点 req_key 仍走 `jimeng_t2i_v40` 或 I2I req_key 不正确，导致最终是文生图路径。
5. 请求日志里显示的 `mode/model` 字段来自前端 requestPayload（非后端真实执行结果），造成“看起来是 i2i”但实际不是。

## 采集计划
- 在前端、`/api/generate`、`JimengProvider` 三处增加仅用于调试的上报点（HTTP POST 到 Debug Server），记录：参考图数量、URL 类型（http/data/blob）、实际发往即梦的 payload 关键字段。
- 本地复现：分别用（A）公网 URL 参考图、（B）data URL 参考图、（C）二者混合，观察即梦请求与响应，并对照是否存在“忽略参考图”的证据。

## 会话信息
- debug sessionId：`jimeng-ref-20260214`


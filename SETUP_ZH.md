# 🚀 快速上手指南 (Quick Start Guide)

欢迎使用 **AI Motion Comic Studio (AI漫剧工作台)**。这是一个 MVP Demo，旨在帮助创作者快速生成漫剧关键帧。

## 🛠️ 第一步：启动项目 (开发者模式)

由于这是一个 Next.js 项目，你需要在终端中运行它。

1.  **安装依赖**
    在项目根目录下打开终端，运行：
    ```bash
    npm install
    ```

2.  **启动服务**
    安装完成后，运行：
    ```bash
    npm run dev
    ```

3.  **访问页面**
    打开浏览器访问：[http://localhost:3000](http://localhost:3000)

---

## 🔑 第二步：配置 API Key

本项目依赖 **Fal.ai** 的 Flux 模型服务。

1.  **获取 Key**:
    *   访问 [Fal.ai Dashboard](https://fal.ai/dashboard) 并注册/登录。
    *   创建一个 API Key。
    *   *(新用户通常有免费试用额度)*

2.  **填入 Key**:
    *   在页面右上角，点击 **设置图标 (⚙️)**。
    *   在 `FAL_KEY` 输入框中粘贴你的 Key (以 `fal_` 开头)。
    *   Key 会自动保存在你的浏览器本地，不会上传到我们的服务器。

---

## 🎨 第三步：开始创作

### 模式 1：文生图 (Text-to-Image)
最常用的模式，直接通过文字描述生成画面。

1.  **Prompt (提示词)**: 输入画面描述。支持中文，但建议用英文以获得最佳效果。
    *   *示例*: "Cyberpunk detective standing in rain, neon lights, high contrast, cinematic lighting, 8k"
    *   *(赛博朋克侦探站在雨中，霓虹灯，高对比度，电影光效)*
2.  **Aspect Ratio**: 选择画幅（推荐 16:9 用于视频）。
3.  **点击 Generate**: 等待几秒钟，右侧画廊会出现结果。

### 模式 2：图生图 (Image-to-Image)
用于保持角色一致性或修改现有画面。

1.  切换到 **Img to Img** 模式。
2.  **Reference Image**: 上传一张参考底图。
3.  **Prompt**: 输入修改指令或原有描述。
4.  **点击 Generate**: AI 会基于底图进行重绘。

---

## 💾 导出结果

*   鼠标悬停在生成的图片上。
*   点击 **Download** 保存到本地。
*   *(Coming Soon)*: 未来版本将支持直接发送到 Kling (可灵) 生成视频。

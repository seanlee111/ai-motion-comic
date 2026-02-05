# 🚀 Deployment Guide (如何托管项目)

本项目已配置 **NextAuth.js** 身份验证，并适配 **Vercel** 部署。

## 1. 准备工作

### A. 获取必要的密钥
在部署前，请确保你拥有以下 Key：
1.  **AUTH_SECRET**: 用于加密会话。
    *   在终端运行 `openssl rand -base64 32` 生成一个随机字符串。
2.  **ACCESS_PASSWORD**: 访问网站的密码（例如 `mysecret123`）。
3.  **API Keys**: FAL_KEY, LLM_KEY 等。

### B. 推送代码到 GitHub
你需要将此项目推送到你的 GitHub 仓库。
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seanlee111/ai-motion-comic.git
git push -u origin main
```

---

## 2. 部署到 Vercel (推荐)

Vercel 是 Next.js 的官方托管平台，免费且最简单。

1.  **注册/登录**: 访问 [vercel.com](https://vercel.com) 并使用 GitHub 登录。
2.  **新建项目**:
    *   点击 **"Add New..."** -> **"Project"**。
    *   在 Import Git Repository 列表中找到你的 `ai-motion-comic` 仓库并点击 **Import**。
3.  **配置环境变量 (Environment Variables)**:
    在 "Configure Project" 页面，展开 **Environment Variables**，添加以下键值对：
    
    | Key | Value (示例) | 说明 |
    | --- | --- | --- |
    | `AUTH_SECRET` | `aX...` (生成的随机串) | **必须** |
    | `ACCESS_PASSWORD` | `admin123` | **必须**，登录密码 |
    | `FAL_KEY` | `fal_...` | (可选) 也可以在网页端设置 |
    | `LLM_KEY` | `sk-...` | (可选) 也可以在网页端设置 |

4.  **点击 Deploy**: 等待几分钟，Vercel 会自动构建并分配一个 `https://xxx.vercel.app` 的域名。

---

## 3. 验证功能

1.  访问 Vercel 分配的公网链接。
2.  你应该会被重定向到 `/login` 页面。
3.  输入你在环境变量中设置的 `ACCESS_PASSWORD`。
4.  验证通过后，即可进入 AI 漫剧工作台。

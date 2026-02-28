# 项目架构升级建议（Blob → Supabase 渐进式）

## 一、目标

在**不影响现有演示版本**的前提下，引入 Supabase，逐步升级为支持多用户的 SaaS 架构，实现：

* 用户登录与身份验证
* 白名单访问控制
* 用户数据隔离
* 用户资产长期保存
* 为未来用户规模增长做准备

---

## 二、总体策略：并行开发，不动现网

原则：
**不直接改现有 Blob 版本，采用隔离 + Feature Flag 渐进迁移**

实施方式：

| 项目 | 做法 |
| :--- | :--- |
| Git | 新建分支 `feature/supabase-auth` |
| Vercel | 利用 Preview Deployment |
| 环境变量 | Production 与 Preview 完全隔离 |
| 功能切换 | 使用 Feature Flag 控制新旧逻辑 |

现网 demo 持续稳定运行。

---

## 三、Vercel 环境隔离配置

### 1）部署结构

| 环境 | 用途 |
| :--- | :--- |
| Production | 现有 Blob Demo（不接 Supabase） |
| Preview | Supabase 新架构开发 |
| Development | 本地开发 |

### 2）新增 Feature Flag

新增环境变量：

```
ENABLE_AUTH=false   (Production)
ENABLE_AUTH=true    (Preview + Dev)
```

代码统一入口：

```js
if (process.env.ENABLE_AUTH === "true") {
  // Supabase 路径
} else {
  // 现有 Blob Demo 路径
}
```

确保生产环境完全不受影响。

---

## 四、引入 Supabase 的职责范围

**注意：不替换 Blob，只补充数据库能力**

最终架构：

```
Vercel Serverless API
        ├── Supabase Auth（身份认证）
        ├── Supabase Postgres（结构化数据）
        └── Vercel Blob（文件存储）
```

职责划分：

| 数据类型 | 存储位置 |
| :--- | :--- |
| 用户身份 | Supabase Auth |
| 用户资料 | Supabase DB |
| 用户资产元数据 | Supabase DB |
| 上传文件 | Vercel Blob |
| 生成文件 | Vercel Blob |

---

## 五、第一阶段必须落地的功能

### 1）用户登录（Supabase Auth）

目标：

* Email 登录即可
* 不开放注册（邀请制）

### 2）白名单访问控制

新增表：`profiles`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | uuid | 对应 auth.user.id |
| email | text | 用户邮箱 |
| role | text | user / admin |
| is_whitelisted | boolean | 是否允许使用 |
| created_at | timestamp | 创建时间 |

登录后流程：

```
用户登录 → 查询 profiles → 若非白名单 → 拒绝访问
```

### 3）用户资产系统（核心）

新增表：`assets`

| 字段 | 说明 |
| :--- | :--- |
| id | 资产ID |
| user_id | 所属用户 |
| blob_url | Blob 文件地址 |
| type | 文件类型 |
| size | 文件大小 |
| status | 处理状态 |
| created_at | 上传时间 |

重要原则：

> 文件仍存 Blob
> 数据库只存文件“信息”

---

## 六、为什么现在必须引入数据库

当前需求已包含：

* 多用户
* 权限控制
* 用户资产
* 长期数据保留

这些属于**标准 SaaS 基础能力**，Blob 无法承担：

Blob 只能存文件，不能：

* 做权限
* 做配额
* 做查询
* 做统计
* 管理用户资产关系

Supabase 解决的是**系统复杂度扩展**。

---

## 七、实施节奏建议

阶段 1（当前）
引入 Auth + profiles + assets

阶段 2（后续）

* 用户配额
* 使用统计
* Admin 后台

阶段 3（未来）

* 计费系统
* 队列与后台任务

---

## 八、风险控制结论

本方案具备：

* 零生产影响
* 可回滚
* 可并行开发
* 可渐进上线

属于低风险架构升级。

---

这一步标志着项目从 **Demo 工具 → 多用户产品** 的正式过渡。

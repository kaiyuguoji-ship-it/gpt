# SWANYO OS

一个仓库，三个独立构建、独立部署的项目。当前提供业务工作区、研究需求存储、管理控制台及数据库诊断作业；Agent / Skill / MCP 尚未接入执行。

| 项目 | 目录 | 职责 | 云端名称 |
| --- | --- | --- | --- |
| 业务前端 | `apps/web` | 九大业务中心、研究需求表单 | `swanyo-web` |
| 管理后台 | `apps/admin` | 独立管理员登录、任务、作业、设置、日志 | `swanyo-admin` |
| 后端服务 | `apps/api` | 鉴权、API、数据库、定时作业 | `swanyo-api` |
| 共用代码 | `packages/shared` | 数据类型、校验规则、轻量转发 | 不单独部署 |

前端各自输出静态页面，并用极小的 Worker 将同源 `/api/*` 请求转发到 API Service Binding。数据库、业务逻辑、密钥只存在 API 项目。业务前端不发布管理页面，并拒绝转发管理接口；后端也独立校验管理员会话。

## 安装与验证

使用 Node.js 24 和 npm 11。在仓库根目录执行：

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run deploy:check
```

## 本地完整环境

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
# 编辑上面的文件，设置两条不同的随机密钥（各至少 32 字符）
npm run db:local -w @swanyo/api
npm run build
npm run preview
```

业务网站 `http://127.0.0.1:8791/`；管理后台 `http://127.0.0.1:8792/`；API `http://127.0.0.1:8790/api/health`。使用各自密钥登录。关闭本地进程后，预览地址不再可用。本地诊断作业通过管理界面“处理下一项”执行。

单独修改页面可执行 `npm run dev:web` 或 `npm run dev:admin`；Next 开发服务器只提供页面，完整 API 联调使用上述三个 Worker 预览。

## 云端部署

参见 [三个项目部署说明](docs/deployment.md)。无需购买域名；三个 Worker 可使用各自的 workers.dev 地址。生产数据库尚未在仓库中配置，不能把本地测试状态当作云端上线。

# SWANYO OS

Next.js App Router + TypeScript + Tailwind CSS 4 + shadcn/ui Button + Lucide React。

## 本地运行

需要 Node.js >= 20.9。

```sh
npm ci
npm run dev
```

浏览器访问 http://localhost:3000。静态生产构建：`npm run build`，输出到 `out/`。运行 `npm start` 使用静态服务器预览构建产物。

包含八中心矩阵、八个二级模块页面、快捷指令、Agent 模拟调度、告警处理和执行日志。响应式布局支持移动端。

当前为前端原型：数据为演示数据，执行通过本地定时器模拟，不连接 Amazon、广告 API 或模型服务；刷新页面会重置状态。实际系统需补充身份认证、服务端任务队列、数据库和 Amazon SP-API 授权。


## Cloudflare Pages 演示部署

本原型使用静态导出，所有八个中心在构建时生成，无需 Node.js 服务端或 Next.js 适配器。

在 Pages 连接此 GitHub 仓库，设置：

- 生产分支：`main`
- 根目录：仓库根目录（留空）
- 框架预设：None（手动配置）
- 构建命令：`npm run build`
- 构建输出目录：`out`
- 环境变量：`NODE_VERSION=22`

安装依赖可使用 `npm ci`。不要将 `.next` 当作静态输出目录，也不要使用 `next-on-pages` 构建此静态原型。

如果使用 Workers 的 Git 构建，构建命令同上，部署命令为 `npx wrangler deploy`，仓库中的 `wrangler.jsonc` 指定静态资产目录。Workers 项目名称应与配置的 `swanyo-os` 一致，或按实际名称修改配置。

部署后验证 `/` 与 `/centers/1/` 至 `/centers/8/`，直接刷新二级页面仍应正常；不存在的路径应返回 404。Agent 交互仍在浏览器中模拟执行。

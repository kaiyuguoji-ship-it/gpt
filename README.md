# SWANYO OS

Next.js App Router + TypeScript + Tailwind CSS 4 + Lucide React.

## 当前版本

- 九大独立业务应用入口。
- Apple-inspired 留白与排版，半透明磨砂玻璃侧边导航。
- 主工作区保持纯白，卡片和分割线使用轻量浅灰。
- 响应式导航与应用页面。
- 市场情报、产品研发、商业决策、视觉创意、Listing SEO、广告运营、FBA 库存、供应链运营、数据审计九大应用。
- 当前仍为前端架构与视觉原型；不展示虚构的实时销售、库存或 Agent 数据，也未连接 Amazon API、数据库或模型服务。

## 本地运行

需要 Node.js >= 20.9。

```sh
npm ci
npm run dev
```

浏览器访问 http://localhost:3000。静态生产构建：`npm run build`，输出到 `out/`。

## Cloudflare Pages

- 生产分支：`main`（合并本次设计分支后生效）
- 根目录：仓库根目录
- 构建命令：`npm run build`
- 构建输出目录：`out`
- 环境变量：`NODE_VERSION=22`

部署前运行 `npm run build && npm run deploy:check`。本次设计分支不会自动替换生产分支；审阅并合并后，Cloudflare 按现有 Git 部署配置构建。

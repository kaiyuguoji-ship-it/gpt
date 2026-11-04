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


## 用户提供的 Linear 排版规格

Inter Variable 随站点自托管，中文使用系统字体回退。主标题 64/64px、510 字重、-1.408px 字距；介绍标题 48/48px、510 字重、-1.056px 字距；正文 16/24px；辅助说明 15/24px、-0.165px 字距；导航 13/19.5px。启用 cv01、ss03。

保留远端最新浅色工作台及可折叠导航，因此主标题保持深色以确保对比度，未将暗色官网的白色主文字直接用于白底。次级文字使用提供的 #8a8f98。沿用当前项目 760px 窄屏断点，主标题为采样的 38/41.8px、-0.836px；窄屏介绍标题适配为 32/35.2px。断点与窄屏介绍标题不是官网实测值。

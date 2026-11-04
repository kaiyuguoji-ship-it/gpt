# SWANYO OS

Next.js App Router + TypeScript + Tailwind CSS 4 + shadcn/ui Button + Lucide React。

## 本地运行

需要 Node.js >= 20.9。

```sh
npm ci
npm run dev
```

浏览器访问 http://localhost:3000。生产模式：`npm run build && npm start`。

包含八中心矩阵、八个二级模块页面、快捷指令、Agent 模拟调度、告警处理和执行日志。响应式布局支持移动端。

当前为前端原型：数据为演示数据，执行通过本地定时器模拟，不连接 Amazon、广告 API 或模型服务；刷新页面会重置状态。实际系统需补充身份认证、服务端任务队列、数据库和 Amazon SP-API 授权。

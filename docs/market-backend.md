# 市场情报中心：后台基础与接入清单

## 当前能力

前端仍由 Next.js 静态导出；Cloudflare Worker 接管 `/api/*`，其他请求交给静态资源。无需转换为 Next.js 服务端渲染。

已实现：个人工作区解锁（签名 HttpOnly 会话，8 小时）、研究任务创建/列表/详情、结构化条件、补充条件、取消、操作记录、提交幂等、乐观锁、D1 持久化、缺失配置提示。用户输入及证据不写浏览器 localStorage。

**未实现：模型调用、市场数据查询、自动类目筛选、候选评分、后台长任务执行。** 模型与数据连接状态明确为未接入，不会展示生成的市场结果。`server/agent.ts` 是未来运行器的契约；`skills/*/SKILL.md` 是方法文档，不代表运行器已加载并执行。当前的数字提取是保守正则，不是 AI 对话。

状态只包含 `needs_clarification`、`blocked_configuration`、`cancelled`。所有阶段均为计划，不显示模拟进度。未来有真实任务执行器后再增加 queued/running/completed/failed 状态及候选证据表。

## 本地完整运行

要求 Node.js 22.18+（测试使用 Node SQLite 与原生 TypeScript stripping）。

```sh
npm ci
cp .dev.vars.example .dev.vars
# 将 .dev.vars 中的密钥换成至少 32 字符的随机值
npm run build
npm run db:local
npm run backend:dev
```

访问 Wrangler 输出的地址（默认 http://localhost:8787），在市场情报中心输入同一密钥解锁。`npm run dev` 仅启动前端；`npm start` 仅提供静态资源，两者都不会运行 Worker API。

`wrangler.local.jsonc` 使用全零数据库 ID，仅供本地模拟，不要用于生产部署。数据库迁移必须在创建任务前运行。刷新页面后可通过右侧研究记录重新打开已保存任务。

## Cloudflare 生产配置

当前默认 `wrangler.jsonc` 刻意不绑定虚构的 D1 数据库。直接部署可继续显示前端和健康状态，但不会假装已具备持久化能力。

1. 在自己的 Cloudflare 账户执行 `npx wrangler d1 create swanyo-market`。
2. 将返回的真实数据库 ID 添加至 `wrangler.jsonc`：

```json
"d1_databases": [{
  "binding": "DB",
  "database_name": "swanyo-market",
  "database_id": "填写实际创建得到的ID",
  "migrations_dir": "migrations"
}]
```

3. 执行 `npx wrangler d1 migrations apply swanyo-market --remote`。
4. 执行 `npx wrangler secret put WORKSPACE_ACCESS_KEY`，输入至少 32 字符的随机密钥，不提交到仓库。
5. 执行 `npm run typecheck && npm test && npm run build && npm run deploy:check`。
6. 执行 `npm run deploy`。需要 Workers 部署；仅把 `out/` 上传到 Pages 不会运行本项目的 Worker。
7. 检查 `/api/health` 的 backend/storage/accessConfigured 均为 true，创建任务、刷新、更新条件并确认操作记录。

这是单人、单工作区基础版；所有持有工作区密钥的人共享研究记录。多人/多租户上线前需要用户身份、权限和数据隔离。密钥只用于解锁，经 HttpOnly Cookie 保持会话。部署时为登录接口配置平台限速，避免不必要的请求消耗。更换密钥会使已有会话失效。

## 下一阶段接入

- 模型服务：选择供应商与模型，在服务端保存凭据。不能把聊天产品中的插件连接直接当成网站凭据。
- 市场数据：确认服务商授权的接口、配额和返回字段；实现服务商适配器并保存原始来源/周期，不要猜测接口。
- 数据层：新增节点、快照、候选、报价与证据表。只有验证站点和来源后才能进入候选池。
- 计算层：明确费用口径与评分规则，资金组合不能重复使用总预算。
- 长任务：使用持久化队列或工作流，支持任务租约、重试上限、超时、取消和逐阶段恢复。不要靠浏览器或请求结束后的短时回调运行长研究。
- Agent：显式加载六个 Skill，限制工具、调用次数、费用与研究范围；对外部数据按不可信内容处理。
- 接入后更新健康检查。未验证的连接不能仅因有环境变量就标为“可用”。

## API

除 health 和 session 登录外都要求会话；写请求要求同源 Origin，JSON 请求体上限 16 KiB。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /api/health | 基础配置状态（不泄露密钥） |
| POST/GET/DELETE | /api/session | 解锁、查询登录、锁定 |
| GET/POST | /api/research/tasks | 最近100项、创建任务 |
| GET/PATCH | /api/research/tasks/:id | 详情、更新条件 |
| POST | /api/research/tasks/:id/cancel | 取消任务 |
| POST | /api/research/tasks/:id/run | 当前返回409并解释未满足条件/未接入服务 |

创建任务带 `Idempotency-Key`；更新/取消带当前 `version`。重复同内容提交返回原任务；同 key 不同内容返回409。冲突更新需刷新详情再处理。

## 验证

`npm test` 覆盖实际用户示例、缺失条件、边界数据、签名会话、同源限制、数据库任务生命周期、审计、幂等和配置缺失。测试数据库为 Node SQLite；部署前还应通过 `db:local` 在 Wrangler D1 模拟器跑一次完整流程。

参考：[Cloudflare 静态资源与 Worker 绑定](https://developers.cloudflare.com/workers/static-assets/binding/)、[D1 数据库接口](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

## 后端管理页面（0.2.0）

入口：`/admin/`，侧栏底部有“后端管理”。使用同一工作区访问密钥登录。

- 运行概览：真实任务统计、数据库读取状态、服务版本及接收/处理开关。
- 研究任务：按需求或完整 ID 搜索、状态筛选、分页、详情及取消。
- 后台作业：持久化数据库检查作业、状态和结果、取消、失败后手动重试。
- 操作日志：研究任务变更、设置变更、后台作业结果，分页查看；不等同于云平台基础设施日志。
- 基础设置：工作区名称、是否接收新研究任务、是否领取新的后台作业；带版本冲突保护。

新增迁移 `0002_admin.sql`，升级前必须执行本地/远端迁移。工作区名称为管理配置，不自动修改品牌名称。开关立即影响后端接口；关闭队列不会强制终止已经领取的短作业。

后台作业是 D1 持久化队列，由 Cloudflare Cron 每分钟处理最多一项；采用原子领取、60 秒租约、最多 3 次自动尝试、失败延迟重试及租约过期恢复。当前仅注册 `database_check`，不会执行 AI 研究。作业处理为短时数据库操作；未来长时间研究需另行实现可靠执行器，不能直接塞入这个短任务处理函数。

Wrangler 本地开发不自动触发 Cron，管理页面“处理下一项”可用于本地验证。部署到 Cloudflare 后由 `triggers.crons` 触发；Cron 配置传播可能需要时间。页面不声称已经验证云端定时器。

后台管理复用单工作区权限，拥有密钥者均可修改设置。当前没有多用户角色管理、在线密钥编辑或 Agent/MCP 配置。

新接口（均要求会话，写入要求同源）：

- `GET /api/admin/overview`
- `PATCH /api/admin/settings`，字段 `name/acceptingTasks/queueEnabled/version`
- `GET /api/admin/tasks?page=1&q=&status=`，每页20条
- `GET /api/admin/logs?page=1`，每页30条
- `GET/POST /api/admin/jobs`，查看最近50项/创建数据库检查
- `POST /api/admin/jobs/process`，立即处理下一项
- `POST /api/admin/jobs/:id/cancel`、`POST /api/admin/jobs/:id/retry`

仅绑定数据库不代表已迁移，管理接口依赖两份迁移全部成功。不要把本地开发模拟器端口暴露到公网；生产使用 Worker 部署。

# 三个独立云端项目

## 部署关系

```text
swanyo-web（业务界面） ── API binding ──┐
                                      ├─ swanyo-api ── D1
swanyo-admin（管理界面）── API binding ──┘
```

一个 GitHub 仓库不等于一个部署。每个项目有自己的 package.json、wrangler.jsonc、Worker 名称和独立部署命令。所有命令在仓库根目录执行，云平台构建根目录也应选仓库根目录，以保留共享包和统一锁文件。不要把根目录整体当作静态资源上传。

| Cloudflare 项目 | 安装 | 构建 | 部署 | 输出/入口 |
| --- | --- | --- | --- | --- |
| swanyo-web | npm ci | npm run build -w @swanyo/web | npm run deploy:web | apps/web/out + worker.ts |
| swanyo-admin | npm ci | npm run build -w @swanyo/admin | npm run deploy:admin | apps/admin/out + worker.ts |
| swanyo-api | npm ci | npm run typecheck -w @swanyo/api | npm run deploy:api | apps/api/src/index.ts |

三者分别设置部署项目，连接同一仓库的 main 分支。现有站点不会因为创建本配置而自动改变；合并和正式部署是后续操作。首次部署先 API、后两个界面。更新共享类型时验证三者，并避免接口不兼容的分批发布。

## API 首次配置

1. 在 Cloudflare 账号创建 D1，例如 `swanyo-production`。
2. 把返回的真实数据库 ID 填入 `apps/api/wrangler.jsonc` 的 `d1_databases`：

```json
"d1_databases": [{
  "binding": "DB",
  "database_name": "swanyo-production",
  "database_id": "由 Cloudflare 返回的真实 UUID",
  "migrations_dir": "migrations"
}]
```

3. 使用 `npx wrangler d1 migrations apply swanyo-production --remote --config apps/api/wrangler.jsonc` 应用数据库迁移。升级数据库前先备份；Worker 回滚不会回滚数据库。
4. 分别设置 Secret：

```sh
npx wrangler secret put WORKSPACE_ACCESS_KEY --config apps/api/wrangler.jsonc
npx wrangler secret put ADMIN_ACCESS_KEY --config apps/api/wrangler.jsonc
```

两条密钥必须不同且至少 32 字符。不要提交密钥，也不要填入 NEXT_PUBLIC 环境变量。当前仍为单工作区模型：业务密钥可管理本工作区研究任务，管理员密钥可额外管理配置、日志和作业；不是多租户用户系统。

5. `npm run deploy:api`。两个界面的 `services[].service` 均指向 `swanyo-api`，部署在同一账号内。
6. 分别构建、部署两个界面。业务与管理界面使用不同主机名，Cookie 按主机隔离，不设置共享 Domain。

后台任务仅支持短时数据库检查，每分钟最多领取一项；不是长时 Agent 执行器。

## 验收

- 三个地址不同，业务网站 `/admin/` 为 404，业务网站 `/api/admin/overview` 为 404。
- 业务密钥不能登录管理后台，业务会话直接请求 API 管理接口返回 401。
- 管理员登录后可查看任务、保存设置、执行数据库检查；刷新后数据仍保留。
- API `/api/health` 返回数据库可读且业务密钥已配置；管理界面读取 `/api/admin/health`。
- 请求写操作时必须携带与请求 URL 相同的 Origin，使用 HttpOnly 会话 Cookie。

## 独立更新与回滚

分别使用 `npm run deploy:web`、`npm run deploy:admin`、`npm run deploy:api`。也可在三个 Cloudflare 项目的 Deployments 中独立回滚。前端改动不会改动数据库；数据库迁移需单独执行。共享包更新应运行全量 CI。

## 本地数据迁移

原版单项目的本地数据位于根目录 `.wrangler/`。新版本使用 `apps/api/.wrangler/`；若要保留旧数据，在停止旧服务后复制其 state 目录到新目录，再执行本地迁移。不要上传本地数据库或密钥。

# Prompt 数据导入与上线

## 架构

Prompt 数据使用 Turso 保存，原图、两档缩略图与管理员上传的原始 JSON 使用现有 B2 存储。应用内的管理员页面只负责校验、预览和排队；Coolify Scheduled Task 启动短生命周期 Worker 处理队列。整个项目仍只部署一个 Application，不需要常驻第二个进程。

```text
/admin/prompts 上传 JSON
  → 校验文件名与数据，生成变更预览
  → JSON 存入 B2，任务写入 Turso
  → Coolify 每分钟运行 pnpm prompts:worker --drain
  → 下载图片并生成缩略图，写入 prompt_items
  → 通知应用立即刷新 Prompt 画廊缓存
```

## 顺序与去重

- 文件名必须且只能包含一个 `YYYYMMDD` 日期。
- 所有文件全局按日期从旧到新处理。
- 同一天按系列名排序；同系列先处理基础文件，再处理 `-2`、`-3`。
- `tweetId` 是唯一身份，不包含模型名。最旧文件先写入，后续相同内容跳过。
- 内容发生变化时，管理员页面会明确显示 changed 数量；只有显式确认后才允许覆盖。
- Prompt 页面仍按内容的 `publishedAt DESC, id DESC` 展示，与导入文件顺序无关。

## 图片

- 原图存入 `prompts/original/`。
- 瀑布流封面生成最大宽度 640px 的 WebP，存入 `prompts/thumb/cover-v2/`。
- 弹窗底部多图缩略图生成最大宽度 160px 的 WebP，存入 `prompts/thumb/detail-v3/`。
- 图片以完整 SHA-256 命名，相同字节不会重复上传。
- 封面总是图片数组第一项。下载限制为 HTTPS、30 秒与 20MB，并由 Sharp 校验像素和格式。

## 首次导入

首次上线的 401 个归档文件建议从本地执行，避免浏览器上传限制和 Web 请求超时：

```bash
pnpm db:setup:production
pnpm prompts:import:dry data-01
pnpm prompts:import:production data-01 --continue-on-error
```

脚本会先扫描并排序全部文件，再开始写入。文件账本确保已完成文件再次运行时直接跳过。失败文件可在修复后重跑；`--continue-on-error` 会继续处理其他文件，并最终以非零状态退出，便于发现不完整导入。

## Coolify 配置

应用环境变量增加：

```dotenv
ADMIN_EMAILS=admin@example.com
PROMPT_IMPORT_WORKER_SECRET=<long-random-secret>
PROMPT_IMPORT_ENABLED=false
PROMPT_IMPORT_CONCURRENCY=2
```

`APP_URL` 必须是正式站点公开地址，并与 Scheduled Task 使用相同的 `PROMPT_IMPORT_WORKER_SECRET`。

在同一个 Coolify Application 中添加 Scheduled Task：

```text
Name: Prompt Import Worker
Command: pnpm prompts:worker --drain
Frequency: * * * * *
Timeout: 3600
```

Worker 使用 Turso 单例锁，同一分钟的任务重叠时后启动者会直接退出。处理中会写入 heartbeat；异常终止超过十分钟后，下一次 Worker 会把遗留任务重新入队。已完成的 item 会按 fingerprint 跳过，因此重试不会重复写入。

### 安全部署顺序

1. 首次部署保持 `PROMPT_IMPORT_ENABLED=false`。
2. 从本地执行 `pnpm prompts:worker:check:production`，或在 Coolify 容器中执行 `pnpm prompts:worker:check`。该命令只检查数据库、队列表与 B2 凭据，不写入 Prompt 数据。
3. 登录 `/admin/prompts`，上传一个 JSON 并查看预览。关闭状态下不能排队。
4. 确认预览和页面正常后，在 Coolify 把 `PROMPT_IMPORT_ENABLED` 改为 `true` 并重启应用。
5. 先确认一个小文件，观察任务完成和前台展示，再逐步导入其余数据。

任何时候把开关改回 `false` 并重启应用，新的 Scheduled Task 都会立即退出。已经运行中的进程不会收到环境变量变化，因此紧急停止时还需要在 Coolify 终止当次 Scheduled Task。

## 管理员增量流程

1. 使用 `ADMIN_EMAILS` 中的邮箱登录。
2. 从用户菜单进入 `Prompt imports`。
3. 一次选择最多 20 个 JSON，每个最大 2MB、总计最大 20MB。
4. 检查 new、duplicate、changed、invalid 结果。
5. changed 为零时直接排队；有 changed 时确认覆盖后排队。
6. 页面自动轮询任务状态；部分图片失败不会阻塞其他 item，可修复源数据后重试。

原始 JSON 使用内容 hash 保存到 `prompts/import-source/`，相同文件不会重复创建任务。管理员页面只接受已登录白名单账号，但这不等于图片内容可信；导入器仍保留 HTTPS、超时、体积和解码限制。

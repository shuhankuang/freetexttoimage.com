# Prompt 数据入库与图片自托管方案

> 状态：v4，待实现  
> 页面：`/prompts/[model]`  
> 规模：约 1 万条起步、持续增加、多个增量 JSON 文件  
> 范围：数据入库、图片自托管、服务端分页；暂不做搜索、后台编辑和自动定时任务

## 1. 结论

采用一条可重复执行的导入管线：

```text
data/**/*.json（只读归档）
  → 校验、下载图片、生成小图
  → B2 内容寻址存储
  → Turso：prompt_items + prompt_import_files
  → Prompt 页面服务端首屏 + API cursor 分页
```

只建两张表：

1. `prompt_items`：一行保存一个 prompt，以及该 prompt 的完整图片数组 JSON。
2. `prompt_import_files`：记录文件哈希和导入状态，未变化的文件直接跳过。

图片没有独立查询、筛选或生命周期需求，总是随 prompt 一起读取。拆成 `prompt_images` 表会增加第二次 Turso 请求、JOIN/聚合、封面唯一约束和跨表事务，却没有当前收益，因此不建。

当前实现把全量数据传给 Client Component。86 条约 198KB，扩展到 1 万条会达到数十 MB。必须改为首屏 24 条，其余滚动加载；这比“JSON 还是 DB”更优先。

## 2. 对旧方案的修正

### 2.1 修正假的图片去重

旧 key 包含 `model_slug/item_id/position`：

```text
prompts/{model_slug}/{item_id}/{position}-{hash}.jpg
```

同一图片出现在不同条目时 key 仍不同，不能去重。

改为全局内容寻址：

```text
prompts/original/{完整 sha256}.{ext}
prompts/thumb/v1/{完整 sha256}.webp
```

相同原始字节天然得到相同 key。使用完整 SHA-256，不为节省几十个字符引入截断碰撞。缩略图路径带 `v1`；将来修改尺寸或编码参数时升为 `v2`，不覆盖 immutable 对象。

### 2.2 删除图片表与复杂发布事务

导入器先在事务外准备好一个 item 的所有图片，再以一次 upsert 写入完整 `images_json`。因此：

- 新条目不会出现“正文已发布、图片未完成”的中间状态。
- 旧条目在新版本准备失败时仍保持原样。
- 封面固定为数组第一张，不需要 `is_cover`、部分唯一索引和先清旧封面的更新顺序。
- 页面一次查询即可得到完整卡片和弹窗数据。

### 2.3 未注册模型直接报错

旧方案为未知模型自动生成 hash slug，会产生页面和导航都访问不到的“幽灵数据”。模型页面是产品能力，必须先注册再导入。

`MODEL_PROMPT_PAGES` 继续作为唯一注册表，并增加 `labels`：

```js
{
  slug: "gpt-image-2-5",
  key: "gptImage25",
  icon: "/icons/openai.png",
  labels: ["ChatGPT Image 2.5", "GPT Image 2.5"],
}
```

导入遇到未知 `model` 时打印文件名、item id 和原始 label，并让该文件失败。别名只能显式加入 `labels`，禁止静默 slugify。

### 2.4 不提前搭建缓存失效系统

当前 `next.config.mjs` 没有启用 Cache Components，因此本轮不为了数据页改变整个应用缓存模型。首屏和侧栏计数使用 `unstable_cache(..., { revalidate: 300 })`；最多延迟 5 分钟看到新内容。先不增加带密钥的失效 Route Handler、预热流程和告警链路。

如果以后后台发布要求“立即可见”，再增加 tag 失效入口。这是明确需求出现后的独立改动。

## 3. 数据模型

### 3.1 `prompt_items`

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | text PK | `{model_slug}:{source_id}` |
| `source_id` | text NOT NULL | 当前为 tweet id |
| `model_slug` | text NOT NULL | 注册表解析后的查询键 |
| `model_label` | text NOT NULL | 数据源原值，便于追溯 |
| `prompt` | text NOT NULL | 原文，不截断、不改写 |
| `prompt_type` | text NOT NULL | 默认 `text`；保留未来 JSON prompt 能力 |
| `title` | text | 可空，用于 alt/无障碍文案 |
| `author_name` | text NOT NULL | 作者显示名 |
| `author_handle` | text NOT NULL | 作者 handle |
| `source_url` | text NOT NULL | View on X 链接 |
| `view_count` | integer | 源数据浏览量；仅保存，当前不排序 |
| `published_at` | integer NOT NULL | `Date.parse()` 后的 epoch ms |
| `images_json` | text NOT NULL | 完整图片数组；第一张即封面 |
| `created_at` | text NOT NULL | 首次入库时间 |
| `updated_at` | text NOT NULL | 最近一次有效导入时间 |

唯一需要的分页索引：

```sql
CREATE INDEX idx_prompt_items_model_page
ON prompt_items(model_slug, published_at DESC, id DESC);
```

`id` 已包含模型和 source id，不再增加重复的 unique 索引。

`images_json` 格式：

```json
[
  {
    "hash": "完整 sha256",
    "displayKey": "prompts/original/{sha256}.jpg",
    "thumbKey": "prompts/thumb/v1/{sha256}.webp",
    "width": 1536,
    "height": 2048
  }
]
```

数据库只保存 object key，不保存 CDN 域名。读取时通过 `publicObjectUrl()` 生成 URL，切换域名不需要更新数据。

### 3.2 `prompt_import_files`

| 列 | 类型 | 说明 |
|---|---|---|
| `file_path` | text PK | 相对数据目录路径，不能只用 basename |
| `file_sha256` | text NOT NULL | 整个文件的完整 SHA-256 |
| `status` | text NOT NULL | `running` / `imported` / `failed` |
| `item_count` | integer NOT NULL | 成功发布数量 |
| `error` | text | 失败摘要 |
| `started_at` | text NOT NULL | 本轮开始时间 |
| `finished_at` | text | 完成时间 |

同路径、同哈希且状态为 `imported` 时直接跳过。文件是增量包，不是全量快照：文件里缺少某条数据绝不触发删库。

## 4. 图片处理

每张源图执行：

1. 下载超时 30 秒；网络错误、429、5xx 最多重试 3 次并退避。
2. 限制响应体大小，例如 20MB；不能只相信 `Content-Length`。
3. 用 Sharp 解码验证并限制总像素，格式只接受 JPEG、PNG、WebP、GIF。
4. 对原始字节计算完整 SHA-256，格式扩展名来自实际解码结果。
5. 原图按原始字节保存，避免 X 链接失效后永久丢失素材。
6. 生成 800px 宽 WebP 小图：自动旋转、禁止放大、quality 75。
7. 调用 S3 `objectExists()`；对象已存在则不重复上传。
8. 新对象写入：`Cache-Control: public, max-age=31536000, immutable`。

全局并发限制为 4，而不是“每个 item 并发 4”。否则多条 item 同时运行会把实际并发放大。任意一张必需图片失败时不发布该 item；已经上传的内容寻址对象可以保留，下次运行会直接复用。

`coverUrl` 必须能在源 `images` 中找到。导入器不能依赖原始数组顺序，必须执行固定归一化：

```js
const sourceImages = uniqueByUrl(item.images);
const cover = sourceImages.find((image) => image.url === item.coverUrl);
if (!cover) throw new Error("coverUrl is missing from images");
const orderedImages = [cover, ...sourceImages.filter((image) => image.url !== item.coverUrl)];
```

图片下载与内容 hash 去重也必须保持这个顺序：先处理封面，再处理其余图片；如果多条 URL 最终得到相同 hash，保留第一次出现的图片，因此封面不会在内容去重时被后面的重复图替换。封面下载失败则不发布整个 item，不能偷偷改用另一张图。

### 存储边界

Prompt 画廊本身是公开内容，因此首版复用现有公开 B2/CDN，并以 `prompts/` 前缀隔离即可。现在增加独立桶、独立凭据和第二套 storage client 只会扩大配置面，不能解决已有作品图片的公开性问题。

现有作品对象通过 `S3_PUBLIC_URL` 可匿名读取，而 `storage.js` 注释称其为私有，这两者矛盾。它是作品隐私策略问题，应单独处理；不要把修复责任错误地塞进 prompt 导入项目。

## 5. 导入规则

脚本：`scripts/import-prompt-items.mjs`

首版参数只保留：

```text
--dry-run
--file <relative-path>
--limit <n>       # 调试用；使用后不得把文件标记为 imported
--force           # 忽略文件账本，重新校验并处理
```

执行过程：

```text
1. 获取本机 lockfile；已有进程运行则退出非 0
2. 按相对路径排序扫描 data/**/*.json
3. 计算文件 hash，查询 prompt_import_files
4. 同 hash 已导入 → 跳过
5. 完整解析并校验文件；未知模型、重复 id、坏日期、空 prompt 直接报告
6. 标记文件 running
7. 对每个 item 准备全部图片
8. 一次 upsert 写入完整 prompt_items 行
9. 全部 item 成功后标记文件 imported；否则标记 failed 并退出非 0
10. 输出新增、更新、跳过、失败和上传复用统计
```

跨文件遇到同一个 `id`：

- 规范化后的正文、作者、来源和图片列表相同：允许重复；`view_count` 取较大值。
- 内容不同：报冲突并停止该文件，禁止用不可控的文件处理顺序静默覆盖。
- 真正需要修正历史数据时，必须同时清理所有相互冲突的归档副本，再使用 `--force`。单独修改其中一个文件仍会冲突，不能被称为修复。

脚本是幂等命令。先手动跑稳；在稳定数据来源和明确更新频率出现以前，不加 cron。

## 6. 读取与分页

### 6.1 服务端首屏

页面 Server Component 调用：

```js
listPromptPage(modelSlug, { limit: 24 })
```

只把首屏 24 条和 `nextCursor` 传给交互画廊。首屏内容仍进入服务端 HTML，有利于抓取和无 JavaScript 场景；Modal、复制、图片切换、滚动加载继续留在最小 Client Component。

### 6.2 Cursor

固定排序：

```sql
ORDER BY published_at DESC, id DESC
```

cursor 是 base64url 编码的 `[publishedAt, id]`。下一页使用行值比较：

```sql
WHERE model_slug = ?
  AND (published_at, id) < (?, ?)
ORDER BY published_at DESC, id DESC
LIMIT 25
```

取 25 条、返回 24 条，以多出的一条判断是否存在下一页。不查询 remaining，不做额外 count，不接受大于 48 的 limit。

公开接口：

```text
GET /api/prompts?model=gpt-image-2-5&cursor=...&limit=24
```

校验 model 必须存在于注册表，严格校验 cursor 类型和长度。响应只返回：

```json
{ "items": [], "nextCursor": "..." }
```

第二页以后可以返回公共 CDN 缓存头。客户端按 `id` 去重，IntersectionObserver 距离底部约 300px 时预加载，并提供失败后的重试按钮。

### 6.3 DTO

服务端解析 `images_json` 并返回：

```js
{
  id,
  title,
  prompt,
  promptType,
  modelLabel,
  modelIcon,
  sourceUrl,
  authorName,
  authorHandle,
  coverImageId: images[0].hash,
  images: [{ id, displayUrl, thumbUrl, width, height }],
}
```

- 网格使用 `images[0].thumbUrl` 和真实宽高比。
- 服务端和客户端都不再接收独立的 `coverUrl`；`images[0]` 是唯一封面来源，避免两个字段发生漂移。
- 弹窗主视图使用 `displayUrl`。
- 缩略条使用 `thumbUrl`。
- 图片选择状态使用 `id`，不能再比较 URL 字符串。
- `promptType=json` 且能解析时使用格式化 `<pre>`；解析失败安全回退为普通文本。
- 原生 `<img loading="lazy" decoding="async">` 足够，不把已生成的静态小图交给运行时图片优化器重复处理。

## 7. 侧栏与缓存

侧栏计数使用一次 `GROUP BY model_slug` 查询，不再逐个读 JSON 文件。只展示注册表中的模型，名称使用 `i18n 文案 ?? model_label`，图标缺失时使用通用图标。

缓存保持克制：

- 每个模型首屏 24 条：缓存 300 秒。
- 所有模型计数：一次 group 查询，缓存 300 秒。
- cursor API：数据库查询结果可通过 HTTP `s-maxage=300` 缓存。
- 不缓存全量列表，不做缓存预热，不新增立即失效接口。

先用真实生产延迟和命中率验证。如果 300 秒数据缓存没有带来收益，再考虑平台级远程缓存；不要提前引入 Redis/KV。

## 8. 实施顺序

1. 给 `storage.js` 增加可选上传 headers 和 `objectExists()`。
2. 在 `schema.js` 增加两张表，生成并应用开发库迁移。
3. 扩展模型注册表的 `labels`，实现严格 resolver。
4. 写导入脚本，先 `--dry-run`，再用当前 86 条文件真实导入。
5. 抽查原图、小图、宽高、封面顺序和 CDN 缓存头。
6. 将数据读取改为 Turso cursor 分页。
7. 将页面改为服务端首屏，把滚动加载留在 Client Component。
8. 侧栏改为一次 group count。
9. Prompt 页面从 `buildPrivateMetadata()` 改为 `buildPublicMetadata()`，补 canonical、语言 alternates，并把已注册模型路由加入 sitemap。
10. 测试通过后再导入其余文件。

不需要先做“20 张图片性能研究”才开工。现有数据足够验证第一版；导入日志直接记录下载、转换、上传耗时和字节数，比单独的研究脚本更接近真实管线。

## 9. 验收标准

- 首屏只返回 24 条，不再把全量 prompt 序列化到浏览器。
- 滚动到底部能稳定加载下一页，无重复、无漏项，顺序固定。
- 页面首次返回的 HTML 包含首屏卡片内容。
- Prompt 页面允许索引，canonical、英语/日语 alternates 和 sitemap 路由正确。
- 网格只加载 800px 小图；弹窗加载原图；多图切换使用稳定 id。
- 相同图片字节在不同条目中只对应一个 original key 和一个 thumb key。
- 重跑同一文件不下载、不上传、不写 item。
- 导入中断后重跑能继续，已发布 item 不损坏。
- 未注册模型、坏图片、超大响应、无封面、冲突数据均明确失败并返回非 0。
- 新对象返回一年 immutable 缓存头。
- 当前 86 条数据导入前后卡片数量、作者、来源链接、prompt 和图片数量一致。
- `eslint`、生产构建和 cursor 边界测试通过。

## 10. 本轮明确不做

- 搜索、FTS、分词。
- 模型聚合页和筛选器。
- 独立图片表。
- 独立 prompt 存储桶。
- 自动 cron、多主机分布式锁。
- 双档缩略图、1600px 有损主图。
- 管理后台和在线编辑。
- 为缓存增加 webhook、密钥和预热系统。

这些能力都可以在真实需求出现后基于现有原文和 object key 增量添加，不会阻塞第一版。

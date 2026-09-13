# 免费注册积分防滥用方案

> 状态：已实现，待配置 Disify Key 并部署
> 目标：用最少的代码阻止最低成本的批量注册，不追求完全防住所有攻击。
> 原则：允许用户注册；只控制每个邮箱身份和网络来源能否领取免费积分。

## 1. 当前问题

- 新用户注册后获得 10 个永久积分。
- Better Auth 只能阻止完全相同的邮箱重复注册。
- Gmail 的点号、`+tag` 和 `googlemail.com` 可以指向同一个邮箱，但现在会被当成不同用户。
- Magic Link 已有 Turnstile；Google 登录需要真实 Google 账号，当前不增加额外验证摩擦。
- 当前发放余额和写入积分流水是两笔独立操作，数据库瞬时失败时可能只完成其中一步。

第一版解决四个问题：

1. 同一个 Gmail 收件箱只能领取一次注册积分。
2. 常见一次性邮箱不能创建新账号。
3. 奖励占位、余额和流水保持一致。
4. 同一 IP 在滚动 24 小时内最多为 3 个账号领取注册积分。

## 2. 邮箱规范化

新增一个纯函数 `canonicalizeBonusEmail(email)`：

1. 去除首尾空格并转为小写。
2. 将 `googlemail.com` 映射为 `gmail.com`。
3. 所有域名都删除 local part 中第一个 `+` 及其后面的内容——`+tag` 是通用的子地址约定
   （Outlook/Yahoo/iCloud/自建域名邮箱都支持，不是 Gmail 独有），且只影响这里算出的防滥用哈希，
   不改变真正用于收信、登录的邮箱地址，不存在破坏邮箱语义的问题。
4. 只对 `gmail.com` 额外删除 local part 中的所有 `.`——只有 Gmail 把点号当无意义字符，
   其他域名的点号是地址的真实组成部分，不能动。

示例：

| 输入 | 规范化结果 |
|---|---|
| `a.b+test@gmail.com` | `ab@gmail.com` |
| `a.b@googlemail.com` | `ab@gmail.com` |
| `ab@gmail.com` | `ab@gmail.com` |
| `a.b+test@outlook.com` | `a.b@outlook.com` |
| `a.b@outlook.com` | `a.b@outlook.com` |

规范化结果不直接存入数据库。使用 HMAC-SHA256 生成不可读键：

```text
email_hash = HMAC-SHA256(SIGNUP_BONUS_SECRET, canonical_email)
```

环境变量：

```env
SIGNUP_BONUS_SECRET=
FREE_SIGNUP_BONUS_ENABLED=true
```

`SIGNUP_BONUS_SECRET` 上线后不能随意更换，否则旧邮箱占位会失效。

## 3. 一次性邮箱判断

使用 Disify 的单邮箱校验接口，不在项目中维护静态域名名单。必须从服务端调用：

```http
POST https://disify.com/api/email
X-Api-Key: ${DISIFY_API_KEY}
Content-Type: application/x-www-form-urlencoded

email=user%40example.com
```

使用 POST，避免邮箱出现在 URL、代理访问日志和错误追踪 URL 中。API Key 只保存在服务端环境变量：

```env
DISIFY_API_KEY=
```

Disify 会返回邮箱格式、DNS、一次性邮箱判断、置信度和信号。第一版使用保守规则：

```js
const shouldBlock =
  result.format === true &&
  result.disposable === true &&
  result.confidence >= 90;
```

只拦截置信度至少为 90 的明确结果，例如域名黑名单、MX 黑名单或已知别名账户命中。不要仅凭低置信度启发式信号拒绝注册，避免误伤正常邮箱。

命中后的行为：

- 在发送 Magic Link 前查询该邮箱是否已经存在。
- 已存在的用户不再调用 Disify，直接继续登录。
- 如果是新用户，调用 Disify；命中拦截规则时拒绝发送 Magic Link，并提示：`Temporary email addresses aren’t supported. Please use a permanent email address.`
- 被拒绝的新用户不写入用户表、积分账户或奖励 claim。
- 写一条不包含原始邮箱的结构化日志：`reason=disposable_email`、`confidence` 和 `signals`。

外部服务失败策略：

- 请求超时设置为约 2.5 秒，不在登录请求中重试。
- 遇到超时、网络错误、无效响应、`401`、`429` 或 `5xx` 时采用 fail-open：允许继续发送 Magic Link。
- 失败只写结构化告警，不向用户显示“邮箱无效”，避免把第三方故障伪装成用户错误。
- Disify 故障期间仍由 Turnstile、Gmail 规范化和数据库唯一约束限制滥用。
- 项目刚上线时不增加 Redis 缓存；请求量接近套餐限制后，再按 Disify 建议缓存域名结果。Gmail、Outlook 和 iCloud 等公共邮箱不能按域名缓存，因为同一域名下不同地址的别名判断可能不同。

隐私要求：

- Privacy 页面以通用方式说明邮箱可能用于验证和防止滥用，不公开列出具体服务商名称。
- 不把 Disify 的完整响应长期存入数据库。
- 日志不保存原始邮箱、完整 API 响应或 API Key。

## 4. 数据表

只新增一张表：

```sql
CREATE TABLE signup_bonus_claims (
  email_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_signup_bonus_claims_ip_time
ON signup_bonus_claims (ip_hash, created_at);
```

用途：

- `email_hash` 唯一约束保证同一个规范化邮箱只能领取一次。
- `user_id` 唯一约束保证一个用户只能领取一次。
- `ip_hash` 使用同一个 HMAC 密钥生成，不保存原始 IP。
- `amount=10` 表示成功领取，`amount=0` 表示被 IP 上限拒绝，防止补偿逻辑稍后误发。

## 5. 发放流程

一次性邮箱判断放在 Magic Link 请求进入注册流程之前；积分发放仅处理已经成功创建的用户。

`grantSignupBonus` 改为接收完整用户信息：

```js
grantSignupBonus({ id: userId, email })
```

执行顺序：

1. Magic Link 接口先校验邮箱格式和 Turnstile。
2. 查询该邮箱是否已有用户。
3. 已有用户直接继续发送 Magic Link。
4. 新用户通过服务端调用 Disify。
5. `disposable=true` 且 `confidence>=90` 时拒绝请求；API 失败时放行并记录告警。
6. 通过检查的新用户继续注册流程。
7. 用户创建后读取 Better Auth 解析的客户端 IP，并对邮箱和 IP 分别生成 HMAC。
8. 开启一个短事务，统计该 `ip_hash` 最近 24 小时内 `amount>0` 的 claim。
9. 未达到上限时插入 `amount=10` 的 claim；达到上限时插入 `amount=0` 的 claim 并创建 0 余额账户。
10. claim 插入冲突表示该邮箱或用户已经处理，创建 0 余额账户并结束。
11. 成功领取时给 `credit_accounts.permanent_balance` 增加 10。
12. 写入确定性 ID 的积分流水：`signup-bonus:{email_hash}`。
13. 提交事务。

奖励占位、账户余额和积分流水必须在同一个事务中。这里没有 IP 查询、计数或外部网络请求，事务很短。

只有 `FREE_SIGNUP_BONUS_ENABLED=true` 才发放免费积分；变量缺失或为其他值时允许注册但不发放。这样新代码早于数据库迁移或密钥配置上线时不会阻断登录。这个变量只作为部署保护和紧急止损开关，不做自动每日额度。

## 6. 注册失败补偿

Better Auth 的 `user.create.after` 在用户创建事务提交后执行，因此奖励失败不能回滚用户创建。

采用一个简单补偿：

- 注册 hook 正常调用一次 `grantSignupBonus`。
- 读取用户积分时，如果该用户没有 `credit_accounts` 行，从最近会话读取 Better Auth 已解析的 IP，再幂等调用一次 `grantSignupBonus`。
- 未获得奖励的重复邮箱创建一个 0 余额账户，避免以后每次读取都重复检查。

这样数据库短暂故障不会让正常用户永久丢失注册积分，也不需要队列或定时任务。

## 7. 已有数据

项目刚上线，迁移只做一次：

1. 查询 `credit_ledger.reason = 'signup_bonus'` 的用户。
2. 读取用户邮箱并计算 `email_hash`。
3. 插入 `signup_bonus_claims`，不修改现有余额。
4. 若规范化后发生冲突，保留最早领取的一条并记录迁移日志。

如果正式环境只有可删除的测试用户，可以清理测试账号后直接启用新逻辑，不需要复杂回填工具。

## 8. 暂时不做

- 不做永久 IP 封禁或“一 IP 一账号”。
- 不存原始 IP 或设备指纹。
- 不给 Google 登录增加 Turnstile。
- 不做延迟到账、审核状态或申诉流程。
- 不做自动每日免费积分预算。
- 不引入 Redis、队列、Worker 或除 Disify 以外的风控服务。

这些措施只有在真实数据证明存在对应滥用后再增加。

## 9. 验证

必须覆盖以下场景：

1. 普通新用户获得 10 积分，并产生一条注册奖励流水。
2. `a.b+1@gmail.com`、`ab@gmail.com`、`a.b@googlemail.com` 中只有第一个账号获得积分。
3. Outlook 等非 Gmail 邮箱的点号不被修改，但 `+tag` 会被去掉（`a.b+1@outlook.com` 与 `a.b@outlook.com` 归并为同一领取身份，`a.b` 与 `ab` 仍是两个不同身份）。
4. Disify 返回 `disposable=true` 且 `confidence>=90` 时，新用户无法请求 Magic Link，也不会创建用户或积分记录。
5. 已经存在的一次性邮箱用户仍可正常请求 Magic Link 登录。
6. Disify 返回低于 90 的置信度时不拒绝注册。
7. Disify 超时、`429` 或 `5xx` 时仍可注册，且记录告警。
8. 普通邮箱不会被一次性邮箱规则误拦截。
9. Disify API Key 不会进入客户端 bundle 或日志。
10. 同一个用户重复执行发放函数不会重复加积分。
11. 奖励事务任一步失败时，claim、余额和流水都不产生部分写入。
12. 注册 hook 失败后，第一次读取积分能够补发。
13. 关闭 `FREE_SIGNUP_BONUS_ENABLED` 后仍可注册，但不会获得积分。
14. 同一 IP 前 3 个新账号正常领取，第 4 个账号可注册但获得 0 积分。
15. 第 4 个账号之后触发积分补偿也不会获得奖励。
16. 无法可信解析 IP 时放行奖励并记录告警，不把所有用户归入同一个 IP。

## 10. 后续升级条件

只有出现可量化的损失后才升级：

- 新的一次性邮箱漏过：先查看 Disify 的返回信号和置信度，确认是否需要调整阈值或向 Disify 提交该服务商。
- 同 IP 批量账号仍明显：先核对 Cloudflare、Coolify 和 Traefik 的真实 IP 链路，再评估是否降低上限。
- Google 账号批量注册：评估是否给 `/sign-in/social` 增加 Turnstile。
- 免费奖励支出明显异常：增加告警或数据库预算计数器。

该版本主要阻止 Gmail 零成本别名和常见一次性邮箱注册。它挡不住自有域名 catch-all、住宅代理或大量真实 Google 账号，但实现简单、正常用户摩擦低，适合项目刚上线时使用。

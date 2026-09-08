# Research: freetexttoimage.com SEO 关键词漏斗（英语 / 全球市场）

> 研究日期：2026-09-08（UTC；日期由 [UTC Time Now](https://www.utctime.net/) 查询）  
> 目标站点：<https://freetexttoimage.com/>  
> 计划项目路径：`heroui/docs/seo-keyword-funnel.md`  
> 数据说明：本研究没有接入 Google Keyword Planner、Ahrefs、Semrush 等付费关键词库，因此**不提供或推测精确搜索量、CPC、关键词难度**。文中的“需求/竞争高、中、低”是基于本次英语 SERP 样本中出现的页面类型、品牌强度、结果重复度及查询修饰词作出的定性判断，不等同于工具指标。

## Summary

英语 SERP 的核心头部词已经被 Canva、Adobe、Bing、DeepAI、Pixlr、Leonardo 等强域名占据；新站不宜只押注 `AI image generator`，更可行的入口是“低摩擦属性（free / no sign up）+ 明确任务（thumbnail / product photo / social media）+ 教程与 prompt 示例”的长尾组合。当前最大前置风险是：目标站抓取失败，而且在本次 `site:` 与品牌域名样本搜索中未看到目标域结果，因此应先验证可访问性、索引、canonical、robots 与 Search Console，再扩内容。

## Findings

1. **Claim：目标站现有定位和页面文案无法被本次研究可靠审计。** 直接抓取 `https://freetexttoimage.com/` 返回网络环境的 fake-IP/SSRF 拦截；对域名、品牌短语及 `site:freetexttoimage.com` 的三组样本搜索没有返回目标域，反而持续返回 Canva、Adobe、Perchance、DeepAI、PicLumen、Leonardo 等。**这只能说明本次样本中“未发现”，不能证明 Google 完全未收录。** **Sources:** [目标站](https://freetexttoimage.com/), [Canva](https://www.canva.com/ai-image-generator/), [Adobe](https://www.adobe.com/products/firefly/features/text-to-image.html), [DeepAI](https://deepai.org/machine-learning-model/text2img). **Support:** 直接证据（抓取错误及 SERP 样本）+ 研究者解释。 **Confidence:** 中。
2. **Claim：头部 SERP 的标准页面是“可立即操作的工具落地页”，并将免费、简单 prompt、风格/比例控制与具体产出同时写入文案。** Adobe 页面覆盖 text prompt、风格、色彩、构图、比例，以及 social posts、banners、Reels、TikToks、product shots 等任务；Canva、Pixlr、DeepAI 等也以生成器页面竞争。**Sources:** [Adobe Text to Image](https://www.adobe.com/products/firefly/features/text-to-image.html), [Canva AI Image Generator](https://www.canva.com/ai-image-generator/), [Pixlr Image Generator](https://pixlr.com/image-generator/), [DeepAI](https://deepai.org/machine-learning-model/text2img). **Support:** 直接证据。 **Confidence:** 高。
3. **Claim：`no sign up`、`unlimited`、`commercial use`、`no watermark` 是强转化修饰词，但也是高风险事实声明。** 多个 SERP 页面把这些词写入标题/H1；各家限制并不一致，例如有的称无需注册，有的仍有每日 token、每日图片数或账户门槛。目标站只有在产品、条款与实际体验完全支持时才可使用这些词。**Sources:** [DeepAI](https://deepai.org/machine-learning-model/text2img), [Creen](https://www.creen.ai/text-to-image), [Free.ai](https://free.ai/image/text-to-image/), [TextToImg.org](https://texttoimg.org/), [Adobe](https://www.adobe.com/products/firefly/features/text-to-image.html). **Support:** 直接证据 + 研究者解释。 **Confidence:** 高。
4. **Claim：教程型需求适合承接 ToFu，并向工具页导流。** 当前结果中存在 `how to write AI image prompts`、prompt examples、prompt structure 等教程；Adobe 和 Meta 都发布了 prompt 示例/技巧内容，说明“先学习、再生成”的用户路径可被内容集群覆盖。**Sources:** [Adobe prompt examples](https://www.adobe.com/learn/express/web/generative-ai-text-prompt-examples), [Meta AI prompt tips](https://ai.meta.com/learn/ai-creativity/prompts-for-ai-images-10-examples-and-tips-for-better-results/), [Morphic guide](https://morphic.com/resources/how-to/how-to-make-an-ai-image). **Support:** 直接证据。 **Confidence:** 高。
5. **Claim：使用场景页是从泛工具词避开强品牌竞争的主要机会。** SERP 已出现专门的 AI thumbnail、product photography、social media image 页面，证明任务式页面符合搜索结果形态；但它们同样有 Canva、Adobe 等强竞争者，必须展示真实样例、尺寸模板、步骤和 CTA，而不是换词复制首页。**Sources:** [Canva AI Thumbnail Maker](https://www.canva.com/ai-thumbnail-maker/), [Adobe AI Thumbnail Generator](https://www.adobe.com/express/create/ai/thumbnail), [Pebblely Product Photography](https://pebblely.com/), [Hotpot Social Media Graphics](https://hotpot.ai/social-media-graphics). **Support:** 直接证据 + 研究者解释。 **Confidence:** 高。
6. **Claim：内部链接应由教程/比较页指向最匹配的工具或场景页，并采用描述性 anchor。** Google 明确建议用可抓取链接、简洁且相关的 anchor，并用内部链接交叉引用站内页面。**Sources:** [Google link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). **Support:** 直接证据。 **Confidence:** 高。
7. **Claim：批量创建近义词薄页会造成蚕食和质量风险。** Google 建议内容首先服务用户而非操纵排名；因此 `text to image`、`text to picture`、`words to image` 应在一个主工具页覆盖，只有搜索任务和页面体验真正不同（如 thumbnail、product photo）时才拆页。**Sources:** [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). **Support:** 官方原则 + 研究者推论。 **Confidence:** 高。

## 核心种子词

| 种子词 | 词型 | 中文意图 | 定性需求 | 定性竞争 | 建议主归属 |
|---|---|---|---|---|---|
| `AI image generator` | 头部词 | 找 AI 图片生成工具 | 高 | 高 | 首页 / 主工具页 |
| `text to image` | 头部词 | 把文字描述转换为图片 | 高 | 高 | 主工具页 |
| `text to image AI` | 头部词 | 寻找文字生图 AI | 高 | 高 | 主工具页 |
| `free AI image generator` | 头部词 | 免费试用/使用生成器 | 高 | 高 | 主工具页（仅在确实免费时） |
| `AI art generator` | 头部词 | 创作艺术风格图片 | 高 | 高 | `/ai-art-generator/` 或主工具页区块 |
| `prompt to image generator` | 中尾词 | 输入 prompt 直接出图 | 中 | 中 | 主工具页 |
| `AI picture generator` | 中尾词 | 生成一般图片/照片 | 中 | 中高 | 主工具页同义覆盖 |
| `free text to image generator no sign up` | 长尾词 | 无注册、低摩擦立即生成 | 中高 | 高 | 主工具页（必须事实成立） |
| `AI image prompt generator` | 中尾词 | 先生成/优化生图提示词 | 中 | 中 | 独立辅助工具或教程 |
| `AI image generator for [use case]` | 模板长尾 | 为特定任务生成素材 | 中 | 中 | 场景落地页集群 |

## 关键词漏斗与主题集群

### ToFu：信息认知

#### 集群 A：原理、入门与安全

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `what is text to image AI`; `what is an AI image generator` | 问题型长尾 | 了解文字生图是什么 | 信息型 | 博客：**What Is Text-to-Image AI? A Beginner’s Guide** | P2 |
| `how does text to image AI work`; `how do AI image generators work` | 问题型长尾 | 了解模型大致原理 | 信息型 | 博客/图解：**How AI Turns Text Into Images** | P2 |
| `how to create AI images`; `how to make AI art` | 中尾词 | 学习从零生成图片 | 信息→使用 | 教程：**How to Create an AI Image in 5 Steps** | P1 |
| `are AI generated images copyrighted`; `can I use AI images commercially` | 问题型长尾 | 判断版权/商用风险 | 信息→商业评估 | 政策说明 + 博客：**Can You Use AI Images Commercially?**（需法务审阅） | P1 |
| `is AI image generation safe`; `are AI image generators private` | 问题型长尾 | 关心内容安全和 prompt 数据 | 信息→信任 | 信任中心：**AI Image Privacy & Safety Explained** | P2 |
| `AI generated image examples`; `text to image examples` | 长尾词 | 先看效果再决定是否使用 | 浏览/信息 | 可索引 Gallery：**Text-to-Image Examples and Prompts** | P1 |

#### 集群 B：Prompt 教育

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `AI image prompts`; `AI art prompts` | 头部/中尾词 | 寻找可直接使用的提示词 | 信息型 | Prompt Hub：**AI Image Prompts: 100+ Tested Ideas** | P1 |
| `how to write AI image prompts`; `how to prompt an AI image generator` | 问题型长尾 | 学习 prompt 写法 | 信息→使用 | 指南：**How to Write Better AI Image Prompts** | P1 |
| `text to image prompt examples`; `best prompts for AI images` | 长尾词 | 复制优秀示例 | 信息→使用 | 示例库：**50 Text-to-Image Prompt Examples** | P1 |
| `AI photo prompts`; `photorealistic AI prompts` | 中尾词 | 生成逼真照片 | 信息→使用 | 集群页：**Photorealistic AI Prompts: Camera, Light & Style** | P1 |
| `negative prompt examples`; `what is a negative prompt` | 问题型长尾 | 了解如何排除瑕疵 | 信息型 | 教程：**Negative Prompts Explained + Examples**（仅产品支持时 CTA） | P2 |
| `AI art style prompts`; `cinematic AI image prompts`; `anime AI prompts` | 长尾词 | 按风格找提示词 | 信息→使用 | 3 个有独立样例的风格指南，先做综合页再按数据拆分 | P2 |

### MoFu：方案比较 / 使用场景

#### 集群 C：选择、比较与替代方案

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `best AI image generator`; `best text to image AI` | 头部比较词 | 比较工具质量和功能 | 商业调研 | 客观榜单：**Best AI Image Generators Compared**，披露评测方法与本站关系 | P2 |
| `best free AI image generator`; `free text to image AI` | 中尾比较词 | 比较免费方案 | 商业调研 | 比较页：**Best Free Text-to-Image Tools: Limits Compared** | P1 |
| `AI image generator no sign up`; `AI image generator without login` | 长尾商业词 | 寻找无需账户的工具 | 商业→交易 | 功能页/比较页；若本站支持，主工具页直接回答 | P0 |
| `unlimited AI image generator`; `free unlimited text to image` | 长尾商业词 | 规避次数限制 | 商业→交易 | 定价/限制透明页，只有真正无限时优化 | P2 / 条件式 |
| `AI image generator without watermark` | 长尾商业词 | 需要无水印下载 | 商业→交易 | FAQ + 输出说明，必须与真实下载一致 | P1 / 条件式 |
| `AI image generator for commercial use`; `royalty free AI image generator` | 长尾商业词 | 寻找可商用输出 | 商业→交易 | License 页面 + 场景解释；避免无依据“royalty-free” | P1 / 条件式 |
| `Canva AI image generator alternative`; `Adobe Firefly alternative`; `Midjourney alternative` | 竞品长尾 | 寻找更便宜/更简单替代品 | 商业调研 | 单一综合页先做：**AI Image Generator Alternatives: Features & Trade-offs**；有真实对比数据后再拆 | P2 |
| `text to image AI comparison`; `free vs paid AI image generator` | 长尾词 | 比较免费和付费差异 | 商业调研 | 对比指南：质量、速度、限制、权利、隐私 | P2 |

#### 集群 D：创作者与营销场景

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `AI image generator for social media`; `AI social media image generator` | 长尾词 | 为社媒帖子生成图片 | 商业→使用 | 场景页：**AI Social Media Image Generator**，含 1:1、4:5、9:16 模板 | P1 |
| `AI YouTube thumbnail generator`; `generate YouTube thumbnail with AI` | 长尾词 | 生成视频缩略图 | 商业→使用 | 场景页：**AI YouTube Thumbnail Generator from Text** | P1 |
| `AI Instagram post generator`; `AI image generator for Instagram` | 长尾词 | 生成 Instagram 素材 | 商业→使用 | 场景页：**Create Instagram Images with AI** | P2 |
| `AI blog image generator`; `AI featured image generator` | 长尾词 | 生成博客封面/配图 | 商业→使用 | 场景页：**AI Blog Image & Featured Image Generator** | P1 |
| `AI ad creative generator`; `AI image generator for ads` | 长尾词 | 生成广告创意图 | 商业→使用 | 场景页：**Generate Ad Creative Images with AI** | P2 |
| `AI presentation image generator` | 长尾词 | 给演示文稿生成插图 | 商业→使用 | 场景页：**AI Images for Presentations** | P2 |

#### 集群 E：电商、品牌与设计场景

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `AI product image generator`; `AI product photo generator` | 中尾词 | 为商品生成照片 | 商业→使用 | 场景页：**AI Product Image Generator**；若不能上传产品图，应明确仅生成概念图 | P1 |
| `AI background generator for product photos` | 长尾词 | 替换/创建产品背景 | 商业→使用 | 仅当有参考图/编辑能力时建工具页，否则写教程 | P2 / 条件式 |
| `AI logo generator from text` | 长尾词 | 从品牌描述生成 logo | 商业→使用 | 仅功能真实支持时建页；否则不抢该词 | P2 / 条件式 |
| `AI poster generator from text`; `AI flyer generator` | 长尾词 | 生成海报/传单 | 商业→使用 | 场景页，必须验证文字渲染能力并展示真实样例 | P2 |
| `AI book cover generator`; `AI album cover generator` | 长尾词 | 生成封面概念图 | 商业→使用 | 先做综合 **AI Cover Image Generator**，按 GSC 数据决定拆分 | P2 |
| `AI game asset generator`; `AI character art generator` | 长尾词 | 生成游戏素材/角色概念 | 商业→使用 | Gallery + 场景指南；注明一致性与权利限制 | P3 |

### BoFu：工具使用 / 商业转化

#### 集群 F：核心生成器与低摩擦交易词

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `AI image generator`; `free AI image generator` | 头部词 | 立即打开生成器 | 交易型 | 首页或 `/ai-image-generator/`：工具首屏 + 样例 + 限制 + FAQ | P0 |
| `text to image`; `text to image generator`; `text to image AI` | 头部词 | 输入文字立即生成图片 | 交易型 | **唯一主工具 canonical 页**；不要为三个近义词各建薄页 | P0 |
| `generate image from text`; `create image from text`; `turn words into images` | 动词长尾 | 立即执行文字生图 | 交易型 | 主工具页同义覆盖 + 操作步骤 | P0 |
| `prompt to image generator`; `text prompt image generator` | 中尾词 | 用 prompt 出图 | 交易型 | 主工具页同义覆盖 | P0 |
| `online text to image generator`; `browser AI image generator` | 长尾词 | 无需安装、浏览器中使用 | 交易型 | 主工具页 FAQ / benefit 区块 | P1 |
| `free text to image generator no sign up`; `instant AI image generator no login` | 长尾词 | 不注册立即生成 | 强交易型 | 主工具 title/H1/CTA，仅在真实体验满足时使用 | P0 / 条件式 |
| `AI image generator free no watermark`; `download AI image free` | 长尾词 | 免费生成并下载无水印图片 | 强交易型 | 下载说明 + FAQ，仅在事实成立时使用 | P1 / 条件式 |
| `high resolution AI image generator`; `4K AI image generator` | 长尾词 | 获取高分辨率输出 | 强交易型 | 功能页 / 定价页；只写实际输出规格 | P2 / 条件式 |

#### 集群 G：输出风格与规格

| 英文关键词 / 关键词组 | 词型 | 中文意图说明 | 搜索意图 | 建议页面类型 / 内容标题 | 优先级 |
|---|---|---|---|---|---|
| `AI photo generator from text`; `realistic AI image generator` | 中尾词 | 直接生成逼真照片 | 交易型 | `/ai-photo-generator/`，有独立风格预设与样例才拆页 | P1 |
| `AI art generator from text`; `free AI art generator` | 中尾词 | 直接生成艺术图 | 交易型 | `/ai-art-generator/`，展示风格选择 | P1 |
| `anime AI image generator`; `cartoon AI image generator` | 长尾词 | 立即生成动漫/卡通图 | 交易型 | 风格落地页，前提是对应 preset 可直接启动 | P2 |
| `landscape AI generator`; `fantasy AI art generator` | 长尾词 | 生成特定题材 | 交易型 | 优先 Gallery/filter URL，不急于创建薄落地页 | P3 |
| `square AI image generator`; `16:9 AI image generator`; `portrait AI image generator` | 规格长尾 | 按比例生成图片 | 交易型 | 主工具 ratio 控件可索引说明；不建议每个比例独立 URL | P2 |
| `AI image generator PNG`; `JPG AI image generator` | 规格长尾 | 需要指定下载格式 | 交易型 | 主工具 FAQ；仅支持时覆盖 | P3 |

## 建议信息架构与落地页 / 博客集群

### P0/P1 落地页

1. `/ai-image-generator/`（或首页作为唯一 canonical 主工具页）  
   主词：`AI image generator`, `text to image`, `free AI image generator`, `generate image from text`。
2. `/ai-art-generator/`  
   只有存在可直接选择的艺术风格、独立样例和用户体验时创建。
3. `/ai-photo-generator/`  
   聚焦 photorealistic 输出、光线/镜头提示、真实样例。
4. `/use-cases/social-media-images/`
5. `/use-cases/youtube-thumbnails/`
6. `/use-cases/blog-images/`
7. `/use-cases/product-images/`  
   若产品只支持纯文字生图，不应声称能保留上传商品的一致外观。
8. `/prompts/`  
   可筛选 prompt hub；每个例子应含 prompt、实际输出、模型/参数（如可披露）和“Use this prompt”深链。
9. `/commercial-use/`、`/privacy/`、`/pricing/` 或 `/limits/`  
   用明确、可核验语言回答商用、数据、额度、水印和注册要求。

### 博客集群

- Pillar：**How to Create AI Images from Text: Complete Beginner’s Guide**
  - **How to Write Better AI Image Prompts**
  - **50 Text-to-Image Prompt Examples**
  - **Photorealistic AI Prompts**
  - **Negative Prompts Explained**（功能相关时）
- Pillar：**Best Free AI Image Generators Compared**
  - **Free vs Paid AI Image Generators**
  - **Do AI Image Generators Require Sign-up?**
  - **Can You Use AI-Generated Images Commercially?**
  - **AI Image Generator Privacy Checklist**
- Pillar：**AI Images for Content Marketing**
  - YouTube thumbnail prompts
  - Blog featured-image prompts
  - Social media image sizes and prompts
  - Product-image prompt examples

## 内部链接路径

```text
首页
└── 主工具页 /ai-image-generator/
    ├── /ai-photo-generator/
    ├── /ai-art-generator/
    ├── /use-cases/social-media-images/
    │   └── 博客：social media sizes + prompts
    ├── /use-cases/youtube-thumbnails/
    │   └── 博客：YouTube thumbnail prompt examples
    ├── /use-cases/blog-images/
    ├── /use-cases/product-images/
    ├── /prompts/
    │   ├── photorealistic prompts
    │   ├── art-style prompts
    │   └── marketing prompts
    └── /commercial-use/ + /privacy/ + /pricing-or-limits/

每篇教程/比较页
├── 上链到所属 pillar
├── 情境深链到最匹配的场景页
└── CTA 深链到工具页（可预填 prompt / style / ratio 时最佳）
```

推荐 anchor 应自然描述目标，例如 `create a YouTube thumbnail from text`、`try the text-to-image generator`；不要让所有链接都重复 `free AI image generator`。面包屑、正文链接与相关内容模块共同保证页面不成为孤岛。

## 推荐 Title / Meta 示例

> 下列属性词必须按产品真实能力删改；特别是 Free、No Sign-up、Unlimited、No Watermark、Commercial Use 与 4K。

### 主工具页

- **Title：** `Free AI Image Generator: Create Images from Text | FreeTextToImage`
- **Meta：** `Turn a text prompt into an AI image online. Choose a style and aspect ratio, generate your image, and download the result. Try FreeTextToImage.`
- 若无需注册属实，可测试：`Free Text-to-Image Generator — No Sign-up | FreeTextToImage`

### Prompt Hub

- **Title：** `100+ AI Image Prompts and Text-to-Image Examples`
- **Meta：** `Explore practical AI image prompts for photos, art, social posts, thumbnails, and product concepts. Copy a prompt and create your own image.`

### YouTube 场景页

- **Title：** `AI YouTube Thumbnail Generator from Text | FreeTextToImage`
- **Meta：** `Create YouTube thumbnail concepts from a text prompt. Generate 16:9 visuals, explore styles, and refine your prompt online.`

### Product 场景页

- **Title：** `AI Product Image Generator from Text | FreeTextToImage`
- **Meta：** `Generate product-image concepts from a description. Explore backgrounds, compositions, and ad-ready aspect ratios with AI.`

### 比较页

- **Title：** `Best Free AI Image Generators: Features and Limits Compared`
- **Meta：** `Compare free AI image generators by sign-up requirements, limits, styles, downloads, privacy, and commercial-use terms.`

## 90 天内容优先顺序

### 第 1–2 周：技术与事实基线（P0）

- 人工验证全球可访问性、HTTP 状态、渲染、robots.txt、XML sitemap、canonical、noindex、移动端和核心生成流程。
- 在 Google Search Console / Bing Webmaster Tools 验证域名、提交 sitemap、检查 URL 和索引状态。
- 确定唯一主工具 URL；首页与工具页若功能重复，二选一作为 canonical，不要互相竞争。
- 建立可公开核验的功能矩阵：是否免费、是否注册、额度、尺寸、格式、水印、数据保留、商用条款、安全限制。文案只能基于此矩阵。
- 完成主工具页 title、H1、简短说明、操作步骤、真实输出 Gallery、FAQ 与 Product/SoftwareApplication 结构化数据（仅按页面可见事实标注）。

### 第 3–4 周：转化长尾（P0/P1）

- 发布或完善主工具页，覆盖 `text to image` 同义词但保持自然语言。
- 若事实成立，优先强化 `no sign up`、`no watermark`、`commercial use` 中最有差异化的一项；不应同时堆叠未经验证的承诺。
- 发布 `/prompts/`、**How to Write Better AI Image Prompts**、**50 Text-to-Image Prompt Examples**。
- 为每篇内容加入可预填 prompt 的工具 CTA，并记录 generate-start / generate-success / download 事件。

### 第 5–8 周：高价值场景（P1）

- 按产品匹配度依次发布 YouTube thumbnail、social media、blog featured image、product concept 四个场景页。
- 每页至少包含：独立任务说明、推荐比例、5–10 个原创 prompt、真实生成结果、局限、FAQ、直接启动工具的 CTA。
- 发布 commercial-use / privacy / limits 页面，供所有落地页引用。
- 开始 GSC 查询归类：工具词、免费修饰词、prompt 词、场景词；根据 impressions 而非猜测决定后续拆页。

### 第 9–12 周：比较与优化（P2）

- 发布一篇方法透明的免费工具比较页；逐项复核竞品当前注册、额度、输出权利并标注检查日期。
- 根据真实查询和转化数据，只扩展 1–2 个风格页（photo/art/anime）或任务页，不批量铺页。
- 合并零展示的高度重叠页；为有 impressions 但 CTR 低的页面测试 title/meta。
- 更新 Gallery，展示失败边界和 prompt 改进过程，以提升可信度与实用性。
- 90 天判断指标：可索引页数量与有效索引率、非品牌 impressions、工具页 CTR、生成成功率、内容→生成器点击率、下载/付费转化（若有），而非只看排名。

## 关键词蚕食与过度堆砌风险

| 风险 | 严重度 | 典型冲突 | 控制措施 |
|---|---|---|---|
| 首页与工具页争同一主词 | 高 | `/` 与 `/ai-image-generator/` 都以 `AI image generator` 为 H1/canonical | 选定唯一主工具 URL；另一页承担品牌/导航角色并明确 canonical 与内部链接中心 |
| 同义词薄页 | 高 | `/text-to-image/`、`/text-to-picture/`、`/words-to-image/` 内容近似 | 合并至一个工具页，在正文自然覆盖同义表达 |
| “免费”修饰词拆页 | 高 | free、no login、unlimited、no watermark 各建一页 | 用主工具 FAQ/限制表集中回答；只有独立体验或条款才拆页 |
| 场景页模板化 | 高 | thumbnail、Instagram、blog 页只替换名词 | 必须有任务专属比例、prompt、真实输出、步骤与限制，否则不发布 |
| Prompt 文章相互抢词 | 中 | `AI image prompts` 与 `text to image prompt examples` 两篇高度重叠 | `/prompts/` 做 hub；子页按清晰风格/任务划分并互链 |
| 竞品替代页泛滥 | 中 | 每个品牌一页但没有真实测试 | 先做一篇综合比较；仅在有一手对比、稳定需求时拆品牌页 |
| Title/H1 堆砌 | 高 | `Free AI Image Generator Text to Image Free No Signup Unlimited` | Title 只保留主词 + 一个真实差异点 + 品牌；H1 面向用户可读性 |
| 不实商业声明 | 高 | 无依据使用 unlimited、royalty-free、commercially safe | 与产品、定价、ToS 和隐私政策逐条核对；加“as of”日期与清晰限制 |
| 搜索导向的批量 AI 内容 | 高 | 无实测图片、无作者判断的成百 prompt 页面 | 每页加入原创输出、测试条件、编辑选择、失败示例和明确受众；遵循 people-first 原则 |

## Contradictions

- **“Free / unlimited / no sign-up”定义不一致。** DeepAI 的搜索文案称核心功能无需注册；Creen 称选定模型有很宽松的免费额度并将其描述为“实际无限”；Free.ai 明确给出访客每日 token；TextToImg.org 则明确每天 5 张。因而 SERP 标题中的 `unlimited` 不能直接视为相同产品承诺。来源：[DeepAI](https://deepai.org/machine-learning-model/text2img)、[Creen](https://www.creen.ai/text-to-image)、[Free.ai](https://free.ai/image/text-to-image/)、[TextToImg.org](https://texttoimg.org/)。
- **目标域索引状态无法定论。** 样本 `site:` 查询未返回目标域，但 source-check 对“未收录”判断给出 unclear；搜索样本不是完整 Google Search Console 数据。因此只记录“本次未发现”，不宣称“未索引”。
- **第三方对竞品价格、额度、质量的说法变化快且可能带推广倾向。** 本研究没有采用 ZSky、Toolify、Musely 等页面中的竞品定价或内部 benchmark 作为策略依据。

## Missing evidence

- 无法读取目标站当前 HTML、title、meta、H1、正文、导航、robots、sitemap、canonical、schema、HTTP 状态和实际生成器能力。
- 没有 Search Console / Bing Webmaster Tools 的索引、查询、国家、设备与 CTR 数据。
- 没有第一方产品事实：模型、速度、输出分辨率、额度、注册、水印、下载格式、隐私、prompt 保留、商用许可、定价。
- 没有可靠关键词工具的精确搜索量、趋势、CPC 或 KD；本文优先级是定性规划，发布后须用 GSC 与合规关键词工具校准。
- 没有对目标站与竞品使用同一 prompt 的画质、速度、文字渲染、prompt adherence 实测，故不建议写“best”“fastest”“higher quality”等比较级声明。
- 本次 SERP 由 AnySearch 样本提供，并非指定国家/设备的原生 Google SERP；排名与结果会因地点、时间、个性化和索引变化。

## Sources

### Kept

- [FreeTextToImage](https://freetexttoimage.com/) — 目标站；本次抓取受网络环境限制。
- [Canva AI Image Generator](https://www.canva.com/ai-image-generator/) — 强域名工具页与“prompt + style + aspect ratio”结果形态证据。
- [Adobe Text to Image](https://www.adobe.com/products/firefly/features/text-to-image.html) — 官方竞品，覆盖功能、使用场景、步骤与免费账户说明。
- [DeepAI Text to Image](https://deepai.org/machine-learning-model/text2img) — SERP 中持续出现的老牌直接工具页及 no-sign-up 定位。
- [Pixlr Image Generator](https://pixlr.com/image-generator/) — 直接工具页与 photo/art 文案证据。
- [Creen Text to Image](https://www.creen.ai/text-to-image) — free/no-sign-up/unlimited 修饰词竞争证据，同时显示限定模型与额度语义。
- [Free.ai Text to Image](https://free.ai/image/text-to-image/) — 公开访客 token 与商用/水印声明的差异化案例。
- [TextToImg.org](https://texttoimg.org/) — “免费”但每日 5 张，支持免费声明口径不一致的结论。
- [Canva AI Thumbnail Maker](https://www.canva.com/ai-thumbnail-maker/) — YouTube thumbnail 独立任务页 SERP 证据。
- [Adobe AI Thumbnail Generator](https://www.adobe.com/express/create/ai/thumbnail) — thumbnail 场景竞争证据。
- [Pebblely](https://pebblely.com/) — AI product photography 专用场景证据。
- [Adobe prompt examples](https://www.adobe.com/learn/express/web/generative-ai-text-prompt-examples) — 官方 prompt 教育内容证据。
- [Meta AI prompt tips](https://ai.meta.com/learn/ai-creativity/prompts-for-ai-images-10-examples-and-tips-for-better-results/) — 权威 prompt 教程需求证据。
- [Google link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) — 内部链接与 anchor 建议的一手依据。
- [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — 防止薄页、批量搜索导向内容的官方原则。

### Rejected / deprioritized

- ZSky “Best Free Adobe Firefly Alternative” — 自家替代品营销页，竞品额度/价格与质量判断存在偏向且可能过期。
- Toolify “Adobe Firefly vs Microsoft Designer vs Canva AI” — 二手聚合内容，评测方法与时效不足。
- Musely Text-to-Image 页面 — 自报内部 benchmark 和竞品数据，缺少独立验证。
- Facebook/Quora 搜索结果 — 可作为语言发现，但不作为决策性事实依据。
- SEO 博客对固定内部链接数量的建议 — 非 Google 官方且机械阈值不适合本站，未采纳。

## Next steps

1. 在可直连环境完成目标站技术审计，并把 HTML、robots.txt、sitemap 与 Search Console Coverage/Performance 导出交叉验证；这是上线内容前的最高优先事项。
2. 获取产品负责人签字确认的“免费/注册/额度/水印/许可/隐私/分辨率”事实矩阵，随后再定最终 title 与 BoFu 页面。
3. 接入 Google Keyword Planner、Ahrefs 或 Semrush，以英语全球为初筛、再按美国/英国/加拿大/澳大利亚拆分；用真实 volume、KD、CPC 和 SERP feature 校准 P0–P3。
4. 用同一组 20 个 prompt 对目标工具与 3–5 个竞品做可复现测试，形成有一手证据的比较页与 Gallery。

## 交付说明

- 研究产物文件：`/Users/kuangshuhan/.pi/agent/sessions/--Users-kuangshuhan-Desktop-toRemove-heroUI-test--/subagent-artifacts/outputs/fab0ecf7-daaa-4971-9c20-ee9d1617ad3c/research.md`
- 预期项目落点：`heroui/docs/seo-keyword-funnel.md`；本执行环境的 authoritative output override 要求只写研究产物路径，因此未直接修改项目文件。
- 研究方法：3 组目标域/品牌/SERP 查询、3 组竞品与场景查询、3 组 prompt/Google 官方原则查询；优先保留官方竞品页与 Google 文档；对决策性 SERP 结论运行 source-check，结果对“未收录”仅为 unclear，因此已降级表述。
- 主要机会：低摩擦条件词（经事实确认后）、prompt 教育、YouTube/blog/social/product 等任务长尾，以及“内容 → 预填 prompt → 生成”内部转化路径。
- 主要限制：目标站不可抓取、无 GSC、无付费关键词工具、SERP 非原生指定地区 Google、没有产品功能和竞品实测数据。

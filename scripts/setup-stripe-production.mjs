#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";

const MANAGED_BY = "freetexttoimage_setup";
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const PRODUCT_SPECS = [
  {
    key: "credits_40",
    name: "FreeTexttoImage — 40 Permanent Credits",
    description: "40 AI image-generation credits that never expire.",
    metadata: { kind: "credit_pack", pack_id: "credits_40", credits: "40", expires: "never" },
    prices: [{
      key: "freetexttoimage_credits_40",
      env: "STRIPE_PRICE_CREDITS_40",
      amount: 500,
      metadata: { kind: "credit_pack", pack_id: "credits_40", credits: "40", expires: "never" },
    }],
  },
  {
    key: "credits_140",
    name: "FreeTexttoImage — 140 Permanent Credits",
    description: "140 AI image-generation credits that never expire.",
    metadata: { kind: "credit_pack", pack_id: "credits_140", credits: "140", expires: "never" },
    prices: [{
      key: "freetexttoimage_credits_140",
      env: "STRIPE_PRICE_CREDITS_140",
      amount: 1500,
      metadata: { kind: "credit_pack", pack_id: "credits_140", credits: "140", expires: "never" },
    }],
  },
  {
    key: "credits_320",
    name: "FreeTexttoImage — 320 Permanent Credits",
    description: "320 AI image-generation credits that never expire.",
    metadata: { kind: "credit_pack", pack_id: "credits_320", credits: "320", expires: "never" },
    prices: [{
      key: "freetexttoimage_credits_320",
      env: "STRIPE_PRICE_CREDITS_320",
      amount: 3000,
      metadata: { kind: "credit_pack", pack_id: "credits_320", credits: "320", expires: "never" },
    }],
  },
  {
    key: "basic",
    name: "FreeTexttoImage Basic",
    description: "120 credits each month, up to 60 images, all AI models, faster generation, and watermark-free output.",
    metadata: {
      kind: "subscription",
      plan: "basic",
      monthly_credits: "120",
      images_per_month: "60",
      all_models: "true",
      generation_speed: "faster",
      watermark_free: "true",
      support: "standard",
    },
    prices: [
      {
        key: "freetexttoimage_basic_monthly",
        env: "STRIPE_PRICE_BASIC",
        amount: 900,
        interval: "month",
        metadata: { kind: "subscription", plan: "basic", billing_interval: "month", monthly_credits: "120" },
      },
      {
        key: "freetexttoimage_basic_yearly",
        env: "STRIPE_PRICE_BASIC_YEARLY",
        amount: 9000,
        interval: "year",
        metadata: { kind: "subscription", plan: "basic", billing_interval: "year", monthly_credits: "120", monthly_equivalent_cents: "750", months_free: "2" },
      },
    ],
  },
  {
    key: "pro",
    name: "FreeTexttoImage Pro",
    description: "400 credits each month, up to 200 images, all AI models, faster generation, watermark-free output, and priority support.",
    metadata: {
      kind: "subscription",
      plan: "pro",
      monthly_credits: "400",
      images_per_month: "200",
      all_models: "true",
      generation_speed: "faster",
      watermark_free: "true",
      support: "priority",
    },
    prices: [
      {
        key: "freetexttoimage_pro_monthly",
        env: "STRIPE_PRICE_PRO",
        amount: 2400,
        interval: "month",
        metadata: { kind: "subscription", plan: "pro", billing_interval: "month", monthly_credits: "400" },
      },
      {
        key: "freetexttoimage_pro_yearly",
        env: "STRIPE_PRICE_PRO_YEARLY",
        amount: 24000,
        interval: "year",
        metadata: { kind: "subscription", plan: "pro", billing_interval: "year", monthly_credits: "400", monthly_equivalent_cents: "2000", months_free: "2" },
      },
    ],
  },
];

function usage() {
  console.log(`
配置 FreeTexttoImage 的 Stripe 正式环境资源。

用法：
  pnpm stripe:setup:production              预览将创建或同步的资源
  pnpm stripe:setup:production -- --apply   创建资源并回写 .env.production

选项：
  --apply              执行写入；不传时 Stripe 和本地文件都不会被修改
  --env-file=<path>    环境变量文件，默认 .env.production
  --help               显示帮助

要求：
  STRIPE_SECRET_KEY 必须是 sk_live_ 开头的正式环境密钥。
  APP_URL 必须是公开的 HTTPS 地址，用于创建 Webhook 与 Billing Portal 链接。
`);
}

function parseArgs(argv) {
  const options = { apply: false, envFile: ".env.production" };
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--env-file=")) options.envFile = arg.slice("--env-file=".length);
    else throw new Error(`未知参数：${arg}`);
  }
  return options;
}

function parseEnv(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    result[match[1]] = value;
  }
  return result;
}

function normalizeAppUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL 不是有效 URL。");
  }
  if (url.protocol !== "https:") throw new Error("正式环境 APP_URL 必须使用 HTTPS。");
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("正式环境 APP_URL 不能指向本机地址。");
  }
  return url.toString().replace(/\/$/, "");
}

function managedMetadata(resourceKey, extra = {}) {
  return { managed_by: MANAGED_BY, resource_key: resourceKey, environment: "production", ...extra };
}

function sameEvents(left, right) {
  return [...left].sort().join("\n") === [...right].sort().join("\n");
}

function describeAmount(amount, interval) {
  const value = `$${(amount / 100).toFixed(amount % 100 ? 2 : 0)} USD`;
  return interval ? `${value}/${interval === "month" ? "月" : "年"}` : value;
}

async function collect(list) {
  const values = [];
  for await (const item of list) values.push(item);
  return values;
}

function replaceEnvValues(contents, values) {
  const remaining = new Map(Object.entries(values));
  const lines = contents.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !remaining.has(match[2])) return line;
    const value = remaining.get(match[2]);
    remaining.delete(match[2]);
    return `${match[1]}${match[2]}=${value}`;
  });

  if (remaining.size) {
    if (lines.at(-1) !== "") lines.push("");
    lines.push("# Stripe 正式环境资源（由 scripts/setup-stripe-production.mjs 管理）");
    for (const [key, value] of remaining) lines.push(`${key}=${value}`);
  }
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function writeEnvFileAtomically(filePath, contents, values) {
  const stat = fs.statSync(filePath);
  const nextContents = replaceEnvValues(contents, values);
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, nextContents, { mode: stat.mode });
  fs.renameSync(temporaryPath, filePath);
  fs.chmodSync(filePath, stat.mode);
}

function productNeedsUpdate(product, spec) {
  return product.name !== spec.name || product.description !== spec.description || !product.active;
}

function assertPriceMatches(price, spec, product) {
  const problems = [];
  if (!price.active) problems.push("价格已停用");
  if (price.currency !== "usd") problems.push(`币种为 ${price.currency}`);
  if (price.unit_amount !== spec.amount) problems.push(`金额为 ${price.unit_amount ?? "null"} cents`);
  if ((price.recurring?.interval || null) !== (spec.interval || null)) {
    problems.push(`周期为 ${price.recurring?.interval || "一次性"}`);
  }
  const productId = typeof price.product === "string" ? price.product : price.product.id;
  if (!product) problems.push(`lookup key 已存在，但缺少对应的受管产品（当前属于 ${productId}）`);
  else if (product.id !== productId) problems.push(`属于其他产品 ${productId}`);
  if (problems.length) {
    throw new Error(`Price lookup_key=${spec.key} 与项目配置不一致（${problems.join("，")}）。Stripe Price 的金额/周期不可修改，请先在 Stripe 后台处理这个冲突。`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();

  const envPath = path.resolve(process.cwd(), options.envFile);
  if (!fs.existsSync(envPath)) throw new Error(`找不到环境变量文件：${envPath}`);
  const envContents = fs.readFileSync(envPath, "utf8");
  const fileEnv = parseEnv(envContents);
  const env = { ...fileEnv, ...process.env };

  if (!env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error(`${options.envFile} 中的 STRIPE_SECRET_KEY 不是 Stripe 正式环境密钥（必须以 sk_live_ 开头）。`);
  }
  const appUrl = normalizeAppUrl(env.APP_URL);
  const webhookUrl = `${appUrl}/api/webhooks/stripe`;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });

  console.log(options.apply ? "\n执行 Stripe 正式环境配置\n" : "\n预览 Stripe 正式环境配置（不会写入）\n");
  console.log(`站点：${appUrl}`);
  console.log(`Webhook：${webhookUrl}\n`);

  const [products, endpoints, portalConfigurations] = await Promise.all([
    collect(stripe.products.list({ limit: 100 })),
    collect(stripe.webhookEndpoints.list({ limit: 100 })),
    collect(stripe.billingPortal.configurations.list({ limit: 100 })),
  ]);

  const productsByKey = new Map();
  for (const product of products) {
    if (product.metadata?.managed_by !== MANAGED_BY) continue;
    const key = product.metadata?.resource_key;
    if (!key) continue;
    if (productsByKey.has(key)) throw new Error(`Stripe 中存在多个受管产品 resource_key=${key}，请先清理重复项。`);
    productsByKey.set(key, product);
  }

  const priceSpecs = PRODUCT_SPECS.flatMap((product) => product.prices);
  const pricesByKey = new Map();
  await Promise.all(priceSpecs.map(async (spec) => {
    const matches = await collect(stripe.prices.list({ lookup_keys: [spec.key], limit: 100 }));
    if (matches.length > 1) throw new Error(`Stripe 中存在多个 Price lookup_key=${spec.key}。`);
    if (matches[0]) pricesByKey.set(spec.key, matches[0]);
  }));

  // 所有不可修改的价格冲突都必须在第一次写入前发现，避免配置执行到一半才失败。
  for (const productSpec of PRODUCT_SPECS) {
    const product = productsByKey.get(productSpec.key) || null;
    for (const priceSpec of productSpec.prices) {
      const price = pricesByKey.get(priceSpec.key);
      if (price) assertPriceMatches(price, priceSpec, product);
    }
  }

  const managedEndpoint = endpoints.filter((endpoint) => endpoint.metadata?.managed_by === MANAGED_BY && endpoint.metadata?.resource_key === "billing_webhook");
  if (managedEndpoint.length > 1) throw new Error("Stripe 中存在多个 FreeTexttoImage 受管 Webhook，请先清理重复项。");
  const sameUrlEndpoint = endpoints.find((endpoint) => endpoint.url === webhookUrl);
  if (sameUrlEndpoint && sameUrlEndpoint.id !== managedEndpoint[0]?.id) {
    throw new Error(`Webhook URL 已被未受本脚本管理的端点 ${sameUrlEndpoint.id} 使用。为避免改变已有配置，脚本不会自动接管它。`);
  }
  const webhookEndpoint = managedEndpoint[0] || null;
  if (webhookEndpoint && webhookEndpoint.url !== webhookUrl) {
    console.log(`[更新] Webhook URL：${webhookEndpoint.url} -> ${webhookUrl}`);
  } else {
    console.log(webhookEndpoint ? `[复用] Webhook ${webhookEndpoint.id}` : "[创建] Webhook endpoint");
  }
  if (webhookEndpoint && !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(`已找到 Webhook ${webhookEndpoint.id}，但 ${options.envFile} 缺少 STRIPE_WEBHOOK_SECRET。Stripe 只在创建端点时返回签名密钥，请先从 Stripe 后台取得该端点的 signing secret 并填入。`);
  }

  let portalConfiguration = null;
  if (env.STRIPE_PORTAL_CONFIGURATION_ID) {
    portalConfiguration = await stripe.billingPortal.configurations.retrieve(env.STRIPE_PORTAL_CONFIGURATION_ID);
    if (!portalConfiguration.livemode) throw new Error("STRIPE_PORTAL_CONFIGURATION_ID 不是正式环境配置。");
  } else {
    const managedPortals = portalConfigurations.filter((configuration) => configuration.metadata?.managed_by === MANAGED_BY && configuration.metadata?.resource_key === "billing_portal");
    if (managedPortals.length > 1) throw new Error("Stripe 中存在多个 FreeTexttoImage 受管 Billing Portal 配置，请先清理重复项。");
    portalConfiguration = managedPortals[0] || null;
  }
  console.log(portalConfiguration ? `[复用/更新] Billing Portal ${portalConfiguration.id}` : "[创建] Billing Portal configuration");

  const envUpdates = {};
  for (const productSpec of PRODUCT_SPECS) {
    let product = productsByKey.get(productSpec.key) || null;
    const action = !product ? "创建" : productNeedsUpdate(product, productSpec) ? "更新" : "同步";
    console.log(`[${action}] 产品 ${productSpec.name}`);

    if (options.apply) {
      const params = {
        name: productSpec.name,
        description: productSpec.description,
        active: true,
        metadata: managedMetadata(productSpec.key, productSpec.metadata),
      };
      product = product
        ? await stripe.products.update(product.id, params)
        : await stripe.products.create(params, { idempotencyKey: `${MANAGED_BY}:product:${productSpec.key}` });
    }

    for (const priceSpec of productSpec.prices) {
      let price = pricesByKey.get(priceSpec.key) || null;
      if (price) assertPriceMatches(price, priceSpec, product);
      console.log(price
        ? `  [同步] ${priceSpec.key} · ${describeAmount(priceSpec.amount, priceSpec.interval)} · ${price.id}`
        : `  [创建] ${priceSpec.key} · ${describeAmount(priceSpec.amount, priceSpec.interval)}`);

      if (options.apply && !price) {
        price = await stripe.prices.create({
          product: product.id,
          currency: "usd",
          unit_amount: priceSpec.amount,
          lookup_key: priceSpec.key,
          nickname: priceSpec.key,
          ...(priceSpec.interval ? { recurring: { interval: priceSpec.interval, usage_type: "licensed" } } : {}),
          metadata: managedMetadata(priceSpec.key, { product_key: productSpec.key, ...priceSpec.metadata }),
        }, { idempotencyKey: `${MANAGED_BY}:price:${priceSpec.key}` });
      } else if (options.apply && price) {
        price = await stripe.prices.update(price.id, {
          nickname: priceSpec.key,
          metadata: managedMetadata(priceSpec.key, { product_key: productSpec.key, ...priceSpec.metadata }),
        });
      }
      if (price) envUpdates[priceSpec.env] = price.id;
    }
  }

  const portalParams = {
    active: true,
    default_return_url: `${appUrl}/pricing`,
    business_profile: {
      headline: "Manage your FreeTexttoImage billing",
      privacy_policy_url: `${appUrl}/privacy`,
      terms_of_service_url: `${appUrl}/terms`,
    },
    features: {
      customer_update: { enabled: false },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "other"],
        },
      },
      subscription_update: { enabled: false },
    },
    metadata: managedMetadata("billing_portal"),
  };

  if (options.apply) {
    const { active: _active, ...portalCreateParams } = portalParams;
    portalConfiguration = portalConfiguration
      ? await stripe.billingPortal.configurations.update(portalConfiguration.id, portalParams)
      : await stripe.billingPortal.configurations.create(portalCreateParams, { idempotencyKey: `${MANAGED_BY}:portal` });
    envUpdates.STRIPE_PORTAL_CONFIGURATION_ID = portalConfiguration.id;

    const webhookParams = {
      url: webhookUrl,
      enabled_events: REQUIRED_EVENTS,
      description: "FreeTexttoImage production billing events",
      metadata: managedMetadata("billing_webhook"),
    };
    let finalEndpoint;
    if (webhookEndpoint) {
      finalEndpoint = await stripe.webhookEndpoints.update(webhookEndpoint.id, webhookParams);
    } else {
      finalEndpoint = await stripe.webhookEndpoints.create(webhookParams, { idempotencyKey: `${MANAGED_BY}:webhook:${webhookUrl}` });
      if (!finalEndpoint.secret) throw new Error("Stripe 创建了 Webhook，但没有返回 signing secret。");
      envUpdates.STRIPE_WEBHOOK_SECRET = finalEndpoint.secret;
    }
    if (webhookEndpoint && !sameEvents(webhookEndpoint.enabled_events, REQUIRED_EVENTS)) {
      console.log(`[更新] Webhook 事件：${REQUIRED_EVENTS.join(", ")}`);
    }

    writeEnvFileAtomically(envPath, envContents, envUpdates);
    console.log(`\n完成：Stripe 资源已配置，${options.envFile} 已原子更新。`);
    console.log("请把以下非敏感 ID 同步到部署平台：");
    for (const priceSpec of priceSpecs) console.log(`${priceSpec.env}=${envUpdates[priceSpec.env]}`);
    console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${envUpdates.STRIPE_PORTAL_CONFIGURATION_ID}`);
    if (envUpdates.STRIPE_WEBHOOK_SECRET) console.log("STRIPE_WEBHOOK_SECRET 已写入环境文件（为安全起见不在终端显示）。");
  } else {
    console.log("\n预览完成，没有修改任何 Stripe 资源或本地文件。确认后执行：");
    console.log("pnpm stripe:setup:production -- --apply");
  }
}

main().catch((error) => {
  console.error(`\n配置失败：${error?.message || error}`);
  process.exitCode = 1;
});

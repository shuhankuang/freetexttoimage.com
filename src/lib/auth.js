import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getIP } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { sendMagicLinkEmail } from "@/lib/postmark";
import { grantSignupBonus } from "@/lib/credits";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkDisposableEmail } from "@/lib/disify";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const ipAddressConfig = {
  ipAddressHeaders: (process.env.AUTH_IP_HEADERS || "cf-connecting-ip,x-forwarded-for")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean),
  trustedProxies: (process.env.AUTH_TRUSTED_PROXIES || "")
    .split(",")
    .map((proxy) => proxy.trim())
    .filter(Boolean),
  ipv6Subnet: 64,
};

function authRequestIp(context) {
  const source = context?.request || context?.headers;
  return source ? getIP(source, { advanced: { ipAddress: ipAddressConfig } }) : null;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: { ipAddress: ipAddressConfig },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/magic-link") return;

      const token = context.headers?.get("x-turnstile-token")
        || context.request?.headers.get("x-turnstile-token");
      if (!await verifyTurnstileToken(token)) {
        throw new APIError("FORBIDDEN", {
          code: "TURNSTILE_VERIFICATION_FAILED",
          message: "Complete the security check before requesting a sign-in link.",
        });
      }

      const email = context.body?.email?.trim().toLowerCase();
      if (!email) return;

      const existing = await context.context.internalAdapter.findUserByEmail(email);
      if (existing?.user) return;

      const disposable = await checkDisposableEmail(email);
      if (disposable.blocked) {
        console.info("[auth] disposable email registration blocked", {
          reason: "disposable_email",
          confidence: disposable.confidence,
          signals: disposable.signals,
        });
        throw new APIError("BAD_REQUEST", {
          code: "DISPOSABLE_EMAIL_NOT_SUPPORTED",
          message: "Temporary email addresses aren’t supported. Please use a permanent email address.",
        });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, context) => {
          await grantSignupBonus(user, { ipAddress: authRequestIp(context) });
        },
      },
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      storeToken: "hashed",
      sendMagicLink: ({ email, url, metadata }) => sendMagicLinkEmail({
        email,
        url,
        locale: metadata?.locale,
      }),
    }),
    nextCookies(),
  ],
});

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { sendMagicLinkEmail } from "@/lib/postmark";
import { grantSignupBonus } from "@/lib/credits";
import { verifyTurnstileToken } from "@/lib/turnstile";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
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
    }),
  },
  databaseHooks: {
    user: {
      create: {
        // 新用户建号即送 10 永久积分；grantSignupBonus 内部靠 insert+onConflictDoNothing 保证幂等。
        after: async (user) => { await grantSignupBonus(user.id); },
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

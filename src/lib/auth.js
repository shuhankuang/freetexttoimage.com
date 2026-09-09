import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/postmark";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
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

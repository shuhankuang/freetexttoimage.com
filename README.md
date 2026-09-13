# FreeTexttoImage

FreeTexttoImage is a focused AI image workspace built with Next.js 16 and HeroUI. Users can generate images from text, browse inspiration, and keep their generated work in a private library.

## Features

- Text-to-image generation through configurable model providers
- English routes at `/` and Japanese routes under `/ja`
- Passwordless authentication with Postmark Magic Links
- Optional Google sign-in
- Responsive masonry gallery and full-screen result viewer
- Private S3-compatible image storage

## Local development

```bash
pnpm install
pnpm db:setup
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and configure the services you use. Magic Link login requires a Postmark server token and a verified sender address:

```env
POSTMARK_SERVER_TOKEN=
POSTMARK_FROM_EMAIL="FreeTexttoImage <hi@freetexttoimage.com>"
POSTMARK_MESSAGE_STREAM=outbound
```

### Google sign-in (optional)

Google is an optional second sign-in method alongside Magic Link — `src/lib/auth.js` only enables it when both env vars below are set, so you can skip this entirely and use Magic Link only.

1. Open the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials) and pick or create a project.
2. If you haven't already, configure the **OAuth consent screen** (app name, support email, scopes) — Google requires this before it lets you create OAuth credentials.
3. Create an **OAuth client ID** of type **Web application**.
4. Add an authorized redirect URI matching your `BETTER_AUTH_URL`: `{BETTER_AUTH_URL}/api/auth/callback/google` — for local development that's `http://localhost:3000/api/auth/callback/google`. Add the production URL's equivalent too if you're deploying.
5. Copy the generated Client ID and Client Secret into `.env.local`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Image generation and S3-compatible storage remain optional integrations documented in `.env.example`.

## Commands

```bash
pnpm lint       # Run ESLint
pnpm build      # Create a production build
pnpm db:setup   # Prepare Better Auth and generation tables
pnpm start      # Start the production server
```

Data lives in Turso (libsql). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local` before running `pnpm db:setup`; use separate databases for local development and production.

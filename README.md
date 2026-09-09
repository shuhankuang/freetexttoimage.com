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
POSTMARK_FROM_EMAIL="FreeTexttoImage <hello@example.com>"
POSTMARK_MESSAGE_STREAM=outbound
```

Google authentication, image generation, and S3-compatible storage remain optional integrations documented in `.env.example`.

## Commands

```bash
pnpm lint       # Run ESLint
pnpm build      # Create a production build
pnpm db:setup   # Prepare Better Auth and generation tables
pnpm start      # Start the production server
```

Data lives in Turso (libsql). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local` before running `pnpm db:setup`; use separate databases for local development and production.

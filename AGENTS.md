<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Localization workflow

- 界面和文案修改先仅更新英文版本。
- 只有在用户确认英文版并明确要求同步后，才更新日语或其他语言；不要自行同步。

## Component boundaries

- 默认使用 Server Components。仅当组件需要客户端状态、事件处理、Effect、自定义客户端 Hook 或浏览器 API 时，才添加 `"use client"`。
- 不要因为父级或相邻组件需要交互，就把静态展示、数据读取或仅包含链接的组件改成 Client Component。
- 当静态服务端内容需要出现在客户端组件内部时，由服务端父组件创建该内容，再通过 `children` 或具名插槽 prop 传入客户端组件。
- 将 `"use client"` 放在尽可能小的交互边界，避免无关依赖进入客户端 bundle。

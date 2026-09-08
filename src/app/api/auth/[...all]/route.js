import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// better-auth 挂载点：处理 /api/auth/*（登录、回调、会话、登出）。
export const { POST, GET } = toNextJsHandler(auth);

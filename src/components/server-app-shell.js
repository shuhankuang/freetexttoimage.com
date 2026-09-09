import { headers } from "next/headers";
import AppShell from "@/components/app-shell";
import { auth } from "@/lib/auth";

export default async function ServerAppShell({ children, ...props }) {
  let showMyCreations = false;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    showMyCreations = Boolean(session?.user);
  } catch {
    // 公开页面在认证服务暂时不可用时仍按游客模式渲染。
  }

  return <AppShell {...props} showMyCreations={showMyCreations}>{children}</AppShell>;
}

import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";

// 纯链接列表，Server Component。v1 不做"当前高亮"——Server Component 里拿不到
// usePathname，为了一个高亮态不值得专门传 pathname/加 client 逻辑。
export default function AdminNavTabs() {
  return <nav className="admin-nav-tabs" aria-label="Admin sections">
    {ADMIN_SECTIONS.map((section) => <Link key={section.href} href={section.href}>{section.label}</Link>)}
  </nav>;
}

import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";

export const metadata = {
  title: "Admin",
  description: "Admin dashboard.",
  robots: { index: false, follow: false },
};

// 权限校验已经在父级 admin/layout.js 里做过一次，这里不用重复。
// 不加统计查询——用户要的是"以后能挂更多管理入口"，不是数据大盘。
export default function AdminDashboardPage() {
  return <main className="workspace-page admin-dashboard-page">
    <header className="page-title">
      <div>
        <span className="eyebrow">ADMIN</span>
        <h1>Dashboard</h1>
        <p>Pick a section to manage.</p>
      </div>
    </header>

    <div className="admin-dashboard-grid">
      {ADMIN_SECTIONS.map((section) => <Link key={section.href} href={section.href} className="admin-dashboard-card">
        <strong>{section.label}</strong>
        <p>{section.description}</p>
      </Link>)}
    </div>
  </main>;
}

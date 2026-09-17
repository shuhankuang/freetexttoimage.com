import { listUsersPage } from "@/lib/admin-users";
import AdminUserList from "@/components/admin-user-list";

export const metadata = {
  title: "Admin · Users",
  description: "Browse user accounts.",
  robots: { index: false, follow: false },
};

// 权限校验已经在父级 admin/layout.js 里做过一次，这里不用重复。
// 搜索框和"仅付费"走原生 <form method="get">，整页 SSR 重新拉数据——筛选是导航，
// 不是客户端状态。只有"加载更多"这种不想整页刷新的交互才交给下面的 client 组件。
export default async function AdminUsersPage({ params, searchParams }) {
  const { locale } = await params;
  const { search = "", paid } = await searchParams;
  const paidOnly = paid === "on" || paid === "1" || paid === "true";

  const page = await listUsersPage({ search, paidOnly });

  return <main className="workspace-page admin-users-page">
    <header className="page-title">
      <div>
        <span className="eyebrow">ADMIN</span>
        <h1>Users</h1>
        <p>{page.items.length + page.remaining} account{page.items.length + page.remaining === 1 ? "" : "s"} match the current filters.</p>
      </div>
    </header>

    <form method="get" className="admin-users-filters">
      <input type="text" name="search" placeholder="Search by name or email" defaultValue={search} />
      <label>
        <input type="checkbox" name="paid" defaultChecked={paidOnly} />
        Paid only (active subscription)
      </label>
      <button type="submit" className="button primary-button">Filter</button>
    </form>

    <AdminUserList
      key={`${search}-${paidOnly}`}
      initialItems={page.items}
      initialNextCursor={page.nextCursor}
      initialRemaining={page.remaining}
      search={search}
      paidOnly={paidOnly}
      locale={locale}
    />
  </main>;
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserProfile } from "@/lib/admin-users";
import { listCreationsPage } from "@/lib/creations";
import AdminUserCreationsGrid from "@/components/admin-user-creations-grid";
import { localePath } from "@/i18n/config";

export const metadata = {
  title: "Admin · User detail",
  robots: { index: false, follow: false },
};

// user.createdAt 大多是 ISO 字符串，但库里存在个别行是 epoch 毫秒的字符串形式
// （如 "1788936114322.0"，Date.parse 认不出来）——兜底按数字再解析一次，解析不出就显示 "—"，
// 不让一行脏数据让整个详情页崩掉。
function formatDate(value) {
  if (!value) return "—";
  let date = new Date(value);
  if (Number.isNaN(date.getTime()) && /^-?\d+(\.\d+)?$/.test(value)) date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// 权限校验已经在父级 admin/layout.js 里做过一次，这里不用重复。
export default async function AdminUserDetailPage({ params }) {
  const { locale, id } = await params;
  const [profile, creationsPage] = await Promise.all([
    getUserProfile(id),
    listCreationsPage(id, { limit: 24 }),
  ]);
  if (!profile) notFound();

  const totalCredits = profile.monthlyCredits + profile.permanentCredits;

  return <main className="workspace-page admin-user-detail-page">
    <header className="page-title">
      <div>
        <span className="eyebrow">ADMIN</span>
        <h1>{profile.name}</h1>
        <p>{profile.email}</p>
      </div>
      <Link className="link-button" href={localePath(locale, "/admin/users")}>Back to users</Link>
    </header>

    <section className="admin-import-summary" aria-label="Account summary">
      <div><strong>{formatDate(profile.createdAt)}</strong><span>Registered</span><small>{profile.emailVerified ? "Email verified" : "Email not verified"}</small></div>
      <div><strong>{profile.plan ? `${profile.plan} · ${profile.subscriptionStatus}` : "No plan"}</strong><span>Subscription</span><small>{profile.currentPeriodEnd ? `Renews ${formatDate(profile.currentPeriodEnd)}${profile.cancelAtPeriodEnd ? " (canceling)" : ""}` : "—"}</small></div>
      <div><strong>{totalCredits}</strong><span>Credits</span><small>{profile.monthlyCredits} monthly · {profile.permanentCredits} permanent</small></div>
      <div><strong>{creationsPage.items.length + creationsPage.remaining}</strong><span>Generated images</span><small>All time</small></div>
    </section>

    {profile.topups.length > 0 && <section className="admin-user-topups">
      <h2>Recent one-time purchases</h2>
      <ul>
        {profile.topups.map((row) => <li key={row.id}>+{row.delta} credits · {formatDate(row.createdAt)}</li>)}
      </ul>
    </section>}

    <section className="admin-jobs">
      <div className="admin-jobs-heading">
        <div>
          <span className="eyebrow">CREATIONS</span>
          <h2>Generated images</h2>
        </div>
      </div>
      <AdminUserCreationsGrid
        userId={id}
        initialItems={creationsPage.items}
        initialNextCursor={creationsPage.nextCursor}
        initialRemaining={creationsPage.remaining}
      />
    </section>
  </main>;
}

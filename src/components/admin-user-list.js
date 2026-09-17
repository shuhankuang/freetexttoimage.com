"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { localePath } from "@/i18n/config";

// user.createdAt 大多是 ISO 字符串，但库里存在个别行是 epoch 毫秒的字符串形式
// （如 "1788936114322.0"，Date.parse 认不出来）——兜底按数字再解析一次，解析不出就显示 "—"，
// 不让一行脏数据让整张列表崩掉。
function formatDate(value) {
  if (!value) return "—";
  let date = new Date(value);
  if (Number.isNaN(date.getTime()) && /^-?\d+(\.\d+)?$/.test(value)) date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export default function AdminUserList({ initialItems, initialNextCursor, initialRemaining, search, paidOnly, locale }) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      if (search) params.set("search", search);
      if (paidOnly) params.set("paid", "1");
      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load more users.");
      const page = await response.json();
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setRemaining(page.remaining);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (!items.length) return <div className="admin-jobs-empty">No users match these filters.</div>;

  return <>
    <div className="admin-users-table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Registered</th>
            <th>Plan</th>
            <th>Credits</th>
            <th>Images</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => <tr key={row.id}>
            <td>
              <Link href={localePath(locale, `/admin/users/${row.id}`)}>
                <strong>{row.name}</strong>
                <span>{row.email}</span>
              </Link>
            </td>
            <td>{formatDate(row.createdAt)}</td>
            <td>
              {row.plan
                ? <em className={`admin-job-status status-${row.subscriptionStatus === "active" ? "completed" : "failed"}`}>{row.plan} · {row.subscriptionStatus}</em>
                : "—"}
            </td>
            <td>{row.monthlyCredits + row.permanentCredits}</td>
            <td>{row.creationCount}</td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {error && <p className="admin-import-error" role="alert">{error}</p>}

    {nextCursor && <div className="admin-jobs-more">
      <Button variant="outline" isDisabled={loadingMore} onPress={loadMore}>
        {loadingMore && <Spinner size="sm" />}
        Load more ({remaining} remaining)
      </Button>
    </div>}
  </>;
}

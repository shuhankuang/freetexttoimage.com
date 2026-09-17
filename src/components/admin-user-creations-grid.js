"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import CreationStatus from "@/components/creation-status";

// 瀑布流用 CSS columns 实现（每格按图片真实宽高比自然排布，不需要知道尺寸），
// 滚动到底部前用 IntersectionObserver 自动加载下一页，不需要点"加载更多"。
export default function AdminUserCreationsGrid({ userId, initialItems, initialNextCursor, initialRemaining }) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/creations?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load more images.");
      const page = await response.json();
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setRemaining(page.remaining);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, nextCursor, loadingMore]);

  useEffect(() => {
    if (!nextCursor) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { rootMargin: "800px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadMore]);

  if (!items.length) return <div className="admin-jobs-empty">This user has not generated any images yet.</div>;

  return <>
    <div className="admin-creations-masonry">
      {items.map((item) => <a
        key={item.id}
        className="admin-creation-tile"
        href={item.image || undefined}
        target="_blank"
        rel="noreferrer"
        title={item.prompt}
      >
        {item.image
          ? <img src={item.thumbnail || item.image} alt={item.prompt || "Generated image"} loading="lazy" />
          : <CreationStatus failed={item.status === "failed"} failedLabel="Generation failed" generatingLabel="Processing…" />}
      </a>)}
    </div>

    {error && <p className="admin-import-error" role="alert">{error}</p>}

    <div ref={sentinelRef} className="admin-creations-sentinel">
      {loadingMore && <><Spinner size="sm" />Loading more…</>}
      {!loadingMore && !nextCursor && `All ${items.length} images loaded.`}
      {!loadingMore && nextCursor && !error && `${remaining} more`}
    </div>
  </>;
}

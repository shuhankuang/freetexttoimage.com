"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { ArrowIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/ui";
import ResultViewer from "@/components/result-viewer";
import { authClient } from "@/lib/auth-client";

const PAGE_SIZE = 24;

function dimensionsFor(ratio) {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio || "");
  if (!match) return { width: 1, height: 1 };
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height || width / height < 0.2 || width / height > 5) return { width: 1, height: 1 };
  return { width, height };
}

function tileHeightRatio(ratio) {
  const { width, height } = dimensionsFor(ratio);
  return Math.min(height / width, 1.55);
}

function columnCountFor(width) {
  if (width >= 860) return 4;
  if (width >= 620) return 3;
  if (width >= 360) return 2;
  return 1;
}

function CreationTile({ item, position, total, onOpen }) {
  const heightRatio = tileHeightRatio(item.ratio);
  const failed = item.status === "failed";
  return (
    <article className="creation-tile" role="listitem" aria-posinset={position} aria-setsize={total}>
      <button
        className="creation-image"
        style={{ aspectRatio: `1 / ${heightRatio}` }}
        onClick={onOpen}
        aria-label={`View ${item.title || "generated image"}`}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title || item.prompt || "Generated image"}
            fill
            sizes="(max-width: 359px) 100vw, (max-width: 999px) 50vw, (max-width: 1399px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <span className="creation-state">
            {failed ? <><TrashIcon size={14} />Generation failed</> : <><Spinner size="sm" color="current" />Generating…</>}
          </span>
        )}
        <span className="creation-overlay" aria-hidden="true">
          <span>{[item.model, item.ratio].filter(Boolean).join(" · ") || "AI image"}</span>
        </span>
        <span className="creation-open" aria-hidden="true"><ArrowIcon /></span>
      </button>
    </article>
  );
}

function distribute(items, count) {
  const columns = Array.from({ length: count }, () => []);
  const heights = Array(count).fill(0);
  items.forEach((item, index) => {
    const target = heights.indexOf(Math.min(...heights));
    columns[target].push({ item, position: index + 1 });
    heights[target] += tileHeightRatio(item.ratio) + 0.06;
  });
  return columns;
}

export default function CreationsPage() {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [columnCount, setColumnCount] = useState(3);
  const wallRef = useRef(null);
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumnCount(columnCountFor(entry.contentRect.width));
    });
    observer.observe(wall);
    return () => observer.disconnect();
  }, [loading, initialError]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch(`/api/creations?limit=${PAGE_SIZE}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load creations");
        return response.json();
      })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setRemaining(page.remaining);
        setTotal(page.items.length + page.remaining);
      })
      .catch(() => { if (!cancelled) setInitialError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [signedIn, retryKey]);

  const columns = useMemo(() => distribute(items, columnCount), [items, columnCount]);

  function retryInitial() {
    setLoading(true);
    setInitialError(false);
    setRetryKey((key) => key + 1);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPageError(false);
    try {
      const response = await fetch(`/api/creations?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error("Unable to load more creations");
      const page = await response.json();
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !known.has(item.id))];
      });
      setNextCursor(page.nextCursor);
      setRemaining(page.remaining);
    } catch {
      setPageError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function remove(id) {
    try {
      const response = await fetch(`/api/creations/${id}`, { method: "DELETE" });
      if (!response.ok) return;
      setSelected(null);
      setItems((current) => current.filter((item) => item.id !== id));
      setTotal((current) => Math.max(0, current - 1));
    } catch { /* 网络失败时保留作品，避免界面与服务端状态不一致 */ }
  }

  if (isPending || (signedIn && loading)) {
    return <main className="workspace-page"><div className="screen-loader"><Spinner /><span>Loading your creations…</span></div></main>;
  }

  return <main className="workspace-page creations-page">
    <div className="page-title"><div><span className="section-label">LIBRARY</span><h1>My creations</h1><p>Every generated image, together with the prompt that made it.</p></div><Link className="link-button primary-button" href="/studio"><PlusIcon /> New image</Link></div>
    {initialError && <div className="library-load-state"><ImageIcon /><h2>Couldn&apos;t load your creations</h2><p>Check your connection and try again.</p><Button variant="outline" onPress={retryInitial}>Try again</Button></div>}
    {!initialError && items.length > 0 && <>
      <div className="library-summary"><span><strong>{total}</strong> creations</span></div>
      <div className="creation-wall" ref={wallRef} role="list" aria-label="Your creations">
        {columns.map((column, index) => <div className="creation-column" key={index}>{column.map(({ item, position }) => <CreationTile key={item.id} item={item} position={position} total={total} onOpen={() => setSelected(item)} />)}</div>)}
      </div>
      {(nextCursor || pageError) && <div className="library-pagination">
        {pageError && <p role="alert">That page didn&apos;t load. Your existing creations are still here.</p>}
        <Button variant="outline" isPending={loadingMore} onPress={loadMore}>{pageError ? "Retry" : `Load more · ${remaining} remaining`}</Button>
      </div>}
    </>}
    {!initialError && items.length === 0 && <div className="empty-library"><span><ImageIcon /></span><h2>Your library is empty</h2><p>Generate your first image and it will appear here with its prompt and settings.</p><Link className="link-button primary-button" href="/studio">Create an image <ArrowIcon /></Link></div>}
    <ResultViewer item={selected} isOpen={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} actions={selected && <Button isIconOnly variant="danger-soft" aria-label="Delete creation" onPress={() => remove(selected.id)}><TrashIcon /></Button>} />
  </main>;
}

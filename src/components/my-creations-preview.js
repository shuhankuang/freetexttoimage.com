"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import CreationStatus from "@/components/creation-status";
import ResultViewer from "@/components/result-viewer";
import { ArrowIcon, TrashIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

// 登录用户在 /studio 上的"我的作品"瀑布流预览：只展示最近一页
// （由 studio/page.js 通过 listCreationsPage 在服务端一次拉好），完整的无限滚动分页
// 留在 /creations 页，这里只负责"生成框下方一眼看到最近的东西"。
//
// 单张作品的悬浮效果/失败删除按钮跟 src/app/[locale]/creations/page.js 的 CreationTile
// 是同一套实现（悬浮放大 + 悬浮显示 model/ratio 角标，失败的直接给删除按钮不用开大图），
// 保持两处一致的体验。
const DISPLAY_LIMIT = 12;

function MyCreationsTile({ item, onOpen, onDelete, t }) {
  const [deleting, setDeleting] = useState(false);
  const failed = item.status === "failed";

  async function handleDelete(event) {
    event.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
  }

  return <div className="my-creations-tile">
    <button
      type="button"
      className="my-creations-image"
      style={{ aspectRatio: item.ratio ? item.ratio.replace(":", " / ") : "1 / 1" }}
      onClick={onOpen}
      aria-label={item.title || t("creations.generatedImage")}
    >
      {item.image ? (
        <>
          <Image src={item.thumbnail || item.image} alt={item.prompt || ""} fill sizes="(max-width: 620px) 45vw, (max-width: 1100px) 28vw, 30vw" unoptimized />
          <span className="creation-overlay" aria-hidden="true">
            <span>{[item.model, item.ratio].filter(Boolean).join(" · ") || t("creations.aiImage")}</span>
          </span>
        </>
      ) : (
        <CreationStatus failed={failed} failedLabel={t("creations.generationFailed")} generatingLabel={t("creations.generating")} />
      )}
    </button>
    {failed && <button
      type="button"
      className="creation-delete"
      aria-label={t("creations.delete")}
      disabled={deleting}
      onClick={handleDelete}
    >
      {deleting ? <Spinner size="sm" color="current" /> : <TrashIcon size={14} />}
    </button>}
  </div>;
}

export default function MyCreationsPreview({ initialItems, remaining, viewAllHref, pending, pendingRatio, latestResult }) {
  const { t } = useI18n();
  const [list, setList] = useState(initialItems);
  const [visibleRemaining, setVisibleRemaining] = useState(remaining);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [processedResultId, setProcessedResultId] = useState(null);

  // 生成成功后把新作品插到最前面——不用等用户刷新页面才能在瀑布流里看到刚生成的图。
  // 在渲染期间做这个调整（而不是 useEffect），避免多一次渲染后才更新导致的闪烁，
  // processedResultId 保证同一个 latestResult 只插入一次，不会无限重渲染。
  // 瀑布流最多显示 DISPLAY_LIMIT 张——插入新作品时若已经在这个上限，挤掉的那张
  // 算进"还有多少张没显示"里，"View all"链接的计数才不会跟真实总数脱节。
  if (latestResult && latestResult.id !== processedResultId) {
    setProcessedResultId(latestResult.id);
    const withoutDuplicate = list.filter((item) => item.id !== latestResult.id);
    if (withoutDuplicate.length >= DISPLAY_LIMIT) setVisibleRemaining((current) => current + 1);
    setList([latestResult, ...withoutDuplicate].slice(0, DISPLAY_LIMIT));
  }

  async function remove(id) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/creations/${id}`, { method: "DELETE" });
      if (!response.ok) return;
      setSelected(null);
      setList((current) => current.filter((item) => item.id !== id));
    } catch {
      // 网络失败时保留，跟 /creations 页同样的容错策略
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  }

  return <section className="my-creations-section" aria-label={t("creations.section")}>
    <div className="my-creations-masonry">
      {pending && <div className="my-creations-tile">
        <div
          className="my-creations-image my-creations-pending"
          aria-hidden="true"
          style={{ aspectRatio: pendingRatio ? pendingRatio.replace(":", " / ") : "1 / 1" }}
        >
          <Spinner size="sm" color="current" />{t("creations.generating")}
        </div>
      </div>}
      {list.map((item) => <MyCreationsTile key={item.id} item={item} onOpen={() => setSelected(item)} onDelete={remove} t={t} />)}
    </div>

    {visibleRemaining > 0 && <Link className="link-button my-creations-viewall" href={viewAllHref}>
      {t("creations.viewAll", { count: list.length + visibleRemaining })} <ArrowIcon size={15} />
    </Link>}

    <ResultViewer
      item={selected}
      isOpen={!!selected}
      onOpenChange={(open) => { if (!open) setSelected(null); }}
      actions={selected && <Button
        isIconOnly
        variant="danger-soft"
        aria-label={t("creations.delete")}
        isPending={deletingId === selected.id}
        isDisabled={deletingId === selected.id}
        onPress={() => remove(selected.id)}
      >
        {deletingId === selected.id ? <Spinner size="sm" color="current" /> : <TrashIcon />}
      </Button>}
    />
  </section>;
}

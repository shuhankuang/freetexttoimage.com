"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Modal, ScrollShadow, Spinner } from "@heroui/react";
import { ArrowIcon, CheckIcon, CopyIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

const PAGE_SIZE = 24;

function PromptImageCard({ item, onOpen, copy }) {
  const [status, setStatus] = useState("loading");
  const imageRef = useRef(null);
  const loaded = status === "loaded";

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  return <article className="model-prompt-card">
    <button type="button" className={`model-prompt-image${loaded ? " is-loaded" : status === "error" ? " is-error" : ""}`} onClick={() => onOpen(item)} aria-label={copy.open.replace("{title}", item.title)} aria-busy={status === "loading"} disabled={status === "error"}>
      {status !== "loaded" && <span className="model-prompt-loading" aria-hidden={status === "loading"}>
        {status === "loading" ? <Spinner size="sm" /> : copy.imageUnavailable}
      </span>}
      {/* Remote source data has no dimensions, so the browser preserves the natural ratio after loading. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={item.coverUrl} alt={item.title} loading="lazy" decoding="async" onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} />
      <span className="model-prompt-overlay">
        <span className="model-prompt-source">
          <strong>{item.authorName}</strong>
          <small>@{item.authorHandle}</small>
        </span>
        <span className="model-prompt-view">{copy.viewPrompt}<ArrowIcon /></span>
      </span>
    </button>
  </article>;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

export default function ModelPromptGallery({ items, copy }) {
  const router = useRouter();
  const { path } = useI18n();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [columnCount, setColumnCount] = useState(3);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const loadTimerRef = useRef(null);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const columns = Array.from({ length: columnCount }, () => []);
  visibleItems.forEach((item, index) => columns[index % columnCount].push({ item, index }));

  useEffect(() => {
    const oneColumn = window.matchMedia("(max-width: 390px)");
    const twoColumns = window.matchMedia("(max-width: 900px)");
    const updateColumns = () => setColumnCount(oneColumn.matches ? 1 : twoColumns.matches ? 2 : 3);
    updateColumns();
    oneColumn.addEventListener("change", updateColumns);
    twoColumns.addEventListener("change", updateColumns);
    return () => {
      oneColumn.removeEventListener("change", updateColumns);
      twoColumns.removeEventListener("change", updateColumns);
    };
  }, []);

  const beginLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loadTimerRef.current) return;
    setLoadingMore(true);
    loadTimerRef.current = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, items.length));
      setLoadingMore(false);
      loadTimerRef.current = null;
    }, 240);
  }, [hasMore, items.length, loadingMore]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) beginLoadMore();
    }, { rootMargin: "240px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [beginLoadMore, hasMore, loadingMore]);

  useEffect(() => () => {
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
  }, []);

  function open(item) {
    setCopied(false);
    setActive(item);
  }

  async function handleCopy() {
    if (active && await copyText(active.prompt)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  function usePrompt() {
    if (!active) return;
    sessionStorage.setItem("freetexttoimage:draft-prompt", active.prompt);
    router.push(path("/"));
  }

  return <>
    <div className="model-prompt-masonry" aria-label={copy.listLabel}>
      {columns.map((column, columnIndex) => <div className="model-prompt-column" key={columnIndex}>
        {column.map(({ item }) => <PromptImageCard item={item} onOpen={open} copy={copy} key={item.id} />)}
      </div>)}
    </div>

    <div className="model-prompt-pagination" ref={loadMoreRef}>
      <p>{copy.showing.replace("{visible}", visibleItems.length).replace("{total}", items.length)}</p>
      {hasMore && <Button variant="outline" onPress={beginLoadMore} isDisabled={loadingMore} aria-busy={loadingMore}>
        {loadingMore ? <><Spinner size="sm" />{copy.loadingMore}</> : <>{copy.loadMore}<ArrowIcon /></>}
      </Button>}
    </div>

    <Modal.Backdrop isOpen={Boolean(active)} onOpenChange={(openState) => { if (!openState) setActive(null); }} className="model-prompt-modal-backdrop">
      <Modal.Container size="full">
        <Modal.Dialog className="model-prompt-modal">
          <Modal.Heading className="model-prompt-modal-heading">{active?.title || copy.details}</Modal.Heading>
          <Modal.CloseTrigger aria-label={copy.close} />
          <Modal.Body>
            {active && <div className="model-prompt-detail">
              <div className="model-prompt-detail-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.coverUrl} alt={active.title} />
              </div>
              <aside className="model-prompt-detail-copy">
                <div className="model-prompt-detail-source">
                  <a className="model-prompt-detail-account" href={active.sourceUrl} target="_blank" rel="noreferrer">
                    <strong>{active.authorName}</strong><small>@{active.authorHandle}</small>
                  </a>
                  <a href={active.sourceUrl} target="_blank" rel="noreferrer">{copy.viewOnX}<ArrowIcon /></a>
                </div>
                <div className="model-prompt-text-block">
                  <div>
                    <span>{copy.prompt}</span>
                    <span className="model-prompt-meta-actions">
                      <span className="model-prompt-type"><Image src={active.modelIcon} alt="" width={14} height={14} />{active.model}</span>
                      <button type="button" onClick={handleCopy}>{copied ? <CheckIcon /> : <CopyIcon />}{copied ? copy.copied : copy.copy}</button>
                    </span>
                  </div>
                  <ScrollShadow className="model-prompt-prompt-scroll" size={28} offset={4}>
                    <p>{active.prompt}</p>
                  </ScrollShadow>
                </div>
                <Button className="primary-button model-prompt-use" fullWidth onPress={usePrompt}>{copy.usePrompt}<ArrowIcon /></Button>
              </aside>
            </div>}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}

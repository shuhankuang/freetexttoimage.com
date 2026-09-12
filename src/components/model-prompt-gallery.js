"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Modal, Spinner } from "@heroui/react";
import { ArrowIcon, CheckIcon, CopyIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

function PromptImageCard({ item, onOpen, copy }) {
  const [status, setStatus] = useState("loading");
  const imageRef = useRef(null);
  const loaded = status === "loaded";
  const cover = item.images[0];

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  return <article className="model-prompt-card">
    <button type="button" className={`model-prompt-image${loaded ? " is-loaded" : status === "error" ? " is-error" : ""}`} style={{ aspectRatio: `${cover.width || 4} / ${cover.height || 5}` }} onClick={() => onOpen(item)} aria-label={copy.open.replace("{title}", item.title)} aria-busy={status === "loading"} disabled={status === "error"}>
      {status !== "loaded" && <span className="model-prompt-loading" aria-hidden={status === "loading"}>
        {status === "loading" ? <Spinner size="sm" /> : copy.imageUnavailable}
      </span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={cover.thumbUrl} alt={item.title} loading="lazy" decoding="async" onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} />
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

function PromptDetailImage({ image, alt, unavailable }) {
  const [status, setStatus] = useState("loading");
  const imageRef = useRef(null);

  useEffect(() => {
    const element = imageRef.current;
    if (!element?.complete) return;
    setStatus(element.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  return <>
    {status !== "loaded" && <span className={`model-prompt-stage-loading${status === "error" ? " is-error" : ""}`} role={status === "error" ? "status" : undefined}>
      {status === "loading" ? <Spinner size="sm" /> : unavailable}
    </span>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      ref={imageRef}
      className={status === "loaded" ? "is-loaded" : ""}
      src={image.displayUrl}
      alt={alt}
      decoding="async"
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
    />
  </>;
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

export default function ModelPromptGallery({ initialItems, initialCursor, model, copy }) {
  const router = useRouter();
  const { path } = useI18n();
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [active, setActive] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [columnCount, setColumnCount] = useState(3);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadMoreRef = useRef(null);
  const hasMore = Boolean(nextCursor);
  const columns = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => columns[index % columnCount].push({ item, index }));

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

  const beginLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadFailed(false);
    try {
      const response = await fetch(`/api/prompts?model=${encodeURIComponent(model)}&cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error("Unable to load prompts");
      const page = await response.json();
      setItems((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(page.nextCursor);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, model, nextCursor]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loadingMore || loadFailed) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) beginLoadMore();
    }, { rootMargin: "240px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [beginLoadMore, hasMore, loadFailed, loadingMore]);

  const stepImage = useCallback((delta) => {
    if (!active || active.images.length < 2) return;
    const currentIndex = active.images.findIndex((image) => image.id === activeImage?.id);
    const nextIndex = ((currentIndex === -1 ? 0 : currentIndex) + delta + active.images.length) % active.images.length;
    setActiveImage(active.images[nextIndex]);
  }, [active, activeImage]);

  useEffect(() => {
    if (!active || active.images.length < 2) return;
    function onKeyDown(event) {
      if (event.key === "ArrowLeft") stepImage(-1);
      else if (event.key === "ArrowRight") stepImage(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, stepImage]);

  function open(item) {
    setCopied(false);
    setActiveImage(item.images[0]);
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
      {loadingMore && <><Spinner size="sm" /><span>{copy.loadingMore}</span></>}
      {loadFailed && <Button variant="outline" onPress={beginLoadMore}>{copy.retry}</Button>}
    </div>

    <Modal.Backdrop isOpen={Boolean(active)} onOpenChange={(openState) => { if (!openState) { setActive(null); setActiveImage(null); } }} className="model-prompt-modal-backdrop">
      <Modal.Container size="full">
        <Modal.Dialog className="model-prompt-modal">
          <Modal.Heading className="model-prompt-modal-heading">{active?.title || copy.details}</Modal.Heading>
          <Modal.CloseTrigger aria-label={copy.close} />
          <Modal.Body>
            {active && <div className="model-prompt-detail">
              <div className="model-prompt-detail-image">
                <div className="model-prompt-detail-stage">
                  <PromptDetailImage key={activeImage?.id} image={activeImage || active.images[0]} alt={active.title} unavailable={copy.imageUnavailable} />
                  {active.images.length > 1 && <>
                    <button type="button" className="model-prompt-stage-nav prev" onClick={() => stepImage(-1)} aria-label={copy.prevImage}><ArrowIcon /></button>
                    <button type="button" className="model-prompt-stage-nav next" onClick={() => stepImage(1)} aria-label={copy.nextImage}><ArrowIcon /></button>
                  </>}
                </div>
                {active.images.length > 1 && <div className="model-prompt-thumbnails" aria-label={copy.imageGallery}>
                  {active.images.map((image, index) => <button type="button" className={image.id === activeImage?.id ? "is-active" : ""} aria-pressed={image.id === activeImage?.id} aria-label={copy.showImage.replace("{number}", index + 1)} onClick={() => setActiveImage(image)} key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.thumbUrl} alt="" loading="lazy" decoding="async" />
                  </button>)}
                </div>}
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
                  <div className="model-prompt-prompt-scroll">
                    {active.promptType === "json" ? <pre>{active.prompt}</pre> : <p>{active.prompt}</p>}
                  </div>
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

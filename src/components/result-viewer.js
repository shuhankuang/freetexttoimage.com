"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal, Spinner } from "@heroui/react";
import ResultInfo from "@/components/result-info";
import { useI18n } from "@/i18n/provider";

function ResultState({ item, t }) {
  if (item?.status === "failed") {
    return <><strong>{t("result.failedTitle")}</strong><span>{item.error || t("result.failedBody")}</span></>;
  }
  return <><strong>{t("result.workingTitle")}</strong><span>{t("result.workingBody")}</span></>;
}

export default function ResultViewer({ item, isOpen, onOpenChange, actions }) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [loadedItemId, setLoadedItemId] = useState(item?.id);

  // 切换到另一张图（或复用同一个 item 再次打开）时重置成"没加载完"，不然会残留上一张图的
  // loaded=true、直接跳过 loading/淡入效果。在渲染期间做这个调整而不是 useEffect，
  // 避免多一次渲染后才重置导致的闪烁。loadedItemId 必须原样存 item?.id（可以是
  // undefined），不能拿 ?? null 之类的方式改写——否则 item 为 null 时 item?.id 永远是
  // undefined、跟被改写过的 loadedItemId 永远对不上，条件永远为真，直接死循环
  // （刚才那次报错 "Too many re-renders" 就是这个原因）。
  if (item?.id !== loadedItemId) {
    setLoadedItemId(item?.id);
    setLoaded(false);
  }

  return (
    <Modal.Backdrop
      className="result-viewer-backdrop"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      variant="opaque"
    >
      <Modal.Container size="full">
        <Modal.Dialog className="result-viewer-dialog">
          <Modal.Heading className="result-viewer-title">{t("result.details")}</Modal.Heading>
          <Modal.CloseTrigger aria-label={t("result.close")} />
          <Modal.Body>
            {item && (
              <div className="result-viewer">
                <div className="result-canvas">
                  {item.image ? (
                    <>
                      {!loaded && <div className="result-canvas-loading" aria-hidden="true"><Spinner /></div>}
                      <Image
                        key={item.id}
                        src={item.image}
                        alt={item.prompt || item.title || t("result.imageAlt")}
                        fill
                        sizes="(max-width: 760px) 100vw, 66vw"
                        unoptimized
                        className={loaded ? "is-loaded" : undefined}
                        onLoad={() => setLoaded(true)}
                      />
                    </>
                  ) : (
                    <div className="result-state"><ResultState item={item} t={t} /></div>
                  )}
                </div>
                <ResultInfo
                  prompt={item.prompt}
                  model={item.model}
                  ratio={item.ratio}
                  createdAt={item.createdAt}
                  image={item.image}
                  downloadUrl={item.id ? `/api/images/${encodeURIComponent(item.id)}?download=1` : item.image}
                  actions={actions}
                />
              </div>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

"use client";

import Image from "next/image";
import { Modal } from "@heroui/react";
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
                    <Image
                      src={item.image}
                      alt={item.prompt || item.title || t("result.imageAlt")}
                      fill
                      sizes="(max-width: 760px) 100vw, 66vw"
                      unoptimized
                    />
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

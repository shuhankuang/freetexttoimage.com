"use client";

import Image from "next/image";
import { Modal } from "@heroui/react";
import ResultInfo from "@/components/result-info";

function ResultState({ item }) {
  if (item?.status === "failed") {
    return <><strong>Generation failed</strong><span>Try again with a different prompt.</span></>;
  }
  return <><strong>Still working…</strong><span>Your image is being generated.</span></>;
}

export default function ResultViewer({ item, isOpen, onOpenChange, actions }) {
  return (
    <Modal.Backdrop
      className="result-viewer-backdrop"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      variant="opaque"
    >
      <Modal.Container size="full">
        <Modal.Dialog className="result-viewer-dialog">
          <Modal.Heading className="result-viewer-title">Generated image details</Modal.Heading>
          <Modal.CloseTrigger aria-label="Close image viewer" />
          <Modal.Body>
            {item && (
              <div className="result-viewer">
                <div className="result-canvas">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.prompt || item.title || "Generated image"}
                      fill
                      sizes="(max-width: 760px) 100vw, 66vw"
                      unoptimized
                    />
                  ) : (
                    <div className="result-state"><ResultState item={item} /></div>
                  )}
                </div>
                <ResultInfo
                  prompt={item.prompt}
                  model={item.model}
                  ratio={item.ratio}
                  createdAt={item.createdAt}
                  image={item.image}
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

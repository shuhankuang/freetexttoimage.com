"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ArrowIcon, CheckIcon, CopyIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export default function ImagePromptExamplesGallery({ copy, items }) {
  const router = useRouter();
  const { path } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const active = items[activeIndex];

  function select(index) {
    setActiveIndex(index);
    setCopied(false);
  }

  function move(direction) {
    select((activeIndex + direction + items.length) % items.length);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(active.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function usePrompt() {
    sessionStorage.setItem("freetexttoimage:draft-prompt", active.prompt);
    router.push(path("/"));
  }

  return <div className="image-prompt-example-browser">
    <div className="image-prompt-example-nav">
      <span>{String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
      <button className="is-previous" type="button" onClick={() => move(-1)} aria-label={copy.previous}><ArrowIcon /></button>
      <button type="button" onClick={() => move(1)} aria-label={copy.next}><ArrowIcon /></button>
    </div>

    <div className="image-prompt-example-stage">
      <div className="image-prompt-example-main-image">
        <Image key={active.src} src={active.src} alt={active.alt} fill sizes="(max-width: 800px) 100vw, 42vw" />
      </div>
      <article className="image-prompt-example-result">
        <div className="image-prompt-example-result-heading">
          <div><h3>{copy.promptLabel}</h3><p>{active.title}</p></div>
          <Button size="sm" variant="ghost" onPress={copyPrompt} aria-label={copied ? copy.copied : copy.copy}>
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}{copied ? copy.copied : copy.copy}
          </Button>
        </div>
        <p>{active.prompt}</p>
        <div className="image-prompt-example-actions">
          <Button className="primary-button image-prompt-example-use" fullWidth onPress={usePrompt}>
            {copy.usePrompt}<ArrowIcon />
          </Button>
        </div>
      </article>
    </div>

    <div className="image-prompt-example-thumbnails">
      {items.map((item, index) => <button
        key={item.src}
        type="button"
        className={index === activeIndex ? "is-active" : ""}
        aria-pressed={index === activeIndex}
        aria-label={item.title}
        onClick={() => select(index)}
      >
        <Image src={item.src} alt="" fill sizes="(max-width: 620px) 22vw, 230px" />
        <span>{item.title}</span>
      </button>)}
    </div>
  </div>;
}

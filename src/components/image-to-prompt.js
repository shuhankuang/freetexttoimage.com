"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import {
  ArrowIcon, CheckIcon, CopyIcon, ImageIcon, ImagePlusIcon, SparkIcon, TrashIcon,
} from "@/components/ui";
import Steps from "@/components/blocks/steps";

const GUIDE_STEP_KEYS = ["upload", "analyze", "create"];

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 3.5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await canvasBlob(canvas, 0.88);
  if (blob?.size > MAX_REQUEST_BYTES) blob = await canvasBlob(canvas, 0.72);
  if (!blob || blob.size > MAX_REQUEST_BYTES) throw new Error("too-large");
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

export default function ImageToPrompt() {
  const inputRef = useRef(null);
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (image?.preview) URL.revokeObjectURL(image.preview); }, [image]);

  async function selectFile(file) {
    if (!file || pending || preparing) return;
    setError("");
    setPrompt("");
    setCopied(false);
    if (!ACCEPTED_TYPES.has(file.type)) return setError(t("imageToPrompt.errors.type"));
    if (file.size > MAX_SOURCE_BYTES) return setError(t("imageToPrompt.errors.size"));
    setPreparing(true);
    try {
      const processed = await prepareImage(file);
      setImage((current) => {
        if (current?.preview) URL.revokeObjectURL(current.preview);
        return { file: processed, name: file.name, size: file.size, preview: URL.createObjectURL(file) };
      });
    } catch {
      setError(t("imageToPrompt.errors.read"));
    } finally {
      setPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage() {
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
    setPrompt("");
    setError("");
  }

  async function generatePrompt() {
    if (!image || pending) return;
    setPending(true);
    setError("");
    setCopied(false);
    try {
      const formData = new FormData();
      formData.append("image", image.file);
      formData.append("locale", locale);
      const response = await fetch("/api/image-to-prompt", { method: "POST", body: formData });
      if (response.status === 401) {
        router.push(`${path("/login")}?redirect=${encodeURIComponent(path("/image-to-prompt"))}`);
        return;
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.prompt) throw new Error("generate-failed");
      setPrompt(body.prompt);
    } catch {
      setError(t("imageToPrompt.errors.generate"));
    } finally {
      setPending(false);
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(t("imageToPrompt.errors.copy"));
    }
  }

  function createWithPrompt() {
    sessionStorage.setItem("freetexttoimage:draft-prompt", prompt);
    router.push(path("/"));
  }

  return <>
    <div className="image-prompt-workspace">
      <Card className="image-prompt-card image-upload-card"><Card.Content>
        <div className="image-prompt-card-heading">
          <span className="workflow-step-marker">01</span>
          <div><strong>{t("imageToPrompt.uploadTitle")}</strong><p>{t("imageToPrompt.uploadBody")}</p></div>
        </div>
        <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={pending || preparing} onChange={(event) => selectFile(event.target.files?.[0])} />
        {image ? <>
          <div className="image-prompt-preview">
            <Image src={image.preview} alt={t("imageToPrompt.previewAlt")} fill sizes="(max-width: 800px) 90vw, 42vw" unoptimized />
          </div>
          <div className="image-prompt-file">
            <span className="image-prompt-file-icon"><ImageIcon /></span>
            <div><strong title={image.name}>{image.name}</strong><small>{formatBytes(image.size)} · {t("imageToPrompt.fileSupport")}</small></div>
            <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => inputRef.current?.click()}>{t("imageToPrompt.replace")}</Button>
            <Button isIconOnly size="sm" variant="secondary" isDisabled={pending} aria-label={t("imageToPrompt.remove")} onPress={removeImage}><TrashIcon /></Button>
          </div>
        </> : <button
          type="button"
          className={`image-prompt-dropzone${dragging ? " dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
        >
          <span className="image-prompt-empty-icon"><ImagePlusIcon size={23} /></span>
          <strong>{preparing ? t("imageToPrompt.preparing") : t("imageToPrompt.dropTitle")}</strong>
          <small>{t("imageToPrompt.dropBody")}</small>
        </button>}
        <Button fullWidth size="lg" className="primary-button image-prompt-generate" isPending={pending || preparing} isDisabled={!image || preparing} onPress={generatePrompt}>
          {pending ? <><Spinner size="sm" color="current" />{t("imageToPrompt.analyzing")}</> : <><SparkIcon />{t("imageToPrompt.generate")}<ArrowIcon /></>}
        </Button>
      </Card.Content></Card>

      <Card className="image-prompt-card image-prompt-result-card"><Card.Content>
        <div className="image-prompt-heading-row">
          <div className="image-prompt-card-heading">
            <span className="workflow-step-marker">02</span>
            <div><strong>{t("imageToPrompt.resultTitle")}</strong><p>{t("imageToPrompt.resultBody")}</p></div>
          </div>
          {(prompt || pending) && <span className={`image-prompt-status${pending ? " pending" : ""}`}>
            {pending ? <Spinner size="sm" /> : <CheckIcon size={16} />}
            {pending ? t("imageToPrompt.analyzing") : t("imageToPrompt.analyzed")}
          </span>}
        </div>

        <div className={`image-prompt-output${prompt ? " has-prompt" : ""}`}>
          {prompt ? <p>{prompt}</p> : <div className="image-prompt-empty">
            <span className="image-prompt-empty-icon">{pending ? <Spinner size="sm" /> : <SparkIcon size={22} />}</span>
            <p>{pending ? t("imageToPrompt.analyzingBody") : t("imageToPrompt.empty")}</p>
          </div>}
        </div>

        {prompt && <div className="image-prompt-actions">
          <Button variant="secondary" isDisabled={pending} onPress={copyPrompt}>
            {copied ? <CheckIcon size={17} /> : <CopyIcon size={17} />}{copied ? t("imageToPrompt.copied") : t("imageToPrompt.copy")}
          </Button>
          <Button className="primary-button" isDisabled={pending} onPress={createWithPrompt}>{t("imageToPrompt.usePrompt")}<ArrowIcon /></Button>
        </div>}
      </Card.Content></Card>
    </div>

    {error && <p className="image-prompt-error" role="alert">{error}</p>}

    <Steps
      label={t("imageToPrompt.guideLabel")}
      steps={GUIDE_STEP_KEYS.map((key) => ({
        title: t(`imageToPrompt.guide.${key}Title`),
        body: t(`imageToPrompt.guide.${key}Body`),
      }))}
    />
    <p className="image-prompt-note">{t("imageToPrompt.note")} <Link href={path("/privacy")}>{t("imageToPrompt.privacy")}</Link></p>
  </>;
}

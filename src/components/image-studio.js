"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Label, Spinner, TextArea } from "@heroui/react";
import ImageSettingsPopover from "@/components/image-settings-popover";
import ModelPickerPopover from "@/components/model-picker-popover";
import InspirationGallery from "@/components/inspiration-gallery";
import ResultViewer from "@/components/result-viewer";
import { useI18n } from "@/i18n/provider";
import { ArrowIcon, CheckIcon, CoinsIcon, DiceIcon, ImagePlusIcon, NoCardIcon, SparkIcon, SparklesIcon } from "@/components/ui";
import Hero from "@/components/blocks/hero";

const suggestions = ["A glass house in a misty pine forest at dawn", "An editorial portrait lit by a soft red neon sign", "A quiet coastal village painted in loose watercolors"];
const FALLBACK_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 150; // ~5 分钟，与服务端观察窗口一致

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ImageStudio({ models = [], defaultModel = "z-image", howItWorks = null, modelShowcase = null }) {
  const router = useRouter(); const fileInput = useRef(null);
  const { messages, path, t } = useI18n();
  const [prompt, setPrompt] = useState(""); const [model, setModel] = useState(defaultModel); const [ratio, setRatio] = useState("1:1"); const [imageCount, setImageCount] = useState(1);
  const [reference, setReference] = useState(null); const [pending, setPending] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState(""); const [creditsShort, setCreditsShort] = useState(false);

  // —— 当前模型的能力声明（来自 /studio/page.js 注入的注册表；加模型自动生效）——
  const modelOptions = models.map(({ id, label, icon }) => ({ value: id, label, icon }));
  const activeSpec = models.find((spec) => spec.id === model) || {};
  const ratioOptions = (activeSpec.aspectRatios?.length ? activeSpec.aspectRatios : FALLBACK_RATIOS).map((value) => ({ value, label: value }));
  const maxPrompt = activeSpec.promptMax || 2000;

  useEffect(() => {
    const draft = sessionStorage.getItem("freetexttoimage:draft-prompt");
    if (!draft) return;
    const timer = window.setTimeout(() => {
      setPrompt(draft.slice(0, maxPrompt));
      sessionStorage.removeItem("freetexttoimage:draft-prompt");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [maxPrompt]);

  // 切模型时把超长 prompt 截到新上限、把不支持的比例复位为默认第一个。
  function selectModel(next) {
    setModel(next);
    const spec = models.find((m) => m.id === next);
    const cap = spec?.promptMax || 2000;
    if (spec && prompt.length > cap) setPrompt(prompt.slice(0, cap));
    const ratios = spec?.aspectRatios;
    if (ratios && !ratios.includes(ratio)) setRatio(ratios[0]);
  }

  useEffect(() => () => { if (reference?.url?.startsWith("blob:")) URL.revokeObjectURL(reference.url); }, [reference]);
  function attach(event) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setError(t("studio.errors.referenceSize")); return; } setReference({ name: file.name, url: URL.createObjectURL(file) }); setError(""); }
  function surprise() { setPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]); setError(""); }
  async function generate() {
    if (!prompt.trim()) { setError(t("studio.errors.promptRequired")); return; }
    setPending(true); setError(""); setCreditsShort(false);
    try {
      // 1) 提交生成任务 → 拿回 status=processing 的 creation
      const response = await fetch("/api/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model, ratio }),
      });
      if (response.status === 401) { router.replace(path("/login")); return; }
      if (response.status === 402) {
        const body = await response.json().catch(() => ({}));
        // 余额不足：保留 prompt，不当成通用生成失败处理。
        setError(t("studio.errors.insufficientCredits", { cost: body.cost ?? "?", balance: body.balance ?? 0 }));
        setCreditsShort(true);
        return;
      }
      if (!response.ok) {
        throw new Error(t("studio.errors.generate"));
      }
      const creation = await response.json();

      // 2) 轮询直到 succeeded / failed（生成是异步的，可能几十秒）
      const finished = await waitForCreation(creation.id);
      if (finished.status === "failed") throw new Error(t("studio.errors.failed"));
      setResult(finished);
    } catch (err) {
      const knownErrors = Object.values(messages.studio.errors);
      setError(knownErrors.includes(err?.message) ? err.message : t("studio.errors.generate"));
    } finally {
      setPending(false);
      // 无论成功/失败/余额不足，积分状态都可能变了（扣款确认或失败退款），通知顶栏刷新。
      window.dispatchEvent(new Event("credits:refresh"));
    }
  }
  async function waitForCreation(id) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const res = await fetch(`/api/creations/${id}`);
      if (!res.ok) {
        if (res.status === 401) { router.replace(path("/login")); throw new Error(t("studio.errors.signIn")); }
        throw new Error(t("studio.errors.connection"));
      }
      const current = await res.json();
      if (current.status === "succeeded" || current.status === "failed") return current;
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(t("studio.errors.timeout"));
  }
  function choosePrompt(value) { setPrompt(value); setError(""); document.getElementById("image-prompt")?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <main className="workspace-page image-studio">
    <Hero
      headingLevel="h1"
      label={t("studio.section")}
      title={t("studio.title")}
      accent={t("studio.titleAccent")}
      subtitle={t("studio.subtitle")}
      icon={<SparkIcon className="title-flower" size={24} />}
    />
    <Card className="generator-card"><Card.Content>
      <div className="composer-heading"><Label htmlFor="image-prompt" className="prompt-label"><SparkIcon />{t("studio.promptLabel")}</Label><Button variant="ghost" onPress={surprise}><DiceIcon />{t("studio.surprise")}</Button></div>
      <TextArea id="image-prompt" maxLength={maxPrompt} fullWidth rows={3} value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(""); }} placeholder={t("studio.placeholder")} className="generator-textarea rounded-none" />
      <div className="generator-meta"><input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={attach} /><Button variant="ghost" onPress={() => fileInput.current.click()}><ImagePlusIcon />{t("studio.addReference")}</Button><span>{prompt.length} / {maxPrompt}</span></div>
      {reference && <div className="reference-preview"><Image src={reference.url} alt={t("studio.referencePreview")} width={64} height={64} unoptimized /><div><strong>{reference.name}</strong><span>{t("studio.referenceImage")}</span></div><Button size="sm" variant="ghost" onPress={() => setReference(null)}>{t("studio.remove")}</Button></div>}
      {error && <p className="inline-error" role="alert">{error}{creditsShort && <Link href={path("/pricing")}> {t("studio.viewPricing")}</Link>}</p>}
    </Card.Content><Card.Footer className="generator-footer">
      <div className="generator-settings"><ModelPickerPopover label={t("studio.model")} value={model} onChange={selectModel} options={modelOptions} /><ImageSettingsPopover ratios={ratioOptions.map((option) => option.value)} ratio={ratio} onRatioChange={setRatio} quality={activeSpec.qualityLabel || "Standard"} count={imageCount} onCountChange={setImageCount} /></div>
      <div className="generator-submit">
        <span className="submit-cost"><CoinsIcon size={18} />{activeSpec.creditCost || 1}</span>
        <Button size="lg" className="primary-button" isPending={pending} onPress={generate}>{pending ? <><Spinner color="current" size="sm" /> {t("studio.creating")}</> : <><SparkIcon /> {t("studio.generate")} <ArrowIcon /></>}</Button>
      </div>
    </Card.Footer></Card>
    <div className="studio-footnote"><span className="ft-item"><CheckIcon size={14} />{t("studio.freeToTry")}</span><span className="ft-dot">·</span><span className="ft-item"><NoCardIcon size={15} />{t("studio.noCard")}</span><span className="ft-dot">·</span><span className="ft-item"><SparklesIcon size={14} />{t("studio.quality")}</span></div>
    {howItWorks}
    <InspirationGallery onChoose={choosePrompt} />
    {modelShowcase}
    <ResultViewer item={result} isOpen={!!result} onOpenChange={(open) => { if (!open) setResult(null); }} />
  </main>;
}

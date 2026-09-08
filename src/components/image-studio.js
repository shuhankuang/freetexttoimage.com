"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, Label, Modal, Spinner, TextArea } from "@heroui/react";
import SettingSelect from "@/components/setting-select";
import InspirationGallery from "@/components/inspiration-gallery";
import ResultInfo from "@/components/result-info";
import { ArrowIcon, CheckIcon, DiceIcon, ImagePlusIcon, NoCardIcon, SparkIcon, SparklesIcon } from "@/components/ui";

const suggestions = ["A glass house in a misty pine forest at dawn", "An editorial portrait lit by a soft red neon sign", "A quiet coastal village painted in loose watercolors"];
const FALLBACK_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 150; // ~5 分钟，与服务端观察窗口一致

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ImageStudio({ models = [], defaultModel = "z-image" }) {
  const router = useRouter(); const fileInput = useRef(null);
  const [prompt, setPrompt] = useState(""); const [model, setModel] = useState(defaultModel); const [ratio, setRatio] = useState("1:1");
  const [reference, setReference] = useState(null); const [pending, setPending] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState("");

  // —— 当前模型的能力声明（来自 /studio/page.js 注入的注册表；加模型自动生效）——
  const modelOptions = models.map(({ id, label }) => ({ value: id, label }));
  const activeSpec = models.find((spec) => spec.id === model) || {};
  const ratioOptions = (activeSpec.aspectRatios?.length ? activeSpec.aspectRatios : FALLBACK_RATIOS).map((value) => ({ value, label: value }));
  const maxPrompt = activeSpec.promptMax || 2000;

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
  function attach(event) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setError("Reference images must be smaller than 10 MB."); return; } setReference({ name: file.name, url: URL.createObjectURL(file) }); setError(""); }
  function surprise() { setPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]); setError(""); }
  async function generate() {
    if (!prompt.trim()) { setError("Describe the image you want to create."); return; }
    setPending(true); setError("");
    try {
      // 1) 提交生成任务 → 拿回 status=processing 的 creation
      const response = await fetch("/api/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model, ratio }),
      });
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Generation failed. Please try again.");
      }
      const creation = await response.json();

      // 2) 轮询直到 succeeded / failed（生成是异步的，可能几十秒）
      const finished = await waitForCreation(creation.id);
      if (finished.status === "failed") throw new Error("The image generation failed. Please tweak your prompt and try again.");
      setResult(finished);
    } catch (err) {
      setError(err?.message || "Generation failed. Please try again.");
    } finally {
      setPending(false);
    }
  }
  async function waitForCreation(id) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const res = await fetch(`/api/creations/${id}`);
      if (!res.ok) {
        if (res.status === 401) { router.replace("/login"); throw new Error("Please sign in to continue."); }
        throw new Error("Lost connection while generating. Your image may still be processing — check My creations in a moment.");
      }
      const current = await res.json();
      if (current.status === "succeeded" || current.status === "failed") return current;
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error("This one is taking longer than expected. Check My creations in a minute — your image may still appear.");
  }
  function choosePrompt(value) { setPrompt(value); setError(""); document.getElementById("image-prompt")?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <main className="workspace-page image-studio">
    <div className="creative-heading"><span className="section-label"><span className="tiny-dot" />FREE AI TEXT TO IMAGE GENERATOR</span><h1>Turn Text Into Images. <em>Bring Your Ideas to Life.</em><SparkIcon className="title-flower" size={24} /></h1><p>Create high-quality AI images from any text prompt in seconds.</p></div>
    <Card className="generator-card"><Card.Content>
      <div className="composer-heading"><Label htmlFor="image-prompt" className="prompt-label"><SparkIcon />Describe the image you want to create</Label><Button variant="ghost" onPress={surprise}><DiceIcon />Surprise me</Button></div>
      <TextArea id="image-prompt" maxLength={maxPrompt} fullWidth rows={3} value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(""); }} placeholder="A sun-drenched villa on the edge of a quiet sea, soft linen curtains dancing in the breeze..." className="generator-textarea rounded-none" />
      <div className="generator-meta"><input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={attach} /><Button variant="ghost" onPress={() => fileInput.current.click()}><ImagePlusIcon />Add reference image</Button><span>{prompt.length} / {maxPrompt}</span></div>
      {reference && <div className="reference-preview"><Image src={reference.url} alt="Reference preview" width={64} height={64} unoptimized /><div><strong>{reference.name}</strong><span>Reference image</span></div><Button size="sm" variant="ghost" onPress={() => setReference(null)}>Remove</Button></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </Card.Content><Card.Footer className="generator-footer">
      <div className="generator-settings"><SettingSelect className="style-select" label="Model" value={model} onChange={selectModel} options={modelOptions} /><SettingSelect className="ratio-select" label="Aspect ratio" value={ratio} onChange={setRatio} options={ratioOptions} /><span className="image-count"><SparkIcon size={15} />1 image</span></div>
      <Button size="lg" className="primary-button" isPending={pending} onPress={generate}>{pending ? <><Spinner color="current" size="sm" /> Creating…</> : <><SparkIcon /> Generate image <ArrowIcon /></>}</Button>
    </Card.Footer></Card>
    <div className="studio-footnote"><span className="ft-item"><CheckIcon size={14} />Free to try</span><span className="ft-dot">·</span><span className="ft-item"><NoCardIcon size={15} />No credit card required</span><span className="ft-dot">·</span><span className="ft-item"><SparklesIcon size={14} />High-quality AI images</span></div>
    <InspirationGallery onChoose={choosePrompt} />
    <Modal.Backdrop isOpen={!!result} onOpenChange={(open) => { if (!open) setResult(null); }}><Modal.Container size="lg"><Modal.Dialog className="result-dialog rounded-xl"><Modal.CloseTrigger /><Modal.Body>{result && <div className="result-grid"><Image src={result.image} alt={result.prompt} width={800} height={800} unoptimized /><ResultInfo eyebrow="CREATION READY" prompt={result.prompt} model={result.model} ratio={result.ratio} createdAt={result.createdAt} actions={<><Button className="primary-button" onPress={() => router.push("/creations")}>View in library <ArrowIcon /></Button><Button variant="outline" slot="close">Create another</Button></>} /></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </main>;
}

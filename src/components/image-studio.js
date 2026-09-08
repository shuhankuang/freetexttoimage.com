"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, Label, Modal, Spinner, TextArea } from "@heroui/react";
import SettingSelect from "@/components/setting-select";
import InspirationGallery from "@/components/inspiration-gallery";
import { ArrowIcon, PlusIcon, SparkIcon } from "@/components/ui";
import { getSession, saveCreation } from "@/lib/store";

const imagePool = ["dunes", "architecture", "flowers", "forest", "coast", "mountain", "portrait"];
const suggestions = ["A glass house in a misty pine forest at dawn", "An editorial portrait lit by a soft red neon sign", "A quiet coastal village painted in loose watercolors"];
const styles = ["Cinematic", "Photographic", "Editorial", "Illustration", "3D render"].map((value) => ({ value, label: value }));
const ratios = ["1:1", "4:3", "16:9", "9:16"].map((value) => ({ value, label: value }));

export default function ImageStudio() {
  const router = useRouter(); const fileInput = useRef(null);
  const [prompt, setPrompt] = useState(""); const [style, setStyle] = useState("Cinematic"); const [ratio, setRatio] = useState("1:1");
  const [reference, setReference] = useState(null); const [pending, setPending] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState("");
  useEffect(() => () => { if (reference?.url?.startsWith("blob:")) URL.revokeObjectURL(reference.url); }, [reference]);
  function attach(event) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setError("Reference images must be smaller than 10 MB."); return; } setReference({ name: file.name, url: URL.createObjectURL(file) }); setError(""); }
  function surprise() { setPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]); setError(""); }
  function generate() {
    if (!prompt.trim()) { setError("Describe the image you want to create."); return; }
    const session = getSession(); if (!session) { router.replace("/login"); return; }
    setPending(true); setError("");
    window.setTimeout(() => {
      const image = imagePool[Math.floor(Math.random() * imagePool.length)];
      const creation = { id: crypto.randomUUID(), title: prompt.trim().split(/\s+/).slice(0, 5).join(" "), prompt: prompt.trim(), style, ratio, image: `/gallery/${image}.jpg`, createdAt: new Date().toISOString() };
      saveCreation(session.email, creation); setResult(creation); setPending(false);
    }, 900);
  }
  function choosePrompt(value) { setPrompt(value); setError(""); document.getElementById("image-prompt")?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <main className="workspace-page image-studio">
    <div className="creative-heading"><span className="section-label"><span className="tiny-dot" />A LITTLE IMAGINATION. ENDLESS POSSIBILITIES.</span><h1>You imagine it. <em>We bring it to life.</em><span className="title-flower">✳</span></h1><p>Turn the ideas in your head into images you can&apos;t stop looking at.</p></div>
    <Card className="generator-card"><Card.Content>
      <div className="composer-heading"><Label htmlFor="image-prompt" className="prompt-label"><SparkIcon />Your imagination starts here</Label><Button variant="ghost" onPress={surprise}><SparkIcon size={15} />Surprise me</Button></div>
      <TextArea id="image-prompt" maxLength={2000} fullWidth rows={3} value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(""); }} placeholder="A sun-drenched villa on the edge of a quiet sea, soft linen curtains dancing in the breeze..." className="generator-textarea" />
      <div className="generator-meta"><input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={attach} /><Button variant="ghost" onPress={() => fileInput.current.click()}><PlusIcon />Add reference image</Button><span>{prompt.length} / 2,000</span></div>
      {reference && <div className="reference-preview"><Image src={reference.url} alt="Reference preview" width={64} height={64} unoptimized /><div><strong>{reference.name}</strong><span>Reference image</span></div><Button size="sm" variant="ghost" onPress={() => setReference(null)}>Remove</Button></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </Card.Content><Card.Footer className="generator-footer">
      <div className="generator-settings"><SettingSelect label="Style" value={style} onChange={setStyle} options={styles} /><SettingSelect label="Aspect ratio" value={ratio} onChange={setRatio} options={ratios} /><span className="image-count"><SparkIcon size={15} />1 image</span></div>
      <Button size="lg" className="primary-button" isPending={pending} onPress={generate}>{pending ? <><Spinner color="current" size="sm" /> Creating…</> : <><SparkIcon /> Generate image <ArrowIcon /></>}</Button>
    </Card.Footer></Card>
    <div className="studio-footnote"><span>✓ Made for your next “what if”</span><span>·</span><span>Demo generation · Curated images</span></div>
    <InspirationGallery onChoose={choosePrompt} />
    <Modal.Backdrop isOpen={!!result} onOpenChange={(open) => { if (!open) setResult(null); }}><Modal.Container size="lg"><Modal.Dialog className="result-dialog"><Modal.CloseTrigger /><Modal.Body>{result && <div className="result-grid"><Image src={result.image} alt={result.title} width={800} height={800} /><div><span className="section-label">CREATION READY</span><Modal.Heading>{result.title}</Modal.Heading><p>{result.prompt}</p><div className="result-tags"><span>{result.style}</span><span>{result.ratio}</span></div><div className="result-actions"><Button className="primary-button" onPress={() => router.push("/creations")}>View in library <ArrowIcon /></Button><Button variant="outline" slot="close">Create another</Button></div></div></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </main>;
}

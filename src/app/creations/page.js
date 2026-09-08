"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Card, Modal, Spinner } from "@heroui/react";
import { ArrowIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

function CreationImage({ item, onClick }) {
  if (item.image) {
    return <button className="creation-image" onClick={onClick}><Image src={item.image} alt={item.title} width={700} height={700} unoptimized /></button>;
  }
  // 还在生成 / 失败：暂无图片，给占位
  const failed = item.status === "failed";
  return (
    <button className="creation-image" onClick={onClick}>
      <span className="creation-state">{failed ? <><TrashIcon size={14} />Generation failed</> : <><Spinner size="sm" color="current" />Generating…</>}</span>
    </button>
  );
}

function CreationState({ item }) {
  if (!item.image) {
    if (item.status === "failed") return <><strong>Generation failed</strong><span>This image didn&apos;t make it. Delete it and try again with a new prompt.</span></>;
    return <><strong>Still working…</strong><span>Your image is being generated. Check back here in a moment.</span></>;
  }
  return null;
}

export default function CreationsPage() {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/creations")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [signedIn]);

  async function remove(id) {
    setSelected(null);
    try {
      await fetch(`/api/creations/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch { /* 删除失败静默保留，下次刷新同步 */ }
  }

  if (isPending || (signedIn && loading)) {
    return <main className="workspace-page"><div className="screen-loader"><Spinner /><span>Loading your creations…</span></div></main>;
  }

  return <main className="workspace-page">
    <div className="page-title"><div><span className="section-label">LIBRARY</span><h1>My creations</h1><p>Every generated image, together with the prompt that made it.</p></div><Link className="link-button primary-button" href="/studio"><PlusIcon /> New image</Link></div>
    {items.length > 0 && <><div className="library-summary"><span><strong>{items.length}</strong> creations</span><span>Saved to your account</span></div><div className="creation-grid">{items.map((item) => <Card key={item.id} className="creation-card"><CreationImage item={item} onClick={() => setSelected(item)} /><Card.Content><div><span>{item.style} · {item.ratio}</span><time>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.createdAt))}</time></div><Card.Title>{item.title}</Card.Title><Card.Description>{item.prompt}</Card.Description></Card.Content><Card.Footer><Button size="sm" variant="ghost" onPress={() => setSelected(item)}>View details <ArrowIcon /></Button></Card.Footer></Card>)}</div></>}
    {items.length === 0 && <div className="empty-library"><span><ImageIcon /></span><h2>Your library is empty</h2><p>Generate your first image and it will appear here with its prompt and settings.</p><Link className="link-button primary-button" href="/studio">Create an image <ArrowIcon /></Link></div>}
    <Modal.Backdrop isOpen={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><Modal.Container size="lg"><Modal.Dialog className="result-dialog"><Modal.CloseTrigger /><Modal.Body>{selected && <div className="result-grid">{selected.image ? <Image src={selected.image} alt={selected.title} width={800} height={800} unoptimized /> : <div className="result-state"><CreationState item={selected} /></div>}<div><span className="section-label">CREATION DETAILS</span><Modal.Heading>{selected.title}</Modal.Heading><p>{selected.prompt}</p><div className="result-tags"><span>{selected.style}</span><span>{selected.ratio}</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div><div className="result-actions"><Button variant="danger" onPress={() => remove(selected.id)}><TrashIcon /> Delete</Button><Button variant="outline" slot="close">Close</Button></div></div></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </main>;
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Card, Modal } from "@heroui/react";
import { ArrowIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/ui";
import { deleteCreation, getSession } from "@/lib/store";
import { useLocalData } from "@/components/use-local-data";

export default function CreationsPage() {
  const [selected, setSelected] = useState(null);
  const { value: user } = useLocalData("forma.session");
  const { value, ready } = useLocalData(`forma.creations.${user?.email?.toLowerCase() || ""}`);
  const items = Array.isArray(value) ? value : [];
  function remove(id) { const session = getSession(); if (!session) return; deleteCreation(session.email, id); window.dispatchEvent(new Event("forma:data")); setSelected(null); }
  return <main className="workspace-page">
    <div className="page-title"><div><span className="section-label">LIBRARY</span><h1>My creations</h1><p>Every generated image, together with the prompt that made it.</p></div><Link className="link-button primary-button" href="/studio"><PlusIcon /> New image</Link></div>
    {ready && items.length > 0 && <><div className="library-summary"><span><strong>{items.length}</strong> creations</span><span>Stored in this browser</span></div><div className="creation-grid">{items.map((item) => <Card key={item.id} className="creation-card"><button className="creation-image" onClick={() => setSelected(item)}><Image src={item.image} alt={item.title} width={700} height={700} /></button><Card.Content><div><span>{item.style} · {item.ratio}</span><time>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.createdAt))}</time></div><Card.Title>{item.title}</Card.Title><Card.Description>{item.prompt}</Card.Description></Card.Content><Card.Footer><Button size="sm" variant="ghost" onPress={() => setSelected(item)}>View details <ArrowIcon /></Button></Card.Footer></Card>)}</div></>}
    {ready && items.length === 0 && <div className="empty-library"><span><ImageIcon /></span><h2>Your library is empty</h2><p>Generate your first image and it will appear here with its prompt and settings.</p><Link className="link-button primary-button" href="/studio">Create an image <ArrowIcon /></Link></div>}
    <Modal.Backdrop isOpen={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><Modal.Container size="lg"><Modal.Dialog className="result-dialog"><Modal.CloseTrigger /><Modal.Body>{selected && <div className="result-grid"><Image src={selected.image} alt={selected.title} width={800} height={800} /><div><span className="section-label">CREATION DETAILS</span><Modal.Heading>{selected.title}</Modal.Heading><p>{selected.prompt}</p><div className="result-tags"><span>{selected.style}</span><span>{selected.ratio}</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div><div className="result-actions"><Button variant="danger" onPress={() => remove(selected.id)}><TrashIcon /> Delete</Button><Button variant="outline" slot="close">Close</Button></div></div></div>}</Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </main>;
}

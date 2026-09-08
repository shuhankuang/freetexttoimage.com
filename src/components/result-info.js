"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, SparkIcon } from "@/components/ui";

// 生成结果弹窗（studio 与 creations 共用）右侧信息面板：
// 眉标 + 标题 + 「提示语块（可一键复制）」+ 生成参数徽章 + 动作区。
// model / ratio / createdAt 由父级从作品记录传入——model 已是服务端装饰好的可读标签。

// 剪贴板：优先 navigator.clipboard（localhost/https 可用），失败退回 execCommand。
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function ResultInfo({ eyebrow, title, prompt, model, ratio, createdAt, actions }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!prompt) return;
    if (await copyText(prompt)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const meta = [
    model && { key: "model", label: "Model", value: model },
    ratio && { key: "ratio", label: "Aspect ratio", value: ratio },
    formatDate(createdAt) && { key: "created", label: "Created", value: formatDate(createdAt) },
  ].filter(Boolean);

  return (
    <div className="result-info">
      {eyebrow && <span className="section-label">{eyebrow}</span>}
      {title && <h2 className="result-title">{title}</h2>}

      {prompt && (
        <div className="prompt-sheet">
          <div className="prompt-sheet-head">
            <span className="prompt-sheet-label"><SparkIcon size={12} />Prompt</span>
            <button type="button" className="copy-prompt" onClick={handleCopy} aria-label="Copy prompt">
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="prompt-sheet-text">{prompt}</p>
        </div>
      )}

      {meta.length > 0 && (
        <dl className="result-meta">
          {meta.map(({ key, label, value }) => (
            <div className="result-meta-item" key={key}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="result-actions">{actions}</div>}
    </div>
  );
}

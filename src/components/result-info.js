"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui";

// 生成结果弹窗（studio 与 creations 共用）右侧信息面板：
// 眉标（可选）+ 提示语（无大标题、直接可读）+ 复制按钮 + 底部小字参数 + 右下角动作区。
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

export default function ResultInfo({ eyebrow, prompt, model, ratio, createdAt, actions }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!prompt) return;
    if (await copyText(prompt)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const meta = [
    model && { label: "Model", value: model },
    ratio && { label: "Aspect", value: ratio },
    formatDate(createdAt) && { label: "Created", value: formatDate(createdAt) },
  ].filter(Boolean);

  return (
    <div className="result-info">
      {eyebrow && <span className="section-label">{eyebrow}</span>}

      <div className="result-prompt">
        {prompt ? <p className="result-prompt-text">{prompt}</p> : <p className="result-prompt-text result-prompt-empty">No prompt recorded for this image.</p>}
        {prompt && (
          <button type="button" className="copy-prompt" onClick={handleCopy} aria-label="Copy prompt">
            {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        )}
      </div>

      <div className="result-foot">
        {meta.length > 0 && (
          <p className="result-meta-line">
            {meta.map(({ label, value }, i) => (
              <span key={label} className={i === 0 ? "first" : ""}><b>{label}</b>{value}</span>
            ))}
          </p>
        )}
        {actions && <div className="result-actions">{actions}</div>}
      </div>
    </div>
  );
}

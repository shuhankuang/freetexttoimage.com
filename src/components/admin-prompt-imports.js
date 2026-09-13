"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CheckIcon, PromptCardsIcon } from "@/components/ui";

const ACTIVE = new Set(["queued", "running"]);
const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function jobStatus(status) {
  return status.replaceAll("_", " ");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

export default function AdminPromptImports({ initialJobs, initialSummary, initialImportsEnabled, initialHasMore }) {
  const inputRef = useRef(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [importsEnabled, setImportsEnabled] = useState(initialImportsEnabled);
  const [summary, setSummary] = useState(initialSummary);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasActive = useMemo(() => summary.queuedJobs + summary.runningJobs > 0, [summary]);

  const loadJobs = useCallback(async ({ offset = 0, append = false } = {}) => {
    const response = await fetch(`/api/admin/prompt-imports?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setJobs((current) => append ? [...current, ...(data.jobs || [])] : (data.jobs || []));
    setSummary(data.summary || initialSummary);
    setHasMore(Boolean(data.hasMore));
    setImportsEnabled(Boolean(data.importsEnabled));
  }, [initialSummary]);

  const refresh = useCallback(async () => {
    await loadJobs();
  }, [loadJobs]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadJobs({ offset: jobs.length, append: true });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, jobs.length, loadJobs, loadingMore]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
  }, [hasActive, refresh]);

  async function upload() {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    try {
      const response = await fetch("/api/admin/prompt-imports", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(job, action) {
    setActionId(job.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/prompt-imports/${job.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, allowUpdates: action === "confirm" && job.changedCount > 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed.");
      await refresh();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionId(null);
    }
  }

  return <main className="workspace-page admin-import-page">
    <header className="page-title admin-import-title">
      <div><span className="eyebrow">ADMIN TOOLS</span><h1>Prompt imports</h1><p>Validate JSON files, review changes, then queue them for the import worker.</p></div>
    </header>

    <div className={`admin-import-switch ${importsEnabled ? "is-enabled" : "is-disabled"}`}>
      <span aria-hidden="true" />
      <div><strong>Production imports are {importsEnabled ? "enabled" : "paused"}</strong><p>{importsEnabled ? "Confirmed jobs can be processed by the scheduled worker." : "Uploads and previews are safe. Jobs cannot be queued or processed until PROMPT_IMPORT_ENABLED=true."}</p></div>
    </div>

    <section className="admin-upload-panel">
      <div className="admin-upload-copy"><span><PromptCardsIcon /></span><div><strong>Add JSON files</strong><p>Up to 20 files, 2 MB each. Files are processed by the date in their filename, oldest first.</p></div></div>
      <div className="admin-upload-actions">
        <input ref={inputRef} type="file" accept="application/json,.json" multiple onChange={(event) => setFiles([...event.target.files].slice(0, 20))} />
        <Button className="primary-button" isDisabled={!files.length || busy} onPress={upload}>{busy && <Spinner size="sm" />}Preview {files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : "files"}</Button>
      </div>
      {files.length > 0 && <p className="admin-file-selection">{files.map((file) => file.name).join(" · ")}</p>}
    </section>

    {error && <p className="admin-import-error" role="alert">{error}</p>}

    <section className="admin-import-summary" aria-label="Import queue summary">
      <div><strong>{formatNumber(summary.jobs)}</strong><span>Import files</span><small>All recorded jobs</small></div>
      <div><strong>{formatNumber(summary.queuedJobs + summary.runningJobs)}</strong><span>In progress</span><small>{formatNumber(summary.queuedJobs)} queued · {formatNumber(summary.runningJobs)} running</small></div>
      <div><strong>{formatNumber(summary.insertedRecords)}</strong><span>Prompts imported</span><small>{formatNumber(summary.skippedRecords)} duplicates skipped</small></div>
      <div className={summary.failedRecords ? "has-attention" : ""}><strong>{formatNumber(summary.failedRecords)}</strong><span>Need attention</span><small>{formatNumber(summary.attentionJobs)} files with errors</small></div>
    </section>

    <section className="admin-jobs">
      <div className="admin-jobs-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Import jobs</h2><p>Showing {formatNumber(jobs.length)} of {formatNumber(summary.jobs)} files · newest activity first</p></div><Button variant="outline" onPress={refresh}>Refresh</Button></div>
      {!jobs.length && <div className="admin-jobs-empty">No imports yet.</div>}
      {jobs.map((job) => {
        const progress = job.totalCount ? Math.round((job.processedCount / job.totalCount) * 100) : 0;
        const working = actionId === job.id;
        const isPreview = job.status === "preview";
        const lastActivity = job.heartbeatAt || job.completedAt || job.startedAt || job.confirmedAt || job.createdAt;
        return <article className="admin-job" key={job.id}>
          <div className="admin-job-head"><div><strong>{job.fileName}</strong><span>{job.sourceDate} · last activity {formatDate(lastActivity)}</span></div><em className={`admin-job-status status-${job.status}`}>{ACTIVE.has(job.status) && <Spinner size="sm" />}{jobStatus(job.status)}</em></div>
          <div className="admin-job-counts"><span><b>{job.totalCount}</b>Source</span><span><b>{isPreview ? job.newCount : job.insertedCount}</b>{isPreview ? "New" : "Imported"}</span><span><b>{isPreview ? job.duplicateCount : job.skippedCount}</b>{isPreview ? "Duplicate" : "Skipped"}</span><span className={job.changedCount ? "has-changes" : ""}><b>{job.changedCount}</b>Changed</span><span><b>{job.failedCount}</b>Failed</span></div>
          {job.status === "running" && <div className="admin-job-progress"><span style={{ width: `${progress}%` }} /><small>{job.processedCount} / {job.totalCount}</small></div>}
          {job.changedCount > 0 && job.status === "preview" && <p className="admin-change-warning">This file changes {job.changedCount} existing tweet{job.changedCount > 1 ? "s" : ""}. Confirming will replace those records.</p>}
          {Array.isArray(job.errors) && job.errors.length > 0 && <details className="admin-job-errors"><summary>{job.failedCount} failure{job.failedCount !== 1 ? "s" : ""} · showing {Math.min(job.errors.length, 10)} details</summary>{job.errors.slice(0, 10).map((item, index) => <p key={`${item.sourceId || "file"}-${index}`}>{item.sourceId && <b>{item.sourceId}: </b>}{item.message}</p>)}</details>}
          <div className="admin-job-footer"><span>{job.completedAt ? `Finished ${formatDate(job.completedAt)}` : job.confirmedAt ? `Queued ${formatDate(job.confirmedAt)}` : "Waiting for confirmation"}</span><div>
            {job.status === "preview" && <Button className="primary-button" isDisabled={working || !importsEnabled} onPress={() => act(job, "confirm")}>{working ? <Spinner size="sm" /> : <CheckIcon />} {job.changedCount ? "Confirm changes & queue" : "Queue import"}</Button>}
            {["failed", "completed_with_errors"].includes(job.status) && <Button variant="outline" isDisabled={working} onPress={() => act(job, "retry")}>{working && <Spinner size="sm" />}Retry</Button>}
          </div></div>
        </article>;
      })}
      {hasMore && <div className="admin-jobs-more"><Button variant="outline" isDisabled={loadingMore} onPress={loadMore}>{loadingMore && <Spinner size="sm" />}Load 20 earlier jobs</Button></div>}
    </section>
  </main>;
}

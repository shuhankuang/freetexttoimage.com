"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spinner } from "@heroui/react";

const PAGE_SIZE = 20;
const ACTIVE_STATUSES = new Set(["queued", "running"]);

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

export default function AdminPromptImports({ initialJobs, initialSummary, initialImportsEnabled, initialHasMore, initialSyncConfig }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [summary, setSummary] = useState(initialSummary);
  const [importsEnabled, setImportsEnabled] = useState(initialImportsEnabled);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [syncConfig, setSyncConfig] = useState(initialSyncConfig);
  const [loadingMore, setLoadingMore] = useState(false);
  const [configBusy, setConfigBusy] = useState("");
  const [sourceBusy, setSourceBusy] = useState("");
  const [taskBusy, setTaskBusy] = useState("");
  const [error, setError] = useState("");

  const hasActiveJob = useMemo(() => summary.queuedJobs + summary.runningJobs > 0, [summary]);

  const loadJobs = useCallback(async ({ offset = 0, append = false } = {}) => {
    const response = await fetch(`/api/admin/prompt-imports?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load sync status.");

    const data = await response.json();
    setJobs((current) => append ? [...current, ...(data.jobs || [])] : (data.jobs || []));
    setSummary(data.summary || initialSummary);
    setImportsEnabled(Boolean(data.importsEnabled));
    setHasMore(Boolean(data.hasMore));
  }, [initialSummary]);

  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const timer = window.setInterval(() => {
      loadJobs().catch((loadError) => setError(loadError.message));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, loadJobs]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      await loadJobs({ offset: jobs.length, append: true });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function updateSync(body, busyKey) {
    setConfigBusy(busyKey);
    setError("");
    try {
      const response = await fetch("/api/admin/prompt-sync", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save sync settings.");
      setSyncConfig(data);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setConfigBusy("");
    }
  }

  async function runSource(id) {
    setSourceBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin/prompt-sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start sync.");
      await loadJobs();
    } catch (runError) {
      setError(runError.message);
    } finally {
      setSourceBusy("");
    }
  }

  async function runTask(id) {
    setTaskBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin/prompt-sync/worker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start this task.");
      await loadJobs();
    } catch (runError) {
      setError(runError.message);
    } finally {
      setTaskBusy("");
    }
  }

  return <main className="workspace-page admin-import-page">
    <header className="page-title admin-import-title">
      <div>
        <span className="eyebrow">PROMPT SYNC</span>
        <h1>Sync status</h1>
        <p>Scheduled searches collect new prompts automatically. This page shows the queue and import health.</p>
      </div>
    </header>

    <div className={`admin-import-switch ${importsEnabled ? "is-enabled" : "is-disabled"}`}>
      <span aria-hidden="true" />
      <div>
        <strong>Automatic sync is {importsEnabled ? "enabled" : "paused"}</strong>
        <p>{importsEnabled ? "Coolify runs the search schedule and the worker processes new prompts." : "Prompt imports are paused until PROMPT_IMPORT_ENABLED=true."}</p>
      </div>
    </div>

    <section className="admin-sync-sources">
      <div className="admin-jobs-heading">
        <div>
          <span className="eyebrow">SYNC SOURCES</span>
          <h2>What gets synced</h2>
          <p>Toggle individual model searches or run one source immediately.</p>
        </div>
        <Button className="primary-button" isDisabled={Boolean(configBusy)} onPress={() => updateSync({ scope: "global", enabled: !syncConfig?.settings?.enabled }, "global")}>
          {configBusy === "global" && <Spinner size="sm" />}
          {syncConfig?.settings?.enabled ? "Pause all" : "Resume sync"}
        </Button>
      </div>

      <div className="admin-source-list">
        {(syncConfig?.sources || []).map((source) => <div className="admin-source" key={source.id}>
          <button
            type="button"
            role="switch"
            aria-checked={source.enabled}
            className={`admin-source-toggle ${source.enabled ? "is-on" : ""}`}
            disabled={Boolean(configBusy) || Boolean(sourceBusy)}
            onClick={() => updateSync({ id: source.id, enabled: !source.enabled }, source.id)}
          >
            <span aria-hidden="true" />
            <b>{configBusy === source.id && <Spinner size="sm" />}{source.enabled ? "On" : "Off"}</b>
          </button>
          <div className="admin-source-copy">
            <strong>{source.name}</strong>
            <span>{source.query}</span>
            <small>Last {source.lookbackHours} hours · min {source.minFaves} likes · max {source.maxRecords}</small>
          </div>
          <Button className="admin-source-run" variant="outline" isDisabled={Boolean(configBusy) || Boolean(sourceBusy) || !source.enabled} onPress={() => runSource(source.id)}>
            {sourceBusy === source.id && <Spinner size="sm" />}
            Run now
          </Button>
        </div>)}
      </div>
    </section>

    <section className="admin-import-summary" aria-label="Prompt sync summary">
      <div><strong>{formatNumber(summary.jobs)}</strong><span>Sync runs</span><small>All recorded runs</small></div>
      <div><strong>{formatNumber(summary.queuedJobs + summary.runningJobs)}</strong><span>In progress</span><small>{formatNumber(summary.queuedJobs)} queued · {formatNumber(summary.runningJobs)} running</small></div>
      <div><strong>{formatNumber(summary.insertedRecords)}</strong><span>Prompts imported</span><small>{formatNumber(summary.skippedRecords)} duplicates skipped</small></div>
      <div className={summary.failedRecords ? "has-attention" : ""}><strong>{formatNumber(summary.failedRecords)}</strong><span>Need attention</span><small>{formatNumber(summary.attentionJobs)} runs with errors</small></div>
    </section>

    {error && <p className="admin-import-error" role="alert">{error}</p>}

    <section className="admin-jobs">
      <div className="admin-jobs-heading">
        <div>
          <span className="eyebrow">SYNC HISTORY</span>
          <h2>Recent runs</h2>
          <p>Showing {formatNumber(jobs.length)} of {formatNumber(summary.jobs)} runs · newest activity first</p>
        </div>
        <Button variant="outline" onPress={() => loadJobs().catch((loadError) => setError(loadError.message))}>Refresh</Button>
      </div>

      {!jobs.length && <div className="admin-jobs-empty">No scheduled sync runs yet.</div>}
      {jobs.map((job) => {
        const progress = job.totalCount ? Math.round((job.processedCount / job.totalCount) * 100) : 0;
        const lastActivity = job.heartbeatAt || job.completedAt || job.startedAt || job.confirmedAt || job.createdAt;

        return <article className="admin-job" key={job.id}>
          <div className="admin-job-head">
            <div><strong>{job.fileName}</strong><span>{job.sourceDate} · last activity {formatDate(lastActivity)}</span></div>
            <em className={`admin-job-status status-${job.status}`}>
              {ACTIVE_STATUSES.has(job.status) && <Spinner size="sm" />}
              {job.status.replaceAll("_", " ")}
            </em>
          </div>
          <div className="admin-job-counts">
            <span><b>{job.totalCount}</b>Source</span>
            <span><b>{job.insertedCount}</b>Imported</span>
            <span><b>{job.skippedCount}</b>Skipped</span>
            <span><b>{job.failedCount}</b>Failed</span>
          </div>
          {job.status === "running" && <div className="admin-job-progress"><span style={{ width: `${progress}%` }} /><small>{job.processedCount} / {job.totalCount}</small></div>}
          {Array.isArray(job.errors) && job.errors.length > 0 && <details className="admin-job-errors">
            <summary>{job.failedCount} failures · showing {Math.min(job.errors.length, 10)} details</summary>
            {job.errors.slice(0, 10).map((item, index) => <p key={`${item.sourceId || "run"}-${index}`}>{item.sourceId && <b>{item.sourceId}: </b>}{item.message}</p>)}
          </details>}
          <div className="admin-job-footer">
            <span>{job.completedAt ? `Finished ${formatDate(job.completedAt)}` : job.confirmedAt ? `Queued ${formatDate(job.confirmedAt)}` : "Waiting"}</span>
            {job.status === "queued" && <Button className="primary-button" isDisabled={Boolean(taskBusy) || !importsEnabled} onPress={() => runTask(job.id)}>
              {taskBusy === job.id && <Spinner size="sm" />}
              Run task
            </Button>}
          </div>
        </article>;
      })}
      {hasMore && <div className="admin-jobs-more">
        <Button variant="outline" isDisabled={loadingMore} onPress={loadMore}>{loadingMore && <Spinner size="sm" />}Load earlier runs</Button>
      </div>}
    </section>
  </main>;
}

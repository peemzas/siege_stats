"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/log/CountUp";
import NameText from "@/components/log/NameText";
import { formatInt, formatSiegeDate, formatSiegeDay, formatUploaded } from "@/lib/format";
import { MAX_LOG_BYTES, previewLog } from "@/lib/preview";
import { recentSaturdays } from "@/lib/servers";
import type { SiegeModel } from "@/lib/siege";
import { sameDaySieges, type SavedSiege } from "@/lib/summary";

type Phase =
  | "idle"
  | "dragover"
  | "reading"
  | "parsing"
  | "checking"
  | "preview"
  | "duplicate"
  | "saving"
  | "success"
  | "error";

type Draft = {
  name: string;
  size: number;
  file: File;
  model: SiegeModel;
};

const STEPS = ["Upload", "Parse", "Preview", "Save"];

function stepIndex(phase: Phase): number {
  if (phase === "reading") return 0;
  if (phase === "parsing" || phase === "checking") return 1;
  if (phase === "preview" || phase === "duplicate") return 2;
  if (phase === "saving") return 3;
  if (phase === "success") return 4;
  return -1;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postLog(
  file: File,
  date: string,
  server: string,
  onProgress: (percent: number) => void,
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/logs");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Couldn’t save this siege."));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as { id?: string };
        if (!body.id) reject(new Error("Couldn’t save this siege."));
        else resolve({ id: body.id });
      } catch {
        reject(new Error("Couldn’t save this siege."));
      }
    };
    xhr.onerror = () => reject(new Error("Couldn’t save this siege."));
    const body = new FormData();
    body.append("file", file);
    body.append("logDate", date);
    body.append("serverName", server);
    xhr.send(body);
  });
}

function PreviewStats({ model }: { model: SiegeModel }) {
  return (
    <>
      <div className="prev">
        <div><small>Players</small><CountUp value={model.players.length} /></div>
        <div><small>Guilds</small><CountUp value={model.guilds.length} /></div>
        <div><small>Kills</small><CountUp value={model.totalKills} /></div>
        <div><small>Duration</small><b className="num">{model.timeline.minutes}m</b></div>
      </div>
      <p className="mut" style={{ margin: 0 }}>
        Champion <b className="g">{model.winner?.name}</b>
        {model.mvp ? <> · MVP <NameText name={model.mvp.name} /></> : null}
      </p>
    </>
  );
}

export default function Uploader({
  expanded,
  onExpand,
  onCollapse,
  server,
  date,
  servers,
  onServer,
  onDate,
  sieges,
  siegesLoading,
  siegesError,
}: {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  server: string;
  date: string;
  servers: string[];
  onServer: (server: string) => void;
  onDate: (date: string) => void;
  sieges: SavedSiege[];
  siegesLoading: boolean;
  siegesError: boolean;
}) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [matches, setMatches] = useState<SavedSiege[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [sample, setSample] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [paste, setPaste] = useState("");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [saturdays, setSaturdays] = useState<string[]>([]);
  const readerRef = useRef<FileReader | null>(null);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaturdays(recentSaturdays(4));
  }, []);

  useEffect(() => {
    if (phase !== "checking" && phase !== "preview" && phase !== "duplicate") return;
    if (!draft || !date) return;
    if (siegesLoading) return;
    const nextMatches = siegesError ? [] : sameDaySieges(sieges, date);
    const nextPhase: Phase = nextMatches.length ? "duplicate" : "preview";
    setMatches(nextMatches);
    setPhase((current) => (current === nextPhase ? current : nextPhase));
  }, [phase, draft, date, sieges, siegesLoading, siegesError]);

  const busy = phase === "reading" || phase === "parsing" || phase === "checking" || phase === "saving";
  const step = stepIndex(phase);

  function reset() {
    readerRef.current?.abort();
    readerRef.current = null;
    setPhase("idle");
    setDraft(null);
    setMatches([]);
    setProgress(0);
    setError("");
    setSample("");
    setSaveFailed(false);
    setSavedId("");
    setPaste("");
    setFileMeta(null);
  }

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      readerRef.current = reader;
      reader.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Couldn’t read this file."));
      reader.onabort = () => reject(new Error("aborted"));
      reader.readAsText(file);
    });
  }

  async function parseText(text: string, file: File) {
    setFileMeta({ name: file.name || "battlelog.txt", size: file.size });
    setPhase("parsing");
    setProgress(0);
    await wait(50);
    const preview = previewLog(text);
    if (!preview.ok) {
      setDraft(null);
      setError(preview.message);
      setSample(preview.sample);
      setPhase("error");
      return;
    }
    setDraft({ name: file.name || "battlelog.txt", size: file.size, file, model: preview.model });
    setPhase("checking");
  }

  async function ingest(file: File) {
    onExpand();
    setError("");
    setSample("");
    setSaveFailed(false);
    setSavedId("");
    if (file.size > MAX_LOG_BYTES) {
      setDraft(null);
      setError("This file is over 5 MB.");
      setPhase("error");
      return;
    }
    setDraft(null);
    setFileMeta({ name: file.name || "battlelog.txt", size: file.size });
    setProgress(0);
    setPhase("reading");
    try {
      const text = await readFile(file);
      await parseText(text, file);
    } catch (err) {
      if (err instanceof Error && err.message === "aborted") return;
      setDraft(null);
      setError("Couldn’t read this file.");
      setPhase("error");
    }
  }

  function onPasteSubmit() {
    const text = paste.trim();
    if (!text || busy) return;
    const file = new File([text], "pasted-log.txt", { type: "text/plain" });
    onExpand();
    setError("");
    setSample("");
    setSaveFailed(false);
    if (file.size > MAX_LOG_BYTES) {
      setError("This file is over 5 MB.");
      setPhase("error");
      return;
    }
    void parseText(text, file);
  }

  async function save() {
    if (!draft || !date || !server) return;
    setPhase("saving");
    setProgress(0);
    setSaveFailed(false);
    try {
      const saved = await postLog(draft.file, date, server, setProgress);
      setSavedId(saved.id);
      setPhase("success");
      await queryClient.invalidateQueries({ queryKey: ["logs", server] });
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
    } catch (err) {
      setSaveFailed(true);
      setError(err instanceof Error ? err.message : "Couldn’t save this siege.");
      setPhase("error");
    }
  }

  function onDragEnter(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (busy || phase === "success" || phase === "preview" || phase === "duplicate") return;
    dragDepth.current += 1;
    setPhase("dragover");
  }

  function onDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function onDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setPhase((current) => (current === "dragover" ? "idle" : current));
    }
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    const file = event.dataTransfer.files?.[0];
    if (!file || busy) {
      setPhase((current) => (current === "dragover" ? "idle" : current));
      return;
    }
    void ingest(file);
  }

  const showDrop = phase === "idle" || phase === "dragover" || (phase === "error" && !draft);
  const fileLabel = fileMeta?.name || draft?.name || "battlelog.txt";
  const fileSize = fileMeta?.size ?? draft?.size ?? 0;
  const statusLine =
    phase === "reading"
      ? `Reading… ${progress}% · ${formatBytes(Math.round((fileSize * progress) / 100))} of ${formatBytes(fileSize)}`
      : phase === "parsing"
        ? "Parsing kill events in your browser…"
        : phase === "checking"
          ? "Checking saved sieges…"
          : phase === "saving"
            ? `Saving… ${progress}%`
            : "";

  function onRootDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || phase === "reading" || phase === "parsing" || phase === "checking" || phase === "saving" || phase === "preview" || phase === "duplicate" || phase === "success") return;
    void ingest(file);
  }

  return (
    <div data-phase={phase} onDragOver={(event) => event.preventDefault()} onDrop={onRootDrop}>
      {!expanded && (phase === "idle" || phase === "dragover") ? (
        <h2 className="sec">
          Upload battlelog
          <button type="button" className="btn" onClick={onExpand}>Open uploader</button>
        </h2>
      ) : null}
      {phase !== "success" ? (
        <div className="fr">
          <div>
            <label htmlFor="siege-server">Server</label>
            <div className="in">
              <select id="siege-server" value={server} disabled={busy} onChange={(event) => onServer(event.target.value)}>
                {servers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="siege-date">Siege date</label>
            <div className="in">
              <input
                id="siege-date"
                type="date"
                value={date}
                disabled={busy || !date}
                onChange={(event) => onDate(event.target.value)}
              />
            </div>
            <div className="dchips">
              {saturdays.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={day === date ? "a" : undefined}
                  disabled={busy}
                  onClick={() => onDate(day)}
                >
                  {formatSiegeDay(day)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step >= 0 ? (
        <div className="steps" aria-label="Upload progress">
          {STEPS.map((label, index) => (
            <span key={label} className={index < step ? "dn" : index === step ? "cu" : undefined}>
              {index < step ? "✓ " : ""}{label}
            </span>
          ))}
        </div>
      ) : null}

      {statusLine ? (
        <div className="file">
          <span style={{ fontSize: 24 }} aria-hidden>📄</span>
          <div className="nm">
            <b>{fileLabel}</b>
            <br />
            <small className="mut">{statusLine}</small>
            <div className={`prog ${phase === "parsing" || phase === "checking" ? "ind" : ""}`}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
          {phase === "reading" ? (
            <button type="button" className="x" onClick={reset} aria-label="Cancel">×</button>
          ) : null}
        </div>
      ) : null}

      {showDrop ? (
        <label
          className={`drop ${phase === "dragover" ? "over" : ""}`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="ic" aria-hidden>⇪</div>
          <p><strong>{phase === "dragover" ? "Release to upload" : "Drag & drop your battlelog"}</strong></p>
          <p>or <u>browse files</u> · .txt up to 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.log,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void ingest(file);
            }}
          />
        </label>
      ) : null}

      {expanded && showDrop ? (
        <>
          <div className="or">OR PASTE TEXT</div>
          <textarea
            value={paste}
            placeholder="[20:20:45] [Wazabz่] Kalgas #89AE0 (Blade) → Attack [OracIe] MirandaDoctrine #180012"
            onChange={(event) => setPaste(event.target.value)}
          />
          <button type="button" className="pbtn" disabled={!paste.trim() || busy} onClick={onPasteSubmit}>
            Parse log
          </button>
        </>
      ) : null}

      {draft && (phase === "preview" || phase === "duplicate" || (phase === "error" && saveFailed)) ? (
        <div className="card" style={{ background: "var(--card2)", marginTop: 12 }}>
          <h2 className="sec">
            Preview before saving
            <span className="chip">not saved yet</span>
          </h2>
          <PreviewStats model={draft.model} />
        </div>
      ) : null}

      {phase === "duplicate" && draft && matches[0] ? (
        <div className="warn">
          <b className="g">This siege is already uploaded.</b>
          <br />
          <small className="mut">
            {server} · {formatSiegeDate(date)}
            {matches[0].createdAt ? ` was saved ${formatUploaded(matches[0].createdAt)}` : " is already saved"}
            {matches.length > 1 ? ` (${matches.length} uploads for this date)` : ""}.
            {" "}The saved copy has {formatInt(matches[0].kills)} kills; this file has {formatInt(draft.model.totalKills)}.
          </small>
          <div className="actions">
            <Link className="btn pri" href={`/logs/${matches[0].id}`}>Open existing →</Link>
            <button type="button" className="btn" onClick={() => void save()}>Upload anyway</button>
          </div>
        </div>
      ) : null}

      {phase === "preview" && draft ? (
        <div className="actions">
          <button type="button" className="pbtn" disabled={!date} onClick={() => void save()}>Save siege</button>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="alert" role="alert">
          <b className="d">{error || "Couldn’t read this log."}</b>
          {error === "No kill lines found." ? (
            <>
              <br />
              <small className="mut">
                Export the Guild Siege battlelog. Each kill starts with “[20:20:45] [Guild] Name (class) → Attack [Guild] Name”.
              </small>
            </>
          ) : null}
          {sample ? (
            <>
              <br />
              <small className="mut">Line 1 looked like: “{sample}”.</small>
            </>
          ) : null}
          <div className="actions">
            {saveFailed && draft ? (
              <button type="button" className="btn" onClick={() => setPhase(matches.length ? "duplicate" : "preview")}>
                Back to preview
              </button>
            ) : null}
            <button type="button" className="btn" onClick={reset}>Try another file</button>
          </div>
        </div>
      ) : null}

      {phase === "success" && savedId ? (
        <div className="card ok" style={{ textAlign: "center", borderColor: "#3ddc9766", marginTop: 12 }}>
          <div className="ck" aria-hidden>✓</div>
          <h3 style={{ margin: "4px 0" }}>Siege saved</h3>
          <p className="mut">{server} · {formatSiegeDate(date)}</p>
          {draft ? <PreviewStats model={draft.model} /> : null}
          <div className="actions center">
            <Link className="btn pri" href={`/logs/${savedId}`}>View results</Link>
            <button type="button" className="btn" onClick={reset}>Upload another</button>
          </div>
        </div>
      ) : null}

      {expanded && (phase === "idle" || phase === "success" || phase === "error") ? (
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset();
              onCollapse();
            }}
          >
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}

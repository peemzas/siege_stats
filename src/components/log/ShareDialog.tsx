"use client";

import { useEffect, useState } from "react";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { discordText } from "@/lib/share";
import type { SiegeModel } from "@/lib/siege";
import NameText from "./NameText";

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

function downloadCard(model: SiegeModel, server: string, date: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const family = getComputedStyle(document.body).fontFamily || "Inter, sans-serif";
  const gradient = ctx.createLinearGradient(0, 0, 900, 400);
  gradient.addColorStop(0, "#3a3018");
  gradient.addColorStop(0.45, "#0b0f16");
  ctx.fillStyle = "#0b0f16";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#f5c451";
  ctx.font = `700 28px ${family}`;
  ctx.fillText(`SIEGESTATS · ${server.toUpperCase()} · ${formatSiegeDate(date).toUpperCase()}`, 64, 120);
  ctx.fillStyle = "#e8ebf2";
  ctx.font = `800 84px ${family}`;
  ctx.fillText(`👑 ${model.winner?.name ?? ""}`, 64, 240);
  ctx.fillStyle = "#8b95a8";
  ctx.font = `500 32px ${family}`;
  ctx.fillText(`${formatInt(model.winner?.totalPoints ?? 0)} pts · +${formatInt(model.margin)} margin · ${formatInt(model.winner?.totalKills ?? 0)} kills`, 64, 310);
  ctx.fillStyle = "#e8ebf2";
  ctx.font = `700 32px ${family}`;
  const mvp = model.mvp ? `MVP ${model.mvp.name} · ${model.mvp.guild}` : "";
  ctx.fillText(mvp, 64, 500);
  ctx.fillStyle = "#8b95a8";
  ctx.font = `500 28px ${family}`;
  ctx.fillText(`${formatInt(model.players.length)} players · ${formatInt(model.guilds.length)} guilds`, 64, 550);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `siege-${server}-${date.slice(0, 10)}.png`;
  link.click();
}

export default function ShareDialog({
  model,
  server,
  date,
  onClose,
  onToast,
}: {
  model: SiegeModel;
  server: string;
  date: string;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function copyLink() {
    try {
      await copy(url);
      onToast("✓ Link copied");
    } catch {
      onToast(url);
    }
  }

  async function copyDiscord() {
    const text = discordText(model, server, date, url);
    try {
      await copy(text);
      onToast("✓ Discord text copied");
    } catch {
      onToast("Couldn’t copy");
    }
  }

  return (
    <div className="ovl" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Share this siege" style={{ maxWidth: 620 }}>
        <div className="mh">
          <h2>Share this siege</h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="og" style={{ margin: "14px 0" }}>
          <div>
            <div className="g" style={{ fontWeight: 800, letterSpacing: ".08em", fontSize: 12 }}>
              SIEGESTATS · {server.toUpperCase()} · {formatSiegeDate(date).toUpperCase()}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, marginTop: 6 }}>👑 {model.winner?.name}</div>
            <div className="mut">
              {formatInt(model.winner?.totalPoints ?? 0)} pts · +{formatInt(model.margin)} margin · {formatInt(model.winner?.totalKills ?? 0)} kills
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "end", fontSize: 13 }}>
            <span>
              MVP {model.mvp ? <b><NameText name={model.mvp.name} /></b> : "—"} {model.mvp?.guild} · {formatInt(model.mvp?.points ?? 0)} pts
            </span>
            <span className="mut">{formatInt(model.players.length)} players · {formatInt(model.guilds.length)} guilds</span>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn pri" onClick={() => void copyLink()}>⧉ Copy link</button>
          <button type="button" className="btn" onClick={() => void copyDiscord()}>Discord text</button>
          <button type="button" className="btn" onClick={() => downloadCard(model, server, date)}>⬇ PNG card</button>
        </div>
        <div className="mut" style={{ fontSize: 12, marginTop: 8, overflowWrap: "anywhere" }}>{url}</div>
      </div>
    </div>
  );
}

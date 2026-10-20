"use client";

import { useEffect, useRef } from "react";

/** Shell chrome for ⌘K. Results are filled in by the search slice. */
export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="card box" role="dialog" aria-modal="true" aria-label="Search players and guilds">
        <input ref={inputRef} aria-label="Search" placeholder="Search player or guild…" />
        <div className="empty" style={{ padding: 24 }}>
          <h3>Search saved sieges</h3>
          <p>Player and guild results load from logs already stored for this server.</p>
        </div>
        <div className="grp" style={{ paddingBottom: 10 }}>↑↓ to navigate · ↵ open · esc close</div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SearchPalette from "./SearchPalette";

function section(path: string): "home" | "sieges" | "rank" | "up" {
  if (path.startsWith("/leaderboards")) return "rank";
  if (path.startsWith("/sieges") || path.startsWith("/logs") || path.startsWith("/players") || path.startsWith("/guilds")) {
    return "sieges";
  }
  return "home";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const active = section(path);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header>
        <Link className="logo" href="/">SIEGE<b>STATS</b></Link>
        <nav className="top" aria-label="Primary">
          <Link href="/" data-n="home" className={active === "home" ? "a" : undefined}>Home</Link>
          <Link href="/sieges" data-n="sieges" className={active === "sieges" ? "a" : undefined}>Sieges</Link>
          <Link href="/leaderboards" data-n="rank" className={active === "rank" ? "a" : undefined}>Leaderboards</Link>
        </nav>
        <button type="button" className="srch" id="srchbtn" onClick={() => setSearchOpen(true)}>
          <span aria-hidden>🔍</span>
          <span>Search player or guild…</span>
          <kbd>⌘K</kbd>
        </button>
        <Link className="btn pri" href="/?upload=1">↑ Upload log</Link>
      </header>
      <main>
        <div className="page" key={path}>{children}</div>
      </main>
      <nav className="bnav" aria-label="Mobile">
        <Link href="/" className={active === "home" ? "a" : undefined}><b>⌂</b>Home</Link>
        <Link href="/sieges" className={active === "sieges" ? "a" : undefined}><b>⚔</b>Sieges</Link>
        <Link href="/?upload=1"><b>⇪</b>Upload</Link>
        <Link href="/leaderboards" className={active === "rank" ? "a" : undefined}><b>🏆</b>Ranks</Link>
      </nav>
      {searchOpen ? <SearchPalette onClose={closeSearch} /> : null}
    </>
  );
}

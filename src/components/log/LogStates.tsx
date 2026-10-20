import Link from "next/link";

export function LogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading siege">
      <div className="sk" style={{ width: 240, height: 14, marginBottom: 12 }} />
      <section className="hero">
        <div className="sk" style={{ height: 250, borderRadius: 18 }} />
        <div className="sk" style={{ height: 250 }} />
      </section>
      <div className="sk" style={{ height: 44, marginBottom: 14 }} />
      <div className="grid2">
        <div className="sk" style={{ height: 260 }} />
        <div className="sk" style={{ height: 260 }} />
      </div>
    </div>
  );
}

export function LogEmpty() {
  return (
    <div className="card empty">
      <div className="ic">⚔️</div>
      <h3>This log has no kill events</h3>
      <p>The file was saved but contained no PvP lines. Re-upload the full siege battlelog.</p>
      <Link className="btn pri" href="/?upload=1">↑ Upload again</Link>
    </div>
  );
}

export function LogError({ missing }: { missing?: boolean }) {
  return (
    <div className="card empty">
      <div className="ic d">⚠</div>
      <h3>{missing ? "Siege not found" : "Couldn’t load this siege"}</h3>
      <p>{missing ? "It may have been removed or the link is wrong." : "The server didn’t return this log. Try again in a moment."}</p>
      <Link className="btn" href="/sieges">← Browse sieges</Link>
    </div>
  );
}

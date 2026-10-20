import Link from "next/link";

/** Placeholder until the saved-siege list slice. Keeps the nav target real. */
export default function SiegesPlaceholder() {
  return (
    <>
      <div className="crumb">Home / <b>Sieges</b></div>
      <h1 style={{ margin: "0 0 12px" }}>Sieges</h1>
      <div className="card empty">
        <div className="ic">🏰</div>
        <h3>Saved sieges</h3>
        <p>The siege list loads from logs already stored for each server.</p>
        <Link className="btn pri" href="/?upload=1">↑ Upload a log</Link>
      </div>
    </>
  );
}

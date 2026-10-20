import Link from "next/link";

/** Placeholder until the leaderboard slice. Keeps the nav target real. */
export default function LeaderboardsPlaceholder() {
  return (
    <>
      <div className="crumb">Lawolf / <b>Leaderboards</b></div>
      <h1 style={{ margin: "0 0 6px" }}>Leaderboards</h1>
      <div className="card empty">
        <div className="ic">🏆</div>
        <h3>Cross-siege ranks</h3>
        <p>Ranks are totaled from siege logs already saved for the server.</p>
        <Link className="btn" href="/sieges">Browse sieges</Link>
      </div>
    </>
  );
}

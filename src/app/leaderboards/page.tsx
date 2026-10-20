import { Suspense } from "react";
import Leaderboards from "@/components/profile/Leaderboards";

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<div className="sk" style={{ height: 280 }} />}>
      <Leaderboards />
    </Suspense>
  );
}

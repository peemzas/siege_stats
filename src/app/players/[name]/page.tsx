import { Suspense } from "react";
import PlayerProfile from "@/components/profile/PlayerProfile";
import { decodeRouteName } from "@/lib/names";

export default function PlayerPage({ params }: { params: { name: string } }) {
  return (
    <Suspense fallback={<div className="sk" style={{ height: 280 }} />}>
      <PlayerProfile name={decodeRouteName(params.name)} />
    </Suspense>
  );
}

import { Suspense } from "react";
import GuildProfile from "@/components/profile/GuildProfile";
import { decodeRouteName } from "@/lib/names";

export default function GuildPage({ params }: { params: { name: string } }) {
  return (
    <Suspense fallback={<div className="sk" style={{ height: 280 }} />}>
      <GuildProfile name={decodeRouteName(params.name)} />
    </Suspense>
  );
}

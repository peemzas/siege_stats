import { Suspense } from "react";
import LogView from "@/components/log/LogView";
import { LogSkeleton } from "@/components/log/LogStates";

export default function LogPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LogSkeleton />}>
      <LogView id={params.id} />
    </Suspense>
  );
}

import { Suspense } from "react";
import SiegesView from "@/components/home/SiegesView";

export default function SiegesPage() {
  return (
    <Suspense fallback={<div className="sk" style={{ height: 280 }} />}>
      <SiegesView />
    </Suspense>
  );
}

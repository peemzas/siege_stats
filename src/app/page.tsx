import { Suspense } from "react";
import HomeView from "@/components/home/HomeView";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="sk" style={{ height: 280 }} />}>
      <HomeView />
    </Suspense>
  );
}

import { Suspense } from "react";
import { ReleaseReadiness } from "./release-readiness";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<main className="workspace" />}>
      <ReleaseReadiness />
    </Suspense>
  );
}

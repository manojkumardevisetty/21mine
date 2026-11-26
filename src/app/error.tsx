"use client";
import { useEffect } from "react";

// Errors caused by the site being updated while a page was open (stale build) are recovered
// automatically by reloading once; anything else shows a friendly message.
const STALE = /Failed to find Server Action|older or newer deployment|ChunkLoadError|Loading chunk .* failed/i;

export default function Error({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE.test(error.message ?? "");
  useEffect(() => {
    if (!stale) return;
    try {
      const key = `reloaded:${location.pathname}`;
      if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); location.reload(); }
    } catch { location.reload(); }
  }, [stale]);
  return (
    <main className="container-x grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="h-display text-3xl">{stale ? "The site was just updated" : "Something went wrong"}</h1>
        <p className="mt-3 text-muted">{stale ? "Reloading the page… If nothing happens, press the button below - nothing was charged." : `Please try again. If the problem continues, contact support@21mine.shop${error.digest ? ` (ref ${error.digest})` : ""}.`}</p>
        <button className="btn-primary mt-6" onClick={() => (stale ? location.reload() : reset())}>{stale ? "Reload page" : "Try again"}</button>
      </div>
    </main>
  );
}

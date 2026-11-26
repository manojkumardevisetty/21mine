"use client";
export default function Error({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-x grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="h-display text-3xl">Something went wrong</h1>
        <p className="mt-3 text-muted">Please try again. If the problem continues, contact support@21mine.shop{error.digest ? ` (ref ${error.digest})` : ""}.</p>
        <button className="btn-primary mt-6" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}

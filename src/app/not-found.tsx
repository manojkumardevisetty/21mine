import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container-x grid min-h-[70vh] place-items-center text-center">
      <div>
        <p className="font-display text-7xl text-rose">404</p>
        <h1 className="h-display mt-2 text-3xl">We couldn't find that page</h1>
        <p className="mt-3 text-muted">It may have moved, or the link may be incorrect.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-primary">Go home</Link><Link href="/shop" className="btn-secondary">Shop all</Link></div>
      </div>
    </main>
  );
}

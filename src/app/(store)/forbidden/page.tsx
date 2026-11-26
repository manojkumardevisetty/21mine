import Link from "next/link";
export default function Forbidden() {
  return <div className="container-x max-w-md py-16"><h1 className="h-display text-3xl">Access restricted</h1><p className="mt-2 text-muted">Your role doesn't allow this page. Ask an administrator for access.</p><Link href="/" className="btn-secondary mt-4">Back to store</Link></div>;
}

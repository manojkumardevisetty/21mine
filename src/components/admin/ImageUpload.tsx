"use client";
import { StatefulForm } from "../StatefulForm";
import { useActionState, useRef, useState } from "react";
import { addImageAction } from "@/app/admin/actions";
import { SubmitButton } from "../SubmitButton";

export function ImageUpload({ productId, productName }: { productId: string; productName: string }) {
  const [s, action] = useActionState(addImageAction, null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true); setErr(null);
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({ error: "Upload failed" }));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "Upload failed"); return; }
    setUrl(j.url);
  }
  return (
    <StatefulForm action={action} className="space-y-3 rounded-xl border border-dashed border-sand p-4">
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm font-medium">Add image</p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} aria-label="Upload image file" />
        {busy && <span className="text-xs text-muted">Uploading…</span>}
      </div>
      <p className="text-xs text-muted">JPG, PNG or WebP up to 5 MB. Recommended 1600×2000 px (4:5). Or paste an https:// image URL:</p>
      <input name="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/media/… or https://…" required />
      <input name="alt" className="input" defaultValue={productName} placeholder="Alt text (describe the image)" required />
      {(err || s) && <p role="alert" className={`text-sm ${s?.ok && !err ? "text-ok" : "text-danger"}`}>{err ?? s?.message}</p>}
      <SubmitButton className="btn-secondary btn-sm" disabled={busy || !url}>Add image</SubmitButton>
    </StatefulForm>
  );
}

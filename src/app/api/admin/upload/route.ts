import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { audit } from "@/lib/audit";
import { ALLOWED, MAX_UPLOAD, UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || (s.user.role !== "ADMIN" && s.user.role !== "STAFF")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image file." }, { status: 400 });
  if (file.size > MAX_UPLOAD) return Response.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  const kind = ALLOWED[file.type];
  const buf = Buffer.from(await file.arrayBuffer());
  if (!kind || !kind.magic(buf)) return Response.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 415 });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  let url: string;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel / serverless: store in Vercel Blob (persistent, CDN-served)
      const blob = await put(`products/${name}`, buf, { access: "public", contentType: file.type, addRandomSuffix: false });
      url = blob.url;
    } else {
      // VPS: store on the persistent disk, served by /media/[name]
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(join(UPLOAD_DIR, name), buf);
      url = `/media/${name}`;
    }
  } catch (e) {
    console.error("[upload]", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
  await audit({ id: s.user.id, email: s.user.email }, "upload", "media", name, { size: file.size, type: file.type, url });
  return Response.json({ url });
}

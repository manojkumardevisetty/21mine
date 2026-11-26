import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
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
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  await writeFile(join(UPLOAD_DIR, name), buf);
  await audit({ id: s.user.id, email: s.user.email }, "upload", "media", name, { size: file.size, type: file.type });
  return Response.json({ url: `/media/${name}` });
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { getUser } from "@/lib/authz";
import { verifiedPurchase } from "@/lib/reviews";
import { rateLimit } from "@/lib/ratelimit";

export type ReviewState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const s = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().min(3, "Add a short title").max(80),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(2000),
  displayName: z.string().trim().min(2, "Enter the name to show").max(40),
});

export async function submitReview(_p: ReviewState, fd: FormData): Promise<ReviewState> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Please sign in to write a review." };
  const parsed = s.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please check the highlighted fields.", errors };
  }
  if (!(await rateLimit(`review:${user.id}`, 10, 3600))) return { ok: false, message: "Too many submissions. Please try again later." };
  const orderId = await verifiedPurchase(user.id, parsed.data.productId);
  if (!orderId) return { ok: false, message: "Only customers who have bought this product can review it." };
  const { productId, rating, title, body, displayName } = parsed.data;
  await db.insert(schema.reviews).values({ productId, userId: user.id, orderId, rating, title, body, displayName, status: "PENDING" })
    .onConflictDoUpdate({ target: [schema.reviews.userId, schema.reviews.productId], set: { rating, title, body, displayName, status: "PENDING", updatedAt: new Date() } });
  revalidatePath("/product/[slug]", "page");
  return { ok: true, message: "Thank you! Your review has been submitted and will appear once approved." };
}

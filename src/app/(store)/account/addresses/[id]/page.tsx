import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/authz";
import { COUNTRIES, UAE_EMIRATES } from "@/lib/countries";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressForm } from "@/components/account/Forms";

export const metadata: Metadata = { title: "Edit address", robots: { index: false } };
export default async function EditAddress({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/account/addresses");
  const { id } = await params;
  const a = await db.query.addresses.findFirst({ where: and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)) });
  if (!a) notFound();
  return <AccountShell title="Edit address" active="/account/addresses"><AddressForm a={a} countries={COUNTRIES} emirates={UAE_EMIRATES} /></AccountShell>;
}

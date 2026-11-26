import type { Metadata } from "next";
import { requireUser } from "@/lib/authz";
import { COUNTRIES, UAE_EMIRATES } from "@/lib/countries";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressForm } from "@/components/account/Forms";

export const metadata: Metadata = { title: "Add address", robots: { index: false } };
export default async function NewAddress() {
  await requireUser("/account/addresses/new");
  return <AccountShell title="Add address" active="/account/addresses"><AddressForm countries={COUNTRIES} emirates={UAE_EMIRATES} /></AccountShell>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/authz";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact us", description: "Contact 21mine customer care." };

export default async function Contact() {
  const [s, user] = await Promise.all([getSettings(), getUser()]);
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Contact us</h1>
        <p className="mt-3 max-w-xl text-muted">Questions about an order, a product or delivery? Send us a message and our team will reply within 1 business day.</p>
        <div className="mt-8 max-w-2xl"><ContactForm email={user?.email} name={user?.name} /></div>
      </div>
      <aside className="card h-fit space-y-5 p-6 text-sm">
        <div><h2 className="font-display text-xl">Customer care</h2>
          <p className="mt-2"><a className="link" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></p>
          <p><a className="link" href="mailto:info@21mine.shop">info@21mine.shop</a> (general enquiries)</p>
          {s.supportPhone && <p>{s.supportPhone}</p>}
          {s.supportHours && <p className="mt-1 text-muted">{s.supportHours}</p>}
        </div>
        <div><h2 className="font-display text-xl">Business information</h2>
          <dl className="mt-2 space-y-1 text-muted">
            <div><dt className="inline font-medium text-charcoal">Legal entity: </dt><dd className="inline">{s.legalName}</dd></div>
            <div><dt className="inline font-medium text-charcoal">Trade licence: </dt><dd className="inline">{s.tradeLicenceNumber}</dd></div>
            <div><dt className="inline font-medium text-charcoal">Authority: </dt><dd className="inline">{s.licenceAuthority}</dd></div>
            <div><dt className="inline font-medium text-charcoal">Address: </dt><dd className="inline">{s.businessAddress}</dd></div>
          </dl>
        </div>
        <p><Link href="/policies/shipping" className="link">Shipping</Link> · <Link href="/policies/returns" className="link">Returns</Link> · <Link href="/policies/contact" className="link">Business info</Link></p>
      </aside>
    </div>
  );
}

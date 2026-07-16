import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

export async function PolicyContact() {
  const settings = await getSettings();
  const phone = settings[SETTINGS.STORE_PHONE];
  const email = settings[SETTINGS.STORE_EMAIL];
  const address = settings[SETTINGS.STORE_ADDRESS];
  return (
    <>
      {settings[SETTINGS.STORE_NAME] || "AzhaguThinpandam"}
      {address ? `, ${address}` : ""}
      {phone ? ` · Phone/WhatsApp: ${phone}` : ""}
      {email ? ` · Email: ${email}` : ""}
    </>
  );
}

export function PolicyLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p>
      <div className="prose-policy mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

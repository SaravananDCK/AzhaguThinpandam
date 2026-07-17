import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, HandHeart, Leaf, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlideshow } from "@/components/store/hero-slideshow";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { getCategories, getFeaturedProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: {
    absolute:
      "Kovilpatti Kadalai Mittai Online | AzhaguThinpandam — Traditional Tamil Snacks & Sweets",
  },
  description:
    "The home of authentic Kovilpatti kadalai mittai (kadalaimittai) — peanut candy set in country jaggery. Plus murukku, sev, seeval, mixture and karupatti sweets, made fresh and delivered across India.",
  alternates: { canonical: "/" },
};

const TRUST_ROW = [
  { Icon: Truck, text: "Free shipping over ₹999" },
  { Icon: HandHeart, text: "Made fresh in small batches" },
  { Icon: ShieldCheck, text: "Secure payments via Razorpay" },
];

const WHY_US = [
  {
    Icon: HandHeart,
    title: "Made in small batches",
    desc: "Every batch is prepared fresh to order — never mass-produced, never stockpiled.",
  },
  {
    Icon: Leaf,
    title: "Pure ingredients",
    desc: "Groundnuts, gingelly oil and country jaggery. Nothing artificial, ever.",
  },
  {
    Icon: Truck,
    title: "Packed with care",
    desc: "Sealed and cushioned so every murukku reaches you crisp and whole.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10 text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">
        {eyebrow}
      </p>
      <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <div>
      {/* Hero — rotating lifestyle photos with maroon overlay. Bleeds up under
          the transparent floating nav (negative margin = the reserved nav height). */}
      <section
        className="relative overflow-hidden text-white"
        style={{ marginTop: "calc(var(--nav-h) * -1)" }}
      >
        <HeroSlideshow />
        {/* Legibility overlays: maroon wash from the left, vignette at edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/70 to-primary-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />

        <div
          className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:pb-28 lg:pb-36"
          style={{ paddingTop: "calc(var(--nav-h) + 3.5rem)" }}
        >
          {/* Copy */}
          <div className="max-w-2xl text-center sm:text-left">
            <p className="mb-5 animate-fade-in-up text-xs font-semibold uppercase tracking-[0.35em] text-gold-300">
              Kovilpatti · அழகு திண்பண்டம்
            </p>
            <h1
              className="mb-6 animate-fade-in-up font-heading text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              The taste of{" "}
              <span className="italic text-gold-300">Kovilpatti</span>,
              <br className="hidden sm:block" /> delivered to your home.
            </h1>
            <p
              className="mx-auto mb-9 max-w-xl animate-fade-in-up text-base font-light leading-relaxed text-white/75 sm:mx-0 sm:text-lg"
              style={{ animationDelay: "0.2s" }}
            >
              Kadalai mittai set in country jaggery, hand-twisted murukku, sev and
              mixture — made fresh in small batches, the way it has always been made.
            </p>

            <div
              className="mb-12 flex animate-fade-in-up flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                href="/products"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-9 py-3.5 text-base font-semibold text-[#2a1204] shadow-lg shadow-gold-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold-800/40 sm:w-auto"
              >
                Shop the collection
                <ArrowRight className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/build-box"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-9 py-3.5 text-base font-medium text-white/90 transition-all duration-300 hover:border-gold-300/60 hover:text-gold-200 sm:w-auto"
              >
                Build your own box
              </Link>
            </div>

            {/* Trust row */}
            <div
              className="flex animate-fade-in-up flex-col items-center gap-3 text-sm text-white/70 sm:flex-row sm:justify-start sm:gap-0"
              style={{ animationDelay: "0.4s" }}
            >
              {TRUST_ROW.map(({ Icon, text }, i) => (
                <span key={text} className="flex items-center">
                  {i > 0 && <span className="mx-5 hidden h-4 w-px bg-white/15 sm:block" />}
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-gold-400" />
                    {text}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Gold hairline base */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* Grand opening promo banner */}
        <section className="mt-8 sm:mt-10">
          <Reveal>
            <Link
              href="/products"
              className="group block overflow-hidden rounded-2xl border shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/welcome.webp"
                alt="Grand Opening Offer — 18% off your first order of Kovilpatti Kadalai Mittai with code WELCOME18"
                width={1672}
                height={941}
                className="w-full transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </Link>
          </Reveal>
        </section>

        {/* Why us */}
        <section className="mt-16 sm:mt-20">
          <Reveal>
            <SectionHeader
              eyebrow="Our promise"
              title="Tradition, without shortcuts"
              subtitle="Three generations of taste, packed into every box."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-3">
            {WHY_US.map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="group h-full rounded-2xl border bg-card p-8 text-center transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-lg">
                  <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-secondary text-primary transition-colors duration-500 group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mb-2 font-heading text-xl font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-16 sm:mt-20">
          <Reveal>
            <SectionHeader
              eyebrow="Explore"
              title="Shop by category"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
              <Link
                href={`/products?category=${c.slug}`}
                className="group relative block overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-xl"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image}
                      alt={c.name}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="font-heading text-lg font-semibold leading-tight drop-shadow">
                    {c.name}
                  </p>
                  {c.tamilName && <p className="mt-0.5 text-xs text-gold-200">{c.tamilName}</p>}
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="my-16 sm:my-20">
            <Reveal>
              <SectionHeader
                eyebrow="Customer favourites"
                title="Bestsellers"
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 90}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <Link href="/products">
                  View all products <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Showcase gallery */}
        <section className="my-16 sm:my-20">
          <Reveal>
            <SectionHeader
              eyebrow="From our kitchen"
              title="Made the traditional way"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n, i) => (
              <Reveal key={n} delay={(i % 3) * 100}>
                <div className="group overflow-hidden rounded-2xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/showcase/showcase-${n}.webp`}
                    alt="AzhaguThinpandam snacks showcase"
                    className="aspect-square size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="mb-16 sm:mb-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/cta.webp"
                alt=""
                className="absolute inset-0 size-full object-cover object-right"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/75 to-primary-950/25" />
              <div className="relative z-10 max-w-xl px-8 py-14 sm:px-12 sm:py-16">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
                  Fresh batch every week
                </p>
                <h2 className="mb-4 font-heading text-3xl font-semibold sm:text-4xl">
                  Bring home the taste of the pettikadai.
                </h2>
                <p className="mb-7 text-sm leading-relaxed text-white/75 sm:text-base">
                  Order today and we&apos;ll pack your kadalai mittai, murukku and
                  mixture fresh — straight from Kovilpatti to your door.
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-8 py-3.5 text-base font-semibold text-[#2a1204] shadow-lg shadow-gold-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Order now <ArrowRight className="size-4.5" />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}

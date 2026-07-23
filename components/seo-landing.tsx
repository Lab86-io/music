import Link from "next/link";
import { Header } from "@/components/header";
import { LinkConverter } from "@/components/link-converter";
import { CONVERSION_PAIRS } from "@/lib/seo-pairs";
import { SEO_PAGES } from "@/lib/seo-pages";

export interface SeoFaqItem {
  question: string;
  answer: string;
}

/**
 * Shared frame for the standalone SEO landing pages (/playlist-converter,
 * /songlink-alternative, ...). Same visual language as the pair pages.
 */
export function SeoLanding({
  slug,
  h1,
  sub,
  faq,
  children,
}: {
  slug: string;
  h1: string;
  sub: string;
  faq: SeoFaqItem[];
  children: React.ReactNode;
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="relative">
        <div aria-hidden className="hero-staff pointer-events-none absolute inset-x-0 top-0 h-72" />
        <div className="container relative mx-auto px-4">
          <section className="mx-auto max-w-2xl pt-12 text-center sm:pt-16">
            <h1 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {h1}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">{sub}</p>
          </section>

          <section className="mx-auto max-w-2xl pb-10 pt-8">
            <LinkConverter showHistory={false} />
          </section>

          {children}

          <section className="mx-auto max-w-2xl pb-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Common questions
            </h2>
            <dl className="mt-2 space-y-4">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-semibold">{item.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mx-auto max-w-2xl pb-16">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Every direction
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {CONVERSION_PAIRS.map((pair) => (
                <li key={pair.slug}>
                  <Link
                    href={`/${pair.slug}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {pair.from.name} to {pair.to.name}
                  </Link>
                </li>
              ))}
              {SEO_PAGES.filter((page) => page.slug !== slug).map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

export function SeoSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl pb-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {heading}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

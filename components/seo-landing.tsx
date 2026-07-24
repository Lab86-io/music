import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
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
    <Stack className="min-h-screen bg-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Stack className="relative">
        <Stack aria-hidden className="hero-staff pointer-events-none absolute inset-x-0 top-0 h-72" />
        <Stack className="container relative mx-auto px-4">
          <Stack as="section" className="mx-auto max-w-3xl pt-12 text-center sm:pt-16">
            <Heading level={1} className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {h1}
            </Heading>
            <Text as="p" className="mx-auto mt-3 max-w-md text-balance text-secondary">{sub}</Text>
          </Stack>

          <Stack as="section" className="mx-auto max-w-6xl pb-10 pt-8">
            <LinkConverter showHistory={false} />
          </Stack>

          {children}

          <Stack as="section" className="mx-auto max-w-2xl pb-10">
            <Heading level={2} className="text-xs font-semibold uppercase tracking-wide text-secondary">
              Common questions
            </Heading>
            <dl className="mt-2 space-y-4">
              {faq.map((item) => (
                <Stack key={item.question}>
                  <dt className="text-sm font-semibold">{item.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-secondary">
                    {item.answer}
                  </dd>
                </Stack>
              ))}
            </dl>
          </Stack>

          <Stack as="section" className="mx-auto max-w-2xl pb-16">
            <Heading level={2} className="text-xs font-semibold uppercase tracking-wide text-secondary">
              Every direction
            </Heading>
            <Stack as="ul" direction="horizontal" wrap="wrap" className="mt-2 gap-x-4 gap-y-1.5">
              {CONVERSION_PAIRS.map((pair) => (
                <Stack as="li" key={pair.slug}>
                  <Link
                    href={`/${pair.slug}`}
                    className="text-xs text-secondary transition-colors hover:text-primary hover:underline"
                  >
                    {pair.from.name} to {pair.to.name}
                  </Link>
                </Stack>
              ))}
              {SEO_PAGES.filter((page) => page.slug !== slug).map((page) => (
                <Stack as="li" key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="text-xs text-secondary transition-colors hover:text-primary hover:underline"
                  >
                    {page.label}
                  </Link>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
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
    <Stack as="section" className="mx-auto max-w-2xl pb-10">
      <Heading level={2} className="text-xs font-semibold uppercase tracking-wide text-secondary">
        {heading}
      </Heading>
      <Stack className="mt-2 space-y-3 text-sm leading-relaxed text-secondary">
        {children}
      </Stack>
    </Stack>
  );
}

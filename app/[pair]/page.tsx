import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { LinkConverter } from "@/components/link-converter";
import { CONVERSION_PAIRS, findPair, type ConversionPair } from "@/lib/seo-pairs";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERSION_PAIRS.map((pair) => ({ pair: pair.slug }));
}

interface PageProps {
  params: Promise<{ pair: string }>;
}

function pageDescription(pair: ConversionPair): string {
  if (pair.to.id === "amazon") {
    return `Free ${pair.from.name} to ${pair.to.name} converter. Paste a song, album, or artist link from ${pair.from.name} and get a matching ${pair.to.name} link. No account needed.`;
  }
  return `Free ${pair.from.name} to ${pair.to.name} converter. Paste a song, album, artist, or playlist link from ${pair.from.name} and get the ${pair.to.name} match. No account needed.`;
}

interface FaqItem {
  question: string;
  answer: string;
}

function buildFaq(pair: ConversionPair): FaqItem[] {
  const { from, to } = pair;
  const faq: FaqItem[] = [];

  faq.push({
    question: "Do I need an account?",
    answer:
      to.id === "amazon"
        ? "No. Songs, albums, and artists convert without any sign in. Amazon Music has no public API, so the result is a pre-filled Amazon search that lands on the right item."
        : `No. Songs, albums, and artists convert without any sign in. Converting a full playlist into ${to.name} needs a sign in so the playlist can be created in your library.`,
  });

  faq.push({
    question: "How accurate are the matches?",
    answer:
      "Songs match by ISRC first, the recording industry's unique ID for a recording, so most matches are exact. When a catalog does not report an ISRC, the converter compares title, artist, and album and shows a confidence score.",
  });

  if (to.id === "amazon") {
    faq.push({
      question: `Can I convert a whole ${from.name} playlist to ${to.name}?`,
      answer:
        "No. Amazon Music has no public API for playlists. A playlist link still works here, but it becomes a 48 hour share page for the five other services instead.",
    });
  } else if (from.id === "youtube") {
    faq.push({
      question: `Can I convert a whole ${from.name} playlist to ${to.name}?`,
      answer: `Yes. Paste the playlist link to get a 48 hour share page anyone can import from. YouTube playlists carry no track IDs, so tracks match by title and accuracy can vary.`,
    });
  } else {
    faq.push({
      question: `Can I convert a whole ${from.name} playlist to ${to.name}?`,
      answer: `Yes. Paste the playlist link to get a 48 hour share page, or sign in and convert it straight into your ${to.name} library. Matching is ISRC first, so playlists come across accurately.`,
    });
  }

  return faq;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair: slug } = await params;
  const pair = findPair(slug);
  if (!pair) return {};
  const title = `Convert ${pair.from.name} to ${pair.to.name}`;
  const description = pageDescription(pair);
  return {
    title,
    description,
    alternates: { canonical: `/${pair.slug}` },
    openGraph: { title, description, url: `/${pair.slug}` },
  };
}

export default async function ConversionPairPage({ params }: PageProps) {
  const { pair: slug } = await params;
  const pair = findPair(slug);
  if (!pair) notFound();

  const { from, to } = pair;
  const faq = buildFaq(pair);
  const others = CONVERSION_PAIRS.filter((p) => p.slug !== pair.slug);

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
              Convert {from.name} to {to.name}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
              {to.id === "amazon"
                ? `Paste a ${from.name} link and get the ${to.name} version. Free, no account.`
                : `Paste a ${from.name} link and get the ${to.name} version. Free, no account, playlists included.`}
            </p>
          </section>

          <section className="mx-auto max-w-2xl pb-10 pt-8">
            <LinkConverter showHistory={false} />
          </section>

          <section className="mx-auto max-w-2xl pb-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How it works
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is the same converter that runs on the{" "}
              <Link href="/" className="font-medium text-foreground hover:underline">
                home page
              </Link>
              . It looks the song up on {from.name}, then finds the same recording on{" "}
              {to.name}
              {to.id === "amazon"
                ? " with a pre-filled search, since Amazon has no public catalog API"
                : " by ISRC, with a title and artist comparison as fallback"}
              . Albums and artists convert too, and every result comes with a universal
              page that lists all six services at once.
            </p>
          </section>

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
              Other directions
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/${other.slug}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {other.from.name} to {other.to.name}
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

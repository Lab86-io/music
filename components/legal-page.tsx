import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_EFFECTIVE_DATE_LABEL,
} from "@/lib/legal";

/**
 * Shared frame for the public legal pages (/privacy and /terms). One narrow
 * reading column in the same type scale as the SEO landing pages.
 */

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack className="min-h-screen bg-body">
      <Stack
        as="article"
        className="mx-auto w-full max-w-2xl px-4 pb-16 pt-12 sm:pt-16"
      >
        <Heading
          level={1}
          className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {title}
        </Heading>
        <Text as="p" type="supporting" display="block" className="mt-3">
          Effective date:{" "}
          <time dateTime={LEGAL_EFFECTIVE_DATE}>{LEGAL_EFFECTIVE_DATE_LABEL}</time>
        </Text>
        <Stack gap={3} className="mt-6 leading-relaxed">
          {intro}
        </Stack>
        <Stack gap={10} className="mt-10">
          {children}
        </Stack>
      </Stack>
    </Stack>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Stack as="section" aria-labelledby={id} className="scroll-mt-6">
      <Heading level={2} id={id} className="text-lg font-semibold">
        {heading}
      </Heading>
      <Stack gap={3} className="mt-3 leading-relaxed">
        {children}
      </Stack>
    </Stack>
  );
}

/** One block paragraph of body copy. Astryx Text is inline by default. */
export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Text as="p" display="block">
      {children}
    </Text>
  );
}

/** Term and description rows, in the same structure as the FAQ lists. */
export function LegalList({
  items,
}: {
  items: ReadonlyArray<{ term: string; description: React.ReactNode }>;
}) {
  return (
    <dl className="space-y-5">
      {items.map((item) => (
        <Stack key={item.term}>
          <dt>
            <Text weight="semibold">{item.term}</Text>
          </dt>
          <dd className="mt-1 space-y-3">{item.description}</dd>
        </Stack>
      ))}
    </dl>
  );
}

export function LegalBullets({ items }: { items: ReadonlyArray<React.ReactNode> }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-secondary">
      {items.map((item, index) => (
        <li key={index}>
          <Text>{item}</Text>
        </li>
      ))}
    </ul>
  );
}

/** Inline text link. External links stay in the same tab and show no icon. */
export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      hasUnderline
      className="font-medium text-primary underline-offset-2"
    >
      {children}
    </Link>
  );
}

export function ContactEmail() {
  return (
    <LegalLink href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</LegalLink>
  );
}

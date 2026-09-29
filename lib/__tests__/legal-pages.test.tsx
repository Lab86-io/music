import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// The sitemap reads recorded universal links from Postgres; tests have no database.
vi.mock("@/lib/universal-links", () => ({
  getRecentUniversalLinks: vi.fn(async () => []),
}));

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import sitemap from "@/app/sitemap";
import { Footer } from "@/components/footer";
import {
  GOOGLE_API_USER_DATA_POLICY_URL,
  GOOGLE_LIMITED_USE_STATEMENT,
  GOOGLE_PERMISSIONS_URL,
  GOOGLE_PRIVACY_POLICY_URL,
  LEGAL_CONTACT_EMAIL,
  YOUTUBE_OAUTH_SCOPE,
  YOUTUBE_TERMS_URL,
} from "@/lib/legal";
import { buildYouTubeAuthUrl } from "@/lib/youtube-oauth";

function renderDocument(element: React.ReactElement): Document {
  return new DOMParser().parseFromString(renderToStaticMarkup(element), "text/html");
}

function hrefs(doc: Document): string[] {
  return Array.from(doc.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
}

describe("privacy policy page", () => {
  const doc = renderDocument(<PrivacyPage />);
  const text = doc.body.textContent ?? "";

  it("keeps the Google Limited Use statement verbatim", () => {
    expect(GOOGLE_LIMITED_USE_STATEMENT).toBe(
      "Lab86 Music's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."
    );
    expect(text).toContain(GOOGLE_LIMITED_USE_STATEMENT);
  });

  it("links the Google and YouTube policies that YouTube API Services need", () => {
    expect(text).toContain("Lab86 Music uses YouTube API Services.");
    for (const url of [
      GOOGLE_API_USER_DATA_POLICY_URL,
      YOUTUBE_TERMS_URL,
      GOOGLE_PRIVACY_POLICY_URL,
      GOOGLE_PERMISSIONS_URL,
      `mailto:${LEGAL_CONTACT_EMAIL}`,
    ]) {
      expect(hrefs(doc)).toContain(url);
    }
  });

  it("names the same YouTube scope that the OAuth flow asks for", () => {
    process.env.YOUTUBE_OAUTH_CLIENT_ID = "test-client";
    const scope = new URL(buildYouTubeAuthUrl("https://music.lab86.io", "state")).searchParams.get(
      "scope"
    );
    expect(scope).toBe(YOUTUBE_OAUTH_SCOPE);
    expect(text).toContain(YOUTUBE_OAUTH_SCOPE);
  });

  it("shows the effective date and one top-level heading", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-29");
  });
});

describe("terms page", () => {
  const doc = renderDocument(<TermsPage />);

  it("links the YouTube terms, the Google privacy policy, and the privacy page", () => {
    expect(doc.body.textContent).toContain("Lab86 Music uses YouTube API Services.");
    expect(hrefs(doc)).toEqual(
      expect.arrayContaining([YOUTUBE_TERMS_URL, GOOGLE_PRIVACY_POLICY_URL, "/privacy"])
    );
    expect(doc.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-29");
  });
});

describe("legal page discovery", () => {
  it("links Privacy and Terms from the global footer", () => {
    const doc = renderDocument(<Footer />);
    const legalNav = doc.querySelector('nav[aria-label="Legal"]');
    expect(Array.from(legalNav?.querySelectorAll("a") ?? []).map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ]);
  });

  it("lists both pages in the sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("https://music.lab86.io/privacy");
    expect(urls).toContain("https://music.lab86.io/terms");
  });
});

import type { Metadata } from "next";

// The dashboard requires a signed-in session; keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

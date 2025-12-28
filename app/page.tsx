"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceConnect } from "@/components/service-connect";
import { Header } from "@/components/header";
import { IconLoader2 } from "@tabler/icons-react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check Spotify session and redirect to dashboard if authenticated
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/spotify/session");
        const data = await response.json();
        if (data.session) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <ServiceConnect />
        </div>
      </main>
    </div>
  );
}

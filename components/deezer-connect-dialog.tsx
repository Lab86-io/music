"use client";

import { useState } from "react";
import { IconAlertTriangle, IconLoader2, IconShieldLock } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeezerLogo } from "@/components/icons";

interface DeezerConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (userName?: string) => void;
}

export function DeezerConnectDialog({
  open,
  onOpenChange,
  onConnected,
}: DeezerConnectDialogProps) {
  const [arl, setArl] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setArl("");
    setAcknowledged(false);
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !arl.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/deezer/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arl: arl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Deezer rejected that session");
        return;
      }
      onConnected(data.userName);
      close();
    } catch {
      setError("Could not connect to Deezer. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
        else onOpenChange(true);
      }}
    >
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-[#A238FF]/12 text-[#A238FF]">
              <DeezerLogo className="size-8" />
            </AlertDialogMedia>
            <AlertDialogTitle>Advanced Deezer connection</AlertDialogTitle>
            <AlertDialogDescription>
              Deezer is not accepting new OAuth apps. This opt-in connection uses the
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">arl</code>
              session value from a browser where you are already signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-3 text-xs text-amber-950 dark:text-amber-100">
              <div className="flex gap-2.5">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>
                  An ARL is a full-account session key. This unofficial method may break,
                  may violate Deezer&apos;s terms, and carries account risk. The value is kept
                  in an HTTP-only browser cookie and is never saved to the database or logs.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="deezer-arl" className="text-sm font-medium">
                Deezer ARL
              </label>
              <Input
                id="deezer-arl"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={arl}
                onChange={(event) => setArl(event.target.value)}
                placeholder="Paste the arl cookie value"
                aria-invalid={Boolean(error)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                In desktop browser developer tools: Storage/Application → Cookies →
                deezer.com → copy the value named <code>arl</code>.
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5 size-4 accent-[#A238FF]"
              />
              <span>I understand this is an unofficial connection and the ARL is as sensitive as a password.</span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={!acknowledged || !arl.trim() || loading}
              className="gap-2 bg-[#A238FF] text-white hover:bg-[#8f2bea]"
            >
              {loading ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconShieldLock className="size-4" />
              )}
              {loading ? "Validating…" : "Connect Deezer"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

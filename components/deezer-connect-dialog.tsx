"use client";

import { useState } from "react";
import { IconShieldLock } from "@tabler/icons-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
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
    <Dialog isOpen={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} purpose="form" width={520}>
      <form onSubmit={handleSubmit}>
        <Layout
          height="auto"
          header={
            <DialogHeader
              title="Advanced Deezer connection"
              subtitle="Use the session from a browser where you are already signed in."
              startContent={<DeezerLogo className="size-8" />}
              onOpenChange={() => close()}
            />
          }
          content={
            <LayoutContent padding={4} isScrollable={false}>
              <VStack gap={4}>
                <Banner
                  status="warning"
                  title="Treat your ARL like a password"
                  description="This unofficial method may break or violate Deezer's terms. Music stores the value only in an HTTP-only browser cookie, never in the database or logs."
                />
                <TextInput
                  label="Deezer ARL"
                  description="In desktop browser developer tools: Storage/Application → Cookies → deezer.com → copy the value named arl."
                  type="password"
                  value={arl}
                  onChange={setArl}
                  placeholder="Paste the arl cookie value"
                  status={error ? { type: "error", message: error } : undefined}
                  isDisabled={loading}
                  htmlName="arl"
                  width="100%"
                />
                <CheckboxInput
                  label="I understand this is an unofficial connection and the ARL is as sensitive as a password."
                  value={acknowledged}
                  onChange={setAcknowledged}
                  isRequired
                  isDisabled={loading}
                  htmlName="acknowledged"
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="end" padding={3}>
                <Button
                  type="button"
                  label="Cancel"
                  variant="secondary"
                  isDisabled={loading}
                  onClick={close}
                />
                <Button
                  type="submit"
                  label={loading ? "Validating…" : "Connect Deezer"}
                  icon={<IconShieldLock size={16} />}
                  variant="primary"
                  isDisabled={!acknowledged || !arl.trim() || loading}
                  isLoading={loading}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}

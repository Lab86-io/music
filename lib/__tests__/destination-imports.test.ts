import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { normalizeReturnPath, returnPathWithError } from "../auth-return";
import { mapWithConcurrency } from "../import-utils";
import {
  addTracksToTidalPlaylist,
  createTidalPlaylist,
  type TidalSession,
} from "../tidal-auth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OAuth return paths", () => {
  it("keeps local paths and rejects external or protocol-relative redirects", () => {
    expect(normalizeReturnPath("/share/abc?from=auth")).toBe("/share/abc?from=auth");
    expect(normalizeReturnPath("https://attacker.example/steal")).toBe("/dashboard");
    expect(normalizeReturnPath("//attacker.example/steal")).toBe("/dashboard");
    expect(normalizeReturnPath(null)).toBe("/dashboard");
  });

  it("adds an OAuth error without discarding an existing query", () => {
    expect(returnPathWithError("/share/abc?source=tidal", "auth_failed")).toBe(
      "/share/abc?source=tidal&error=auth_failed"
    );
  });
});

describe("bounded import matching", () => {
  it("preserves result order while limiting concurrent work", async () => {
    let active = 0;
    let maxActive = 0;
    const results = await mapWithConcurrency([4, 3, 2, 1], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active -= 1;
      return value * 10;
    });

    expect(results).toEqual([40, 30, 20, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe("TIDAL playlist writes", () => {
  const session: TidalSession = {
    accessToken: "test-access-token",
    expiresAt: Date.now() + 60_000,
    countryCode: "US",
  };

  it("creates a private playlist using the current JSON:API payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: "playlist-id" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTidalPlaylist(session, "Road trip", "Imported")).resolves.toEqual({
      id: "playlist-id",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openapi.tidal.com/v2/playlists?countryCode=US");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Idempotency-Key": expect.any(String) });
    expect(JSON.parse(String(init.body))).toEqual({
      data: {
        type: "playlists",
        attributes: { name: "Road trip", description: "Imported" },
      },
    });
  });

  it("adds no more than the documented 50 items per request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ids = Array.from({ length: 51 }, (_, index) => String(index + 1));
    await expect(addTracksToTidalPlaylist(session, "playlist-id", ids)).resolves.toEqual({
      added: 51,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(firstBody.data).toHaveLength(50);
    expect(secondBody.data).toHaveLength(1);
  });
});

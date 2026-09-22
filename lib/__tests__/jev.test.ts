// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackEvidence } from "../jev";

const source = { title: "Northern Lights", artist: "The Harbour" };
const candidates = [
  { title: "Northern Lights (Live)", artist: "The Harbour", id: "live" },
  { title: "Northern Lights (2024 Remaster)", artist: "The Harbour", id: "studio" },
];
const identity = (track: TrackEvidence) => track;
let select: typeof import("../jev").selectTrackCandidate;
let fetchMock: ReturnType<typeof vi.fn>;

function response(choice = "candidate_1", confidence = 1, probabilities: Record<string, number> = { candidate_0: 0, candidate_1: 1, none: 0 }) {
  return new Response(JSON.stringify({
    model: "typesafe/jev-1.13-20260917",
    answers: { best_match: { type: "choice", choice, confidence, probabilities } },
  }));
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("JEV_MATCHING_ENABLED", "true");
  fetchMock = vi.fn().mockImplementation(async () => response());
  vi.stubGlobal("fetch", fetchMock);
  select = (await import("../jev")).selectTrackCandidate;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Jev recording review", () => {
  it("reranks candidates and sends only bounded track evidence", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const enriched = { ...source, url: "https://private.example", accessToken: "not-for-model", album: "A".repeat(1000) };
    expect(await select(enriched, candidates, identity, candidates[0])).toBe(candidates[1]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/alpha/decisions");
    expect(timeout).toHaveBeenCalledWith(1500);
    const request = JSON.parse(init.body);
    expect(request.state.source.album).toHaveLength(300);
    expect(init.body).not.toContain("not-for-model");
    expect(init.body).not.toContain("private.example");
    expect(request.questions.best_match.criteria).toHaveProperty("none");
  });

  it.each(["disabled", "missing key"])("keeps the fallback with %s", async reason => {
    vi.stubEnv(reason === "disabled" ? "JEV_MATCHING_ENABLED" : "OPENROUTER_API_KEY", reason === "disabled" ? "false" : "");
    expect(await select(source, candidates, identity, candidates[0])).toBe(candidates[0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips exact metadata, preserving version punctuation", async () => {
    expect(await select(source, [source], identity, source)).toBe(source);
    expect(fetchMock).not.toHaveBeenCalled();
    await select(source, candidates, identity, candidates[0]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["none", 1, { candidate_0: 0, candidate_1: 0, none: 1 }],
    ["candidate_1", 0.5, { candidate_0: 0.2, candidate_1: 0.8, none: 0 }],
    ["candidate_1", 0.95, { candidate_0: 0.07, candidate_1: 0.93, none: 0 }],
  ])("does not restore the fuzzy match after rejection or uncertainty (%s, %s)", async (choice, confidence, probabilities) => {
    fetchMock.mockResolvedValueOnce(response(choice, confidence, probabilities));
    expect(await select(source, candidates, identity, candidates[0])).toBeNull();
  });

  it.each([401, 429, 529])("falls back and cools down after HTTP %s", async status => {
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status }));
    expect(await select(source, candidates, identity, candidates[0])).toBe(candidates[0]);
    expect(await select({ ...source, title: "Another" }, candidates, identity, null)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back on an aborted request", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"));
    expect(await select(source, candidates, identity, candidates[0])).toBe(candidates[0]);
  });

  it.each([
    ["candidate_99", 1, { candidate_0: 0, candidate_1: 1, none: 0 }],
    ["candidate_1", 1, { candidate_1: 1 }],
    ["candidate_1", 1, { candidate_0: 1, candidate_1: 1, none: 0 }],
    ["candidate_0", 1, { candidate_0: 0, candidate_1: 1, none: 0 }],
  ])("falls back for malformed answers (%s)", async (choice, confidence, probabilities) => {
    fetchMock.mockResolvedValueOnce(response(choice, confidence, probabilities));
    expect(await select(source, candidates, identity, candidates[0])).toBe(candidates[0]);
  });

  it("coalesces concurrent requests and caches successful reviews", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => select(source, candidates, identity, candidates[0])));
    expect(results.every(result => result === candidates[1])).toBe(true);
    expect(await select(source, candidates, identity, candidates[0])).toBe(candidates[1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps submitted candidates", async () => {
    fetchMock.mockResolvedValueOnce(response("none", 1, { ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`candidate_${i}`, 0])), none: 1 }));
    await select(source, Array.from({ length: 20 }, () => candidates[0]), identity, candidates[0]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).state.candidates).toHaveLength(10);
  });
});

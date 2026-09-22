import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { _internal, type LinkMetadata } from "../lib/link-converter";
import { fixtures } from "./jev-fixtures";

import { buildJevMatchRequest, JEV_MATCH_INSTRUCTIONS as instructions } from "../lib/jev";

function baseline(source: LinkMetadata, candidates: LinkMetadata[]) {
  const scored = candidates.map((candidate, index) => ({ index, score: _internal.scoreCandidate(source, candidate) }));
  const best = scored.reduce((a, b) => b.score > a.score ? b : a);
  return { choice: best.score >= 0.4 ? `candidate_${best.index}` : "none", scores: scored.map(c => c.score) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

async function main() {
  const offline = process.argv.includes("--offline");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!offline && !apiKey) throw new Error("Set OPENROUTER_API_KEY in the environment or .env.local, or use --offline.");
  const rows = [];
  let totalCost = 0;
  let totalInputTokens = 0;
  // Both orders are predeclared trials. These are correlated, not independent samples.
  for (const fixture of fixtures) {
    for (const reversed of [false, true]) {
      const candidates = reversed ? [...fixture.candidates].reverse() : fixture.candidates;
      const expectedIndex = fixture.expected === null ? null : reversed ? candidates.length - 1 - fixture.expected : fixture.expected;
      const expected = expectedIndex === null ? "none" : `candidate_${expectedIndex}`;
      const heuristic = baseline(fixture.source, candidates);
      const request = buildJevMatchRequest(fixture.source, candidates);
      const criteria = request.questions.best_match.criteria;
      let jev = null;
      if (!offline) {
        const start = performance.now();
        const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(15000),
        });
        // Do not print remote error bodies: they can echo request metadata.
        if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}; experiment stopped without retrying.`);
        const body: unknown = await response.json();
        const elapsedMs = Math.round(performance.now() - start);
        if (!isObject(body) || !isObject(body.answers) || !isObject(body.answers.best_match)) throw new Error("Missing Jev answer");
        const answer = body.answers.best_match;
        if (answer.type !== "choice" || typeof answer.choice !== "string" || !Object.hasOwn(criteria, answer.choice) ||
          !unit(answer.confidence) || !isObject(answer.probabilities)) throw new Error("Invalid Jev choice");
        const probabilities = answer.probabilities;
        if (Object.keys(probabilities).length !== Object.keys(criteria).length ||
          !Object.keys(criteria).every(key => unit(probabilities[key])) ||
          Math.abs(Object.values(probabilities).reduce<number>((sum, p) => sum + Number(p), 0) - 1) > 0.05) {
          throw new Error("Invalid Jev probability distribution");
        }
        if (typeof body.model !== "string" || !body.model.startsWith("typesafe/jev-") || !isObject(body.usage) ||
          typeof body.usage.cost !== "number" || !Number.isFinite(body.usage.cost) || body.usage.cost < 0 ||
          typeof body.usage.input_tokens !== "number" || !Number.isInteger(body.usage.input_tokens) || body.usage.input_tokens < 0) {
          throw new Error("Unexpected model or usage");
        }
        totalCost += body.usage.cost;
        totalInputTokens += body.usage.input_tokens;
        jev = { model: body.model, choice: answer.choice, confidence: answer.confidence, probabilities, elapsedMs, cost: body.usage.cost };
      }
      const row = { case: fixture.name, reversed, expected, heuristic, jev };
      rows.push(row);
      console.log(`${fixture.name}${reversed ? " (reversed)" : ""}: heuristic=${heuristic.choice === expected ? "PASS" : "FAIL"}, Jev=${jev ? jev.choice === expected ? "PASS" : "FAIL" : "not called"}`);
    }
  }
  const latencies = rows.flatMap(row => row.jev ? [row.jev.elapsedMs] : []).sort((a, b) => a - b);
  const summary = {
    mode: offline ? "offline" : "live",
    fixtures: fixtures.length,
    trials: rows.length,
    heuristicCorrect: rows.filter(row => row.heuristic.choice === row.expected).length,
    jevCorrect: offline ? null : rows.filter(row => row.jev?.choice === row.expected).length,
    heuristicWrongSelections: rows.filter(row => row.heuristic.choice !== "none" && row.heuristic.choice !== row.expected).length,
    jevWrongSelections: offline ? null : rows.filter(row => row.jev?.choice !== "none" && row.jev?.choice !== row.expected).length,
    medianLatencyMs: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
    p95LatencyMs: latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null,
    totalInputTokens,
    totalCostUsd: totalCost,
  };
  const report = {
    timestamp: new Date().toISOString(),
    limitations: "Small synthetic challenge set; correlated order-reversal trials; not catalog accuracy or calibrated production thresholds. Baseline is scoreCandidate with the current 0.4 acceptance cutoff, not the complete search/ISRC pipeline.",
    fixtureSha256: createHash("sha256").update(JSON.stringify(fixtures)).digest("hex"),
    instructions,
    summary,
    rows,
  };
  await mkdir("evals/jev", { recursive: true });
  const path = `evals/jev/${offline ? "offline" : "live"}-results.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${path}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Experiment failed");
  process.exitCode = 1;
});

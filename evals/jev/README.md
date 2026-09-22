# Jev track-matching experiment

This opt-in CLI compares Jev with the app's existing `scoreCandidate` fuzzy
scorer. It shares the production request builder and prompt, but measures raw
model choices without the production confidence gates, exact-match bypass, or
similarity cutoff on selected candidates. It does not write to music accounts.

## Run

Use Node 22+ and install dependencies with `pnpm install`. Set
`OPENROUTER_API_KEY` in the environment or the gitignored `.env.local`, then run:

```sh
pnpm eval:jev
```

This makes 32 paid requests to OpenRouter's alpha Decisions endpoint using
`typesafe/jev-1.13`. The environment key takes precedence over `.env.local`.
No credentials are written to the report. Missing credentials, HTTP errors,
timeouts, and malformed responses stop the run; there are no automatic retries.
Only a completed run replaces `live-results.json` (check its timestamp).

To evaluate only the existing scorer without an API key or network requests:

```sh
pnpm eval:jev --offline
```

This writes a separate `offline-results.json`; it never overwrites live results.

## First live result

Run timestamp: 2026-09-22 01:23 UTC (September 21 in New York).
Served model: `typesafe/jev-1.13-20260917`.

| Measurement | Existing fuzzy scorer | Jev |
| --- | ---: | ---: |
| Correct decisions | 13 / 32 | 32 / 32 |
| Incorrect candidate selections | 17 | 0 |
| Median request latency | Not measured | 269 ms |
| p95 request latency | Not measured | 331 ms |
| Reported API cost | No API call | $0.000704928 |

The report includes per-trial probabilities, confidence, elapsed time, billed
cost, the resolved model version, prompt, and fixture hash. The initial separate
connectivity check cost $0.0000168 and is not included in the table.

## Interpretation and limits

- These are 16 hand-authored **synthetic** cases, each evaluated in original and
  reversed candidate order. Reversal trials are correlated; for single-candidate
  cases they repeat the same input. This is a smoke experiment, not a 32-example
  independent benchmark or an estimate of real catalog accuracy.
- Cases emphasize known fuzzy-scoring weaknesses: live, acoustic, remix, cover,
  radio-edit and featuring differences. They are not representative traffic.
- Labels follow an explicit proposed policy: preserve recording/version, allow
  remasters and credit-format variations, and reject unsupported substitutions.
  The fixture names and expected labels are not sent to the model.
- The baseline imports the actual scorer and applies its current 0.4 acceptance
  threshold. It does **not** exercise the entire search cascade, ISRC matching,
  YouTube parsing, provider metadata enrichment, or playlist import pipeline.
- Jev decisions use the top choice without confidence gating. These results do
  not validate calibration or establish a safe automatic-acceptance threshold.
  The production reviewer is deliberately stricter: confidence >= 0.90 and
  selected probability >= 0.95. For example, the initial run's correct remaster
  and featuring-format choices had confidence below that gate and would require
  manual matching rather than automatic acceptance.
- Requests run serially with a 15-second timeout. Measurements include HTTP and
  body parsing from this environment; they do not measure full conversion time.

The next useful evaluation is a held-out, human-labeled set of real search
candidates, with the same retrieved candidates supplied to both matchers. Track
wrong recording selections, abstentions, order sensitivity, and added latency
before enabling any automatic substitution in the app.

References: [OpenRouter's official provider implementation](https://github.com/OpenRouterTeam/ai-sdk-provider#evaluation-jev-with-ai-sdk-through-openrouter),
[Jev model](https://openrouter.ai/typesafe/jev-1.13),
[TypeSafe response schema](https://docs.typesafe.ai/api).

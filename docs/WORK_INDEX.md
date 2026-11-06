# Work index — S7 reliability fork

**Updated:** 2026-11-06. Tasks here are tracked until GitHub Issues are enabled. After enabling Issues, convert tasks to individually scoped issues and link them here. Do not create duplicates if they already exist.

## Current change

| ID | Priority | Task | State | Next action |
| --- | --- | --- | --- | --- |
| WI-001 | P0 | [Transparent AI-assisted maintenance and endpoint wrapper regressions](https://github.com/Missel2/node-red-contrib-s7/pull/1) | PR open; tests passed on SHA `9b7fe3ffe658c588f4d97dcafd3b104e210260d9` | Human review / merge decision |
| WI-002 | P0 | Pending COTP/socket cleanup from Musashi investigation | Not reproduced in this fork | Recover authorized source, build failing dependency-level fault case |
| WI-003 | P1 | Disposable S7 protocol endpoint and TCP fault proxy on GitHub-hosted runners | Not implemented | Pick licensed test fixture, verify real S7 reads/writes, inject faults |
| WI-004 | P1 | Reproducible dependency lockfile | Inherited lock stale | Generate current lock using trusted registry, enforce npm ci |
| WI-005 | P2 | Diagnostic state, error taxonomy and data freshness semantics | Requirements only | Specify public contract, test invalid/old data and uncertain writes |

## Task acceptance notes

**WI-002.** Isolate `@st-one-io/nodes7` from wrapper behavior and `s7-plus`; demonstrate a baseline handshake/timeout socket leak; fix at the correct dependency layer; show fail-before/pass-after and bounded reconnect resources.

**WI-003.** Real network fixture on GitHub Ubuntu and Windows, tests that fail if the fixture does not start, reproducible resets and timeouts, bounded diagnostic artifacts, explicit distinction from Siemens hardware compatibility.

**WI-004.** Correct all package and transitive dependency versions/integrity values using actual npm registry output; test `npm ci` on supported runners, `npm pack --dry-run` and security findings.

**WI-005.** Report last successful PLC read separately from last output, never reclassify a cached value as fresh, classify disconnection and unknown write outcomes, preserve backwards compatibility.

## How to resume

1. Verify the status and CI of open PR #1.
2. Continue WI-002 (highest technical priority), do not start a feature rewrite.
3. Update this index and [HANDOFF.md](HANDOFF.md) after each substantive round.
4. Before any claim about field reliability, verify real protocol/server and named Siemens hardware evidence separately.

## Administrative prerequisite

Issues are currently disabled in the fork. The maintainer can enable **Settings → General → Features → Issues**. No npm release, production OT sync or automatic merge is authorized by this index.

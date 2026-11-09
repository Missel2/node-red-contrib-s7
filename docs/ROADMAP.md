# Roadmap: reproducible faults to qualified packages

**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


The [shared tracking issue](https://github.com/Missel2/node-red-contrib-s7/issues/21) owns completion checkboxes; the
[work index](WORK_INDEX.md) maps repository-specific tasks. This roadmap orders
work by exit evidence rather than promising delivery dates.

| Stage | Work | Exit gate |
| --- | --- | --- |
| Now: trustworthy baseline | Correct stale handoffs; nodes7 #14 queue retention; existing wrapper PR #11; nodes7 #15 security triage | Reviewable isolated PRs; red/green regression; exact-head hosted checks; exposure-specific dependency disposition |
| Next: consumer and fault contracts | Wrapper #18 installed Node-RED runtime; wrapper #19 uncertain writes; nodes7 #16 packet boundaries and fault corpus | Real package/flow lifecycle; no ambiguous write replay; independent byte oracle and bounded queue/recovery assertions |
| Then: explicit semantics | nodes7 #17 dates; wrapper #20 freshness/diagnostics | Documented compatibility decision, cross-zone vectors and opt-in metadata tests |
| Release candidate | Shared #21 package identity, supported matrix, migration and evidence manifest | Tested exact tarball pair, source/lock/package hashes, license inventory, known limitations and rollback |
| Hardware claims | Wrapper #8 isolated S7-1200 bench | Named CPU/firmware/program/commit and authorized execution; all cases pending until then |

## Engineering choices

Keep protocol ownership in nodes7 and flow/editor ownership in the wrapper.
Do not bundle a backend replacement, TypeScript migration or mass formatting with
reliability fixes. Use property tests for packet boundaries and targeted mutations
for important assertions only when they improve fault detection. Measure soak
results after warm-up and before fixture teardown; do not choose a marketing
uptime number. Test-only dependencies and runtime dependencies have separate risks.

## Community deliverables

- A hardware-free [contributor quickstart](../CONTRIBUTING.md) and reproducible bug reports.
- One current entry point, historical evidence clearly labelled, original authors credited.
- A release evidence manifest: repository SHAs, lock hashes, artifact digest, runtime/OS,
  test commands/results, coverage limits, advisory disposition and HIL status.
- Actual tarball installation, compatibility/migration notes and a rollback procedure.
  SBOM and publishing provenance are release work; their existence is not claimed today.

No new automation is enabled by this roadmap. Each session resumes outstanding CI
and existing PRs before adding work. Merges, publishing and physical tests retain
separate human decisions.

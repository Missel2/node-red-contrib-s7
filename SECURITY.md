# Security Policy

## Project status

This is an independent, AI-assisted downstream fork of [ST-One's node-red-contrib-s7](https://github.com/st-one-io/node-red-contrib-s7). Original upstream authorship and GPL-3.0-or-later licensing are preserved.

The repository focuses on improving Siemens classic S7 communication reliability, testing, diagnostics and safe maintenance in Node-RED. **It is not an official Siemens product, a Siemens-firmware test certification or a safety-certified industrial component.**

The inherited package version is `3.1.3`. It does not indicate a separately published or security-supported fork release.

## Supported versions

| Branch or version | Security maintenance |
| --- | --- |
| `master` (development) | Best-effort investigation and security fixes |
| Unreleased feature branches and PRs | No independent security support |
| Inherited package version `3.1.3` | No stable fork release or guaranteed security-update commitment |
| Original upstream releases | Subject to the upstream maintainers' policy |

There is currently **no guaranteed response time, remediation deadline or security support SLA**. Prioritize reported issues based on severity, reproducibility and impact.

## Reporting a vulnerability

**Do not publish security vulnerabilities, credentials, plant addresses, exploit details or production logs in public Issues, Pull Requests or Discussions.**

Use the fork's GitHub private vulnerability reporting feature:

[Report a vulnerability privately](https://github.com/Missel2/node-red-contrib-s7/security/advisories/new)

Please include the affected branch/version and commit, observed impact, controlled reproduction steps, a minimal proof of concept where safe, and any proposed mitigation. Remove passwords, PLC credentials, real internal addresses and sensitive industrial data.

If private reporting is unavailable, contact the maintainer privately through an appropriate verified channel rather than disclosing the issue publicly. Do not guess or post sensitive reports to an unrelated maintainer.

## Vulnerability handling

The maintainer aims to review, reproduce, assess and remediate reports on a **best-effort** basis. Accepted issues may result in isolated tests, a patch, a GitHub Security Advisory and coordinated disclosure. Reports outside this fork or affecting independent dependencies may be referred to the appropriate upstream maintainers. Not every report can be fixed immediately, and no response schedule is promised.

We encourage coordinated responsible disclosure and reasonable investigation time before public exploitation details are shared.

## Industrial control system safety

This package can communicate with real industrial controllers.

- **Never test vulnerabilities against a production PLC or production OT network without explicit authorization.**
- Prefer disposable loopback software-protocol fixtures and synthetic test data.
- Use physically isolated hardware benches with disconnected or controlled outputs for future HIL tests.
- Physical PLC writes must be separately authorized, use a dedicated scratch data block and have a documented safe reset procedure.
- No untrusted public-PR CI job may reach a hardware-connected runner.
- Avoid uncontrolled write retries and assume a timeout does not prove a write was not executed.
- Passing mock or software-protocol CI is **not** evidence of Siemens firmware support or safety-critical suitability.

## Development safeguards

The fork uses protected branches, required CI, regression tests, dependency alerting and security-analysis tools as configured in GitHub. Additional checks and real-hardware testing are introduced when validated; a security feature shown in GitHub settings is not evidence that all relevant tests have run.

AI-assisted code and tests require the same reproducible evidence and human approval as other contributions. Changes are proposed through reviewable PRs. **No automatic merge, npm publication, physical-PLC interaction or production deployment is implied by this policy.**

## Maintainer

- [Missel2](https://github.com/Missel2)
- [Fork repository](https://github.com/Missel2/node-red-contrib-s7)
- [Hardware test-debt tracker](https://github.com/Missel2/node-red-contrib-s7/issues/8)

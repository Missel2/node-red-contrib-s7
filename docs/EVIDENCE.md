# Verification ledger

**Date:** 2026-11-06. Tests are only "CI-verified" after checking a specific commit and workflow run.

| Work | Current state | Evidence / limitation |
| --- | --- | --- |
| Fork baseline | Inspected | package.json 3.1.3; dependency @st-one-io/nodes7 1.1.2 |
| Inherited package lock | Known mismatch | lockfile v1 lists package 3.0.0 and nodes7 1.0.0-beta.1 |
| Original test command | Known invalid baseline | Original npm test intentionally returned an error |
| Node-RED endpoint wrapper lifecycle | Code and offline tests proposed on topic branch | Verify full results on the exact PR commit |
| Musashi pending TCP/COTP transport bug | Historical lead, **unverified here** | No original source patch or failing dependency-level regression yet |
| S7 wire protocol CI | Not implemented | No real S7 server/fixture included in this branch |
| Siemens PLC/firmware | Not tested | Neither simulator nor hardware compatibility claimed |
| Missel2 npm artifact | Not released | No publication or package identity change |

## CI scope

The verification workflow includes Node built-in contract tests on GitHub-hosted Ubuntu/Windows runners and a package smoke job. Its Node-RED and nodes7 test doubles intentionally cannot validate a real S7 socket. The package lock is inherited and stale: the smoke job temporarily uses `npm install --no-package-lock --ignore-scripts`, which cannot be described as a reproducible dependency installation. Regenerate the lock from a trusted npm registry, then switch to `npm ci`.

Every verified entry should cite: exact SHA, workflow run URL, OS/Node version, fixture version, command and observed outcome. Failures and limitations must stay visible.

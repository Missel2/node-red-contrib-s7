# Verification ledger

**Date:** updated 2026-11-07. Tests are only "CI-verified" after checking a specific commit and workflow run.

| Work | Current state | Evidence / limitation |
| --- | --- | --- |
| Fork baseline | Inspected | package.json 3.1.3; dependency @st-one-io/nodes7 1.1.2 |
| Inherited package lock | Known mismatch | lockfile v1 lists package 3.0.0 and nodes7 1.0.0-beta.1 |
| Original test command | Replaced in topic branch | Nine built-in offline wrapper tests; prior placeholder returned an error |
| Node-RED endpoint wrapper lifecycle | CI-verified through commit `42ba5d7d95e46817931e8590907c65c3780e4db9` | [Workflow 42354533869](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42354533869): nine wrapper tests on Windows 2025 and Ubuntu 24.04 with Node.js 22/24, all four matrix jobs passed |
| Targeted negative-control test | CI-verified on topic branch SHA `9b7fe3ffe658c588f4d97dcafd3b104e210260d9` | [Workflow 42297490497](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42297490497): targeted stale-read test fails on known pre-fix source as required |
| Reconnect read serialization | **CI-verified** on PR #1 commit `42ba5d7d95e46817931e8590907c65c3780e4db9` | [Workflow 42354533869](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42354533869): six of six jobs passed on Ubuntu/Windows and Node.js 22/24, including targeted failure against the prior wrapper revision `e0aa944691a6fb304e33ae5d98b428b0c411b157`. The test is mocked; a permanently unsettled real read can still delay new polling. |
| Musashi pending TCP/COTP transport bug | Historical lead, **unverified here** | No original source patch or failing dependency-level regression yet |
| S7 wire protocol CI | Not implemented | No real S7 server/fixture included in this branch |
| Siemens PLC/firmware | Not tested | Neither simulator nor hardware compatibility claimed |
| Missel2 npm artifact | Not released | No publication or package identity change |

## CI scope

The verification workflow includes Node built-in contract tests on GitHub-hosted Ubuntu/Windows runners and a package smoke job. Its Node-RED and nodes7 test doubles intentionally cannot validate a real S7 socket. The package lock is inherited and stale: the smoke job temporarily uses `npm install --no-package-lock --ignore-scripts`, which cannot be described as a reproducible dependency installation. Regenerate the lock from a trusted npm registry, then switch to `npm ci`.

Every verified entry should cite: exact SHA, workflow run URL, OS/Node version, fixture version, command and observed outcome. Failures and limitations must stay visible.

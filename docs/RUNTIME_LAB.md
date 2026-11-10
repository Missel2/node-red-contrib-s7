# Installed Node-RED runtime lab

Build one npm tarball from the checkout and install its exact bytes into two
temporary Node-RED user directories. The lab runs the real runtime and its
admin API, then uses a disposable S7 server on loopback to observe what reaches
the wire. Each user directory and server is torn down after its run.

| Install mode | Dependency resolution | Evidence |
| --- | --- | --- |
| Locked | Override the transport version in the temporary user directory with the repository lock version | Compare the installed production tree against the repository lock |
| Consumer | Run npm install on the tarball with its normal dependency ranges | Compare the pinned nodes7 archive and record the resolved transport version and integrity |

Both modes verify that the install used the same tarball integrity. The
consumer install exposed a difference in the current dependency tree. The
repository lock has iso-on-tcp 0.1.0 and the fresh install resolved 0.1.1.
The npm archives differ in their parser and package metadata. The lab records
the actual resolution on every run. A separate decision on transport pinning
belongs to the release qualification work in [#21](https://github.com/Missel2/node-red-contrib-s7/issues/21).

## Run it

Use a checkout, Git, npm, Python 3.12, and Node.js 22.9 or later in the Node
22 or 24 series. Run these from the repository root.

    npm ci --prefix test/runtime-lab --ignore-scripts --no-audit --no-fund
    python -m pip install --only-binary=:all: --require-hashes -r test/runtime-lab/requirements.txt
    npm run test:runtime-lab

Use a Python virtual environment if needed. The test runner uses python from
PATH or the executable supplied in S7_FIXTURE_PYTHON. The fixture binds a
kernel-assigned port on 127.0.0.1. The admin server, test relay and every PLC
endpoint also use loopback. The runtime starts with a fresh user directory,
disables external module installation and serves the synthetic test flow.

The hosted matrix uses Ubuntu 24.04 and Windows 2025 with Node 22 and 24.
The private toolchain pins the active Node-RED 5.0.9 release. This is a test
matrix for those combinations. Node-RED 4.x is in upstream maintenance, and
other releases need their own qualification. See the official
[release plan](https://nodered.org/about/releases/),
[Node.js support policy](https://nodered.org/docs/faq/node-versions) and
[releases](https://github.com/node-red/node-red/releases).

## What the scenarios prove

1. The installed package registers all four S7 types. The editor API serves
   their templates and help and the English and German message catalogs.
2. The [flow API](https://nodered.org/docs/api/admin/methods/post/flows/) deploys
   and exports the scratch DB configuration. The real Control and In nodes
   trigger and deliver a read. Invalid interval input reaches Catch.
   An unknown write variable reports a diagnosis and sends zero WRITE_VAR
   requests. The report records whether that diagnosis reaches Catch or the
   runtime log.
3. A normal Out message reaches Complete once. A read from the fixture
   verifies the written value and the other two DB values.
4. The relay discards a successful WRITE_VAR acknowledgement after the
   server applies the write. The original flow message reaches Catch with
   ERR_TIMEOUT. The endpoint reconnects, reads back the applied scratch
   value, and sends no duplicate write during the observation window.
5. A full redeploy while a read response is withheld closes the old peer
   socket and removes the old poll timer and flow subscriptions. The old
   flow emits no data during redeploy. A subsequent trigger reads through
   the new endpoint.
6. An unanswered COTP request closes on empty deployment. The lab then
   observes a complete retry window while the peer is still available.
   On the approved nodes7 source pin the strict requirement is zero extra
   requests and zero live peers **before fixture cleanup**, for every install
   mode. No legacy affected-pin exception remains in the test.
   Historical negative evidence: [nodes7 #20](https://github.com/Missel2/nodes7/issues/20).

## Read the evidence

The report at test-reports/s7-runtime-lab.json names the source checkout and
dirty state, lock digests, package digest and integrity, runtime versions,
resolved dependencies, scenarios and peer observations. The runner also
requires the Node-RED test process to exit on its own within the deadline.
CI attaches each matrix report to its job. The existing required package
check depends on all four installed-runtime jobs.
Hosted packaging uses a Git archive of the tested commit. That keeps the
package inputs independent of checkout line endings and generated files.
The report records the checkout state separately from the archive inputs.
The archive check rejects case-colliding paths before extraction.

The previous nodes7 pin `2cf864e38be447c2709348a25eb0524d67f5cf2d`
reproduced an extra retry and one live peer before cleanup. Its historical
`characterized-with-known-failure` result is negative evidence, **not** a
successful teardown test. The current strict test unconditionally requires zero
retry and zero live peers before cleanup, independent of the installed source
SHA. The unknown-write-outcome contract is tracked in
[#19](https://github.com/Missel2/node-red-contrib-s7/issues/19).

### Verified source candidate (2026-11-10)

On candidate `7f4b629ad9a95c0f14119ba5f45b13845ab68328`,
[Verification 42858665710](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42858665710)
passed 23/23 checks. The four hosted Windows/Linux Node 22/24 JSON artifacts
were inspected. Both install modes in each report showed
`extraRequests=0`, `livePeers=0`, `observationMs=5250`, `verdict=passed`,
and `replayedWrites=0` after a dropped ACK. All four archived identical npm
package SHA-256
`1cc8bc93d71a6ed699415675aa00dc9a6d276dc276980e961f679055f6a674bb`.
**These reports precede this unconditional strictness change; its new
exact-head CI must pass separately.** HIL remains PENDING_HARDWARE.

The fixture uses one synthetic DB and a bounded observation window.
The test covers the admin/editor HTTP responses and runtime lifecycle.
Browser rendering, indefinite uptime, firmware support and physical I/O
require different evidence. HIL-S7-001 through HIL-S7-007 remain
PENDING_HARDWARE.

## Toolchain provenance

Node-RED 5.0.9 is Apache-2.0 licensed and installed from its official npm
package into a private test toolchain. The Python wheel has a recorded
SHA-256. The package-composition check requires the editor and locale files
and exercises missing-file and test-tool inclusion failures. The wrapper
tarball excludes the lab, its dependencies and reports.

The local npm audit of the lab lock on 2026-11-09 reported 41 affected
entries, including six high and zero critical. Those counts include
propagated dependency entries. This audit covers the isolated test
toolchain, including Node-RED's npm dependency. The lab uses local synthetic
requests, disables npm lifecycle scripts and leaves the production lock
untouched. Re-evaluate the lab pin as upstream fixes become available.

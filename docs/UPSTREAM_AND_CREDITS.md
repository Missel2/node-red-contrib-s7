# Origins, dependencies and acknowledgements

This document records the original projects and contributors from which this fork derives or on which it depends. It is a record of provenance and thanks, not a statement of endorsement, partnership or certification.

## Direct origin: node-red-contrib-s7

- **Source:** [ST-One / node-red-contrib-s7](https://github.com/st-one-io/node-red-contrib-s7)
- **Original project:** created as part of the [ST-One](https://st-one.io) project. The original README identifies **ST-One Ltda.** and **Guilherme Francescon Cittolin** and retains copyright notices.
- **Relationship:** this GitHub repository is a **fork** of the original repository, with the original Git history, copyright notices, documentation and license retained.
- **License:** [GNU General Public License, version 3 or later](../LICENSE).

We thank ST-One, Guilherme Francescon Cittolin, and everyone who has contributed to the original Node-RED S7 integration, including issue reports, patches, testing and documentation. Their prior work is the foundation of this fork. Independent maintenance does not alter that history.

## Runtime S7 protocol implementation: nodes7

- **Source:** [st-one-io/nodes7](https://github.com/st-one-io/nodes7)
- **On protected master:** [@st-one-io/nodes7](https://www.npmjs.com/package/@st-one-io/nodes7) **1.1.2** from npm registry. **On unmerged draft PR #15 only:** same package key sources separately maintained [Missel2/nodes7](https://github.com/Missel2/nodes7) at full immutable commit `2cf864e38be447c2709348a25eb0524d67f5cf2d`, delivered as a commit-addressed HTTPS tarball with npm SHA-512 integrity. The upstream package name and GPL license remain unchanged.
- **Author listed in its package metadata:** Guilherme Francescon.
- **License listed in its package metadata:** GPL-3.0-or-later.
- **Relationship:** a **separate direct runtime dependency**, not part of this repository's vendored source. The independent COTP fix in nodes7 PR #13 was human-approved and merged in its own repo; wrapper integration is proposed in PR #15, not vendored or published.

We thank the nodes7 authors and contributors for the protocol implementation on which this Node-RED integration currently depends.

### Earlier protocol work and supporting ecosystem

The [nodes7 README](https://github.com/st-one-io/nodes7#readme) says it was rewritten and inspired by [plcpeople/nodeS7](https://github.com/plcpeople/nodeS7). We acknowledge that **indirect historical influence** and thank its contributors. This does **not** make nodeS7 a direct dependency or mean its source is included in this fork.

The nodes7 package declares a dependency on the [iso-on-tcp npm package](https://www.npmjs.com/package/iso-on-tcp). That package provides part of the protocol/transport ecosystem; it is an **indirect dependency** of this fork. Its own distribution and licensing information must be verified when regenerating the dependency lockfile.

## Test-only classic S7Comm fixture: python-snap7

- **Source and pinned release:** [gijzelaerr/python-snap7, tag 3.3.1](https://github.com/gijzelaerr/python-snap7/releases/tag/3.3.1).
- **Package installed by hosted protocol CI:** [python-snap7==3.3.1](https://pypi.org/project/python-snap7/3.3.1/), with source metadata naming Gijs Molenaar as an author.
- **License:** [MIT](https://github.com/gijzelaerr/python-snap7/blob/3.3.1/LICENSE), verified against the tagged 3.3.1 `pyproject.toml` and LICENSE.
- **Relationship:** a **direct test-only Python dependency** used to run a disposable classic-S7 TCP server with synthetic DB data on hosted CI. It is **not** a Node.js runtime dependency of this fork, is not vendored into this repository, and is not shipped as a PLC simulator or Siemens firmware.
- **Evidence:** [Issue #4](https://github.com/Missel2/node-red-contrib-s7/issues/4) and [protocol fixture coverage](PROTOCOL_FIXTURE.md); Windows/Linux loopback results do not establish real Siemens hardware compatibility.

We thank the python-snap7 maintainers and contributors for enabling license-compatible, hardware-free automated protocol testing.

## Node-RED ecosystem

- **Project:** [Node-RED](https://nodered.org/)
- **Source:** [node-red/node-red](https://github.com/node-red/node-red)

We thank the Node-RED project and community for the runtime, editor, node interface and documentation ecosystem. This fork develops a third-party integration for Node-RED; it is **not** a fork of the Node-RED runtime and does not represent the Node-RED project.

## Contributors to this fork

Engineering contributions may be AI-assisted; actual assistance must be disclosed in the relevant PR, as described in [AI_DEVELOPMENT.md](AI_DEVELOPMENT.md). The human maintainer `Missel2` decides priorities and reviews changes. This disclosure does not alter upstream authorship or the GPL license obligations.

This fork's change history, PRs, source files, upstream commit history and their copyright notices remain the record of who contributed what. No individual or organization listed here is assumed to endorse this fork.

## Trademarks, licensing and future dependencies

Siemens and SIMATIC/S7 are trademarks of their respective owners; naming products to describe interoperability does not imply endorsement by Siemens AG. This project does not claim industrial safety certification, functional-safety approval or validated compatibility with every PLC.

Any additional code or dependencies must receive a separate license and provenance review before inclusion. **Other planned test servers, Siemens simulators or alternative S7 implementations are not current dependencies until adopted.** The adopted python-snap7 protocol fixture is identified separately above.

A credit line cannot replace license compliance. Preserve notices, license texts, attribution and corresponding source obligations in any redistributed work.

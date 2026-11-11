# Public disclosure boundary and evidence handling

**Applies to every public branch, commit, pull request, issue, discussion, workflow, test fixture, published package and release artifact in this repository.** This is a repository policy, not evidence that historical content is clean.

## Public material

Publish only vendor-neutral source code, reproducible synthetic protocol fixtures, compatibility contracts, independently verifiable CI results, upstream references and sanitized non-identifying summaries. Prefer local loopback fixtures and documentation-only addresses (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `example.invalid`). An example must never be copied from a real controller or network.

## Confidential material — never commit or paste into public systems

- Organization, customer, site, production line, asset and operator identifiers or a combination of metadata that can reveal them.
- Actual controller IPs, hostnames, network routes, zones, topology, ACLs, firewall policy, jump hosts, service endpoints, artifact registries, internal CI runners and access paths.
- Credentials, tokens, certificates, PLC projects/programs, process values, tags, registers, industrial payloads and real operational logs or captures.
- Private test plans and schedules, incident details, raw hardware evidence, infrastructure manifests, image references or build logs containing the above.
- Confidential indicators disguised as public test deny-lists, workflow variables, coded aliases or fixtures. **Do not publish a list of private strings merely to block them.**

Keep sensitive operational configuration, complete evidence and allow/deny indicators in a separately access-controlled system. No public pull-request workflow may have a route to live industrial equipment.

## Required review workflow

1. **Before the first public push**, review the proposed files, diff, commit message, filenames, branch name, configuration, test output and generated artifacts against the private disclosure rules. Execute any organization-specific scan exclusively in an authorized private environment. Its patterns and matching values must not be uploaded to public CI or its artifacts.
2. Run ordinary public CI for portable, high-confidence checks such as accidental credentials and unsafe test inputs; never imply that post-push CI can prevent initial disclosure. Do not echo suspected secrets in failures.
3. Before publishing a PR, issue, release, npm package or SBOM, review its description, embedded metadata, package contents and external URLs. **`npm pack --dry-run --json` is only an inspection aid**, not a confidentiality guarantee.
4. Record real-hardware outcomes privately with the exact CPU/firmware, approval, image digest, logs and site evidence. Publish only a human-reviewed, non-identifying summary, clearly separating read-only, simulated, hardware and write verification. Do not claim a hardware pass without validated underlying private evidence.
5. If a disclosure is suspected, stop propagation, review privately, and use coordinated security handling. Deleting a file from the current branch **does not delete prior commits, forks, caches, releases or logs**. Any history rewrite or takedown requires a separate assessed decision and appropriate authorization; rotate exposed credentials immediately if necessary.

For contributors and coding agents: do not request or paste confidential incident records into public repository conversations. Keep examples and release docs neutral. The maintainer decides every publication and deployment separately.

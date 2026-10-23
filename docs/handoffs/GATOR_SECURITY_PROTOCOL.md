# GATOR SECURITY PROTOCOL (GSP) — WVLRP
Status: **Proposed operational policy, not yet enforced by GitHub settings**
Date: 2026-10-22
Owner: WVLRP owner. Scope: all Gator sessions working in copperisbetter-lang/Wvlrp.

## Primary rule
**No assistant may deploy, alter live-site infrastructure, delete assets, or overwrite another Gator's active work without explicit coordination and owner authorization.** During a P0 incident, Gator 2 owns production recovery. This policy is a coordination aid, not an access-control mechanism.

## Roles and path ownership
- **Gator 2 / Site Reliability:** .github/workflows/pages.yml, root website, deployment, domain, incident response.
- **Gator 3 / World:** world-creator/base-camp/, terrain, lake, trails, panorama and approved Base Camp assets. Do not alter the original Wild unless authorized.
- **Brooke Gator / Avatars:** avatar-work/brooke/, Brooke-specific workflows, and Brooke model outputs. Avoid unrelated avatars.
- Shared files and directories (.github/, public-models/, root pages, docs/handoffs/) require checking latest handoff and owner approval before modifying when another Gator is working there.

## Change procedure (all Gators)
1. Read current handoff, identify incident state and current owner. Fetch current SHA before editing.
2. State intended file paths and risk; limit edits to assigned scope. Prefer a dedicated branch and pull request.
3. Never force-push, reset main, mass-delete, overwrite another Gator's changes, or make blind replacements.
4. Use SHA/optimistic concurrency for edits. If a conflict occurs, re-read and reconcile; do not overwrite.
5. Validate syntax/tests, inspect exact diff and document affected files and commit SHA.
6. Publish only after authorized checks; verify actual live behavior, not merely CI status.
7. Update handoff with change, build run, verification, unresolved risks, and rollback instructions.

## P0 / incident lock
- During an active production outage, **only Gator 2** modifies deployment or production routing.
- Other Gators freeze production pushes and model publishing; diagnostic read-only inspection is allowed.
- Record exact incident start, symptoms, GitHub Actions run IDs, affected routes, known-good deployment and recovery verification.
- Lift lock only when owner confirms and Gator 2 records independently verified site health.

## Protection settings for repository owner to configure
These controls are **NOT enabled by this document**:
- Create GitHub ruleset/branch protection for `main`: require pull requests, at least one independent approval, no force pushes or deletions, required status checks, and restricted bypass.
- Require CODEOWNERS reviews after defining actual GitHub usernames/teams for ownership; assistant nicknames are not GitHub accounts.
- Restrict GitHub Actions permissions to least privilege; separate website deploy from model artifact generation.
- Protect the `github-pages` environment and review production deployment permissions; consider approval gates.
- Keep immutable release tags and downloadable known-good site/model artifacts. Test rollback.
- Enable security alerts, dependency updates, secret scanning if supported. Never commit tokens or credentials.

## Critical technical risk discovered
The current Pages workflow runs on **every push to main**. Model publishing workflows also commit generated GLBs directly to main, sometimes racing with other commits. Merely assigning Gator roles will not stop automatic deployment or publishing races. Do not add branch protection blindly until model-publish bots and Pages automation have a compatible pull-request or artifact promotion path; otherwise the site may be blocked. Design and test the migration with Gator 2 after P0 recovery.

## Check-in format
`Gator | scope | files | intended change | incident lock status | commit/PR | tests | live verification | rollback`.

## Current incident
See `docs/handoffs/GATOR_TO_GATOR_WVLRP_OUTAGE_2026-10-22.md`. No claim of recovery without independent live verification.

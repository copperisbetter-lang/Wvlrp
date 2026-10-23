# Gator-to-Gator — WVLRP Production Outage / Crisis Handoff
Date: 2026-10-22 (Eastern). Priority: P0 — restore production website before avatar work.
Repository: https://github.com/copperisbetter-lang/Wvlrp
Website: https://wvlrp.com
Actions: https://github.com/copperisbetter-lang/Wvlrp/actions

## Situation and verified evidence
- Owner reports **entire WVLRP website offline** and requested crisis mode.
- An external fetch of https://wvlrp.com returned **HTTP 404** (point-in-time check). Do not infer DNS, GitHub Pages, or custom-domain root cause from 404 alone.
- GitHub Actions **Publish WVLRP #3684**, run ID 39868621260, failed at **Prepare Carolyn model for inspection**. Actual log: `gh run download "$run_id" --repo "$GITHUB_REPOSITORY" --name caroline-adult-foundation --dir /tmp/carolyn-export` -> `no valid artifacts found to download` -> exit 1. Subsequent website upload and deploy steps skipped.
- **Brooke Head Prototype #35**, run ID 39868610735, generated, validated, rendered, and uploaded `brooke-head-prototype.glb` and `brooke-preview.png` successfully. Publishing failed at `git push` because remote main advanced: `! [rejected] main -> main (fetch first)`. Prototype artifact ID 12465496811. This is a publishing race, not a model generation failure.
- **Brooke photo-based 3DDFA reconstruction #2**, run ID 39868621226, had successfully fetched/validated reference photo and reconstructed one face; at last job check Blender installation was in progress. Complete head-neck GLB success and live viewer appearance NOT verified.
- Actions listing at last check: **Publish WVLRP #3686** on commit 494f327 was in progress; **Brooke Head Prototype #36** also in progress; Publish WVLRP #3685 cancelled; older publisher runs repeatedly failed or cancelled. Check fresh status.
- GitHub's separate combined status showed a successful Railway context on older commit 1007b93; **this does not establish that GitHub Pages publication or wvlrp.com is healthy**.

## Fixes already committed to main
1. `7446b75693245293356a514a18b10abee50c4229` — `.github/workflows/pages.yml`: make missing optional Caroline artifact download nonfatal; emit warning and continue. Does not modify Brooke geometry or delete Carolyn assets.
2. `494f3273004cc163c56c581662b571f0d97ca286` — `.github/workflows/brooke-head.yml`: fetch/rebase latest main and retry push up to five times to handle concurrent commits. Prototype still separate from Brooke photo reconstruction.
No verification yet that these changes restore production. Avoid declaring victory prematurely.

## P0 recovery plan
1. Pause unrelated Brooke/Carolyn/Laura avatar changes and avoid competing main pushes while stabilizing deployment.
2. Inspect latest Publish WVLRP run #3686 and exact logs. Determine whether a *different* step now fails after optional Carolyn skip (e.g., Laura verification, Pages artifact, Pages deployment, custom domain).
3. Confirm GitHub Pages source, deployment environment, repository Pages configuration, domain mapping/CNAME, DNS, TLS, and origin response. Distinguish 404 due to missing deploy from DNS/hosting misconfiguration.
4. If latest deployment cannot pass quickly, identify last known-good production deploy and restore it safely, preserving current work/commits and project assets.
5. Verify https://wvlrp.com and representative homepage, cameras, Adventure Portal and critical viewer pages from outside; record HTTP status and rendered content. Don't equate CI green with site health.
6. Only after website restored, resume photo-based Brooke pipeline and confirm single complete head, back of skull, neck, realistic facial fit, successful GLB export, published viewer.
7. Record new failures with exact workflow, run ID, step, error, fix, and verification so repeated builds don't regress.

## Constraints / user intent
- **GitHub only** for project source/workflows; don't divert to Railway as development workflow.
- Brooke must use supplied reference photos and Laura's validated photo-driven method, not a generic prototype or Carolyn's model.
- Protect existing WVLRP website, live camera pages, The Wild, assets, and progress.
- Owner expects Gator 2 to take over outage recovery with this file; no direct inter-chat messaging has been performed.

## Update — 2026-10-22 late evening: Base Camp / lake access incident
- Owner reports the lake direct link did not load: `https://wvlrp.com/world-creator/walk.html?mode=beta&spawn=lake`. A subsequent direct `/world-creator/walk.html` link has not yet been confirmed working.
- Current `adventure-portal.html` on GitHub main contains a non-clickable Game Beta Test tile explicitly labeled **Temporarily closed for private development**; the Original 360° World remains linked to `adventures.html`. Thus public game entry is intentionally disabled in portal source, but this alone does NOT prove the 3D Base Camp game code/files are down or deleted.
- No definitive live HTTP/render verification yet of the Base Camp entry or original 360° World. Treat as **P0 access investigation**, not confirmed total Base Camp loss.
- Gator 2 (site/deployment): verify current GitHub Pages publish, actual HTTP responses for `/`, `/adventure-portal.html`, `/world-creator/walk.html` and `/adventures.html`; distinguish site outage vs intentional closed beta tile vs game loading/runtime issue. Restore access safely after verifying intended public/private policy.
- Gator 3 (world/terrain): preserve all lake overlook, orange maple, second beach, original panorama, trail and 8-foot drop assets. Do not remove or overwrite them to address an access problem. Once the game is accessible, facilitate owner capturing clearer lake reference screenshots. Do not claim a repair until tested.
- Coordination: this is a shared GitHub handoff only; it does not deliver messages into other active ChatGPT sessions automatically. Other Gators must read this file.

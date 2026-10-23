# Current Work — Change Log

## 2026-10-23 — Baseline recovered and recorded
- Confirmed working viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1.1/world-creator/brooke-1.1-head-detail.html
- Confirmed source: `world-creator/assets/brooke-1.1-detail-head-candidate.glb` on branch `brooke-1.1`.
- Confirmed review report: `world-creator/brooke-1.1-review/pass4-report.json`.
- User confirmed this viewer is correct.
- Logged outstanding facial complaints and proposed corrections.
- **Model edits in this step:** None. This entry records the recovered baseline and safeguards.

## Future update template
### YYYY-MM-DD — Pass / change
- User complaint:
- Proposed correction:
- Exact source and destination paths:
- Commit SHA:
- Build and visual validation:
- Updated working viewer URL:
- Remaining issues:

## 2026-10-23 — Pass 5 candidate implementation (not yet approved)
- User supplied Pass 4 screenshots (profile, nostrils/lips, three-quarter) and front/profile reference photos.
- Complaints and proposed corrections recorded in `COMPLAINTS_AND_CORRECTIONS.md` before edits.
- **Protected baseline:** `world-creator/assets/brooke-1.1-detail-head-candidate.glb` (Pass 4 unchanged).
- **New isolated branch:** `brooke-1.1-pass5-from-pass4`.
- **New corrective script:** `avatar-work/brooke/one-point-one/pass5_from_pass4.py`.
- **Candidate output (after successful CI):** `world-creator/assets/brooke-1.1-pass5-candidate.glb`.
- **Candidate viewer (after successful CI):** https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1.1-pass5-from-pass4/world-creator/brooke-1.1-pass5-review.html
- **Build workflow:** `.github/workflows/brooke-1.1-pass5-review.yml`.
- **Status:** Script and workflow committed; successful candidate export, front/profile renders and visual approval not yet verified. Pass 4 remains the active verified viewer until validation.

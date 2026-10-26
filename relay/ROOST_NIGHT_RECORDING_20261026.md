# URGENT: Roost continuous 20-minute captures — 2026-10-26

Owner requested 20-minute video chunks **for tonight**, not motion-only.
Status: isolated branch implementation, runs only if an available self-hosted GitHub runner
can access the **already-running relay container** `wvlrp-relay`.
No modifications to production code, website, camera, East Bank pipeline, or relay container.
This is an attempt at deployment, not proof of recorded footage.

## How it works
- Capture sidecar container uses the current wvlrp-relay image and shares the
  existing relay's network namespace. It reads the internal RTSP path
  `rtsp://127.0.0.1:8554/roost`, without opening a second session to the physical camera.
- Output is stored on the host under `/var/lib/wvlrp/roost-captures/`.
- FFmpeg copies original available video and audio to Matroska (.mkv).
- 20-minute segment boundaries are :00, :20, :40 UTC. The first and last
  partial files may be shorter.
- Capture stops after 12 hours, reconnects if the relay signal drops, and
  pauses below 2 GiB free host disk.
- Footage stays private on the host, is never pushed to GitHub, and is never
  automatically deleted. Review later via an authenticated path; no public link.
- Container runs without restarting existing relay. It will not create video
  when the camera is offline. No automatic notifications or live intervention.

## Activation
The workflow `.github/workflows/roost-overnight-capture.yml` is scoped to its
isolated branch and triggers from the workflow-file push. It validates the
running relay, copies the recording script to permanent host storage, and
starts a separate sidecar container with Docker. The job checks 45 seconds
later for a **nonempty file**, and fails if it cannot confirm one.

Monitor via GitHub Actions job log; check capture process and host filesystem
on the runner. Do not assume success from a commit or green workflow alone.
If no self-hosted runner is available, or relay is offline, **nothing records**.

## Stop / rollback
`sudo docker stop wvlrp-roost-capture`.
Captured footage remains at `/var/lib/wvlrp/roost-captures/`.
Branch can be deleted without altering production. Clips must not be committed.

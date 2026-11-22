# Cecil 1 video-to-speech facial study

Sources: two original MP4 videos in the private \`Dadsfiles\` release. No audio was exported or committed. The MP4 originals are not modified.

Generated for **each** video:
- \`video_N_transcript.txt\`: time-coded machine-transcribed speech.
- \`video_N_transcript_segments.json\`: same segment data with model confidence metadata.
- \`video_N_word_mouth_alignment.csv\`: recognized word start/end seconds and measured facial movement averaged across those word intervals.
- \`video_N_facial_motion_3fps.csv\`: sampled face features at 3 samples/second; \`face_found=0\` means no measurement.
- \`video_N_animation_reference.json\`: animation event reference combining speech-word timing, approximate phoneme-to-viseme guesses, and measured visual changes.
- \`summary.json\`: diagnostic coverage and metric percentiles.

## Accuracy and constraints
Word timestamps come from automatic recognition (faster-whisper base.en). They may have errors, omissions and false positives. **No transcription has yet been human-verified.**

Phoneme symbols are derived from a pronunciation dictionary; timings *inside each word* are evenly divided heuristic guides, NOT real measured sound-by-sound alignments. Actual accent and pronunciation can differ from the dictionary. This cannot certify lip-sync accuracy.

Facial metrics are direct 3fps face landmark measurements and may be imperfect because of occluding moustache, facial hair, camera angle and detection errors; values are unitless ratios, not finished morph weights. Face geometry, eye colors and rest pose from the approved Cecil 1 model remain authoritative.

**No source videos, model, head, rig or approved viewer were changed.** This is reference data for a safe working-copy animation pass and manual QA.

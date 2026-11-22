# Cecil 1 prototype facial motion curves — NOT an approved rig animation

Created exclusively from original Dad reference-video machine measurements and word timestamps.

\`video_1_facial_candidate_12fps.csv\` and \`video_2_facial_candidate_12fps.csv\` contain:
- \`time\`: recording-local seconds, 12fps export samples (facial landmark measurements were only 3fps; 12fps values are interpolated).
- \`jawOpen\`: relative inner-mouth opening (per-video 10th to 90th percentile normalized).
- \`mouthNarrow\` / \`mouthWide\`: relative mouth width proxies (NOT independently verified lip pucker/smile).
- \`eyeSquintLeft\` / \`eyeSquintRight\`: eyelid opening relative to that video's observed range.
- \`browLowerLeft\` / \`browLowerRight\` / \`browFurrow\`: relative landmark distance proxies, camera-pose-sensitive.
- \`mouthCornerAsymmetry\`: raw signed vertical position difference, not a smile or frown expression.
- \`viseme_*\`: DICTIONARY pronunciation guesses distributed uniformly within machine-recognized word windows. These are not phoneme force alignment or verified pronunciation.

**These are test curves, not finished face animation**. An animator must review timing against both original video/audio files and map these candidate values to actual rig/morph names and ranges on a **copy** of approved Cecil 1. Avoid interpreting video-specific baselines as universal rig values. Do NOT drive \`mouthNarrow\` and \`mouthWide\` simultaneously without a proper blend rule. Do NOT apply every phonetic event at full weight. Facial-hair follow-through, eye color, teeth, tongue, smile reference and asymmetric details still need dedicated review and rig testing.

Input data: \`../video_N_animation_reference.json\`, \`../video_N_facial_motion_3fps.csv\`, \`../summary.json\`.
No approved model or original videos were changed.

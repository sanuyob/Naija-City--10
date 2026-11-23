# Stage 08Q audit scope

The original target of 551 components is fully reconciled: 398 remain unbatched and 153 are assigned to Stage 08Q static batches. The separate 20 Stage 08N moving door handles remain unbatched outside the 551 target. The CSV includes all 571 rows: the 551 target group plus those separate door handles.

The full scene accounts for 4856 render components: 4285 already in earlier batch groups, 153 assigned by Stage 08Q, and 418 still unbatched. The full pre-existing batch index is included in the Yaba audit JSON for review.

Every Stage 08Q-assigned row is checked against the same material, opacity, movement, animation, physics and static-candidate rules. The exporter fails if a dynamic or incompatible component appears in a Stage 08Q batch.

The Yaba and Ikeja benchmark uses matched 844×390 viewports, camera height, target vector, 62° FOV and 650 m far clip. Each district/mode has three trials, each with 20 warm-up and 60 measured animation frames.

Frame-time numbers from Box's SwiftShader renderer are only useful for same-environment comparisons; they are not claims about physical Android FPS.

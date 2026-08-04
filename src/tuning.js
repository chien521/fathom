export const TUNING = Object.freeze({
	pixelShortAxis: 320,
	shaftWidth: 12,
	shaftDepth: 2,
	shaftLength: 300,
	playerWidth: 0.8,
	playerHeight: 0.8,
	playerDepth: 0.7,
	playerStartY: 0.6,
	gravity: 17,
	steerSpeed: 7,
	jumpVelocity: 8.5,
	fastFallPressImpulse: 2.5,
	mobileStepDistance: 0.65,
	mobileSwipeMotionTimeout: 120,
	mobileSwipeThreshold: 18,
	mobileFastFallPressCount: 1,
	maxFallVelocity: 18,
	scrollSpeedCurve: [
		{ depth: 0, speed: 1.35 },
		{ depth: 200, speed: 2.25 },
		{ depth: 600, speed: 3.2 },
		{ depth: 1200, speed: 4 },
	],
	difficultyTiers: [
		{
			depth: 0,
			minGap: 1.7,
			maxGap: 2.8,
			typeWeights: { stone: 5, ice: 3, slide: 1, moving: 1, geyser: 1 },
		},
		{
			depth: 200,
			minGap: 1.9,
			maxGap: 3.1,
			typeWeights: { stone: 3, ice: 3, slide: 1, moving: 1, geyser: 2 },
		},
		{
			depth: 600,
			minGap: 2.2,
			maxGap: 3.4,
			typeWeights: { stone: 2, ice: 3, slide: 2, moving: 1, geyser: 3 },
		},
		{
			depth: 1200,
			minGap: 2.5,
			maxGap: 3.7,
			typeWeights: { stone: 1, ice: 3, slide: 2, moving: 1, geyser: 4 },
		},
	],
	ceilingInset: 0.35,
	spikeHeight: 0.7,
	spikeCount: 12,
	platformPoolSize: 32,
	platformHeight: 0.35,
	platformDepth: 0.7,
	platformMinWidth: 2.4,
	platformMaxWidth: 4.4,
	iceCrumbleDelay: 1,
	iceFallSpeed: 8,
	iceFallDistance: 4,
	slideTiltAngle: 0.3,
	slideTiltSpeed: 3,
	slideSpeed: 4,
	movingPlatformAmplitude: 1.1,
	movingPlatformAngularSpeed: 2,
	geyserLaunchVelocity: 9.5,
	particlePoolSize: 96,
	particleSize: 0.16,
	particleLifetime: 0.45,
	particleGravity: 13,
	iceParticleCount: 14,
	iceParticleSpeed: 4,
	geyserParticleCount: 10,
	geyserParticleSpeed: 3.5,
	landingSquashDuration: 0.12,
	landingSquashX: 1.22,
	landingSquashY: 0.76,
	deathShakeDuration: 0.24,
	deathShakeMagnitude: 0.24,
	depthMilestone: 100,
	milestoneFlashDuration: 0.24,
	platformRecycleMargin: 4,
	initialPlatformY: -0.05,
	initialPlatformWidth: 4,
	spawnAhead: 12,
	metersPerWorldUnit: 3,
	maxDeltaSeconds: 0.05,
});

export function getScrollSpeed(depth) {
	const curve = TUNING.scrollSpeedCurve;
	for (let index = 1; index < curve.length; index += 1) {
		const previous = curve[index - 1];
		const next = curve[index];
		if (depth <= next.depth) {
			const progress = (depth - previous.depth) / (next.depth - previous.depth);
			return previous.speed + (next.speed - previous.speed) * progress;
		}
	}
	return curve[curve.length - 1].speed;
}

export function getDifficulty(depth) {
	let tier = TUNING.difficultyTiers[0];
	for (let index = 1; index < TUNING.difficultyTiers.length; index += 1) {
		if (depth < TUNING.difficultyTiers[index].depth) break;
		tier = TUNING.difficultyTiers[index];
	}
	return tier;
}
import * as THREE from 'three';
import { Audio } from './core/Audio.js';
import { Input } from './core/Input.js';
import { PixelRenderer } from './core/PixelRenderer.js';
import { PALETTE } from './palette.js';
import { Player } from './player/Player.js';
import { getScrollSpeed, TUNING } from './tuning.js';
import { GameUI } from './ui/GameUI.js';
import { PlatformPool } from './world/PlatformPool.js';
import { createShaft } from './world/Shaft.js';
import { Spikes } from './world/Spikes.js';
import { ParticlePool } from './world/ParticlePool.js';
import { ViverseSession } from './viverse/ViverseSession.js';

const app = document.querySelector('#app');

function showBootError(error) {
	const message = error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error && error.stack ? error.stack : 'No stack trace available.';
	const details = document.createElement('pre');
	details.textContent = `FATHOM failed to start\n\n${message}\n\n${stack}`;
	app.replaceChildren(details);
}

function boot() {
	const pixelRenderer = new PixelRenderer();
	app.replaceChildren(pixelRenderer.renderer.domElement);
	document.documentElement.style.width = '100%';
	document.documentElement.style.height = '100%';
	document.body.style.margin = '0';
	document.body.style.width = '100%';
	document.body.style.height = '100%';
	app.style.width = '100%';
	app.style.height = '100%';

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(PALETTE.shaftWall);
	const ambientLight = new THREE.AmbientLight(PALETTE.uiText, 1.4);
	const directionalLight = new THREE.DirectionalLight(PALETTE.uiText, 1.8);
	directionalLight.position.set(2, 4, 5);
	scene.add(ambientLight, directionalLight);

	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	camera.position.z = 8;
	createShaft(scene);
	const platforms = new PlatformPool(scene);
	const player = new Player(scene);
	const spikes = new Spikes(scene);
	const particles = new ParticlePool(scene);
	const ui = new GameUI(app);
	const audio = new Audio();
	const viverse = new ViverseSession();
	let state = 'title';
	let cameraY = 0;
	let viewportHeight = TUNING.shaftWidth;
	let depth = 0;
	let nextMilestone = TUNING.depthMilestone;
	let shakeTime = 0;
	let finalDepth = 0;
	let runId = 0;
	let resultKey = '';
	let submissionMessage = '';
	const controlHintKey = 'fathom-control-hint-seen';
	let showControlHint = localStorage.getItem(controlHintKey) !== 'true';
	// SPEC-GAP: The personal-best localStorage key name is not specified.
	let best = Number(localStorage.getItem('fathom-personal-best') || 0);
	let lastTime = performance.now();
	const input = new Input(pixelRenderer.renderer.domElement, togglePause, dismissControlHint);
	const isTouchDevice = navigator.maxTouchPoints > 0;
	window.addEventListener('keydown', (event) => {
		const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
		if (!isSpace) return;
		if (state === 'paused') {
			event.preventDefault();
			togglePause();
			return;
		}
		if (state !== 'title' && state !== 'gameOver') return;
		event.preventDefault();
		startRun();
	});

	function dismissControlHint() {
		if (!showControlHint) return;
		showControlHint = false;
		localStorage.setItem(controlHintKey, 'true');
		ui.dismissControlHint();
	}

	function showTitle() {
		ui.showTitle(startRun, () => viverse.connect(), () => showRecords('title'), viverse.state);
	}

	viverse.subscribe(() => {
		if (state === 'title') showTitle();
		else if (state === 'gameOver') showGameOver();
	});
	viverse.initialize();

	function startRun() {
		state = 'run';
		runId += 1;
		resultKey = '';
		submissionMessage = '';
		cameraY = 0;
		depth = 0;
		nextMilestone = TUNING.depthMilestone;
		shakeTime = 0;
		player.reset();
		platforms.reset();
		particles.reset();
		const hint = isTouchDevice ? 'KEEP SWIPING LEFT / RIGHT • UP TO JUMP' : 'ARROWS / A / D TO STEER • UP TO JUMP';
		ui.showRun(depth, false, showControlHint ? hint : '', togglePause, startRun);
	}

	function endRun() {
		state = 'gameOver';
		shakeTime = TUNING.deathShakeDuration;
		audio.death();
		finalDepth = Math.floor(depth);
		resultKey = `fathom-${runId}-${finalDepth}`;
		best = Math.max(best, finalDepth);
		localStorage.setItem('fathom-personal-best', String(best));
		showGameOver();
	}

	function showGameOver() {
		ui.showGameOver(finalDepth, best, startRun, () => viverse.connect(), () => showRecords('gameOver'), submitScore, viverse.state, submissionMessage);
	}

	async function submitScore() {
		submissionMessage = 'Submitting score...';
		showGameOver();
		const result = await viverse.submitScore(finalDepth, resultKey);
		if (state === 'gameOver') {
			submissionMessage = result.message;
			showGameOver();
		}
	}

	async function showRecords(returnState) {
		state = 'records';
		ui.showRecords({ entries: [], message: 'Loading records...' }, () => returnFromRecords(returnState));
		const result = await viverse.getLeaderboard();
		if (state === 'records') ui.showRecords(result, () => returnFromRecords(returnState));
	}

	function returnFromRecords(returnState) {
		state = returnState;
		if (state === 'title') showTitle();
		else showGameOver();
	}

	function togglePause() {
		if (state === 'run') state = 'paused';
		else if (state === 'paused') state = 'run';
		else return;
		ui.showRun(Math.floor(depth), state === 'paused', '', togglePause, startRun);
	}

	function resize() {
		const viewport = window.visualViewport;
		const width = Math.round(viewport?.width || window.innerWidth);
		const height = Math.round(viewport?.height || window.innerHeight);
		app.style.width = `${width}px`;
		app.style.height = `${height}px`;
		const aspect = width / height;
		viewportHeight = aspect < 1 ? TUNING.shaftWidth / aspect : TUNING.shaftWidth;
		const viewportWidth = viewportHeight * aspect;
		camera.left = -viewportWidth / 2;
		camera.right = viewportWidth / 2;
		camera.top = viewportHeight / 2;
		camera.bottom = -viewportHeight / 2;
		camera.updateProjectionMatrix();
		pixelRenderer.resize(width, height);
	}

	window.addEventListener('resize', resize);
	window.addEventListener('orientationchange', resize);
	window.visualViewport?.addEventListener('resize', resize);
	resize();

	function update(deltaSeconds) {
		const scrollSpeed = getScrollSpeed(depth);
		cameraY -= scrollSpeed * deltaSeconds;
		camera.position.y = cameraY;
		const cameraTop = cameraY + viewportHeight / 2;
		const cameraBottom = cameraY - viewportHeight / 2;
		const ceilingY = cameraTop - TUNING.ceilingInset;
		spikes.update(ceilingY);
		platforms.update(deltaSeconds, cameraTop, cameraBottom, depth);
		const crumbledPlatform = platforms.consumeCrumble();
		if (crumbledPlatform) {
			particles.burstIce(crumbledPlatform.x, crumbledPlatform.y);
			audio.crumble();
		}
		const landedPlatform = player.update(
			deltaSeconds,
			input.getDirection(),
			0,
			input.consumeJumpPress(),
			input.consumeFastFallPresses(),
			platforms.platforms,
		);
		if (landedPlatform !== null) {
			player.squash();
			audio.land();
			const effect = platforms.onLand(landedPlatform);
			if (effect === 'geyser') {
				player.launch(TUNING.geyserLaunchVelocity);
				particles.puffGeyser(landedPlatform.x, landedPlatform.y + TUNING.platformHeight / 2);
				audio.geyser();
			}
		}
		depth = Math.max(depth, -cameraY * TUNING.metersPerWorldUnit);
		ui.setDepth(Math.floor(depth));
		while (depth >= nextMilestone) {
			ui.flashMilestone();
			audio.milestone();
			nextMilestone += TUNING.depthMilestone;
		}

		const playerTop = player.y + TUNING.playerHeight / 2;
		const playerBottom = player.y - TUNING.playerHeight / 2;
		if (playerTop >= ceilingY || playerBottom < cameraBottom) endRun();
	}

	function updateEffects(deltaSeconds) {
		particles.update(deltaSeconds);
		ui.update(deltaSeconds);
		if (shakeTime > 0) {
			shakeTime = Math.max(0, shakeTime - deltaSeconds);
			const magnitude = TUNING.deathShakeMagnitude * shakeTime / TUNING.deathShakeDuration;
			camera.position.x = (Math.random() * 2 - 1) * magnitude;
			camera.position.y = cameraY + (Math.random() * 2 - 1) * magnitude;
		} else {
			camera.position.x = 0;
			camera.position.y = cameraY;
		}
	}

	function render(time) {
		const deltaSeconds = Math.min((time - lastTime) / 1000, TUNING.maxDeltaSeconds);
		lastTime = time;
		if (state === 'run') update(deltaSeconds);
		updateEffects(deltaSeconds);
		pixelRenderer.render(scene, camera);
		requestAnimationFrame(render);
	}

	showTitle();
	render(performance.now());
}

try {
	boot();
} catch (error) {
	showBootError(error);
}
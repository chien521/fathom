import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { getDifficulty, TUNING } from '../tuning.js';

class Platform {
	constructor(scene) {
		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, TUNING.platformHeight, TUNING.platformDepth),
			new THREE.MeshBasicMaterial({ color: PALETTE.stone }),
		);
		this.iceMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.ice, flatShading: true });
		this.slideMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.slide });
		this.movingMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.moving });
		this.geyserMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.geyser });
		this.stoneMaterial = this.mesh.material;
		this.cracks = new THREE.Group();
		for (const offset of [-0.25, 0, 0.25]) {
			const crack = new THREE.Mesh(
				new THREE.BoxGeometry(0.08, 0.03, TUNING.platformDepth + 0.01),
				new THREE.MeshBasicMaterial({ color: PALETTE.iceCrack }),
			);
			crack.position.set(offset, TUNING.platformHeight / 2 + 0.02, 0);
			crack.rotation.z = offset;
			this.cracks.add(crack);
		}
		this.cracks.visible = false;
		this.mesh.add(this.cracks);
		this.vent = new THREE.Mesh(
			new THREE.CylinderGeometry(0.28, 0.42, 0.2, 6),
			new THREE.MeshBasicMaterial({ color: PALETTE.geyserVent }),
		);
		this.vent.position.y = TUNING.platformHeight / 2 + 0.1;
		this.vent.rotation.x = Math.PI / 2;
		this.vent.visible = false;
		this.mesh.add(this.vent);
		scene.add(this.mesh);
		this.mesh.visible = false;
		this.x = 0;
		this.y = 0;
		this.baseX = 0;
		this.width = 0;
		this.type = 'stone';
		this.crumbleTime = 0;
		this.fallDistance = 0;
		this.slideProgress = 0;
		this.slideDirection = 0;
		this.motionTime = 0;
		this.motionPhase = 0;
		this.motionDeltaX = 0;
		this.available = false;
	}

	place(x, y, width, type) {
		this.x = x;
		this.y = y;
		this.baseX = x;
		this.width = width;
		this.type = type;
		this.crumbleTime = 0;
		this.fallDistance = 0;
		this.slideProgress = 0;
		this.slideDirection = type === 'slide' ? (Math.random() < 0.5 ? -1 : 1) : 0;
		this.motionTime = 0;
		this.motionPhase = Math.random() * Math.PI * 2;
		this.motionDeltaX = 0;
		this.available = false;
		this.mesh.scale.x = width;
		this.mesh.position.set(x, y, 0);
		this.mesh.rotation.z = 0;
		this.mesh.material = type === 'ice' ? this.iceMaterial : type === 'slide' ? this.slideMaterial : type === 'moving' ? this.movingMaterial : type === 'geyser' ? this.geyserMaterial : this.stoneMaterial;
		this.cracks.visible = false;
		this.vent.visible = type === 'geyser';
		this.mesh.visible = true;
	}

	onLand() {
		if (this.type === 'geyser') return 'geyser';
		if (this.type === 'slide') {
			this.slideProgress = Number.EPSILON;
			return 'slide';
		}
		if (this.type !== 'ice' || this.crumbleTime > 0) return null;
		this.crumbleTime = Number.EPSILON;
		this.cracks.visible = true;
		return 'ice';
	}

	update(deltaSeconds) {
		this.motionDeltaX = 0;
		if (this.type === 'moving') {
			const previousX = this.x;
			this.motionTime += deltaSeconds;
			this.x = this.baseX + Math.sin(this.motionPhase + this.motionTime * TUNING.movingPlatformAngularSpeed) * TUNING.movingPlatformAmplitude;
			this.motionDeltaX = this.x - previousX;
			this.mesh.position.x = this.x;
		}
		if (this.type === 'slide' && this.slideProgress > 0) {
			this.slideProgress = Math.min(1, this.slideProgress + TUNING.slideTiltSpeed * deltaSeconds);
			this.mesh.rotation.z = -this.slideDirection * TUNING.slideTiltAngle * this.slideProgress;
		}
		if (this.crumbleTime > 0) {
			this.crumbleTime += deltaSeconds;
			if (this.crumbleTime > TUNING.iceCrumbleDelay) {
				const hasJustCrumbled = this.fallDistance === 0;
				const fallDelta = TUNING.iceFallSpeed * deltaSeconds;
				this.y -= fallDelta;
				this.fallDistance += fallDelta;
				this.mesh.position.y = this.y;
				if (this.fallDistance >= TUNING.iceFallDistance) {
					this.mesh.visible = false;
					this.available = true;
				}
				return hasJustCrumbled;
			}
		}
		return false;
	}

	getSlideVelocity() {
		return this.slideDirection * this.slideProgress * TUNING.slideSpeed;
	}

	getMotionDeltaX() {
		return this.motionDeltaX;
	}

	getTopYAt(playerX) {
		const rotation = this.mesh.rotation.z;
		return this.y + Math.tan(rotation) * (playerX - this.x) + TUNING.platformHeight / (2 * Math.cos(rotation));
	}

	isLandable() {
		return this.type !== 'ice' || this.crumbleTime <= TUNING.iceCrumbleDelay;
	}

	isUnder(playerX, playerWidth) {
		return Math.abs(playerX - this.x) <= (this.width + playerWidth) / 2;
	}
}

export class PlatformPool {
	constructor(scene) {
		this.platforms = Array.from({ length: TUNING.platformPoolSize }, () => new Platform(scene));
		this.nextSpawnY = TUNING.initialPlatformY;
		this.lastSpawnX = 0;
		this.lastSpawnType = null;
		this.consecutiveSpawnCount = 0;
		this.difficulty = getDifficulty(0);
		this.crumbledPlatform = null;
	}

	reset() {
		for (const platform of this.platforms) platform.mesh.visible = false;
		this.nextSpawnY = TUNING.initialPlatformY;
		this.lastSpawnX = 0;
		this.lastSpawnType = null;
		this.consecutiveSpawnCount = 0;
		this.difficulty = getDifficulty(0);
		const initialOffset = (TUNING.initialPlatformWidth - TUNING.playerWidth) / 2;
		const initialX = this.randomRange(-initialOffset, initialOffset);
		this.spawn(this.platforms[0], initialX, this.nextSpawnY, TUNING.initialPlatformWidth, 'stone');
		this.nextSpawnY -= this.difficulty.minGap;
		for (let index = 1; index < this.platforms.length; index += 1) this.spawnNext(this.platforms[index]);
	}

	update(deltaSeconds, cameraTop, cameraBottom, depth) {
		this.difficulty = getDifficulty(depth);
		this.crumbledPlatform = null;
		for (const platform of this.platforms) {
			if (platform.update(deltaSeconds)) this.crumbledPlatform = platform;
			if (platform.available) {
				this.spawnNext(platform);
				continue;
			}
			if (platform.y > cameraTop + TUNING.platformRecycleMargin) this.spawnNext(platform);
		}
		while (this.nextSpawnY > cameraBottom - TUNING.spawnAhead) {
			let reusable = null;
			for (const platform of this.platforms) {
				if (platform.y > cameraTop + TUNING.platformRecycleMargin) {
					reusable = platform;
					break;
				}
			}
			if (!reusable) break;
			this.spawnNext(reusable);
		}
	}

	spawnNext(platform) {
		const gap = this.randomRange(this.difficulty.minGap, this.difficulty.maxGap);
		this.nextSpawnY -= gap;
		const width = this.randomRange(TUNING.platformMinWidth, TUNING.platformMaxWidth);
		const type = this.chooseType(this.difficulty.typeWeights);
		const movementInset = type === 'moving' ? TUNING.movingPlatformAmplitude : 0;
		const maxX = TUNING.shaftWidth / 2 - width / 2 - movementInset;
		const maxStep = Math.min(TUNING.steerSpeed * (gap / Math.sqrt(TUNING.gravity)), maxX);
		const x = Math.max(-maxX, Math.min(maxX, this.lastSpawnX + this.randomRange(-maxStep, maxStep)));
		this.spawn(platform, x, this.nextSpawnY, width, type);
	}

	spawn(platform, x, y, width, type) {
		platform.place(x, y, width, type);
		this.lastSpawnX = x;
		this.consecutiveSpawnCount = type === this.lastSpawnType ? this.consecutiveSpawnCount + 1 : 1;
		this.lastSpawnType = type;
	}

	onLand(platform) {
		return platform.onLand();
	}

	consumeCrumble() {
		const platform = this.crumbledPlatform;
		this.crumbledPlatform = null;
		return platform;
	}

	chooseType(weights) {
		const blockedType = this.consecutiveSpawnCount >= 2 ? this.lastSpawnType : null;
		const stoneWeight = blockedType === 'stone' ? 0 : weights.stone;
		const iceWeight = blockedType === 'ice' ? 0 : weights.ice;
		const slideWeight = blockedType === 'slide' ? 0 : weights.slide;
		const movingWeight = blockedType === 'moving' ? 0 : weights.moving;
		const geyserWeight = blockedType === 'geyser' ? 0 : weights.geyser;
		const totalWeight = stoneWeight + iceWeight + slideWeight + movingWeight + geyserWeight;
		const roll = Math.random() * totalWeight;
		if (roll < stoneWeight) return 'stone';
		if (roll < stoneWeight + iceWeight) return 'ice';
		if (roll < stoneWeight + iceWeight + slideWeight) return 'slide';
		if (roll < stoneWeight + iceWeight + slideWeight + movingWeight) return 'moving';
		return 'geyser';
	}

	randomRange(minimum, maximum) {
		return minimum + Math.random() * (maximum - minimum);
	}
}
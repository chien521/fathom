import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { TUNING } from '../tuning.js';

export class Player {
	constructor(scene) {
		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(TUNING.playerWidth, TUNING.playerHeight, TUNING.playerDepth),
			new THREE.MeshBasicMaterial({ color: PALETTE.player }),
		);
		scene.add(this.mesh);
		this.reset();
	}

	reset() {
		this.x = 0;
		this.y = TUNING.playerStartY;
		this.velocityY = 0;
		this.wasGrounded = true;
		this.groundPlatform = null;
		this.squashTime = 0;
		this.mesh.scale.set(1, 1, 1);
		this.syncMesh();
	}

	update(deltaSeconds, direction, jumpPressed, fastFalling, fastFallPressed, platforms) {
		const wasGrounded = this.wasGrounded && (!this.groundPlatform || this.groundPlatform.isLandable());
		const slideVelocity = wasGrounded && this.groundPlatform ? this.groundPlatform.getSlideVelocity() : 0;
		const platformMotion = wasGrounded && this.groundPlatform ? this.groundPlatform.getMotionDeltaX() : 0;
		this.x += (direction * TUNING.steerSpeed + slideVelocity) * deltaSeconds + platformMotion;
		const shaftLimit = TUNING.shaftWidth / 2 - TUNING.playerWidth / 2;
		this.x = Math.max(-shaftLimit, Math.min(shaftLimit, this.x));
		if (wasGrounded && this.groundPlatform) this.y = this.groundPlatform.getTopYAt(this.x) + TUNING.playerHeight / 2;

		const previousBottom = this.y - TUNING.playerHeight / 2;
		if (wasGrounded && jumpPressed) this.velocityY = TUNING.jumpVelocity;
		else this.velocityY -= TUNING.gravity * deltaSeconds;
		if (!wasGrounded && this.velocityY < 0) {
			if (fastFalling) this.velocityY -= TUNING.fastFallAcceleration * deltaSeconds;
			if (fastFallPressed) this.velocityY -= TUNING.fastFallPressImpulse;
		}
		this.velocityY = Math.max(this.velocityY, -TUNING.maxFallVelocity);
		this.y += this.velocityY * deltaSeconds;
		this.wasGrounded = false;
		this.groundPlatform = null;
		let landedPlatform = null;

		if (this.velocityY <= 0) {
			for (const platform of platforms) {
				if (!platform.mesh.visible || !platform.isLandable() || !platform.isUnder(this.x, TUNING.playerWidth)) continue;
				const platformTop = platform.getTopYAt(this.x);
				const playerBottom = this.y - TUNING.playerHeight / 2;
				if (previousBottom >= platformTop && playerBottom <= platformTop) {
					this.y = platformTop + TUNING.playerHeight / 2;
					this.velocityY = 0;
					this.wasGrounded = true;
					this.groundPlatform = platform;
					if (!wasGrounded) landedPlatform = platform;
					break;
				}
			}
		}
		if (this.squashTime > 0) {
			this.squashTime = Math.max(0, this.squashTime - deltaSeconds);
			const progress = this.squashTime / TUNING.landingSquashDuration;
			this.mesh.scale.set(1 + (TUNING.landingSquashX - 1) * progress, 1 + (TUNING.landingSquashY - 1) * progress, 1);
		} else {
			this.mesh.scale.set(1, 1, 1);
		}
		this.syncMesh();
		return landedPlatform;
	}

	syncMesh() {
		this.mesh.position.set(this.x, this.y, 0);
	}

	launch(velocityY) {
		this.velocityY = velocityY;
		this.wasGrounded = false;
	}

	squash() {
		this.squashTime = TUNING.landingSquashDuration;
	}
}
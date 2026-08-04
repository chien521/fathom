import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { TUNING } from '../tuning.js';

export class ParticlePool {
	constructor(scene) {
		this.geometry = new THREE.PlaneGeometry(TUNING.particleSize, TUNING.particleSize);
		this.iceMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.particleIce });
		this.geyserMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.particleGeyser });
		this.particles = [];
		for (let index = 0; index < TUNING.particlePoolSize; index += 1) {
			const mesh = new THREE.Mesh(this.geometry, this.iceMaterial);
			mesh.visible = false;
			scene.add(mesh);
			this.particles.push({ mesh, active: false, x: 0, y: 0, velocityX: 0, velocityY: 0, age: 0 });
		}
	}

	burstIce(x, y) {
		this.spawn(x, y, TUNING.iceParticleCount, TUNING.iceParticleSpeed, this.iceMaterial, false);
	}

	puffGeyser(x, y) {
		this.spawn(x, y, TUNING.geyserParticleCount, TUNING.geyserParticleSpeed, this.geyserMaterial, true);
	}

	reset() {
		for (const particle of this.particles) {
			particle.active = false;
			particle.mesh.visible = false;
		}
	}

	spawn(x, y, count, speed, material, upward) {
		let spawned = 0;
		for (const particle of this.particles) {
			if (particle.active) continue;
			particle.active = true;
			particle.age = 0;
			particle.x = x;
			particle.y = y;
			particle.velocityX = (Math.random() * 2 - 1) * speed;
			particle.velocityY = upward ? Math.random() * speed : (Math.random() * 2 - 1) * speed;
			particle.mesh.material = material;
			particle.mesh.position.set(x, y, 1);
			particle.mesh.visible = true;
			spawned += 1;
			if (spawned === count) break;
		}
	}

	update(deltaSeconds) {
		for (const particle of this.particles) {
			if (!particle.active) continue;
			particle.age += deltaSeconds;
			if (particle.age >= TUNING.particleLifetime) {
				particle.active = false;
				particle.mesh.visible = false;
				continue;
			}
			particle.velocityY -= TUNING.particleGravity * deltaSeconds;
			particle.x += particle.velocityX * deltaSeconds;
			particle.y += particle.velocityY * deltaSeconds;
			particle.mesh.position.set(particle.x, particle.y, 1);
		}
	}
}
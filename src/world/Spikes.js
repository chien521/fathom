import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { TUNING } from '../tuning.js';

export class Spikes {
	constructor(scene) {
		this.group = new THREE.Group();
		const geometry = new THREE.ConeGeometry(TUNING.shaftWidth / TUNING.spikeCount, TUNING.spikeHeight, 4);
		const material = new THREE.MeshBasicMaterial({ color: PALETTE.spike });
		for (let index = 0; index < TUNING.spikeCount; index += 1) {
			const spike = new THREE.Mesh(geometry, material);
			spike.rotation.x = Math.PI;
			spike.position.x = -TUNING.shaftWidth / 2 + (index + 0.5) * TUNING.shaftWidth / TUNING.spikeCount;
			this.group.add(spike);
		}
		scene.add(this.group);
	}

	update(ceilingY) {
		this.group.position.y = ceilingY + TUNING.spikeHeight / 2;
	}
}
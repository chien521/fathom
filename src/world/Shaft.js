import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { TUNING } from '../tuning.js';

export function createShaft(scene) {
	const backWall = new THREE.Mesh(
		new THREE.BoxGeometry(TUNING.shaftWidth, TUNING.shaftLength, TUNING.shaftDepth),
		new THREE.MeshBasicMaterial({ color: PALETTE.shaft }),
	);
	backWall.position.set(0, -TUNING.shaftLength / 2, -TUNING.shaftDepth);
	scene.add(backWall);

	for (const side of [-1, 1]) {
		const trim = new THREE.Mesh(
			new THREE.BoxGeometry(TUNING.platformHeight, TUNING.shaftLength, TUNING.platformDepth),
			new THREE.MeshLambertMaterial({ color: PALETTE.shaftTrim, flatShading: true }),
		);
		trim.position.set(side * TUNING.shaftWidth / 2, -TUNING.shaftLength / 2, -TUNING.platformDepth);
		scene.add(trim);
	}
}
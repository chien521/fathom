import * as THREE from 'three';
import { TUNING } from '../tuning.js';

export class PixelRenderer {
	constructor() {
		this.renderer = new THREE.WebGLRenderer({ antialias: false });
		this.renderer.setPixelRatio(1);
		this.renderer.domElement.style.display = 'block';
		this.renderer.domElement.style.width = '100%';
		this.renderer.domElement.style.height = '100%';

		this.target = new THREE.WebGLRenderTarget(1, 1, {
			magFilter: THREE.NearestFilter,
			minFilter: THREE.NearestFilter,
			depthBuffer: true,
		});
		this.target.texture.generateMipmaps = false;

		this.presentScene = new THREE.Scene();
		this.presentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.presentScene.add(new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2),
			new THREE.MeshBasicMaterial({ map: this.target.texture }),
		));
	}

	resize(width, height) {
		const shortAxis = Math.min(width, height);
		const pixelScale = Math.max(1, Math.round(shortAxis / TUNING.pixelShortAxis));
		const targetWidth = Math.max(1, Math.round(width / pixelScale));
		const targetHeight = Math.max(1, Math.round(height / pixelScale));

		this.renderer.setSize(width, height, false);
		this.target.setSize(targetWidth, targetHeight);
		return { targetWidth, targetHeight, pixelScale };
	}

	render(scene, camera) {
		this.renderer.setRenderTarget(this.target);
		this.renderer.render(scene, camera);
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.presentScene, this.presentCamera);
	}
}
import { TUNING } from '../tuning.js';

export class Input {
	constructor(element, onPause, onControlInput) {
		this.direction = 0;
		this.keys = new Set();
		this.touchDirection = 0;
		this.mobileStepDirection = 0;
		this.mobileHoldDirection = 0;
		this.mobileHoldTimer = 0;
		this.gesturePointerId = null;
		this.gestureStartX = 0;
		this.gestureStartY = 0;
		this.gestureType = '';
		this.jumpPressed = false;
		this.fastFallPresses = 0;
		this.onPause = onPause;
		this.onControlInput = onControlInput;

		window.addEventListener('keydown', (event) => this.onKeyDown(event));
		window.addEventListener('keyup', (event) => this.onKeyUp(event));
		element.addEventListener('pointerdown', (event) => this.onPointerDown(event));
		element.addEventListener('pointermove', (event) => this.onPointerMove(event));
		element.addEventListener('pointerup', (event) => this.onPointerEnd(event));
		element.addEventListener('pointercancel', (event) => this.onPointerCancel(event));
		element.addEventListener('lostpointercapture', () => this.cancelMobileMove(this.mobileHoldDirection));
	}

	onKeyDown(event) {
		if (event.code === 'Escape') {
			event.preventDefault();
			this.onPause();
			return;
		}
		if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
			event.preventDefault();
			this.keys.add(event.code);
			this.onControlInput();
			if (event.code === 'ArrowUp' && !event.repeat) this.jumpPressed = true;
			if (event.code === 'ArrowDown' && !event.repeat) this.fastFallPresses += 1;
			this.updateKeyboardDirection();
		}
	}

	onKeyUp(event) {
		this.keys.delete(event.code);
		this.updateKeyboardDirection();
	}

	onPointerDown(event) {
		if (event.pointerType === 'mouse') return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		this.onControlInput();
		this.gesturePointerId = event.pointerId;
		this.gestureStartX = event.clientX;
		this.gestureStartY = event.clientY;
		this.gestureType = 'pending';
	}

	onPointerMove(event) {
		if (event.pointerId !== this.gesturePointerId || this.gestureType !== 'pending') return;
		event.preventDefault();
		const horizontalDistance = event.clientX - this.gestureStartX;
		const verticalDistance = event.clientY - this.gestureStartY;
		if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < TUNING.mobileSwipeThreshold) return;
		if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
			this.gestureType = 'horizontal';
			this.startMobileMove(Math.sign(horizontalDistance));
			return;
		}
		this.gestureType = 'vertical';
		if (verticalDistance < 0) this.tapMobileJump();
		else this.tapMobileFastFall();
	}

	onPointerEnd(event) {
		if (event.pointerId !== this.gesturePointerId) return;
		event.preventDefault();
		if (this.gestureType === 'horizontal') this.endMobileMove(this.mobileHoldDirection);
		this.gesturePointerId = null;
		this.gestureType = '';
	}

	onPointerCancel(event) {
		if (event.pointerId !== this.gesturePointerId) return;
		this.cancelMobileMove(this.mobileHoldDirection);
		this.gesturePointerId = null;
		this.gestureType = '';
	}

	updateKeyboardDirection() {
		const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
		const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
		this.direction = Number(right) - Number(left);
	}

	getDirection() {
		return this.direction || this.touchDirection;
	}

	consumeMobileStep() {
		const direction = this.mobileStepDirection;
		this.mobileStepDirection = 0;
		return direction;
	}

	isFastFalling() {
		return this.keys.has('ArrowDown');
	}

	consumeJumpPress() {
		const wasPressed = this.jumpPressed;
		this.jumpPressed = false;
		return wasPressed;
	}

	consumeFastFallPresses() {
		const presses = this.fastFallPresses;
		this.fastFallPresses = 0;
		return presses;
	}

	startMobileMove(direction) {
		this.onControlInput();
		this.mobileHoldDirection = direction;
		clearTimeout(this.mobileHoldTimer);
		this.mobileHoldTimer = window.setTimeout(() => {
			if (this.mobileHoldDirection === direction) this.touchDirection = direction;
		}, TUNING.mobileHoldDelay);
	}

	endMobileMove(direction) {
		if (this.mobileHoldDirection !== direction) return;
		const wasWalking = this.touchDirection === direction;
		clearTimeout(this.mobileHoldTimer);
		this.mobileHoldTimer = 0;
		this.mobileHoldDirection = 0;
		this.touchDirection = 0;
		if (!wasWalking) this.mobileStepDirection = direction;
	}

	cancelMobileMove(direction) {
		if (this.mobileHoldDirection !== direction) return;
		clearTimeout(this.mobileHoldTimer);
		this.mobileHoldTimer = 0;
		this.mobileHoldDirection = 0;
		this.touchDirection = 0;
	}

	tapMobileJump() {
		this.onControlInput();
		this.jumpPressed = true;
	}

	tapMobileFastFall() {
		this.onControlInput();
		this.fastFallPresses += TUNING.mobileFastFallPressCount;
	}
}
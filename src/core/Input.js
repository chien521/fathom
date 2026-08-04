export class Input {
	constructor(element, onPause, onControlInput) {
		this.direction = 0;
		this.keys = new Set();
		this.touchDirection = 0;
		this.jumpPressed = false;
		this.fastFallPressed = false;
		this.element = element;
		this.onPause = onPause;
		this.onControlInput = onControlInput;

		window.addEventListener('keydown', (event) => this.onKeyDown(event));
		window.addEventListener('keyup', (event) => this.onKeyUp(event));
		element.addEventListener('pointerdown', (event) => this.onPointerDown(event));
		element.addEventListener('pointermove', (event) => this.onPointerMove(event));
		element.addEventListener('pointerup', (event) => this.onPointerEnd(event));
		element.addEventListener('pointercancel', (event) => this.onPointerEnd(event));
		element.addEventListener('lostpointercapture', () => { this.touchDirection = 0; });
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
			if (event.code === 'ArrowDown' && !event.repeat) this.fastFallPressed = true;
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
		this.element.setPointerCapture(event.pointerId);
		this.onControlInput();
		this.updateTouchDirection(event);
	}

	onPointerMove(event) {
		if (event.pointerType === 'mouse') return;
		event.preventDefault();
		this.updateTouchDirection(event);
	}

	onPointerEnd(event) {
		if (event.pointerType !== 'mouse') event.preventDefault();
		this.touchDirection = 0;
	}

	updateTouchDirection(event) {
		this.touchDirection = event.clientX < this.element.clientWidth / 2 ? -1 : 1;
	}

	updateKeyboardDirection() {
		const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
		const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
		this.direction = Number(right) - Number(left);
	}

	getDirection() {
		return this.direction || this.touchDirection;
	}

	isFastFalling() {
		return this.keys.has('ArrowDown');
	}

	consumeJumpPress() {
		const wasPressed = this.jumpPressed;
		this.jumpPressed = false;
		return wasPressed;
	}

	consumeFastFallPress() {
		const wasPressed = this.fastFallPressed;
		this.fastFallPressed = false;
		return wasPressed;
	}
}
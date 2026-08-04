import { PALETTE } from '../palette.js';
import { TUNING } from '../tuning.js';

const styles = `
position:fixed;inset:0;box-sizing:border-box;color:${PALETTE.uiText};font-family:Georgia, 'Times New Roman', serif;letter-spacing:0;background:transparent;
`;

const buttonSizeStyle = `box-sizing:border-box;width:168px;height:48px;font-family:Georgia, 'Times New Roman', serif;font-size:18px;white-space:nowrap;`;
const primaryButtonStyle = `${buttonSizeStyle}--button-fill:${PALETTE.uiAccent};--button-hover-text:#000000;--button-text:${PALETTE.uiAccent};border:2px solid ${PALETTE.uiAccent};background:transparent;color:${PALETTE.uiAccent};`;
const secondaryButtonStyle = `${buttonSizeStyle}--button-fill:${PALETTE.uiText};--button-hover-text:#ffffff;--button-text:${PALETTE.uiText};border:1px solid ${PALETTE.uiText};background:transparent;color:${PALETTE.uiText};`;
const pausePanelStyle = `box-sizing:border-box;min-width:280px;padding:24px;background:#ffffff;border:1px solid ${PALETTE.uiText};text-align:center;`;

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export class GameUI {
	constructor(parent) {
		this.root = document.createElement('div');
		this.root.tabIndex = -1;
		this.root.style.cssText = `${styles}pointer-events:none;padding:calc(16px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));`;
		parent.append(this.root);
		this.root.addEventListener('pointerover', (event) => this.highlightSecondaryButton(event));
		this.root.addEventListener('pointerout', (event) => this.resetSecondaryButton(event));
		this.depth = null;
		this.hud = null;
		this.pauseMessage = null;
		this.flash = null;
		this.flashTime = 0;
	}

	highlightSecondaryButton(event) {
		const button = event.target.closest?.('button');
		const fill = button?.style.getPropertyValue('--button-fill');
		if (!button || !fill || button.style.background !== 'transparent') return;
		button.dataset.secondaryHover = 'true';
		button.style.background = fill;
		button.style.color = button.style.getPropertyValue('--button-hover-text');
	}

	resetSecondaryButton(event) {
		const button = event.target.closest?.('button');
		if (!button || button.dataset.secondaryHover !== 'true' || button.contains(event.relatedTarget)) return;
		button.style.background = 'transparent';
		button.style.color = button.style.getPropertyValue('--button-text');
		delete button.dataset.secondaryHover;
	}

	showTitle(onDive, onConnect, onRecords, viverseState) {
		const connectLabel = viverseState?.status === 'logged_in' ? 'viverse connected' : 'connect viverse';
		const isMobileLayout = window.matchMedia('(max-width: 767px)').matches;
		const titleOffset = isMobileLayout ? '-25vh' : '-30vh';
		this.root.innerHTML = `<div style="height:100%;display:grid;place-items:center;pointer-events:auto"><section style="text-align:center;transform:translateY(${titleOffset})"><h1 style="margin:0;color:${PALETTE.uiAccent};font-family:Georgia, 'Times New Roman', serif;font-size:56px;font-weight:normal">fathom</h1><p style="margin:12px 0 20px">tap / press space to dive</p><button data-action="dive" style="${primaryButtonStyle}">dive</button><p style="margin:18px 0 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button data-action="viverse" style="${secondaryButtonStyle}">${connectLabel}</button><button data-action="records" style="${secondaryButtonStyle}">records</button></p></section></div>`;
		this.root.querySelector('[data-action="dive"]').addEventListener('click', onDive);
		this.root.querySelector('[data-action="viverse"]').addEventListener('click', onConnect);
		this.root.querySelector('[data-action="records"]').addEventListener('click', onRecords);
		this.root.focus({ preventScroll: true });
		this.root.addEventListener('pointerdown', (event) => {
			if (event.target === this.root) onDive();
		}, { once: true });
	}

	showRun(depth, paused, controlHint, onResume, onRestart) {
		if (!this.hud) {
			const hint = controlHint ? `<div data-hint style="position:absolute;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);font-size:14px;text-align:center;white-space:nowrap;text-shadow:2px 2px ${PALETTE.uiPanel}">${escapeHtml(controlHint)}</div>` : '';
			this.root.innerHTML = `<div data-hud style="font-size:22px"></div><button data-action="pause" type="button" aria-label="Pause" title="Pause" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:calc(16px + env(safe-area-inset-right));width:48px;height:48px;padding:0;border:2px solid ${PALETTE.uiText};background:#ffffff;color:${PALETTE.uiText};font-family:Georgia, 'Times New Roman', serif;font-size:26px;line-height:1;pointer-events:auto">||</button><div data-flash style="position:absolute;inset:0;background:${PALETTE.uiAccent};opacity:0"></div><div data-pause style="position:absolute;inset:0;display:none;place-items:center;background:rgba(44, 50, 56, 0.3);pointer-events:auto"><section style="${pausePanelStyle}"><h2 style="margin:0;color:${PALETTE.uiText};font-size:34px">PAUSED</h2><p style="margin:18px 0 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button data-action="resume" style="${primaryButtonStyle}">resume</button><button data-action="restart" style="${secondaryButtonStyle}">restart</button></p></section></div>${hint}`;
			this.hud = this.root.querySelector('[data-hud]');
			this.flash = this.root.querySelector('[data-flash]');
			this.pauseMessage = this.root.querySelector('[data-pause]');
			this.root.querySelector('[data-action="pause"]').addEventListener('click', onResume);
			this.pauseMessage.querySelector('[data-action="resume"]').addEventListener('click', onResume);
			this.pauseMessage.querySelector('[data-action="restart"]').addEventListener('click', () => this.showRestartConfirmation(onResume, onRestart));
			this.depth = null;
		}
		this.setDepth(depth);
		this.pauseMessage.style.display = paused ? 'grid' : 'none';
	}

	dismissControlHint() {
		this.root.querySelector('[data-hint]')?.remove();
	}

	showRestartConfirmation(onResume, onRestart) {
		this.pauseMessage.innerHTML = `<section style="${pausePanelStyle}"><h2 style="margin:0;color:${PALETTE.uiText};font-size:34px">RESTART?</h2><p style="margin:12px 0 20px">restart this dive?</p><p style="margin:0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button data-action="confirm-restart" style="${primaryButtonStyle}">restart</button><button data-action="back" style="${secondaryButtonStyle}">back</button></p></section>`;
		this.pauseMessage.querySelector('[data-action="confirm-restart"]').addEventListener('click', onRestart);
		this.pauseMessage.querySelector('[data-action="back"]').addEventListener('click', () => this.showPauseActions(onResume, onRestart));
	}

	showPauseActions(onResume, onRestart) {
		this.pauseMessage.innerHTML = `<section style="${pausePanelStyle}"><h2 style="margin:0;color:${PALETTE.uiText};font-size:34px">PAUSED</h2><p style="margin:18px 0 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button data-action="resume" style="${primaryButtonStyle}">resume</button><button data-action="restart" style="${secondaryButtonStyle}">restart</button></p></section>`;
		this.pauseMessage.querySelector('[data-action="resume"]').addEventListener('click', onResume);
		this.pauseMessage.querySelector('[data-action="restart"]').addEventListener('click', () => this.showRestartConfirmation(onResume, onRestart));
	}

	setDepth(depth) {
		if (this.depth === depth || !this.hud) return;
		this.depth = depth;
		this.hud.textContent = `DEPTH ${depth}m`;
	}

	flashMilestone() {
		this.flashTime = TUNING.milestoneFlashDuration;
	}

	update(deltaSeconds) {
		if (this.flashTime <= 0 || !this.flash) return;
		this.flashTime = Math.max(0, this.flashTime - deltaSeconds);
		this.flash.style.opacity = String(this.flashTime / TUNING.milestoneFlashDuration);
	}

	showGameOver(depth, best, onDive, onConnect, onRecords, onSubmit, viverseState, submissionMessage) {
		this.hud = null;
		this.pauseMessage = null;
		this.flash = null;
		const connectLabel = viverseState?.status === 'logged_in' ? 'viverse connected' : 'connect viverse';
		const submit = viverseState?.status === 'logged_in' ? `<button data-action="submit" style="${secondaryButtonStyle}">submit score</button>` : '';
		const message = submissionMessage ? `<p style="color:${PALETTE.uiMuted}">${escapeHtml(submissionMessage)}</p>` : '';
		this.root.innerHTML = `<div style="height:100%;display:grid;place-items:center;pointer-events:auto"><section data-game-over-panel style="box-sizing:border-box;min-width:280px;padding:24px;background:#ffffff;border:1px solid ${PALETTE.uiText};text-align:center;opacity:0;transition:opacity 220ms ease-out"><h2 style="margin:0;color:${PALETTE.uiText};font-size:34px">DIVE OVER</h2><p>DEPTH ${depth}m</p><p>PERSONAL BEST ${best}m</p><p style="margin:12px 0 20px">tap / press space to dive again</p><button data-action="dive" style="${primaryButtonStyle}">dive again</button><p style="margin:18px 0 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button data-action="viverse" style="${secondaryButtonStyle}">${connectLabel}</button>${submit}<button data-action="records" style="${secondaryButtonStyle}">records</button></p>${message}</section></div>`;
		this.root.querySelector('[data-action="dive"]').addEventListener('click', onDive);
		this.root.querySelector('[data-action="viverse"]').addEventListener('click', onConnect);
		this.root.querySelector('[data-action="records"]').addEventListener('click', onRecords);
		const submitButton = this.root.querySelector('[data-action="submit"]');
		if (submitButton) submitButton.addEventListener('click', onSubmit);
		requestAnimationFrame(() => { this.root.querySelector('[data-game-over-panel]')?.style.setProperty('opacity', '1'); });
		this.root.focus({ preventScroll: true });
	}

	showRecords(result, onBack) {
		const rows = result.entries.map((entry) => `<li>#${entry.rank} ${escapeHtml(entry.name)} ${entry.score}m</li>`).join('');
		const content = rows ? `<ol style="padding-left:24px;text-align:left;max-height:220px;overflow-y:auto">${rows}</ol>` : `<p>${escapeHtml(result.message || 'Loading records...')}</p>`;
		this.hud = null;
		this.pauseMessage = null;
		this.flash = null;
		this.root.innerHTML = `<div style="height:100%;display:grid;place-items:center;pointer-events:auto"><section style="box-sizing:border-box;min-width:280px;max-width:320px;padding:24px;background:#ffffff;border:1px solid ${PALETTE.uiText};text-align:center"><h2 style="margin:0;color:${PALETTE.uiAccent};font-size:30px">RECORDS</h2>${content}<button data-action="back" style="${secondaryButtonStyle}">back</button></section></div>`;
		this.root.querySelector('[data-action="back"]').addEventListener('click', onBack);
	}
}
const VERSION_NAME = 'fathom-viverse-session-1';
const AUTH_DOMAIN = 'account.htcvive.com';
const HANDSHAKE_DELAY_MS = 1200;
const AUTH_RETRY_COUNT = 3;
const AUTH_RETRY_DELAY_MS = 1000;

function delay(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ViverseSession {
	constructor() {
		this.listeners = new Set();
		this.sdk = null;
		this.client = null;
		this.appId = '';
		this.leaderboardName = import.meta.env.VITE_VIVERSE_LEADERBOARD_NAME || 'depth';
		this.explorerLeaderboardName = import.meta.env.VITE_VIVERSE_EXPLORER_LEADERBOARD_NAME || 'explorer';
		this.gameDashboardClient = null;
		this.dashboardToken = '';
		this.submittedResultKeys = new Set();
		this.pendingResultKeys = new Set();
		this.bootstrapPromise = null;
		this.state = { status: 'unavailable', message: 'Available on VIVERSE.', user: null };
	}

	subscribe(listener) {
		this.listeners.add(listener);
		listener(this.state);
		return () => this.listeners.delete(listener);
	}

	setState(status, message, user = null) {
		this.state = { status, message, user };
		for (const listener of this.listeners) listener(this.state);
	}

	getSdk() {
		return window.viverse || window.VIVERSE_SDK || window.vSdk || null;
	}

	resolveAppId() {
		const configured = import.meta.env.VITE_VIVERSE_CLIENT_ID;
		if (configured && configured !== 'YOUR_APP_ID') return configured;
		const match = window.location.hostname.match(/^([a-z0-9]+)(?:-preview)?\.world\.viverse\.app$/);
		return match ? match[1] : '';
	}

	async initialize() {
		if (this.bootstrapPromise) return this.bootstrapPromise;
		this.bootstrapPromise = this.bootstrap();
		return this.bootstrapPromise;
	}

	async bootstrap() {
		console.info(`[VIVERSE] ${VERSION_NAME}`);
		this.sdk = this.getSdk();
		this.appId = this.resolveAppId();
		if (!this.sdk || !this.appId) {
			this.setState('unavailable', 'Available on VIVERSE.');
			return this.state;
		}
		try {
			if (typeof this.sdk.client === 'function') {
				this.client = new this.sdk.client({ clientId: this.appId, domain: AUTH_DOMAIN });
			} else if (this.sdk.client) {
				this.client = this.sdk.client;
			} else {
				this.setState('error', 'VIVERSE authentication is unavailable.');
				return this.state;
			}
			await delay(HANDSHAKE_DELAY_MS);
			const auth = await this.checkAuth();
			if (!auth?.access_token) {
				this.setState('logged_out', 'Connect VIVERSE to submit scores.');
				return this.state;
			}
			const user = await this.loadProfile(auth);
			this.setState('logged_in', `Connected as ${user.displayName}.`, user);
		} catch (error) {
			console.warn('[VIVERSE] Auth bootstrap failed.', error);
			this.setState('error', 'VIVERSE connection failed. You can still dive.');
		}
		return this.state;
	}

	async checkAuth() {
		let auth = null;
		for (let attempt = 0; attempt < AUTH_RETRY_COUNT; attempt += 1) {
			auth = await this.client.checkAuth();
			if (auth?.access_token) return auth;
			if (attempt < AUTH_RETRY_COUNT - 1) await delay(AUTH_RETRY_DELAY_MS);
		}
		return auth;
	}

	async loadProfile(auth) {
		let profile = null;
		const merge = (value) => {
			if (value && typeof value === 'object') profile = profile ? { ...profile, ...value } : value;
		};
		const hasIdentity = () => Boolean(profile?.name || profile?.displayName || profile?.display_name || profile?.nickName || profile?.nickname || profile?.userName || profile?.email);
		const token = auth.access_token;
		try {
			if (typeof this.sdk.avatar === 'function') {
				const avatar = new this.sdk.avatar({
					baseURL: 'https://sdk-api.viverse.com/',
					accessToken: token,
					token,
					authorization: token,
					appId: this.appId,
					clientId: this.appId,
				});
				merge(await avatar.getProfile());
			}
			if (!hasIdentity() && this.client.getUserInfo) merge(await this.client.getUserInfo());
			if (!hasIdentity() && this.client.getUser) merge(await this.client.getUser());
			if (!hasIdentity() && this.client.getProfileByToken) merge(await this.client.getProfileByToken(token));
			if (!hasIdentity()) {
				const response = await fetch('https://account-profile.htcvive.com/SS/Profiles/v3/Me', {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) merge(await response.json());
			}
		} catch (error) {
			console.warn('[VIVERSE] Profile enrichment failed.', error);
		}
		const displayName = profile?.displayName || profile?.display_name || profile?.name || profile?.nickName || profile?.nickname || profile?.userName || profile?.email || 'VIVERSE Player';
		return { accessToken: token, displayName };
	}

	async connect() {
		await this.initialize();
		if (this.state.status === 'unavailable' || this.state.status === 'error' || this.state.status === 'logged_in') return this.state;
		try {
			this.setState('logging_in', 'Opening VIVERSE login...');
			await this.client.loginWithWorlds({ state: 'fathom' });
		} catch (error) {
			console.warn('[VIVERSE] Login failed.', error);
			this.setState('error', 'VIVERSE login failed. You can still dive.');
		}
		return this.state;
	}

	async submitScore(score, explorerScore, resultKey) {
		await this.initialize();
		const value = Math.floor(Number(score));
		if (!Number.isFinite(value) || value <= 0) return { status: 'invalid', message: 'A depth above 0m is required.' };
		if (this.state.status !== 'logged_in') return { status: this.state.status, message: 'Sign in to submit a score.' };
		if (!this.leaderboardName) return { status: 'unavailable', message: 'Score submission needs VIVERSE leaderboard setup.' };
		if (this.submittedResultKeys.has(resultKey)) return { status: 'submitted', message: 'Score already submitted.' };
		if (this.pendingResultKeys.has(resultKey)) return { status: 'submitting', message: 'Submitting score...' };
		this.pendingResultKeys.add(resultKey);
		try {
			const dashboard = await this.getDashboardClient();
			if (!dashboard) return { status: 'error', message: 'Score submission is unavailable right now.' };
			const scores = [{ name: this.leaderboardName, value }];
			const explorerValue = Math.floor(Number(explorerScore));
			if (this.explorerLeaderboardName && Number.isFinite(explorerValue) && explorerValue > 0) scores.push({ name: this.explorerLeaderboardName, value: explorerValue });
			await dashboard.uploadLeaderboardScore(this.appId, scores);
			this.submittedResultKeys.add(resultKey);
			return { status: 'submitted', message: this.explorerLeaderboardName ? 'Depth and Explorer scores submitted.' : 'Depth score submitted.' };
		} catch (error) {
			console.warn('[VIVERSE] Leaderboard submission failed.', error);
			return { status: 'error', message: 'Score submission failed. Please try again.' };
		} finally {
			this.pendingResultKeys.delete(resultKey);
		}
	}

	async getDashboardClient() {
		const auth = this.state.user?.accessToken;
		if (!auth) return null;
		let token = auth;
		if (typeof this.client?.getToken === 'function') {
			const response = await this.client.getToken();
			token = typeof response === 'string' ? response : (response?.access_token || auth);
		}
		if (this.gameDashboardClient && this.dashboardToken === token) return this.gameDashboardClient;
		const DashboardClass = this.sdk?.gameDashboard || this.sdk?.GameDashboard;
		if (typeof DashboardClass !== 'function') return null;
		this.dashboardToken = token;
		this.gameDashboardClient = new DashboardClass({
			token,
			clientId: this.appId,
			baseURL: 'https://www.viveport.com/',
			communityBaseURL: 'https://www.viverse.com/',
		});
		return this.gameDashboardClient;
	}

	extractRankings(response) {
		const rankings = response?.rankings || response?.ranking || response?.leaderboard_rankings || response?.data?.rankings || response?.data?.ranking || response?.leaderboard?.rankings || response?.leaderboard?.ranking || [];
		return Array.isArray(rankings) ? rankings : [];
	}

	normalizeRankings(rankings) {
		return rankings.map((ranking, index) => ({
			rank: typeof ranking.rank === 'number' ? ranking.rank + 1 : index + 1,
			name: ranking.displayName || ranking.display_name || ranking.nickname || ranking.user_name || ranking.name || 'Diver',
			score: Number(ranking.value ?? ranking.score ?? ranking.points ?? 0),
		}));
	}

	async getLeaderboard(leaderboardName = this.leaderboardName) {
		await this.initialize();
		if (this.state.status === 'unavailable') return { status: 'unavailable', entries: [], message: 'Records are available on VIVERSE.' };
		if (this.state.status !== 'logged_in') return { status: this.state.status, entries: [], message: 'Sign in to view records.' };
		if (!leaderboardName) return { status: 'unavailable', entries: [], message: 'Records need VIVERSE leaderboard setup.' };
		try {
			const dashboard = await this.getDashboardClient();
			if (!dashboard) return { status: 'error', entries: [], message: 'Records are unavailable right now.' };
			const configs = [
				{ name: leaderboardName, range_start: 0, range_end: 9, region: 'global', time_range: 'alltime', around_user: false },
				{ name: leaderboardName, range_start: 0, range_end: 9, region: 'global', time_range: 'alltime', around_user: true },
				{ name: leaderboardName, range_start: 0, range_end: 9, region: 'local', time_range: 'alltime', around_user: false },
			];
			let rankings = [];
			for (const config of configs) {
				rankings = this.extractRankings(await dashboard.getLeaderboard(this.appId, config));
				if (rankings.length > 0) break;
			}
			if (rankings.length === 0 && typeof dashboard.getGuestLeaderboard === 'function') {
				for (const config of configs) {
					rankings = this.extractRankings(await dashboard.getGuestLeaderboard(this.appId, config));
					if (rankings.length > 0) break;
				}
			}
			return { status: 'success', entries: this.normalizeRankings(rankings), message: rankings.length ? '' : 'No dives recorded yet.' };
		} catch (error) {
			console.warn('[VIVERSE] Leaderboard read failed.', error);
			return { status: 'error', entries: [], message: 'Records are unavailable right now.' };
		}
	}

	async getLeaderboards() {
		const configurations = [
			{ label: 'depth score', name: this.leaderboardName, unit: 'm' },
			{ label: 'explorer score', name: this.explorerLeaderboardName, unit: '' },
		].filter((configuration) => configuration.name);
		if (configurations.length === 0) return { leaderboards: [], message: 'Records need VIVERSE leaderboard setup.' };
		const leaderboards = await Promise.all(configurations.map(async (configuration) => ({
			label: configuration.label,
			unit: configuration.unit,
			...(await this.getLeaderboard(configuration.name)),
		})));
		return { leaderboards, message: '' };
	}
}
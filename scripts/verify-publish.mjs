import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const envPath = join(root, '.env');
const distPath = join(root, 'dist');

function readEnvValue(name) {
	if (!existsSync(envPath)) return '';
	const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
	return line ? line.slice(name.length + 1).trim() : '';
}

function collectFiles(path) {
	return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(path, entry.name);
		return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
	});
}

const appId = readEnvValue('VITE_VIVERSE_CLIENT_ID');
if (!appId || appId === 'YOUR_APP_ID') throw new Error('Set VITE_VIVERSE_CLIENT_ID to the existing VIVERSE World App ID in .env.');
if (!existsSync(distPath) || !statSync(distPath).isDirectory()) throw new Error('dist/ is missing. Run npm run build first.');

const indexPath = join(distPath, 'index.html');
if (!existsSync(indexPath)) throw new Error('dist/index.html is missing. Run npm run build first.');

const files = collectFiles(distPath);
const bundle = files.map((file) => readFileSync(file, 'utf8')).join('\n');
const indexHtml = readFileSync(indexPath, 'utf8');
if (!bundle.includes(appId)) throw new Error(`Built bundle does not contain App ID ${appId}. Rebuild after checking .env.`);
if (bundle.includes('YOUR_APP_ID')) throw new Error('Built bundle contains YOUR_APP_ID. Resolve the placeholder and rebuild.');
if (!indexHtml.includes('./assets/') || indexHtml.includes('/src/')) throw new Error('dist/index.html does not contain deployment-safe relative asset paths.');

console.log(`Publish verification passed for App ID ${appId}.`);
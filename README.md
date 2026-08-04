# FATHOM

FATHOM is an endless pixel-rendered descent game. Steer through a vertical shaft, survive brittle ice and geyser vents, and dive as deeply as you can before the ceiling closes in.

Built with Three.js and Vite for desktop and mobile browsers.

## Play Online

[Play FATHOM in your browser](https://chien521.github.io/fathom/)

## Controls

| Platform | Control |
| --- | --- |
| Desktop | Left/Right arrows or A/D to steer |
| Desktop | Up arrow to jump from a platform |
| Desktop | Down arrow to fast-fall while airborne |
| Desktop | Escape to pause |
| Mobile | Keep swiping left or right to move |
| Mobile | Swipe up to jump; swipe down for a double fast-fall impulse |

## Local Development

```sh
npm install
npm run dev
```

Create `.env` from `.env.example` and provide the VIVERSE values:

```text
VITE_VIVERSE_CLIENT_ID=your-world-app-id
VITE_VIVERSE_LEADERBOARD_NAME=depth
```

Vite embeds `VITE_*` values at build time. Rebuild after changing either value.

## Build

```sh
npm run build
npm run verify:publish
npm run preview
```

`npm run build` creates the static release bundle in `dist/`. `npm run preview` serves that exact bundle locally for a release smoke test.

## VIVERSE Setup

1. Open the VIVERSE World App that owns FATHOM and copy its App ID into `VITE_VIVERSE_CLIENT_ID`.
2. Register the hosted world's required authentication origin and redirect URL in Studio.
3. Create a leaderboard under that same App ID with API name `depth` exactly, including its lowercase spelling.
4. Configure it as `Numerical` and `Descending`. Use the Studio update rule for a player's best result so the leaderboard represents each player's deepest dive rather than cumulative depth.
5. Save and publish the Studio configuration, then rebuild the game.

The App ID and leaderboard name are compiled into the Vite bundle from `.env`; they are not configured on the VIVERSE side at upload time. Keep the same App ID in `.env` as the World App being updated.

## Publish To VIVERSE

1. Install the official CLI if needed: `npm install -g @viverse/cli`.
2. Authenticate it: `viverse-cli auth login`.
3. Confirm the existing World App is listed: `viverse-cli app list`.
4. Build the static bundle: `npm run build`.
5. Run the deterministic pre-publish audit: `npm run verify:publish`.
6. Publish the existing World App: `viverse-cli app publish ./dist --app-id dqzgwv4ff3`.
7. Open the URL returned by the CLI and verify the title screen, a full dive, VIVERSE login, one positive-depth score submission, and the Records view.

The publish command updates the existing World App in place. Do not create another app for a republish.

## Screenshot Capture List

Capture these from the published World before release:

1. Title screen in portrait mobile layout.
2. Active descent showing the depth HUD, shaft, player, and platforms.
3. Brittle ice cracking or crumbling with particles visible.
4. Geyser launch with puff particles visible.
5. Game-over screen with final depth and personal best.
6. Records screen with populated VIVERSE rankings.
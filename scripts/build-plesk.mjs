/**
 * Build script for Plesk deployment.
 * Produces:
 *   dist/index.cjs        ← CJS entry point for Plesk (wraps the ESM bundle)
 *   dist/index.mjs        ← ESM Express bundle (loaded by index.cjs)
 *   dist/public/          ← React frontend (served by Express)
 *   dist/pino-*.mjs       ← Pino logging workers
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm, mkdir, cp, readdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.resolve(rootDir, "dist");

// CJS wrapper that loads the ESM bundle via dynamic import
const CJS_WRAPPER = `\
/**
 * Plesk entry point — CJS wrapper that loads the ESM Express bundle.
 * Run with: node dist/index.cjs
 */
(async () => {
  try {
    await import('./index.mjs');
  } catch (err) {
    console.error('Failed to start Good Deal server:', err);
    process.exit(1);
  }
})();
`;

async function buildPlesk() {
  console.log("🧹 Nettoyage du dossier dist...");
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // ── 1. Build frontend (Vite) → dist/public/ ───────────────────────────────
  console.log("\n⚛️  Build du frontend React...");
  execSync(
    "NODE_ENV=production BASE_PATH=/ PORT=3000 pnpm --filter @workspace/good-deal run build",
    { stdio: "inherit", cwd: rootDir }
  );
  await cp(
    path.resolve(rootDir, "artifacts/good-deal/dist/public"),
    path.resolve(distDir, "public"),
    { recursive: true }
  );
  console.log("✅ Frontend → dist/public/");

  // ── 2. Build backend ESM → artifacts/api-server/dist/ ─────────────────────
  console.log("\n🔧 Build du backend Express...");
  execSync(
    "pnpm --filter @workspace/api-server run build",
    { stdio: "inherit", cwd: rootDir }
  );

  // Copy all built files from api-server/dist/ to root dist/
  const apiDist = path.resolve(rootDir, "artifacts/api-server/dist");
  const files = await readdir(apiDist);
  for (const file of files) {
    await cp(path.resolve(apiDist, file), path.resolve(distDir, file), {
      recursive: true,
    });
  }
  console.log("✅ Backend ESM → dist/index.mjs");

  // ── 3. Write CJS wrapper → dist/index.cjs ────────────────────────────────
  await writeFile(path.resolve(distDir, "index.cjs"), CJS_WRAPPER, "utf-8");
  console.log("✅ Wrapper CJS → dist/index.cjs");

  console.log(`
╔══════════════════════════════════════════════╗
║  ✅ Build Plesk terminé                      ║
║                                              ║
║  Entrée Plesk : dist/index.cjs               ║
║  Frontend     : dist/public/                 ║
║                                              ║
║  Variables d'env requises dans Plesk :       ║
║    PORT=3000 (ou votre port)                 ║
║    NODE_ENV=production                       ║
║    DATABASE_URL=...                          ║
║    SESSION_SECRET=...                        ║
║    ASHTECH_API_KEY=ak_...                    ║
║    ASHTECH_WEBHOOK_SECRET=whsec_...          ║
║    BASE_URL=https://votre-domaine-public     ║
╚══════════════════════════════════════════════╝
`);
}

buildPlesk().catch((err) => {
  console.error("❌ Erreur de build :", err);
  process.exit(1);
});

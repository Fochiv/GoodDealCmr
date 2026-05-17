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

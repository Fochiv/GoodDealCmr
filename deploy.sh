#!/bin/bash
set -e

echo "==> Mise à jour du code..."
git pull

echo "==> Installation des dépendances..."
pnpm install --frozen-lockfile

echo "==> Build de production (Plesk)..."
pnpm run build

echo "==> Migration de la base de données..."
pnpm --filter @workspace/db run push

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Déploiement terminé                          ║"
echo "║                                                  ║"
echo "║  Redémarrez l'application dans Plesk :           ║"
echo "║    Entrée : dist/index.cjs                       ║"
echo "║    Cmd    : npm run start                        ║"
echo "║                                                  ║"
echo "║  Variables d'env requises dans Plesk :           ║"
echo "║    PORT            (ex: 3000)                    ║"
echo "║    NODE_ENV        production                    ║"
echo "║    DATABASE_URL    postgres://...                ║"
echo "║    SESSION_SECRET  (clé secrète)                 ║"
echo "╚══════════════════════════════════════════════════╝"

#!/bin/bash
set -e

echo "==> Mise à jour du code..."
git pull

echo "==> Installation des dépendances..."
pnpm install --frozen-lockfile

echo "==> Build de production..."
NODE_ENV=production pnpm run build:prod

echo "==> Migration de la base de données..."
pnpm --filter @workspace/db run push

echo "==> Déploiement terminé ✅"
echo "    Redémarrez le serveur Node.js dans Plesk pour appliquer les changements."

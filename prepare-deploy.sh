#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Script Replit — Build + préparation pour push GitHub → Plesk
#
# Usage (depuis Replit Shell) :
#   chmod +x prepare-deploy.sh   (une seule fois)
#   ./prepare-deploy.sh
#
# Ensuite, dans Plesk :
#   git pull
#   Redémarrer l'application → c'est tout !
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Good Deal — Préparation déploiement         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Build complet (frontend React + backend Express → dist/)
echo "==> Build de production..."
pnpm run build
echo ""

# 2. Afficher ce qui a changé dans dist/
echo "==> Fichiers dist/ modifiés :"
git --no-optional-locks diff --name-only dist/ 2>/dev/null || true
git --no-optional-locks status --short dist/ 2>/dev/null || true
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Build terminé — dist/ est prêt                       ║"
echo "║                                                          ║"
echo "║  Prochaines étapes :                                     ║"
echo "║    git add -A                                            ║"
echo "║    git commit -m \"build: mise à jour production\"         ║"
echo "║    git push                                              ║"
echo "║                                                          ║"
echo "║  Puis dans Plesk :                                       ║"
echo "║    1. git pull                                           ║"
echo "║    2. Redémarrer l'application                           ║"
echo "║       (Entrée : dist/index.cjs | Cmd : npm start)        ║"
echo "║                                                          ║"
echo "║  Si le schéma DB a changé, exécuter aussi :              ║"
echo "║    ./deploy.sh  (avant de redémarrer)                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

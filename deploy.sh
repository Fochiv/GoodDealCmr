#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Script Plesk — à exécuter UNIQUEMENT quand le schéma DB a changé.
#
# Workflow normal (sans changement de schéma) :
#   1. git pull
#   2. Redémarrer l'application dans Plesk → c'est tout !
#
# Workflow avec changement de schéma :
#   1. git pull
#   2. ./deploy.sh       ← applique les migrations
#   3. Redémarrer l'application dans Plesk
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Good Deal — Migration base de données       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "==> Installation des dépendances (si nécessaire)..."
pnpm install --frozen-lockfile

echo "==> Migration du schéma..."
pnpm --filter @workspace/db run push

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Migration terminée                       ║"
echo "║                                              ║"
echo "║  Redémarrez maintenant l'application         ║"
echo "║  dans le panneau Plesk.                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

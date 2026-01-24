#!/bin/bash
# Yevedia AI Chat Launcher
# Double-cliquez sur ce fichier pour lancer l'application

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Se déplacer vers le dossier de l'application
cd "$(dirname "$0")"

clear
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                   ║${NC}"
echo -e "${PURPLE}║   🚀 ${BLUE}Yevedia AI Chat${PURPLE}                              ║${NC}"
echo -e "${PURPLE}║                                                   ║${NC}"
echo -e "${PURPLE}║   Démarrage de l'application...                   ║${NC}"
echo -e "${PURPLE}║                                                   ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${NC}❌ Node.js n'est pas installé. Veuillez l'installer d'abord.${NC}"
    echo "   Téléchargez-le sur: https://nodejs.org/"
    read -p "Appuyez sur Entrée pour fermer..."
    exit 1
fi

# Vérifier si le serveur tourne déjà sur le port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Le serveur est déjà en cours d'exécution${NC}"
else
    echo -e "${BLUE}→ Démarrage du serveur...${NC}"
fi

# Ouvrir Safari après un court délai
(sleep 2 && open -a Safari "http://localhost:8080") &

# Lancer le serveur Node.js
echo -e "${GREEN}✓ Serveur démarré sur http://localhost:8080${NC}"
echo ""
echo -e "${BLUE}ℹ️  Gardez cette fenêtre ouverte pour maintenir le serveur actif${NC}"
echo -e "${BLUE}   Appuyez sur Ctrl+C pour arrêter le serveur${NC}"
echo ""

node server.js

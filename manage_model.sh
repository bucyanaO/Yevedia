#!/bin/bash

# Configuration
SCRIPT_NAME="image_generator.py"

function show_help {
    echo "Usage: ./manage_model.sh [command]"
    echo ""
    echo "Commandes:"
    echo "  status   - Voir si le modèle est en cours d'exécution"
    echo "  stop     - Arrêter (tuer) le processus de génération"
    echo "  help     - Afficher cette aide"
}

function check_status {
    PID=$(ps aux | grep "$SCRIPT_NAME" | grep -v grep | awk '{print $2}')
    if [ -n "$PID" ]; then
        echo "🟢 Le modèle tourne (PID: $PID)"
        ps aux | grep "$SCRIPT_NAME" | grep -v grep
    else
        echo "⚪️ Aucun processus de génération actif (Le modèle se décharge automatiquement après chaque image)"
    fi
}

function stop_model {
    PID=$(ps aux | grep "$SCRIPT_NAME" | grep -v grep | awk '{print $2}')
    if [ -n "$PID" ]; then
        echo "🔴 Arrêt du processus $PID..."
        kill -9 $PID
        echo "✅ Processus tué."
    else
        echo "⚪️ Rien à arrêter."
    fi
}

case "$1" in
    status)
        check_status
        ;;
    stop)
        stop_model
        ;;
    *)
        show_help
        ;;
esac

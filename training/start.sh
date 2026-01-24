#!/bin/bash
# ===========================================
# Yevedia Fine-Tuning Launcher
# Script de démarrage simplifié pour Mac
# ===========================================

echo "🧠 Yevedia Fine-Tuning System"
echo "============================="
echo ""

# Se déplacer dans le bon dossier
cd "$(dirname "$0")"

# Activer l'environnement virtuel
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install mlx mlx-lm transformers huggingface_hub numpy
else
    source venv/bin/activate
fi

echo "✅ Environnement activé"
echo ""

# Menu
echo "Que voulez-vous faire ?"
echo ""
echo "  1) Exporter les données d'entraînement"
echo "  2) Lancer le fine-tuning complet"
echo "  3) Tester le modèle fine-tuné"
echo "  4) Voir les données exportées"
echo "  5) Quitter"
echo ""

read -p "Choix (1-5): " choice

case $choice in
    1)
        echo ""
        echo "📤 Export des données..."
        python scripts/export_data.py
        ;;
    2)
        echo ""
        echo "🚀 Lancement du fine-tuning..."
        echo "⚠️  Cela peut prendre 15-30 minutes"
        python scripts/finetune.py
        ;;
    3)
        echo ""
        echo "🧪 Test du modèle..."
        if [ -d "models/adapters/yevedia-lora" ]; then
            read -p "Entrez votre question: " question
            python -m mlx_lm.generate \
                --model microsoft/Phi-3-mini-4k-instruct \
                --adapter-path models/adapters/yevedia-lora \
                --max-tokens 150 \
                --prompt "$question"
        else
            echo "❌ Modèle non trouvé. Lancez d'abord le fine-tuning."
        fi
        ;;
    4)
        echo ""
        echo "📊 Données exportées:"
        echo ""
        if [ -f "data/train.jsonl" ]; then
            echo "--- Train (5 premiers exemples) ---"
            head -5 data/train.jsonl | python -m json.tool 2>/dev/null || head -5 data/train.jsonl
        else
            echo "Aucune donnée exportée. Lancez l'export d'abord."
        fi
        ;;
    5)
        echo "Au revoir!"
        exit 0
        ;;
    *)
        echo "Choix invalide"
        ;;
esac

echo ""
echo "✅ Terminé!"

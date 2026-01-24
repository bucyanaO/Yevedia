#!/bin/bash
# Script pour ouvrir le terminal MLX Yevedia

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "🧠 Activation de l'environnement MLX pour Yevedia..."
echo ""

source training/venv/bin/activate

echo "✅ Environnement virtuel activé!"
echo ""
echo "📦 Packages disponibles:"
pip show mlx mlx-lm 2>/dev/null | grep -E "^(Name|Version):"
echo ""
echo "🚀 Commandes disponibles:"
echo "   python training/scripts/finetune.py"
echo "   python training/scripts/export_data.py"  
echo "   python training/scripts/create_ollama_model.py"
echo ""

exec $SHELL

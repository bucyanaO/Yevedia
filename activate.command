#!/bin/bash
# Yevedia MLX Training Environment Activator
# Double-cliquez sur ce fichier pour ouvrir un terminal avec le venv activé

cd "$(dirname "$0")"

echo "🧠 Activation de l'environnement MLX pour Yevedia..."
echo ""

source training/venv/bin/activate

echo "✅ Environnement virtuel activé!"
echo ""
echo "📦 Packages disponibles:"
pip show mlx mlx-lm 2>/dev/null | grep -E "^(Name|Version):" | paste - - | while read line; do
    echo "   $line"
done
echo ""
echo "🚀 Vous pouvez maintenant exécuter vos scripts de training:"
echo "   python training/scripts/finetune.py"
echo "   python training/scripts/export_data.py"
echo ""

# Garder le terminal ouvert avec le venv actif
exec $SHELL

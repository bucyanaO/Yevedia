#!/usr/bin/env python3
"""
Yevedia MLX Fine-Tuning Script
Fine-tune Phi-3 avec LoRA sur Apple Silicon
"""

import subprocess
import sys
import os
from pathlib import Path

# Chemins
SCRIPT_DIR = Path(__file__).parent
TRAINING_DIR = SCRIPT_DIR.parent  # training/
DATA_DIR = TRAINING_DIR / "data"  # training/data
MODELS_DIR = TRAINING_DIR / "models"  # training/models
ADAPTERS_DIR = MODELS_DIR / "adapters"

# Configuration du fine-tuning
CONFIG = {
    # Modèle de base TinyLlama (petit et rapide ~500MB)
    "base_model": "mlx-community/TinyLlama-1.1B-Chat-v1.0-4bit",
    
    # Paramètres LoRA
    "lora_rank": 8,           # Rang de la décomposition LoRA (4-16)
    "lora_alpha": 16,         # Facteur d'échelle
    "lora_dropout": 0.05,     # Dropout pour régularisation
    
    # Paramètres d'entraînement
    "batch_size": 4,          # Taille du batch (ajuster selon RAM)
    "learning_rate": 1e-5,    # Taux d'apprentissage
    "epochs": 3,              # Nombre d'époques
    "max_seq_length": 512,    # Longueur max des séquences
    
    # Sauvegarde
    "save_every": 100,        # Sauvegarder tous les N steps
    "adapter_path": str(ADAPTERS_DIR / "yevedia-lora"),
}

def check_dependencies():
    """Vérifier et installer les dépendances"""
    print("🔍 Vérification des dépendances...")
    
    required = ['mlx', 'mlx_lm', 'transformers', 'huggingface_hub']
    missing = []
    
    for pkg in required:
        try:
            __import__(pkg.replace('-', '_'))
        except ImportError:
            missing.append(pkg)
    
    if missing:
        print(f"📦 Installation des dépendances manquantes: {missing}")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "mlx", "mlx-lm", "transformers", "huggingface_hub", "numpy"
        ])
        print("✅ Dépendances installées!")
    else:
        print("✅ Toutes les dépendances sont installées")

def check_data():
    """Vérifier que les données d'entraînement existent"""
    train_file = DATA_DIR / "train.jsonl"
    valid_file = DATA_DIR / "valid.jsonl"
    
    if not train_file.exists() or not valid_file.exists():
        print("⚠️  Données d'entraînement non trouvées!")
        print("   Exécution de l'export des données...")
        
        export_script = SCRIPT_DIR / "export_data.py"
        subprocess.check_call([sys.executable, str(export_script)])
    
    # Compter les exemples
    with open(train_file, 'r') as f:
        train_count = sum(1 for _ in f)
    with open(valid_file, 'r') as f:
        valid_count = sum(1 for _ in f)
    
    print(f"📊 Données disponibles:")
    print(f"   - Train: {train_count} exemples")
    print(f"   - Validation: {valid_count} exemples")
    
    return train_count, valid_count

def run_finetuning():
    """Lancer le fine-tuning avec MLX"""
    print("\n🚀 Démarrage du fine-tuning MLX...")
    print("=" * 60)
    
    # Créer le dossier des adaptateurs
    ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Commande MLX pour le fine-tuning LoRA (mlx-lm >= 0.30 nouvelle syntaxe)
    cmd = [
        sys.executable, "-m", "mlx_lm", "lora",
        "--model", CONFIG["base_model"],
        "--train",
        "--data", str(DATA_DIR),
        "--adapter-path", CONFIG["adapter_path"],
        "--batch-size", str(CONFIG["batch_size"]),
        "--num-layers", "16",
        "--iters", str(CONFIG["epochs"] * 100),
        "--learning-rate", str(CONFIG["learning_rate"]),
        "--save-every", str(CONFIG["save_every"]),
    ]
    
    print(f"📝 Commande: {' '.join(cmd)}")
    print("\n" + "=" * 60)
    
    try:
        # Exécuter le fine-tuning
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Afficher la sortie en temps réel
        for line in process.stdout:
            print(line, end='')
        
        process.wait()
        
        if process.returncode == 0:
            print("\n" + "=" * 60)
            print("✅ Fine-tuning terminé avec succès!")
            print(f"   Adaptateur sauvegardé: {CONFIG['adapter_path']}")
            return True
        else:
            print(f"\n❌ Erreur lors du fine-tuning (code: {process.returncode})")
            return False
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        return False

def test_model():
    """Tester le modèle fine-tuné"""
    print("\n🧪 Test du modèle fine-tuné...")
    
    test_prompts = [
        "Qui es-tu ?",
        "Qui est Obed ?",
        "Que peux-tu faire ?",
    ]
    
    cmd_base = [
        sys.executable, "-m", "mlx_lm.generate",
        "--model", CONFIG["base_model"],
        "--adapter-path", CONFIG["adapter_path"],
        "--max-tokens", "100",
    ]
    
    for prompt in test_prompts:
        print(f"\n📝 Prompt: {prompt}")
        cmd = cmd_base + ["--prompt", prompt]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            print(f"🤖 Réponse: {result.stdout}")
        except Exception as e:
            print(f"❌ Erreur: {e}")

def export_to_gguf():
    """Convertir le modèle en format GGUF pour Ollama"""
    print("\n📦 Conversion en GGUF pour Ollama...")
    
    output_path = MODELS_DIR / "yevedia-phi3.gguf"
    
    # La conversion GGUF nécessite llama.cpp
    print("⚠️  Pour utiliser avec Ollama, suivez ces étapes:")
    print("")
    print("1. Fusionner les adaptateurs LoRA avec le modèle de base:")
    print(f"   python -m mlx_lm.fuse \\")
    print(f"       --model {CONFIG['base_model']} \\")
    print(f"       --adapter-path {CONFIG['adapter_path']} \\")
    print(f"       --save-path {MODELS_DIR}/yevedia-phi3-merged")
    print("")
    print("2. Convertir en GGUF avec llama.cpp:")
    print(f"   python llama.cpp/convert-hf-to-gguf.py \\")
    print(f"       {MODELS_DIR}/yevedia-phi3-merged \\")
    print(f"       --outtype q4_0 \\")
    print(f"       --outfile {output_path}")
    print("")
    print("3. Créer un Modelfile Ollama:")
    print(f"   FROM {output_path}")
    print("")
    print("4. Importer dans Ollama:")
    print(f"   ollama create yevedia -f Modelfile")

def main(auto_mode=False):
    print("=" * 60)
    print("🧠 Yevedia MLX Fine-Tuning System")
    print("   Fine-tune Phi-3 pour ton assistant personnel")
    print("=" * 60)
    print()
    
    # Étape 1: Dépendances
    check_dependencies()
    
    # Étape 2: Données
    train_count, valid_count = check_data()
    
    if train_count < 5:
        print("\n⚠️  Pas assez de données d'entraînement!")
        print("   Ajoutez plus de conversations et mémoires dans Yevedia.")
        print("   Minimum recommandé: 50+ exemples")
        
        if not auto_mode:
            response = input("\nContinuer quand même? (o/n): ")
            if response.lower() != 'o':
                print("Annulé.")
                return False
        else:
            print("\n[AUTO] Continuation avec les données disponibles...")
    
    # Étape 3: Fine-tuning
    print("\n" + "=" * 60)
    print("⏳ Le fine-tuning va commencer...")
    print("   Cela peut prendre 10-30 minutes selon votre Mac.")
    print("=" * 60)
    
    if not auto_mode:
        response = input("\nDémarrer le fine-tuning? (o/n): ")
        if response.lower() != 'o':
            print("Annulé.")
            return False
    else:
        print("\n[AUTO] Démarrage automatique...")
    
    success = run_finetuning()
    
    if success:
        if not auto_mode:
            response = input("\nTester le modèle fine-tuné? (o/n): ")
            if response.lower() == 'o':
                test_model()
        
        # Étape 5: Export
        export_to_gguf()
    
    print("\n" + "=" * 60)
    print("✅ Processus terminé!" if success else "❌ Entraînement échoué!")
    print("=" * 60)
    
    return success

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Yevedia MLX Fine-Tuning')
    parser.add_argument('--auto', action='store_true', help='Mode automatique sans confirmation')
    args = parser.parse_args()
    
    success = main(auto_mode=args.auto)
    sys.exit(0 if success else 1)


# Yevedia Fine-Tuning System
# ===========================
# Système d'entraînement MLX pour personnaliser Phi-3

## 🎯 Vue d'ensemble

Ce système permet de fine-tuner le modèle Phi-3 avec vos propres données
pour créer un assistant IA personnalisé appelé Yevedia.

## 📁 Structure

```
training/
├── data/                  # Données d'entraînement
│   ├── train.jsonl        # Exemples d'entraînement
│   ├── valid.jsonl        # Exemples de validation
│   └── test.jsonl         # Exemples de test
├── models/                # Modèles entraînés
│   └── adapters/          # Adaptateurs LoRA
├── scripts/               # Scripts Python
│   ├── export_data.py     # Export des données depuis SQLite
│   ├── finetune.py        # Script principal de fine-tuning
│   └── create_ollama_model.py  # Création modèle Ollama
└── README.md              # Ce fichier
```

## 🚀 Utilisation rapide

### Étape 1: Exporter les données

```bash
cd /Users/emci/Documents/App/Yevedia/training/scripts
python export_data.py
```

Cela va:
- Exporter vos conversations depuis la base de données
- Exporter vos mémoires et documents
- Créer les fichiers train.jsonl, valid.jsonl, test.jsonl

### Étape 2: Lancer le fine-tuning

```bash
python finetune.py
```

Cela va:
- Vérifier les dépendances (MLX, transformers, etc.)
- Télécharger Phi-3 si nécessaire
- Lancer l'entraînement LoRA
- Sauvegarder les adaptateurs

### Étape 3: Utiliser le modèle

Après le fine-tuning, vous pouvez tester le modèle:

```bash
python -m mlx_lm.generate \
    --model microsoft/Phi-3-mini-4k-instruct \
    --adapter-path ./models/adapters/yevedia-lora \
    --prompt "Qui es-tu ?"
```

## ⚙️ Configuration

Modifiez les paramètres dans `finetune.py`:

| Paramètre | Description | Valeur par défaut |
|-----------|-------------|-------------------|
| `lora_rank` | Rang LoRA (plus = plus précis mais plus lent) | 8 |
| `batch_size` | Taille du batch (réduire si manque de RAM) | 4 |
| `epochs` | Nombre d'époques | 3 |
| `learning_rate` | Taux d'apprentissage | 1e-5 |

## 📊 Format des données

Les données doivent être au format JSONL (une ligne JSON par exemple):

```json
{"instruction": "Question de l'utilisateur", "input": "", "output": "Réponse souhaitée"}
```

Exemple:
```json
{"instruction": "Qui es-tu ?", "input": "", "output": "Je suis Yevedia, ton assistant IA personnel."}
{"instruction": "Quel temps fait-il ?", "input": "", "output": "Je n'ai pas accès aux données météo en temps réel, mais je peux t'aider avec d'autres questions."}
```

## 🔧 Dépannage

### "Not enough memory"
Réduisez `batch_size` à 2 ou 1 dans `finetune.py`.

### "Model not found"
Le modèle sera téléchargé automatiquement depuis Hugging Face.
Assurez-vous d'avoir une connexion internet.

### "No training data"
Exécutez d'abord `export_data.py` ou ajoutez manuellement
des fichiers dans le dossier `data/`.

## 💡 Conseils

1. **Plus de données = meilleur résultat**
   - Minimum recommandé: 50 exemples
   - Idéal: 200+ exemples

2. **Qualité > Quantité**
   - Des exemples bien rédigés sont plus importants que beaucoup d'exemples médiocres

3. **Diversité**
   - Incluez différents types de questions/réponses
   - Ajoutez des exemples de conversations normales et techniques

4. **Itérations**
   - Commencez avec peu d'époques (2-3)
   - Augmentez si le modèle ne converge pas bien

## 🖥️ Spécifications Mac recommandées

| RAM | Modèle supporté | Temps estimé |
|-----|-----------------|--------------|
| 16 Go | Phi-3 (3B) | 15-30 min |
| 32 Go | Phi-3 + Mistral 7B | 20-45 min |
| 64 Go | Tous jusqu'à 13B | 30-60 min |
| 96 Go | Tous jusqu'à 70B (QLoRA) | 45-90 min |

Votre Mac de 96 Go peut entraîner pratiquement n'importe quel modèle! 🚀

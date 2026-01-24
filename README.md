# Yevedia — L'IA qui respire

<div align="center">

![Version](https://img.shields.io/badge/version-7.6.0-purple)
![Platform](https://img.shields.io/badge/platform-macOS-blue)
![License](https://img.shields.io/badge/license-Private-red)

**Une plateforme d'IA locale complète avec génération d'images, mémoire persistante et recherche web.**

</div>

---

## ✨ Fonctionnalités

### 🤖 Chat IA
- Interface de chat moderne avec support Markdown
- Modèles Ollama locaux (phi3, mistral, llama, etc.)
- Mémoire à long terme avec base SQLite
- Historique des conversations persistant

### 🎨 Génération d'Images (FLUX)
- **Text-to-Image** : Génère des images à partir de prompts textuels
- **Image-to-Image** : Transforme des images existantes avec FLUX.2-klein
- Sélection de ratio (1:1, 16:9, 9:16)
- Qualité configurable (Rapide / HD)
- Édition directe depuis le chat

### 🎤 Transcription Vocale
- Dictée vocale avec Whisper (local)
- Transcription en temps réel

### 🔍 Recherche Web
- Recherche web intégrée via Serper.dev
- Base de connaissances web persistante

### 🧠 Mémoire & Apprentissage
- Stockage de souvenirs et contexte
- Import de documents pour le RAG
- Fine-tuning personnalisé avec MLX

---

## � Le Modèle yevedia-libre

**yevedia-libre** est le modèle IA par défaut, basé sur **Dolphin-Llama3** (non censuré).

### Caractéristiques
| Propriété | Valeur |
|-----------|--------|
| Base | Dolphin-Llama3 |
| Taille | 4.3 GB |
| Paramètres | ~8B |
| Censure | ❌ Aucune |
| Contexte | 8192 tokens |

### yevedia-libre vs GPT/Gemini

| Aspect | **yevedia-libre** | **GPT-4 / Gemini** |
|--------|-------------------|-------------------|
| **Hébergement** | 🏠 100% local (ton Mac) | ☁️ Serveurs cloud |
| **Confidentialité** | ✅ Données restent chez toi | ⚠️ Envoyées aux serveurs |
| **Coût** | 💚 Gratuit | 💰 Payant (API/abo) |
| **Connexion** | 📴 Fonctionne hors-ligne | 🌐 Internet requis |
| **Taille** | ~8B paramètres | ~175B-1T+ paramètres |
| **Personnalisation** | ✅ Fine-tuning possible | ❌ Impossible |
| **Censure** | ✅ Libre | ⚠️ Modérée |

### Pourquoi choisir yevedia-libre ?
- **Souveraineté** : Tes conversations restent privées
- **Personnalisation** : Fine-tuning avec tes propres données
- **Liberté** : Pas de restrictions de contenu
- **Économique** : Aucun frais récurrent après installation

---

## �🚀 Installation

### Prérequis
- **macOS** avec Apple Silicon (M1/M2/M3)
- **Node.js** 18+
- **Python** 3.10+
- **Ollama** installé et configuré

### Étapes

1. **Cloner le repo**
```bash
git clone https://github.com/bucyanaO/Yevedia.git
cd Yevedia
```

2. **Créer l'environnement Python**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # ou installer manuellement les dépendances
```

3. **Installer les dépendances Node**
```bash
npm install express cors
```

4. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos clés API (SERPER_API_KEY, etc.)
```

5. **Lancer l'application**
```bash
./Yevedia.command
# ou
node server.js
```

6. **Accéder à l'interface**
```
http://localhost:8080
```

---

## 📁 Structure du Projet

```
Yevedia/
├── app.js                 # Logique frontend principale
├── index.html             # Interface HTML
├── styles.css             # Styles CSS (thème sombre)
├── server.js              # Serveur Express.js
├── image_generator.py     # Génération d'images FLUX
├── memory.py              # Gestion mémoire SQLite
├── whisper_transcribe.py  # Transcription vocale
├── webSearch.js           # Module recherche web
├── web_knowledge_db.py    # Base de connaissances web
├── Modelfile              # Configuration modèle Ollama
├── training/              # Scripts de fine-tuning
│   ├── scripts/
│   │   ├── export_data.py
│   │   ├── finetune.py
│   │   └── create_ollama_model.py
│   └── start.sh
└── generated_images/      # Images générées (gitignore)
```

---

## 🎨 Génération d'Images

### Mode Text-to-Image
1. Cliquer sur l'icône 📷 pour activer le mode image
2. Sélectionner le ratio et la qualité dans le popup
3. Écrire le prompt de génération
4. Envoyer

### Mode Image-to-Image
1. Cliquer sur 📎 pour importer une image
2. Sélectionner le ratio souhaité dans le popup
3. Écrire le prompt de transformation
4. Envoyer

### Éditer une Image Générée
1. Cliquer sur l'icône ✏️ sur une image dans le chat
2. L'image est chargée dans la prévisualisation
3. Écrire le prompt de modification
4. Envoyer

---

## ⚙️ Configuration

### Variables d'environnement (.env)
```env
SERPER_API_KEY=votre_clé_serper
OLLAMA_HOST=http://localhost:11434
PORT=8080
```

### Modèle Ollama
Le modèle par défaut est `yevedia-libre`. Pour le créer :
```bash
ollama create yevedia-libre -f Modelfile
```

---

## 🧪 Fine-Tuning

1. **Exporter les données de conversation**
```bash
cd training
python scripts/export_data.py
```

2. **Lancer le fine-tuning**
```bash
./start.sh
```

3. **Créer le modèle Ollama**
```bash
python scripts/create_ollama_model.py
```

---

## 📝 Changelog

### v7.6.0 (2026-01-24)
- ✨ Popup modal pour sélection ratio/qualité
- ✨ Click-to-edit sur les images générées
- 🔧 Correction du bug popup (variable toolbar)
- 🎨 Style monochrome (emojis retirés)
- 🔧 Auto-fermeture du popup

### v7.5.47
- Interface "Interactive Image Toolbar"
- Mode Image dédié (text2img)

### v7.5.45
- Génération img2img inline
- Preview d'image avec suppression

---

## 🤝 Contribution

Ce projet est privé. Contactez le propriétaire pour toute contribution.

---

## 📄 Licence

Propriétaire - Tous droits réservés © 2026

# Yevedia - Documentation Technique v10.5

> **L'IA qui respire** — Une expérience conversationnelle nouvelle génération

## 📋 Vue d'ensemble

Yevedia est une plateforme IA locale complète combinant chat, génération multimédia et éditeur nodal visuel.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (app.js)                        │
│  • 7,941 lignes | 317 fonctions                                 │
│  • Interface "Spatial Canvas" avec animations                   │
│  • Éditeur nodal Drawflow                                       │
│  • Gestion d'état centralisée                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (server.js)                       │
│  • 3,034 lignes | 83 handlers                                   │
│  • Port 8080 (principal)                                        │
│  • Proxy pour APIs externes                                     │
│  • Gestion MLX servers                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  MLX Chat     │   │  MLX Vision   │   │  MLX TTS      │
│  Port 8081    │   │  Port 8082    │   │  Port 8083    │
│  Qwen3-32B    │   │  Qwen2.5-VL   │   │  Qwen3-TTS    │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 🎯 Fonctionnalités Actuelles

### 1. Chat IA Local
- **Modèles**: Ollama (11434) + MLX (8081)
- **Modes**: Standard, Réflexion (Qwen3), Libre (proactif)
- **Mémoire**: Contexte persistant, documents, instructions

### 2. Génération d'Images
| Provider | Modèles | Type |
|----------|---------|------|
| **FLUX MLX** | flux-4bit | Local |
| **Pollinations** | Flux, Seedream 4.5 Pro | Cloud |
| **NanoBanana** | nanobanana, nanobanana-pro | Cloud |

### 3. Génération de Vidéos
| Provider | Modèles | Durée |
|----------|---------|-------|
| **LTX** | ltx-2-fast, ltx-2-pro | 5-10s |
| **Pollinations** | Seedance, Seedance Pro, Wan 2.6, Veo 3.1 | 5-8s |

### 4. Voice Chat 🆕
- **STT**: Web Speech API / Whisper local
- **TTS**: Qwen3-TTS (port 8083)
- **Mode vocal**: AI parle automatiquement les réponses

### 5. Vision
- **Modèle**: Qwen2.5-VL-7B (MLX)
- **Analyses**: Description, OCR, identification

### 6. Éditeur Nodal
- Nodes: Input, LLM, Vision, Image Gen, Video Gen, TTS, Output
- Exécution en chaîne avec prévisualisations

---

## 🔧 Configuration

### Variables d'environnement (.env)
```env
POLLINATIONS_API_KEY=xxx      # Pour Pollinations.ai
LTXV_API_KEY=xxx              # Pour LTX Video
SERPER_API_KEY=xxx            # Pour recherche web (optionnel)
```

### Ports utilisés
| Port | Service | Script |
|------|---------|--------|
| 8080 | Backend principal | server.js |
| 8081 | MLX Chat | mlx_server.py |
| 8082 | MLX Vision | vision_server.py |
| 8083 | MLX TTS | tts_server.py |
| 11434 | Ollama | ollama serve |

---

## 📁 Structure des Fichiers

```
Yevedia/
├── index.html          # UI principale (1199 lignes)
├── app.js              # Logique frontend (7941 lignes)
├── styles.css          # Styles (76KB)
├── server.js           # Backend Node.js (3034 lignes)
├── mlx_server.py       # Serveur LLM MLX
├── vision_server.py    # Serveur Vision MLX
├── tts_server.py       # Serveur TTS MLX
├── tts_generator.py    # Générateur TTS CLI
├── image_generator.py  # Générateur FLUX
├── whisper_transcribe.py # STT Whisper
├── memory.py           # Gestionnaire mémoire
├── memory.db           # SQLite mémoire
├── webSearch.js        # Recherche web
├── training/           # Fine-tuning
└── generated_*/        # Médias générés
```

---

## 🚀 Améliorations Suggérées

### 🔴 Priorité Haute

#### 1. **Refactoring app.js** (7941 lignes)
**Problème**: Fichier monolithique difficile à maintenir
**Solution**:
```
app/
├── core/           # Config, state, utils
├── ui/             # Composants UI
├── chat/           # Logique chat
├── nodes/          # Éditeur nodal
├── media/          # Image/Video/Audio
└── index.js        # Point d'entrée
```

#### 2. **Error Boundaries**
**Problème**: Erreurs silencieuses dans les promises
**Solution**: Ajouter try/catch systématiques et UI de récupération

#### 3. **Streaming TTS**
**Problème**: TTS attend la fin du texte
**Solution**: Streaming par phrases pour réponse plus naturelle

### 🟡 Priorité Moyenne

#### 4. **Cache de Modèles**
Garder les modèles MLX chargés en mémoire entre requêtes

#### 5. **Queue de Génération**
File d'attente pour éviter les conflits de génération simultanée

#### 6. **Historique des Générations**
Interface galerie avec métadonnées (prompt, paramètres, date)

#### 7. **Export/Import Workflows**
Sauvegarder et partager les graphs de nodes

### 🟢 Priorité Basse

#### 8. **Tests Unitaires**
Ajouter Jest pour tester les fonctions critiques

#### 9. **TypeScript Migration**
Typage pour meilleure maintenabilité

#### 10. **PWA Support**
Service worker pour usage offline

---

## 📊 Métriques du Code

| Fichier | Lignes | Fonctions | Complexité |
|---------|--------|-----------|------------|
| app.js | 7,941 | 317 | 🔴 Haute |
| server.js | 3,034 | 83 | 🟡 Moyenne |
| styles.css | 2,100+ | - | 🟡 Moyenne |
| index.html | 1,199 | - | 🟢 Basse |

### Dépendances Externes
- **Drawflow** - Éditeur nodal
- **Lucide Icons** - Icônes SVG
- **Google Fonts** - Space Grotesk, JetBrains Mono

---

## 🛠️ Commandes de Développement

```bash
# Démarrer l'application
npm start
# ou
node server.js

# Démarrer avec auto-restart
npm run dev

# Activer tous les services MLX
./activate.command

# Git backup
git add -A && git commit -m "backup" && git push
```

---

## 🔐 Sécurité

### Points d'attention
1. **API Keys** dans `.env` (non versionné)
2. **Pas d'authentification** - usage local uniquement
3. **CORS ouvert** - intentionnel pour dev local
4. **Exécution de commandes** - attention aux injections

### Recommandations Production
- Ajouter authentification
- HTTPS obligatoire
- Rate limiting
- Validation stricte des inputs

---

## 📝 Changelog Récent

### v10.5 (2026-01-31)
- ✅ Voice Chat avec Qwen3-TTS
- ✅ TTS dans panneau paramètres MLX
- ✅ Fix génération vidéo (input unique)
- ✅ Fix LTX-2 Fast résolution 720p
- ✅ Ajout Seedream 4.5 Pro

### v10.4
- Éditeur nodal avec nodes multimédia
- Node Sortie universel

### v10.3
- Intégration MLX Chat et Vision
- Mémoire persistante SQLite

---

## 🤝 Contribution

1. Fork le repo
2. Créer une branche feature
3. Commit avec messages descriptifs
4. Push et créer PR

**GitHub**: https://github.com/bucyanaO/Yevedia

# 🚀 Guide: Rendre Yevedia Plus Puissant

## Vue d'ensemble

Ce guide couvre deux aspects majeurs:
1. **Fine-tuning** - Entraîner votre modèle avec vos propres données
2. **Recherche Web** - Permettre à l'IA de chercher sur internet

---

## 📚 1. Fine-Tuning (Entraînement du Modèle)

### Qu'est-ce que le Fine-Tuning?
Le fine-tuning permet d'adapter un modèle de base (comme Phi-3 ou Llama 3.1) à vos besoins spécifiques en l'entraînant sur vos propres données.

### Prérequis
- Mac avec Apple Silicon (M1/M2/M3)
- 16 Go RAM minimum (96 Go = parfait!)
- Environnement MLX installé

### Étape 1: Préparer les données

Les données doivent être au format JSONL:
```json
{"instruction": "Question", "input": "", "output": "Réponse souhaitée"}
```

**Sources de données:**
- Vos conversations passées
- Vos documents uploadés
- Vos mémoires sauvegardées
- Des exemples personnalisés

### Étape 2: Exporter les données

```bash
cd /Users/emci/Documents/App/Yevedia/training/scripts
python3 export_data.py
```

### Étape 3: Ajouter plus de données manuellement

Éditez le fichier `training/data/train.jsonl`:
```json
{"instruction": "Comment tu t'appelles?", "input": "", "output": "Je suis Yevedia, créé par Obed."}
{"instruction": "Parle-moi de [sujet]", "input": "", "output": "Voici ce que je sais sur [sujet]..."}
```

**Conseils:**
- Minimum 50 exemples recommandés
- Idéal: 200+ exemples
- Variez les types de questions
- Qualité > Quantité

### Étape 4: Lancer le fine-tuning

```bash
# Activer l'environnement
source /Users/emci/Documents/App/Yevedia/training/venv/bin/activate

# Lancer l'entraînement
python3 finetune.py
```

### Étape 5: Créer un modèle Ollama

Après le fine-tuning:
```bash
python3 create_ollama_model.py
```

Cela créera un nouveau modèle "yevedia" dans Ollama.

---

## 🌐 2. Recherche Web

### Fonctionnement
La recherche web permet à Yevedia de chercher des informations actuelles sur internet AVANT de répondre à votre question.

### Déclencheurs automatiques
La recherche s'active quand vous posez des questions contenant:
- "cherche", "recherche", "trouve"
- "actualités", "nouvelles"
- "aujourd'hui", "cette semaine"
- "2024", "2025", "2026"
- "météo", "prix de"

### Exemples de questions qui déclenchent la recherche:
- "Cherche les dernières news sur l'IA"
- "Quelles sont les actualités aujourd'hui?"
- "Qui est le président actuel de [pays]?"

### Providers de recherche disponibles

| Provider | Type | Qualité | Config |
|----------|------|---------|--------|
| DuckDuckGo | Gratuit | Basique | Activé par défaut |
| Serper.dev | Payant | Excellente | Nécessite API key |
| Tavily | Payant | Optimisée LLM | Nécessite API key |

### Configurer Serper (recommandé)

1. Créez un compte sur https://serper.dev (2,500 requêtes gratuites)
2. Copiez votre API key
3. Créez un fichier `.env`:
```bash
echo "SERPER_API_KEY=votre_clé_ici" > /Users/emci/Documents/App/Yevedia/.env
```
4. Modifiez `webSearch.js`:
```javascript
serper: {
    enabled: true,  // Changer à true
    apiKey: process.env.SERPER_API_KEY || 'votre_clé',
```

### Configurer Tavily (meilleur pour LLM)

1. Créez un compte sur https://tavily.com
2. Obtenez une API key gratuite
3. Configurez comme Serper

---

## 🔧 3. Utilisation dans l'interface

### Recherche Web
La recherche est **automatique**. Posez simplement votre question et si elle nécessite des infos récentes, Yevedia cherchera.

### Désactiver la recherche
Dans la console du navigateur:
```javascript
toggleWebSearch(); // Toggle on/off
```

### Ajouter des instructions
1. Ouvrez la modal "Mémoire Sensible"
2. Onglet "Instructions"
3. Ajoutez vos instructions personnalisées

---

## 📊 4. Améliorer continuellement

### Collecter plus de données
1. Utilisez Yevedia normalement
2. Exportez régulièrement vos conversations
3. Relancez le fine-tuning périodiquement

### Ajouter des documents
Uploadez des PDFs, textes, ou fichiers pour enrichir la base de connaissances.

### Script de collecte automatique

J'ai créé un pipeline qui:
1. Exporte toutes vos conversations
2. Les formate en exemples d'entraînement
3. Les ajoute au dataset

---

## 🎯 5. Modèles recommandés

| Modèle | RAM requise | Utilisation |
|--------|-------------|-------------|
| Phi-3 (3B) | 8 Go | Réponses rapides |
| Llama 3.1 (8B) | 16 Go | Équilibré |
| Mistral (7B) | 16 Go | Raisonnement |
| Llama 3.1 (70B) | 64 Go+ | Maximum qualité |

Avec vos 96 Go de RAM, vous pouvez entraîner n'importe quel modèle!

---

## 🚀 Commandes rapides

```bash
# Exporter les données
cd /Users/emci/Documents/App/Yevedia/training/scripts && python3 export_data.py

# Fine-tuning
python3 finetune.py

# Créer modèle Ollama
python3 create_ollama_model.py

# Tester le modèle
ollama run yevedia

# Démarrer le serveur
cd /Users/emci/Documents/App/Yevedia && node server.js
```

---

## ❓ FAQ

**Q: Le fine-tuning prend combien de temps?**
R: Avec 96 Go RAM et ~100 exemples: 15-30 minutes.

**Q: La recherche web est-elle gratuite?**
R: DuckDuckGo est gratuit mais limité. Serper offre 2,500 requêtes gratuites.

**Q: Comment améliorer les réponses?**
R: Plus de données de qualité + instructions claires + documents pertinents.

**Q: Puis-je utiliser GPT-4 pour générer des données?**
R: Oui! C'est une excellente façon de créer des exemples de qualité.

# 🔊 Guide Qwen3-TTS

## Modèles Disponibles

| Modèle | Taille | Usage | Fonction |
|--------|--------|-------|----------|
| **CustomVoice** (0.6B/1.7B) | ~2Go/~5Go | Voix prédéfinies | `generate_custom_voice()` |
| **VoiceDesign** (1.7B) | ~5Go | Créer voix par description | `generate_voice_design()` |
| **Base** (0.6B/1.7B) | ~2Go/~5Go | Cloner voix existante | `generate_voice_clone()` |

---

## 3 Modes d'Utilisation

### 1. CustomVoice - Voix Prédéfinies (Installé ✅)
```python
wavs, sr = model.generate_custom_voice(
    text="Bonjour!",
    language="French",   # Auto, French, English, Chinese, etc.
    speaker="Chelsie",   # Chelsie, Ethan, Vivian, Ryan
    instruct="Joyeux"    # Optionnel: émotion/style
)
```
**Speakers:** Chelsie (EN), Ethan (EN), Vivian (ZH), Ryan (ZH)

### 2. VoiceDesign - Créer Voix par Description
```python
wavs, sr = model.generate_voice_design(
    text="Bonjour!",
    language="French",
    instruct="Voix féminine douce, 25 ans, ton chaleureux"
)
```
**Usage:** Créer personnage unique via description textuelle

### 3. VoiceClone - Cloner Voix Existante
```python
wavs, sr = model.generate_voice_clone(
    text="Nouveau texte à dire",
    language="French",
    ref_audio="voix_reference.wav",  # Audio de référence
    ref_text="Transcription de l'audio de référence"
)
```
**Usage:** Reproduire voix depuis échantillon audio

---

## Langues Supportées (10)

| Langue | Code |
|--------|------|
| Français | `French` |
| Anglais | `English` |
| Chinois | `Chinese` |
| Japonais | `Japanese` |
| Coréen | `Korean` |
| Allemand | `German` |
| Espagnol | `Spanish` |
| Italien | `Italian` |
| Portugais | `Portuguese` |
| Russe | `Russian` |

---

## Workflow Recommandé pour Films

1. **VoiceDesign** → Créer voix du personnage par description
2. **Sauvegarder** le sample audio généré
3. **VoiceClone** → Réutiliser cette voix pour tous les dialogues

```python
# Créer personnage
ref_wav, sr = design_model.generate_voice_design(
    text="Phrase exemple", 
    instruct="Fillette de 8 ans, voix aiguë, enjouée"
)
sf.write("personnage.wav", ref_wav[0], sr)

# Réutiliser pour chaque dialogue
clone_prompt = clone_model.create_voice_clone_prompt(
    ref_audio="personnage.wav",
    ref_text="Phrase exemple"
)
for dialogue in dialogues:
    wav, sr = clone_model.generate_voice_clone(
        text=dialogue,
        voice_clone_prompt=clone_prompt
    )
```

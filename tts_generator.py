#!/usr/bin/env python3
"""
Qwen3-TTS Text-to-Speech Generator for Yevedia
Supports multiple languages and voice cloning
"""

import sys
import os
import json
import argparse
import warnings
warnings.filterwarnings("ignore")

def main():
    parser = argparse.ArgumentParser(description='Generate speech with Qwen3-TTS')
    parser.add_argument('text', help='Text to synthesize')
    parser.add_argument('--output', '-o', default='output_tts.wav', help='Output file path')
    parser.add_argument('--language', '-l', default='Auto', help='Language: Chinese, English, French, German, Spanish, Italian, Japanese, Korean, Russian, Portuguese, Auto')
    parser.add_argument('--speaker', '-s', default='Chelsie', help='Speaker: Chelsie, Ethan, Vivian, Ryan, etc.')
    parser.add_argument('--instruct', '-i', default='', help='Emotion/style instruction')
    parser.add_argument('--model', '-m', default='0.6B', choices=['0.6B', '1.7B'], help='Model size')
    args = parser.parse_args()

    print(f"🔊 Qwen3-TTS generating speech...")
    print(f"   Text: {args.text[:50]}{'...' if len(args.text) > 50 else ''}")
    print(f"   Language: {args.language}")
    print(f"   Speaker: {args.speaker}")
    
    try:
        import torch
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel

        # Choose model based on size
        model_name = f"Qwen/Qwen3-TTS-12Hz-{args.model}-CustomVoice"
        
        # Use MPS (Metal) on Mac if available, otherwise CPU
        if torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float32  # MPS doesn't fully support bfloat16
            attn = None  # No flash attention on MPS
        else:
            device = "cpu"
            dtype = torch.float32
            attn = None
        
        print(f"   Device: {device}")
        print(f"   Loading model: {model_name}")

        model = Qwen3TTSModel.from_pretrained(
            model_name,
            device_map=device,
            dtype=dtype,
        )

        print("   Generating audio...")
        
        wavs, sr = model.generate_custom_voice(
            text=args.text,
            language=args.language,
            speaker=args.speaker,
            instruct=args.instruct if args.instruct else None,
        )

        sf.write(args.output, wavs[0], sr)
        print(f"✅ Audio saved: {args.output}")
        
        # Return result as JSON for Node.js
        result = {
            "success": True,
            "output": args.output,
            "sample_rate": sr,
            "duration": len(wavs[0]) / sr
        }
        print(json.dumps(result))

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        result = {"success": False, "error": str(e)}
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()

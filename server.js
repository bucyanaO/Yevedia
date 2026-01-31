/**
 * Yevedia AI Chat - Backend Server
 * Contrôle réel d'Ollama via le terminal
 */

// Load environment variables from .env
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const webSearch = require('./webSearch');

const PORT = 8080;
let ollamaProcess = null;

// Types MIME
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Serveur HTTP
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API Endpoints
    if (req.url === '/api/ollama/start' && req.method === 'POST') {
        return handleStartOllama(req, res);
    }

    if (req.url === '/api/ollama/stop' && req.method === 'POST') {
        return handleStopOllama(req, res);
    }

    if (req.url === '/api/ollama/status' && req.method === 'GET') {
        return handleOllamaStatus(req, res);
    }

    if (req.url === '/api/ollama/tags' && req.method === 'GET') {
        return handleOllamaTags(req, res);
    }

    // MLX Server API
    if (req.url === '/api/mlx/start' && req.method === 'POST') {
        return handleStartMLX(req, res);
    }

    if (req.url === '/api/mlx/stop' && req.method === 'POST') {
        return handleStopMLX(req, res);
    }

    if (req.url === '/api/mlx/status' && req.method === 'GET') {
        return handleMLXStatus(req, res);
    }

    if (req.url === '/api/whisper/transcribe' && req.method === 'POST') {
        return handleWhisperTranscribe(req, res);
    }

    // Image Generation API
    if (req.url === '/api/image/generate' && req.method === 'POST') {
        return handleImageGenerate(req, res);
    }

    if (req.url === '/api/image/status' && req.method === 'GET') {
        return handleImageStatus(req, res);
    }

    // Pollinations.ai API (NanoBanana models)
    if (req.url === '/api/pollinations/generate' && req.method === 'POST') {
        return handlePollinationsGenerate(req, res);
    }

    // Pollinations.ai Video API (Seedance/Wan)
    if (req.url === '/api/pollinations/video' && req.method === 'POST') {
        return handlePollinationsVideo(req, res);
    }

    if (req.url === '/api/images' && req.method === 'GET') {
        return handleListImages(req, res);
    }

    // MLX Models API - Auto-detect installed Qwen models
    if (req.url === '/api/mlx/models' && req.method === 'GET') {
        return handleMLXModels(req, res);
    }

    // MLX Model Control API
    if (req.url === '/api/mlx/status' && req.method === 'GET') {
        return handleMLXStatus(req, res);
    }

    if (req.url === '/api/mlx/start' && req.method === 'POST') {
        return handleMLXStart(req, res);
    }

    if (req.url === '/api/mlx/stop' && req.method === 'POST') {
        return handleMLXStop(req, res);
    }

    if (req.url === '/api/image/delete' && req.method === 'POST') {
        return handleDeleteImage(req, res);
    }

    // Vision Analysis API
    if (req.url === '/api/vision/analyze' && req.method === 'POST') {
        return handleVisionAnalyze(req, res);
    }

    if (req.url === '/api/vision/status' && req.method === 'GET') {
        return handleVisionStatus(req, res);
    }

    // LTX Video Generation API
    if (req.url === '/api/video/status' && req.method === 'GET') {
        return handleVideoStatus(req, res);
    }

    if (req.url === '/api/video/generate' && req.method === 'POST') {
        return handleVideoGenerate(req, res);
    }

    if (req.url === '/api/video/animate' && req.method === 'POST') {
        return handleVideoAnimate(req, res);
    }

    if (req.url === '/api/videos' && req.method === 'GET') {
        return handleListVideos(req, res);
    }

    // Film Generator Routes
    if (req.url === '/api/film/scenario' && req.method === 'POST') {
        return handleFilmScenario(req, res);
    }

    if (req.url === '/api/film/generate' && req.method === 'POST') {
        return handleFilmGenerate(req, res);
    }

    if (req.url.startsWith('/api/film/status/') && req.method === 'GET') {
        return handleFilmStatus(req, res);
    }

    if (req.url === '/api/film/render' && req.method === 'POST') {
        return handleFilmRender(req, res);
    }

    if (req.url === '/api/video/delete' && req.method === 'POST') {
        return handleVideoDelete(req, res);
    }

    // TTS Route
    if (req.url === '/api/tts/generate' && req.method === 'POST') {
        return handleTTSGenerate(req, res);
    }

    // TTS Clone Route
    if (req.url === '/api/tts/clone' && req.method === 'POST') {
        return handleTTSClone(req, res);
    }

    // Parse URL to handle query params
    const urlParts = req.url.split('?');
    const urlPath = urlParts[0];

    // Memory API Endpoints
    if (urlPath === '/api/memory' && req.method === 'GET') {
        return handleGetMemories(req, res);
    }

    if (urlPath === '/api/memory' && req.method === 'POST') {
        return handleAddMemory(req, res);
    }

    if (urlPath.startsWith('/api/memory/') && req.method === 'DELETE') {
        const parts = urlPath.split('/');
        const id = parts[parts.length - 1];
        if (id && id !== 'clear' && id !== 'context' && id !== 'stats') {
            return handleDeleteMemory(req, res, id);
        }
    }

    if (urlPath === '/api/memory/clear' && req.method === 'POST') {
        return handleClearMemories(req, res);
    }

    if (urlPath === '/api/memory/context' && req.method === 'GET') {
        return handleGetMemoryContext(req, res);
    }

    if (urlPath === '/api/memory/stats' && req.method === 'GET') {
        return handleGetMemoryStats(req, res);
    }

    // Documents API Endpoints
    if (urlPath === '/api/documents' && req.method === 'GET') {
        return handleGetDocuments(req, res);
    }

    if (urlPath === '/api/documents' && req.method === 'POST') {
        return handleAddDocument(req, res);
    }

    if (urlPath.startsWith('/api/documents/') && req.method === 'DELETE') {
        const parts = urlPath.split('/');
        const id = parts[parts.length - 1];
        if (id) {
            return handleDeleteDocument(req, res, id);
        }
    }

    if (urlPath.match(/^\/api\/documents\/\d+\/toggle$/) && req.method === 'PUT') {
        const parts = urlPath.split('/');
        const id = parts[3];
        return handleToggleDocument(req, res, id);
    }

    // Training API Endpoints
    if (urlPath === '/api/training/stats' && req.method === 'GET') {
        return handleGetTrainingStats(req, res);
    }

    if (urlPath === '/api/training/export' && req.method === 'POST') {
        return handleExportTrainingData(req, res);
    }

    if (urlPath === '/api/training/start' && req.method === 'POST') {
        return handleStartTraining(req, res);
    }

    if (urlPath === '/api/training/terminal' && req.method === 'POST') {
        return handleOpenMLXTerminal(req, res);
    }

    // Code Execution API Endpoint
    if (urlPath === '/api/execute' && req.method === 'POST') {
        return handleExecuteCode(req, res);
    }

    // Web Search API Endpoints
    if (urlPath === '/api/search' && req.method === 'POST') {
        return handleWebSearch(req, res);
    }

    if (urlPath === '/api/chat/smart' && req.method === 'POST') {
        return handleSmartChat(req, res);
    }

    // Web Knowledge API Endpoints (recherches sauvegardées)
    if (urlPath === '/api/web-knowledge' && req.method === 'GET') {
        return handleGetWebKnowledge(req, res);
    }

    if (urlPath === '/api/web-knowledge/stats' && req.method === 'GET') {
        return handleGetWebKnowledgeStats(req, res);
    }

    if (urlPath.startsWith('/api/web-knowledge/') && req.method === 'GET') {
        const filename = urlPath.split('/').pop();
        return handleGetWebKnowledgeDetails(req, res, filename);
    }

    if (urlPath.startsWith('/api/web-knowledge/') && req.method === 'DELETE') {
        const filename = urlPath.split('/').pop();
        return handleDeleteWebKnowledge(req, res, filename);
    }

    // Servir les fichiers statiques
    // Use urlPath (already stripped of query params at line 52-53)
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
        const content = fs.readFileSync(filePath);
        // Add cache-busting headers
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(content);
    } catch (err) {
        res.writeHead(404);
        res.end('File not found');
    }
});

// Démarrer Ollama (macOS avec launchctl)
async function handleStartOllama(req, res) {
    try {
        // Vérifier si Ollama est déjà en cours
        const isRunning = await checkOllamaRunning();
        if (isRunning) {
            sendJSON(res, { success: true, message: 'Ollama est déjà en cours d\'exécution' });
            return;
        }

        console.log('🔄 Démarrage d\'Ollama...');

        // Méthode 1: Essayer de charger via launchctl (méthode préférée sur macOS)
        try {
            await executeCommand('launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist 2>/dev/null || true');
            console.log('   → Service launchctl chargé');
        } catch (e) {
            // Si le plist n'existe pas, on passe à la méthode 2
        }

        // Attendre un peu pour launchctl
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier si ça a marché
        let running = await checkOllamaRunning();

        if (!running) {
            // Méthode 2: Démarrer directement ollama serve
            console.log('   → Démarrage direct avec ollama serve...');
            ollamaProcess = spawn('ollama', ['serve'], {
                detached: true,
                stdio: 'ignore'
            });
            ollamaProcess.unref();

            // Attendre que Ollama démarre
            await new Promise(resolve => setTimeout(resolve, 3000));
            running = await checkOllamaRunning();
        }

        if (running) {
            console.log('✅ Ollama démarré avec succès');
            sendJSON(res, { success: true, message: 'Ollama démarré avec succès' });
        } else {
            console.log('❌ Impossible de démarrer Ollama');
            sendJSON(res, { success: false, message: 'Impossible de démarrer Ollama. Vérifiez qu\'il est installé.' }, 500);
        }
    } catch (error) {
        console.error('Erreur démarrage Ollama:', error);
        sendJSON(res, { success: false, message: error.message }, 500);
    }
}

// Arrêter Ollama (macOS avec launchctl)
async function handleStopOllama(req, res) {
    try {
        console.log('🔄 Arrêt d\'Ollama en cours...');

        // Méthode 1: Utiliser launchctl pour arrêter le service Ollama sur macOS
        // Cela empêche le redémarrage automatique
        try {
            await executeCommand('launchctl unload ~/Library/LaunchAgents/com.ollama.ollama.plist 2>/dev/null || true');
            console.log('   → Service launchctl déchargé');
        } catch (e) {
            // Ignorer si le fichier n'existe pas
        }

        // Méthode 2: Arrêter via la commande ollama stop (si disponible)
        try {
            await executeCommand('ollama stop 2>/dev/null || true');
            console.log('   → Commande ollama stop exécutée');
        } catch (e) {
            // Ignorer
        }

        // Méthode 3: Tuer les processus Ollama directement
        try {
            // D'abord envoyer SIGTERM (arrêt propre)
            await executeCommand('pkill -TERM -f "ollama" 2>/dev/null || true');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Vérifier si toujours en cours
            const stillRunning = await checkOllamaRunning();
            if (stillRunning) {
                // Force kill si nécessaire
                await executeCommand('pkill -9 -f "ollama" 2>/dev/null || true');
                await executeCommand('killall -9 ollama 2>/dev/null || true');
                console.log('   → Processus forcé à s\'arrêter');
            }
        } catch (e) {
            // Ignorer
        }

        // Attendre et vérifier
        await new Promise(resolve => setTimeout(resolve, 1500));

        const isRunning = await checkOllamaRunning();
        if (!isRunning) {
            console.log('⛔ Ollama arrêté avec succès');
            ollamaProcess = null;
            sendJSON(res, { success: true, message: 'Ollama arrêté avec succès' });
        } else {
            console.log('⚠️ Ollama semble toujours actif, tentative de force kill...');
            await executeCommand('killall -9 ollama 2>/dev/null || true');
            await executeCommand('pkill -9 -f "Ollama" 2>/dev/null || true');
            sendJSON(res, { success: true, message: 'Ollama arrêté (forcé)' });
        }
    } catch (error) {
        console.log('⛔ Ollama arrêté (avec erreurs ignorées)');
        sendJSON(res, { success: true, message: 'Ollama arrêté' });
    }
}

// Vérifier le statut d'Ollama
async function handleOllamaStatus(req, res) {
    try {
        const response = await fetch('http://localhost:11434/api/version');
        if (response.ok) {
            const data = await response.json();
            sendJSON(res, { running: true, version: data.version });
        } else {
            sendJSON(res, { running: false });
        }
    } catch (error) {
        sendJSON(res, { running: false });
    }
}

async function handleOllamaTags(req, res) {
    try {
        let models = [];

        // Get Ollama models
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (response.ok) {
                const data = await response.json();
                models = data.models || [];
            }
        } catch (e) {
            // Ollama not running
        }

        // Check for MLX Qwen3 model
        try {
            const mlxResponse = await fetch('http://localhost:8081/health');
            if (mlxResponse.ok) {
                // MLX server is running, add Qwen3 to list
                models.push({
                    name: 'qwen3-32b:mlx',
                    model: 'qwen3-32b:mlx',
                    size: 18400000000,
                    details: {
                        family: 'qwen3',
                        parameter_size: '32B',
                        format: 'mlx'
                    }
                });
            }
        } catch (e) {
            // MLX server not running, check if model exists
            const fs = require('fs');
            const modelPath = require('os').homedir() + '/.cache/huggingface/hub/models--mlx-community--Qwen3-32B-4bit';
            if (fs.existsSync(modelPath)) {
                models.push({
                    name: 'qwen3-32b:mlx (offline)',
                    model: 'qwen3-32b:mlx',
                    size: 18400000000,
                    details: {
                        family: 'qwen3',
                        parameter_size: '32B',
                        format: 'mlx',
                        status: 'offline - start MLX server'
                    }
                });
            }
        }

        sendJSON(res, { success: true, models });
    } catch (error) {
        console.error('Erreur tags:', error);
        sendJSON(res, { success: false, error: 'Erreur récupération modèles' });
    }
}

/**
 * POST /api/whisper/transcribe - Transcription vocale avec Whisper
 * Body: { audio: base64 string }
 */
async function handleWhisperTranscribe(req, res) {
    try {
        const body = await readBody(req);
        const { audio } = body;

        if (!audio) {
            sendJSON(res, { success: false, error: 'Audio requis' }, 400);
            return;
        }

        console.log('🎤 Transcription Whisper en cours...');

        // Save audio to temp file
        const tempPath = path.join(__dirname, 'temp_audio.webm');
        const audioBuffer = Buffer.from(audio, 'base64');
        fs.writeFileSync(tempPath, audioBuffer);

        // Call Python Whisper script
        const pythonScript = `
import sys
sys.path.insert(0, '${__dirname}')

# Activate venv
activate_this = '${path.join(__dirname, 'venv', 'bin', 'activate_this.py')}'
try:
    exec(open(activate_this).read(), {'__file__': activate_this})
except:
    pass

import whisper
import json

try:
    model = whisper.load_model("base")
    result = model.transcribe("${tempPath}", language="fr")
    print(json.dumps({"success": True, "text": result["text"].strip()}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

        exec(`${path.join(__dirname, 'venv', 'bin', 'python3')} -c "${pythonScript.replace(/"/g, '\\"')}"`,
            { cwd: __dirname, timeout: 60000 },
            (error, stdout, stderr) => {
                // Clean up temp file
                try { fs.unlinkSync(tempPath); } catch (e) { }

                if (error && !stdout) {
                    console.error('Erreur Whisper:', stderr || error.message);
                    sendJSON(res, { success: false, error: 'Erreur de transcription' }, 500);
                    return;
                }

                try {
                    const result = JSON.parse(stdout.trim());
                    console.log('✅ Transcription:', result.text?.substring(0, 50) + '...');
                    sendJSON(res, result);
                } catch (e) {
                    console.error('Erreur parsing Whisper:', stdout);
                    sendJSON(res, { success: false, error: 'Erreur de parsing' }, 500);
                }
            }
        );
    } catch (error) {
        console.error('❌ Erreur Whisper:', error.message);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// ============================================
// IMAGE GENERATION API HANDLERS
// ============================================

/**
 * GET /api/vision/status - Check vision server status
 */
async function handleVisionStatus(req, res) {
    try {
        const response = await fetch('http://localhost:8082/health');
        if (response.ok) {
            const data = await response.json();
            sendJSON(res, { success: true, status: 'running', ...data });
        } else {
            sendJSON(res, { success: true, status: 'offline' });
        }
    } catch (e) {
        sendJSON(res, { success: true, status: 'offline' });
    }
}

/**
 * POST /api/vision/analyze - Analyze image with Qwen VL
 */
async function handleVisionAnalyze(req, res) {
    try {
        const body = await readBody(req);
        const { image, prompt } = body;

        if (!image) {
            sendJSON(res, { success: false, error: 'Image required' }, 400);
            return;
        }

        console.log('🔍 Vision analysis requested...');

        // Forward to vision server
        const response = await fetch('http://localhost:8082/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: image,
                prompt: prompt || 'Décris cette image en détail en français.',
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            sendJSON(res, { success: false, error: error.error || 'Vision server error' }, 500);
            return;
        }

        const result = await response.json();
        console.log('✅ Vision analysis complete');
        sendJSON(res, { success: true, analysis: result.analysis });

    } catch (e) {
        console.error('Vision error:', e);
        if (e.cause?.code === 'ECONNREFUSED') {
            sendJSON(res, { success: false, error: 'Vision server not running. Start with: python vision_server.py' }, 503);
        } else {
            sendJSON(res, { success: false, error: e.message }, 500);
        }
    }
}

/**
 * POST /api/image/generate - Générer une image avec FLUX.2-klein-4B
 */
async function handleImageGenerate(req, res) {
    try {
        const body = await readBody(req);
        const { prompt, width = 512, height = 512, steps = 4, reference_image } = body;

        if (!prompt) {
            sendJSON(res, { success: false, error: 'Prompt requis' }, 400);
            return;
        }

        const mode = reference_image ? 'img2img' : 'text2img';
        console.log(`🎨 Génération image (${mode}):`, prompt.substring(0, 50) + '...');

        const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
        const scriptPath = path.join(__dirname, 'image_generator.py');

        // Use spawn with stdin for JSON input (handles reference images)
        const { spawn } = require('child_process');
        const process = spawn(pythonPath, [scriptPath, 'generate_json'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Send JSON data via stdin
        const inputData = JSON.stringify({ prompt, width, height, steps, reference_image });
        process.stdin.write(inputData);
        process.stdin.end();

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => { stdout += data.toString(); });
        process.stderr.on('data', (data) => { stderr += data.toString(); });

        // Set timeout
        const timeout = setTimeout(() => {
            process.kill();
            sendJSON(res, { success: false, error: 'Timeout de génération' }, 500);
        }, 300000);

        process.on('close', (code) => {
            clearTimeout(timeout);
            if (stderr) console.log('📝 FLUX:', stderr);

            try {
                const result = JSON.parse(stdout.trim());
                if (result.success) console.log('✅ Image générée:', result.filename);
                sendJSON(res, result);
            } catch (e) {
                console.error('❌ Erreur parsing:', e.message, stdout);
                sendJSON(res, { success: false, error: 'Erreur de parsing' }, 500);
            }
        });

        process.on('error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Erreur spawn:', error.message);
            sendJSON(res, { success: false, error: error.message }, 500);
        });

    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * POST /api/pollinations/generate - Generate image using Pollinations.ai (NanoBanana)
 * Uses GET https://gen.pollinations.ai/image/{prompt} for text-only
 * Uses POST https://gen.pollinations.ai/v1/chat/completions for image-to-image (per official docs)
 */
async function handlePollinationsGenerate(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { prompt, model = 'flux', width = 1024, height = 1024, seed, enhance = true, image } = JSON.parse(body);

            if (!prompt || prompt.trim().length === 0) {
                return sendJSON(res, { success: false, error: 'Prompt is required' }, 400);
            }

            const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;

            // Add model parameter - nanobanana, nanobanana-pro, seedream-pro are official models
            const modelMap = {
                'nanobanana': 'nanobanana',
                'nanobanana-pro': 'nanobanana-pro',
                'seedream-pro': 'seedream-pro',
                'flux': 'flux'
            };
            const actualModel = modelMap[model] || 'nanobanana';

            console.log(`[Pollinations] Model: ${actualModel}, Prompt: ${prompt.substring(0, 60)}...`);

            // If image is provided, use chat/completions endpoint (per official docs)
            // This endpoint supports OpenAI-compatible image_url format for image-to-image
            if (image && (actualModel === 'nanobanana' || actualModel === 'nanobanana-pro')) {
                console.log(`[Pollinations] Using chat/completions for image-to-image`);

                const chatApiUrl = 'https://gen.pollinations.ai/v1/chat/completions';

                // Build message content with text and image (OpenAI Vision format)
                const messageContent = [
                    { type: 'text', text: `Generate an image: ${prompt}` }
                ];

                // Add reference image
                if (image.startsWith('data:')) {
                    messageContent.push({
                        type: 'image_url',
                        image_url: { url: image }
                    });
                } else {
                    messageContent.push({
                        type: 'image_url',
                        image_url: { url: image }
                    });
                }

                const chatPayload = {
                    model: actualModel,
                    messages: [
                        { role: 'user', content: messageContent }
                    ]
                };

                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                if (pollinationsApiKey) {
                    headers['Authorization'] = `Bearer ${pollinationsApiKey}`;
                }

                console.log(`[Pollinations] Chat request to ${chatApiUrl}`);

                const response = await fetch(chatApiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(chatPayload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[Pollinations] Chat API Error:', response.status, errorText);
                    return sendJSON(res, { success: false, error: `Pollinations error: ${response.status}` }, response.status);
                }

                const chatResponse = await response.json();
                console.log(`[Pollinations] Chat response received`);

                // Extract image from content_blocks or direct image_url
                let imageUrl = null;
                const message = chatResponse.choices?.[0]?.message;

                if (message?.content_blocks) {
                    for (const block of message.content_blocks) {
                        if (block.type === 'image_url' && block.image_url?.url) {
                            imageUrl = block.image_url.url;
                            break;
                        }
                    }
                } else if (message?.content && typeof message.content === 'string') {
                    // Check if content contains an image URL
                    const urlMatch = message.content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i);
                    if (urlMatch) {
                        imageUrl = urlMatch[0];
                    }
                }

                if (!imageUrl) {
                    console.error('[Pollinations] No image found in response:', JSON.stringify(chatResponse).substring(0, 500));
                    return sendJSON(res, { success: false, error: 'No image in response' }, 500);
                }

                // Download the image
                const imgResponse = await fetch(imageUrl);
                if (!imgResponse.ok) {
                    return sendJSON(res, { success: false, error: 'Failed to download generated image' }, 500);
                }

                const imageBuffer = await imgResponse.arrayBuffer();
                const imageData = Buffer.from(imageBuffer).toString('base64');

                // Save image locally
                const filename = `pollinations_${Date.now()}.png`;
                const imagesDir = path.join(__dirname, 'generated_images');
                if (!fs.existsSync(imagesDir)) {
                    fs.mkdirSync(imagesDir, { recursive: true });
                }
                const imagePath = path.join(imagesDir, filename);
                fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));

                console.log(`[Pollinations] Image saved: ${filename} (${Math.round(imageData.length / 1024)}KB)`);

                return sendJSON(res, {
                    success: true,
                    model: actualModel,
                    base64: imageData,
                    path: `/generated_images/${filename}`,
                    filename: filename
                });
            }

            // For text-only generation, use the simple GET endpoint
            const encodedPrompt = encodeURIComponent(prompt);
            let apiUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
            apiUrl += `&model=${actualModel}`;

            if (seed) {
                apiUrl += `&seed=${seed}`;
            }
            if (enhance) {
                apiUrl += `&enhance=true`;
            }

            console.log(`[Pollinations] GET request: ${apiUrl.substring(0, 100)}...`);

            const headers = {
                'Accept': 'image/*'
            };
            if (pollinationsApiKey) {
                headers['Authorization'] = `Bearer ${pollinationsApiKey}`;
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                console.error('[Pollinations] HTTP Error:', response.status);
                return sendJSON(res, { success: false, error: `Pollinations error: ${response.status}` }, response.status);
            }

            // Get image as buffer
            const imageBuffer = await response.arrayBuffer();
            const imageData = Buffer.from(imageBuffer).toString('base64');

            if (!imageData || imageData.length < 100) {
                return sendJSON(res, { success: false, error: 'Empty image received' }, 500);
            }

            // Save image locally
            const filename = `pollinations_${Date.now()}.png`;
            const imagesDir = path.join(__dirname, 'generated_images');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            const imagePath = path.join(imagesDir, filename);
            fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));

            console.log(`[Pollinations] Image saved: ${filename} (${Math.round(imageData.length / 1024)}KB)`);

            sendJSON(res, {
                success: true,
                model: actualModel,
                base64: imageData,
                path: `/generated_images/${filename}`,
                filename: filename
            });

        } catch (error) {
            console.error('[Pollinations] Error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * POST /api/pollinations/video - Generate video using Pollinations.ai (Seedance/Wan)
 * Uses authenticated API with Bearer token
 */
async function handlePollinationsVideo(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { prompt, model = 'seedance', duration = 5 } = JSON.parse(body);

            if (!prompt || prompt.trim().length === 0) {
                return sendJSON(res, { success: false, error: 'Prompt is required' }, 400);
            }

            const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
            if (!pollinationsApiKey) {
                return sendJSON(res, { success: false, error: 'POLLINATIONS_API_KEY not configured' }, 500);
            }

            console.log(`[Pollinations Video] Model: ${model}, Duration: ${duration}s, Prompt: ${(prompt || '').substring(0, 60)}...`);

            // Video models are accessed via /image/ endpoint with model param
            // Valid video models: seedance, seedance-pro, wan, veo
            const validVideoModels = ['seedance', 'seedance-pro', 'wan', 'veo'];
            const videoModel = validVideoModels.includes(model) ? model : 'seedance';

            const encodedPrompt = encodeURIComponent(prompt);
            const videoUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${videoModel}&duration=${duration}`;

            console.log(`[Pollinations Video] Request: ${videoUrl.substring(0, 120)}...`);

            const response = await fetch(videoUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'video/mp4,*/*',
                    'Authorization': `Bearer ${pollinationsApiKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error(`[Pollinations Video] Error ${response.status}:`, errorText.substring(0, 200));
                return sendJSON(res, { success: false, error: `Pollinations error: ${response.status} - ${errorText.substring(0, 100)}` }, response.status);
            }

            // Get video as buffer
            const videoBuffer = await response.arrayBuffer();
            const videoData = Buffer.from(videoBuffer);

            if (!videoData || videoData.length < 1000) {
                console.error('[Pollinations Video] Empty or too small video received');
                return sendJSON(res, { success: false, error: 'Empty video received' }, 500);
            }

            // Save video locally
            const filename = `pollinations_${model}_${Date.now()}.mp4`;
            const videosDir = path.join(__dirname, 'generated_videos');
            if (!fs.existsSync(videosDir)) {
                fs.mkdirSync(videosDir, { recursive: true });
            }
            const videoPath = path.join(videosDir, filename);
            fs.writeFileSync(videoPath, videoData);

            console.log(`[Pollinations Video] Video saved: ${filename} (${Math.round(videoData.length / 1024)}KB)`);

            sendJSON(res, {
                success: true,
                model: model,
                duration: duration,
                path: `/generated_videos/${filename}`,
                filename: filename,
                size: videoData.length
            });

        } catch (error) {
            console.error('[Pollinations Video] Error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}


/**
 * GET /api/image/status - Vérifier le statut du générateur
 */
async function handleImageStatus(req, res) {
    try {
        const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
        const scriptPath = path.join(__dirname, 'image_generator.py');

        exec(`"${pythonPath}" "${scriptPath}" status`, { cwd: __dirname, timeout: 10000 },
            (error, stdout) => {
                try {
                    const result = JSON.parse(stdout.trim());
                    sendJSON(res, result);
                } catch (e) {
                    sendJSON(res, { available: false, error: 'Erreur de parsing' });
                }
            }
        );
    } catch (error) {
        sendJSON(res, { available: false, error: error.message });
    }
}

/**
 * GET /api/images - Lister les images générées
 */
async function handleListImages(req, res) {
    try {
        const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
        const scriptPath = path.join(__dirname, 'image_generator.py');

        exec(`"${pythonPath}" "${scriptPath}" list`, { cwd: __dirname, timeout: 10000 },
            (error, stdout) => {
                try {
                    const result = JSON.parse(stdout.trim());
                    sendJSON(res, result);
                } catch (e) {
                    sendJSON(res, { success: false, images: [] });
                }
            }
        );
    } catch (error) {
        sendJSON(res, { success: false, images: [], error: error.message });
    }
}

/**
 * GET /api/mlx/models - Scan installed MLX/Qwen models from HuggingFace cache
 */
async function handleMLXModels(req, res) {
    try {
        const homeDir = process.env.HOME || '/Users/' + process.env.USER;
        const hubPath = path.join(homeDir, '.cache', 'huggingface', 'hub');

        if (!fs.existsSync(hubPath)) {
            return sendJSON(res, { success: true, models: [] });
        }

        const dirs = fs.readdirSync(hubPath);
        const mlxModels = [];

        // Model configurations with sizes
        const modelConfigs = {
            'Qwen3-32B': { size: 17.1, type: 'chat', icon: '🧠' },
            'Qwen2.5-VL-7B': { size: 5.65, type: 'vision', icon: '👁️' },
            'Qwen2.5-VL-3B': { size: 2.5, type: 'vision', icon: '👁️' },
            'Qwen2-VL-2B': { size: 1.5, type: 'vision', icon: '👁️' },
            'DeepSeek-R1-Distill-Qwen-7B': { size: 4.5, type: 'reasoning', icon: '🔬' },
            'DeepSeek-R1-Distill-Qwen-32B': { size: 18, type: 'reasoning', icon: '🔬' }
        };

        for (const dir of dirs) {
            if (dir.startsWith('models--mlx-community--')) {
                const modelName = dir.replace('models--mlx-community--', '');

                // Normalize for matching: remove -4bit, hyphens, lowercase
                const normalizedName = modelName.toLowerCase().replace(/-4bit/g, '').replace(/-/g, '');

                // Find matching config
                let config = null;
                let displayName = modelName;
                for (const [key, conf] of Object.entries(modelConfigs)) {
                    const normalizedKey = key.toLowerCase().replace(/-/g, '');
                    if (normalizedName.includes(normalizedKey)) {
                        config = conf;
                        displayName = key;
                        break;
                    }
                }
                // Only add chat and reasoning models (exclude vision models - they're for image analysis)
                if (config && (config.type === 'chat' || config.type === 'reasoning')) {
                    mlxModels.push({
                        name: modelName.toLowerCase() + ':mlx',
                        displayName: displayName,
                        fullPath: 'mlx-community/' + modelName,
                        size: config.size * 1024 * 1024 * 1024,
                        sizeGB: config.size,
                        type: config.type,
                        icon: config.icon,
                        backend: 'mlx'
                    });
                }
            }
        }

        sendJSON(res, { success: true, models: mlxModels });
    } catch (error) {
        console.error('Error scanning MLX models:', error);
        sendJSON(res, { success: false, models: [], error: error.message });
    }
}

// Track running MLX processes
const mlxProcesses = {};

/**
 * GET /api/mlx/status - Check which MLX servers are running
 */
async function handleMLXStatus(req, res) {
    const status = {
        chat: { online: false, model: null, port: 8081 },
        vision: { online: false, model: null, port: 8082 },
        tts: { online: false, model: null, port: 8083 }
    };

    try {
        // Check chat server (8081)
        const chatRes = await fetch('http://localhost:8081/health', { signal: AbortSignal.timeout(2000) });
        if (chatRes.ok) {
            const data = await chatRes.json();
            status.chat.online = true;
            status.chat.model = data.model || 'unknown';
        }
    } catch (e) { /* offline */ }

    try {
        // Check vision server (8082)
        const visionRes = await fetch('http://localhost:8082/health', { signal: AbortSignal.timeout(2000) });
        if (visionRes.ok) {
            const data = await visionRes.json();
            status.vision.online = true;
            status.vision.model = data.model || 'unknown';
        }
    } catch (e) { /* offline */ }

    try {
        // Check TTS server (8083)
        const ttsRes = await fetch('http://localhost:8083/health', { signal: AbortSignal.timeout(2000) });
        if (ttsRes.ok) {
            const data = await ttsRes.json();
            status.tts.online = true;
            status.tts.model = data.model || 'qwen3-tts';
        }
    } catch (e) { /* offline */ }

    sendJSON(res, { success: true, status });
}

/**
 * POST /api/mlx/start - Start an MLX model server
 */
async function handleMLXStart(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { model, type = 'chat' } = JSON.parse(body);

            // Port and script mapping for each type
            const portMap = { chat: 8081, vision: 8082, tts: 8083 };
            const scriptMap = { chat: 'mlx_server.py', vision: 'vision_server.py', tts: 'tts_server.py' };
            const port = portMap[type] || 8081;
            const scriptPath = scriptMap[type] || 'mlx_server.py';

            // Check if already running
            try {
                const healthRes = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
                if (healthRes.ok) {
                    return sendJSON(res, { success: true, message: 'Already running' });
                }
            } catch (e) { /* not running, continue */ }

            // Start the server
            const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
            const script = path.join(__dirname, scriptPath);

            const child = spawn(pythonPath, [script], {
                cwd: __dirname,
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, MLX_MODEL: model }
            });

            child.unref();
            mlxProcesses[type] = child.pid;

            // Wait a bit for startup
            await new Promise(r => setTimeout(r, 3000));

            sendJSON(res, { success: true, pid: child.pid, message: 'Starting...' });
        } catch (error) {
            console.error('Error starting MLX:', error);
            sendJSON(res, { success: false, error: error.message });
        }
    });
}

/**
 * POST /api/mlx/stop - Stop an MLX model server
 */
async function handleMLXStop(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { type = 'chat' } = JSON.parse(body);
            const portMap = { chat: 8081, vision: 8082, tts: 8083 };
            const port = portMap[type] || 8081;

            // Kill by port
            exec(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, (error) => {
                if (mlxProcesses[type]) {
                    delete mlxProcesses[type];
                }
                sendJSON(res, { success: true, message: `Stopped server on port ${port}` });
            });
        } catch (error) {
            sendJSON(res, { success: false, error: error.message });
        }
    });
}

/**
 * POST /api/image/delete - Supprimer une image
 */
async function handleDeleteImage(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { filename } = JSON.parse(body);
            if (!filename) {
                return sendJSON(res, { success: false, error: 'Nom fichier manquant' }, 400);
            }

            // Sanitize filename to prevent directory traversal
            const safeName = path.basename(filename);
            const imagesDir = path.join(__dirname, 'generated_images');
            const imagePath = path.join(imagesDir, safeName);
            const metaPath = path.join(imagesDir, safeName.replace('.png', '.json'));

            // Check image exists
            if (!fs.existsSync(imagePath)) {
                return sendJSON(res, { success: false, error: 'Image non trouvée' }, 404);
            }

            // Delete image and metadata
            fs.unlinkSync(imagePath);
            if (fs.existsSync(metaPath)) {
                fs.unlinkSync(metaPath);
            }

            sendJSON(res, { success: true, message: 'Image supprimée' });
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

// Vérifier si Ollama tourne
function checkOllamaRunning() {
    return new Promise((resolve) => {
        http.get('http://localhost:11434/api/tags', (response) => {
            resolve(response.statusCode === 200);
        }).on('error', () => {
            resolve(false);
        });
    });
}

// Exécuter une commande shell
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error && error.code !== 1) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

// Envoyer une réponse JSON
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}
// ============================================
// MEMORY API HANDLERS (SQLite via Python)
// ============================================

// Lire le body d'une requête POST
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// Exécuter un script Python pour la mémoire
function executePythonMemory(command, args = []) {
    return new Promise((resolve, reject) => {
        const pythonScript = `
import sys
sys.path.insert(0, '${__dirname}')
import memory
import json

# Initialiser la DB
memory.init_database()

# Exécuter la commande
result = ${command}
print(json.dumps(result))
`;
        exec(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error && !stdout) {
                reject(new Error(stderr || error.message));
            } else {
                try {
                    resolve(JSON.parse(stdout.trim()));
                } catch (e) {
                    resolve({ raw: stdout.trim() });
                }
            }
        });
    });
}

// GET /api/memory - Récupérer tous les souvenirs
async function handleGetMemories(req, res) {
    try {
        const memories = await executePythonMemory('memory.get_all_memories()');
        sendJSON(res, { success: true, memories });
    } catch (error) {
        console.error('Erreur get memories:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// POST /api/memory - Ajouter un souvenir
async function handleAddMemory(req, res) {
    try {
        const body = await readBody(req);
        const { title, content, category, priority } = body;

        if (!title || !content) {
            sendJSON(res, { success: false, error: 'Titre et contenu requis' }, 400);
            return;
        }

        // Encoder en Base64 pour éviter tous les problèmes d'échappement
        const titleB64 = Buffer.from(title).toString('base64');
        const contentB64 = Buffer.from(content).toString('base64');

        const result = await executePythonMemory(
            `memory.add_memory_base64('${titleB64}', '${contentB64}', '${category || 'knowledge'}', ${priority || 1})`
        );

        console.log('✅ Souvenir ajouté:', title);
        sendJSON(res, { success: true, memory: result });
    } catch (error) {
        console.error('Erreur add memory:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// DELETE /api/memory/:id - Supprimer un souvenir
async function handleDeleteMemory(req, res, id) {
    try {
        const result = await executePythonMemory(`memory.delete_memory(${id})`);
        console.log('🗑️ Souvenir supprimé:', id);
        sendJSON(res, { success: true, result });
    } catch (error) {
        console.error('Erreur delete memory:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// POST /api/memory/clear - Effacer toute la mémoire
async function handleClearMemories(req, res) {
    try {
        const result = await executePythonMemory('memory.clear_all_memories()');
        console.log('🧹 Mémoire effacée');
        sendJSON(res, { success: true, result });
    } catch (error) {
        console.error('Erreur clear memories:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// GET /api/memory/context - Récupérer le contexte formaté
async function handleGetMemoryContext(req, res) {
    try {
        const context = await executePythonMemory('memory.build_memory_context()');
        sendJSON(res, { success: true, context });
    } catch (error) {
        console.error('Erreur get context:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// GET /api/memory/stats - Statistiques de la mémoire
async function handleGetMemoryStats(req, res) {
    try {
        const stats = await executePythonMemory('memory.get_memory_stats()');
        sendJSON(res, { success: true, stats });
    } catch (error) {
        console.error('Erreur get stats:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// ============================================
// GESTION DES DOCUMENTS
// ============================================

// GET /api/documents - Récupérer tous les documents
async function handleGetDocuments(req, res) {
    try {
        const documents = await executePythonMemory('memory.get_all_documents()');
        sendJSON(res, { success: true, documents });
    } catch (error) {
        console.error('Erreur get documents:', error);
        sendJSON(res, { success: true, documents: [] });
    }
}

// POST /api/documents - Ajouter un document
async function handleAddDocument(req, res) {
    try {
        const body = await readBody(req);
        const { name, content, type, size } = body;

        // Encoder le contenu en Base64 pour éviter les problèmes d'échappement shell
        const base64Content = Buffer.from(content).toString('base64');
        const safeName = name.replace(/['"\\]/g, '');

        const result = await executePythonMemory(
            `memory.add_document_base64('${safeName}', '${base64Content}', '${type}', ${size})`
        );
        console.log('📄 Document ajouté:', name);
        sendJSON(res, { success: true, result });
    } catch (error) {
        console.error('Erreur add document:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// DELETE /api/documents/:id - Supprimer un document
async function handleDeleteDocument(req, res, id) {
    try {
        const result = await executePythonMemory(`memory.delete_document(${id})`);
        console.log('🗑️ Document supprimé:', id);
        sendJSON(res, { success: true, result });
    } catch (error) {
        console.error('Erreur delete document:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// PUT /api/documents/:id/toggle - Activer/Désactiver un document
async function handleToggleDocument(req, res, id) {
    try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const data = JSON.parse(body);
            const isActive = data.is_active ? 1 : 0;

            const result = await executePythonMemory(`memory.toggle_document(${id}, ${isActive})`);
            console.log('🔄 Document toggle:', id, '->', isActive ? 'actif' : 'inactif');
            sendJSON(res, { success: true, result });
        });
    } catch (error) {
        console.error('Erreur toggle document:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// ============================================
// TRAINING API HANDLERS
// ============================================

// GET /api/training/stats - Récupérer les statistiques d'entraînement
async function handleGetTrainingStats(req, res) {
    try {
        const memories = await executePythonMemory('memory.get_all_memories()');
        const documents = await executePythonMemory('memory.get_all_documents()');

        const memoryList = Array.isArray(memories) ? memories : [];
        const documentList = Array.isArray(documents) ? documents : [];

        // Compter les exemples exportés
        let examples = 0;
        const trainFile = path.join(__dirname, 'training', 'data', 'train.jsonl');
        if (fs.existsSync(trainFile)) {
            const content = fs.readFileSync(trainFile, 'utf-8');
            examples = content.split('\n').filter(line => line.trim()).length;
        }

        sendJSON(res, {
            success: true,
            examples,
            memories: memoryList.length,
            documents: documentList.length
        });
    } catch (error) {
        console.error('Erreur get training stats:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// POST /api/training/export - Exporter les données d'entraînement
async function handleExportTrainingData(req, res) {
    try {
        const scriptPath = path.join(__dirname, 'training', 'scripts', 'export_data.py');

        if (!fs.existsSync(scriptPath)) {
            sendJSON(res, { success: false, error: 'Script d\'export non trouvé' }, 404);
            return;
        }

        // Exécuter le script d'export Python
        const venvPython = path.join(__dirname, 'training', 'venv', 'bin', 'python3');
        const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

        exec(`${pythonCmd} "${scriptPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error('Erreur export:', stderr);
                sendJSON(res, { success: false, error: stderr || error.message }, 500);
                return;
            }

            // Compter les exemples exportés
            const trainFile = path.join(__dirname, 'training', 'data', 'train.jsonl');
            let trainCount = 0;
            if (fs.existsSync(trainFile)) {
                const content = fs.readFileSync(trainFile, 'utf-8');
                trainCount = content.split('\n').filter(line => line.trim()).length;
            }

            console.log('📤 Données exportées:', trainCount, 'exemples');
            sendJSON(res, { success: true, trainCount, output: stdout });
        });
    } catch (error) {
        console.error('Erreur export training data:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// POST /api/training/start - Lancer l'entraînement
async function handleStartTraining(req, res) {
    try {
        const scriptPath = path.join(__dirname, 'training', 'scripts', 'finetune.py');

        if (!fs.existsSync(scriptPath)) {
            sendJSON(res, { success: false, error: 'Script de fine-tuning non trouvé' }, 404);
            return;
        }

        // Vérifier que les données existent
        const trainFile = path.join(__dirname, 'training', 'data', 'train.jsonl');
        if (!fs.existsSync(trainFile)) {
            sendJSON(res, { success: false, error: 'Exportez d\'abord les données d\'entraînement' }, 400);
            return;
        }

        // Lancer l'entraînement en arrière-plan
        const venvPython = path.join(__dirname, 'training', 'venv', 'bin', 'python3');
        const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

        console.log('🧠 Démarrage de l\'entraînement...');

        // Exécuter en arrière-plan (non-bloquant) avec mode auto
        const trainProcess = spawn(pythonCmd, [scriptPath, '--auto'], {
            cwd: __dirname,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        trainProcess.stdout.on('data', (data) => {
            console.log('[Training]', data.toString());
        });

        trainProcess.stderr.on('data', (data) => {
            console.error('[Training Error]', data.toString());
        });

        trainProcess.unref();

        sendJSON(res, {
            success: true,
            message: 'Entraînement lancé en arrière-plan',
            pid: trainProcess.pid
        });
    } catch (error) {
        console.error('Erreur start training:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// POST /api/training/terminal - Ouvrir un terminal avec l'environnement MLX
async function handleOpenMLXTerminal(req, res) {
    try {
        const venvPath = path.join(__dirname, 'training', 'venv');

        if (!fs.existsSync(venvPath)) {
            sendJSON(res, { success: false, error: 'Environnement virtuel non trouvé. Exécutez d\'abord: python3 -m venv training/venv && source training/venv/bin/activate && pip install mlx mlx-lm' }, 404);
            return;
        }

        // Utiliser le script .command préexistant
        const scriptPath = path.join(__dirname, 'training', 'open_terminal.command');

        if (!fs.existsSync(scriptPath)) {
            sendJSON(res, { success: false, error: 'Script terminal non trouve' }, 404);
            return;
        }

        exec(`open "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Erreur ouverture terminal:', error);
                sendJSON(res, { success: false, error: 'Impossible d ouvrir le terminal' }, 500);
                return;
            }

            console.log('Terminal MLX ouvert');
            sendJSON(res, { success: true, message: 'Terminal MLX ouvert' });
        });
    } catch (error) {
        console.error('Erreur open MLX terminal:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// ============================================
// CODE EXECUTION API
// ============================================

/**
 * Execute code in various languages (Python, JavaScript, Shell)
 * POST /api/execute
 * Body: { code: string, language: 'python' | 'javascript' | 'shell' }
 */
async function handleExecuteCode(req, res) {
    try {
        const body = await readBody(req);
        const { code, language } = body;

        if (!code) {
            sendJSON(res, { success: false, error: 'Code requis' }, 400);
            return;
        }

        const lang = (language || 'python').toLowerCase();
        const timeout = 30000; // 30 seconds max
        let command;
        let tempFile;

        switch (lang) {
            case 'python':
            case 'py':
                // Créer un fichier temporaire pour le code Python
                tempFile = path.join(__dirname, '.temp_code.py');
                fs.writeFileSync(tempFile, code);
                command = `python3 "${tempFile}"`;
                break;

            case 'javascript':
            case 'js':
            case 'node':
                // Créer un fichier temporaire pour le code JavaScript
                tempFile = path.join(__dirname, '.temp_code.js');
                fs.writeFileSync(tempFile, code);
                command = `node "${tempFile}"`;
                break;

            case 'shell':
            case 'bash':
            case 'sh':
                // Créer un fichier temporaire pour le script shell
                tempFile = path.join(__dirname, '.temp_code.sh');
                fs.writeFileSync(tempFile, code);
                fs.chmodSync(tempFile, '755');
                command = `bash "${tempFile}"`;
                break;

            default:
                sendJSON(res, { success: false, error: `Langage non supporté: ${lang}. Utilisez python, javascript, ou shell.` }, 400);
                return;
        }

        console.log(`🖥️ Exécution de code ${lang}...`);

        // Exécuter avec timeout
        const execPromise = new Promise((resolve, reject) => {
            const process = exec(command, {
                cwd: __dirname,
                timeout,
                maxBuffer: 1024 * 1024 // 1MB max output
            }, (error, stdout, stderr) => {
                // Nettoyer le fichier temporaire
                if (tempFile && fs.existsSync(tempFile)) {
                    try { fs.unlinkSync(tempFile); } catch (e) { }
                }

                if (error) {
                    if (error.killed) {
                        reject(new Error('Timeout: Le code a pris trop de temps (> 30s)'));
                    } else {
                        reject(new Error(stderr || error.message));
                    }
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        const result = await execPromise;

        console.log(`✅ Code exécuté avec succès`);
        sendJSON(res, {
            success: true,
            output: result.stdout,
            stderr: result.stderr,
            language: lang
        });

    } catch (error) {
        console.error('❌ Erreur exécution code:', error.message);
        sendJSON(res, {
            success: false,
            error: error.message
        }, 500);
    }
}

// ============================================
// WEB SEARCH API HANDLERS
// ============================================

/**
 * POST /api/search - Effectuer une recherche web (avec cache)
 * Body: { query: string, maxCacheAge?: number }
 */
async function handleWebSearch(req, res) {
    try {
        const body = await readBody(req);
        const { query, maxCacheAge = 24 } = body;

        if (!query) {
            sendJSON(res, { success: false, error: 'Query requise' }, 400);
            return;
        }

        console.log('🔍 Recherche web:', query);

        // 1. Vérifier d'abord le cache
        try {
            const cachedResult = await executePythonMemory(
                `memory.get_cached_search('${query.replace(/'/g, "\\'")}', ${maxCacheAge})`
            );

            if (cachedResult && cachedResult.cached) {
                console.log(`📦 Résultat trouvé en cache (${cachedResult.hit_count} hits)`);
                sendJSON(res, {
                    success: true,
                    results: cachedResult.results,
                    source: cachedResult.source,
                    cached: true,
                    cachedAt: cachedResult.cached_at,
                    hitCount: cachedResult.hit_count
                });
                return;
            }
        } catch (cacheError) {
            console.log('⚠️ Erreur cache (ignorée):', cacheError.message);
            // Continuer avec la recherche normale si le cache échoue
        }

        // 2. Vérifier dans la base de connaissances permanente
        try {
            const savedResult = await executePythonWebKnowledge(
                `web_knowledge_db.get_saved_search('${query.replace(/'/g, "\\'")}')`
            );

            if (savedResult && savedResult.cached) {
                console.log(`📚 Résultat trouvé dans la base de connaissances (${savedResult.access_count} accès)`);
                sendJSON(res, {
                    success: true,
                    results: savedResult.results,
                    source: savedResult.source,
                    fromKnowledge: true,
                    savedAt: savedResult.saved_at,
                    accessCount: savedResult.access_count,
                    filename: savedResult.filename
                });
                return;
            }
        } catch (knowledgeError) {
            console.log('⚠️ Erreur base de connaissances (ignorée):', knowledgeError.message);
        }

        // 3. Pas trouvé, effectuer la recherche
        const results = await webSearch.webSearch(query);

        // 4. Sauvegarder dans le cache temporaire
        try {
            const resultsForCache = JSON.stringify(results.results).replace(/'/g, "\\'");
            await executePythonMemory(
                `memory.cache_search_results('${query.replace(/'/g, "\\'")}', ${resultsForCache}, '${results.source}')`
            );
            console.log(`💾 Résultats mis en cache`);
        } catch (cacheError) {
            console.log('⚠️ Erreur sauvegarde cache:', cacheError.message);
        }

        // 5. Sauvegarder dans la base de connaissances permanente
        try {
            const resultsForKnowledge = JSON.stringify(results.results).replace(/'/g, "\\'").replace(/"/g, '\\"');
            await executePythonWebKnowledge(
                `web_knowledge_db.save_web_search("${query.replace(/"/g, '\\"')}", ${JSON.stringify(results.results)}, "${results.source}")`
            );
            console.log(`📚 Résultats sauvegardés dans la base de connaissances`);
        } catch (knowledgeError) {
            console.log('⚠️ Erreur sauvegarde base de connaissances:', knowledgeError.message);
        }

        console.log(`✅ ${results.results.length} résultats trouvés (${results.source})`);
        sendJSON(res, { ...results, cached: false, fromKnowledge: false });
    } catch (error) {
        console.error('❌ Erreur recherche web:', error.message);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * Helper pour exécuter le module web_knowledge_db
 */
function executePythonWebKnowledge(command) {
    return new Promise((resolve, reject) => {
        const pythonScript = `
import sys
sys.path.insert(0, '${__dirname}')
import web_knowledge_db
import json

result = ${command}
print(json.dumps(result) if result else 'null')
`;
        exec(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error && !stdout) {
                reject(new Error(stderr || error.message));
            } else {
                try {
                    const parsed = JSON.parse(stdout.trim());
                    resolve(parsed);
                } catch (e) {
                    resolve(null);
                }
            }
        });
    });
}

/**
 * GET /api/web-knowledge - Lister toutes les recherches sauvegardées
 */
async function handleGetWebKnowledge(req, res) {
    try {
        const searches = await executePythonWebKnowledge('web_knowledge_db.list_all_searches()');
        sendJSON(res, { success: true, searches: searches || [] });
    } catch (error) {
        console.error('Erreur get web knowledge:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * GET /api/web-knowledge/stats - Statistiques de la base de connaissances
 */
async function handleGetWebKnowledgeStats(req, res) {
    try {
        const stats = await executePythonWebKnowledge('web_knowledge_db.get_knowledge_stats()');
        sendJSON(res, { success: true, stats });
    } catch (error) {
        console.error('Erreur get web knowledge stats:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * GET /api/web-knowledge/:filename - Détails d'une recherche
 */
async function handleGetWebKnowledgeDetails(req, res, filename) {
    try {
        const details = await executePythonWebKnowledge(`web_knowledge_db.get_search_details('${filename}')`);
        if (details) {
            sendJSON(res, { success: true, ...details });
        } else {
            sendJSON(res, { success: false, error: 'Recherche non trouvée' }, 404);
        }
    } catch (error) {
        console.error('Erreur get web knowledge details:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * DELETE /api/web-knowledge/:filename - Supprimer une recherche
 */
async function handleDeleteWebKnowledge(req, res, filename) {
    try {
        const result = await executePythonWebKnowledge(`web_knowledge_db.delete_saved_search('${filename}')`);
        sendJSON(res, result);
    } catch (error) {
        console.error('Erreur delete web knowledge:', error);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

/**
 * POST /api/chat/smart - Chat intelligent avec recherche automatique
 * Body: { message: string, autoSearch: boolean }
 * 
 * Cette API détecte automatiquement si une recherche web est nécessaire
 * et retourne le contexte enrichi pour la génération
 */
async function handleSmartChat(req, res) {
    try {
        const body = await readBody(req);
        const { message, autoSearch = true } = body;

        if (!message) {
            sendJSON(res, { success: false, error: 'Message requis' }, 400);
            return;
        }

        let searchContext = null;
        let searchPerformed = false;

        // Vérifier si une recherche est nécessaire
        if (autoSearch && webSearch.shouldSearch(message)) {
            const query = webSearch.extractSearchQuery(message);
            console.log('🔍 Recherche automatique détectée:', query);

            try {
                const results = await webSearch.webSearch(query);
                searchContext = webSearch.formatSearchResultsForPrompt(results);
                searchPerformed = true;
                console.log(`✅ Contexte web ajouté (${results.results.length} résultats)`);
            } catch (searchError) {
                console.log('⚠️ Recherche échouée, continuation sans contexte web');
            }
        }

        sendJSON(res, {
            success: true,
            message,
            searchPerformed,
            searchContext,
            shouldEnrichPrompt: searchPerformed && searchContext
        });
    } catch (error) {
        console.error('❌ Erreur smart chat:', error.message);
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// Nettoyer à la fermeture
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});

// Démarrer le serveur
server.listen(PORT, () => {
    // Initialiser la base de données au démarrage
    exec(`python3 -c "import sys; sys.path.insert(0, '${__dirname}'); import memory; memory.init_database()"`, { cwd: __dirname });

    // ============================================
    // MLX SERVER HANDLERS
    // ============================================

    let mlxProcess = null;

    /**
     * POST /api/mlx/start - Start MLX server for MiniMax
     */
    async function handleStartMLX(req, res) {
        try {
            // Check if already running
            try {
                const check = await fetch('http://localhost:8081/health');
                if (check.ok) {
                    sendJSON(res, { success: true, message: 'MLX server déjà en cours' });
                    return;
                }
            } catch (e) { }

            console.log('🔄 Démarrage du serveur MLX...');

            const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
            const scriptPath = path.join(__dirname, 'mlx_server.py');

            mlxProcess = spawn(pythonPath, [scriptPath], {
                cwd: __dirname,
                detached: true,
                stdio: 'ignore'
            });
            mlxProcess.unref();

            // Wait for server to start
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check if running
            try {
                const check = await fetch('http://localhost:8081/health');
                if (check.ok) {
                    console.log('✅ Serveur MLX démarré (port 8081)');
                    sendJSON(res, { success: true, message: 'MLX server démarré' });
                    return;
                }
            } catch (e) { }

            sendJSON(res, { success: false, error: 'Impossible de démarrer le serveur MLX' }, 500);
        } catch (error) {
            console.error('Erreur démarrage MLX:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    }

    /**
     * POST /api/mlx/stop - Stop MLX server
     */
    async function handleStopMLX(req, res) {
        try {
            console.log('⛔ Arrêt du serveur MLX...');
            await executeCommand('pkill -f "mlx_server.py" 2>/dev/null || true');
            mlxProcess = null;
            sendJSON(res, { success: true, message: 'MLX server arrêté' });
        } catch (error) {
            sendJSON(res, { success: true, message: 'MLX server arrêté' });
        }
    }

    /**
     * GET /api/mlx/status - Check MLX server status
     */
    async function handleMLXStatus(req, res) {
        try {
            const response = await fetch('http://localhost:8081/health');
            if (response.ok) {
                const data = await response.json();
                sendJSON(res, { running: true, model: data.model });
            } else {
                sendJSON(res, { running: false });
            }
        } catch (error) {
            sendJSON(res, { running: false });
        }
    }

    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Yevedia AI Chat Server                       ║
║                                                   ║
║   Serveur:  http://localhost:${PORT}                 ║
║   Status:   En cours d'exécution                  ║
║   Mémoire:  SQLite (memory.db)                    ║
║   Video:    LTX-2 ${process.env.LTXV_API_KEY ? '✅' : '❌'}                         ║
║                                                   ║
║   Appuyez sur Ctrl+C pour arrêter                 ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});

// ============================================
// 🎬 LTX VIDEO API HANDLERS
// ============================================

const LTX_API_BASE = 'https://api.ltx.video/v1';
const VIDEOS_DIR = path.join(__dirname, 'generated_videos');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

/**
 * GET /api/video/status - Check if LTX Video is configured
 */
function handleVideoStatus(req, res) {
    const apiKey = process.env.LTXV_API_KEY;
    sendJSON(res, {
        available: !!apiKey && apiKey.startsWith('ltxv_'),
        configured: !!apiKey,
        models: ['ltx-2-fast', 'ltx-2-pro'],
        resolutions: ['720p', '1080p', '1440p', '4k'],
        durations: [6, 8, 10]
    });
}

/**
 * POST /api/video/generate - Text-to-video generation
 */
async function handleVideoGenerate(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const { prompt, duration = 6, resolution = '720p', model = 'fast', generateAudio = true } = data;

            const apiKey = process.env.LTXV_API_KEY;
            if (!apiKey) {
                return sendJSON(res, { success: false, error: 'LTX API key not configured' }, 500);
            }

            console.log(`🎬 Generating video: "${prompt.substring(0, 50)}..."`);

            const modelName = model === 'pro' ? 'ltx-2-pro' : 'ltx-2-fast';
            const resolutionMap = {
                '720p': '1280x720',
                '1080p': '1920x1080',
                '1440p': '2560x1440',
                '4k': '3840x2160'
            };

            // ltx-2-fast doesn't support 720p, force 1080p
            let actualResolution = resolutionMap[resolution] || '1920x1080';
            if (modelName === 'ltx-2-fast' && actualResolution === '1280x720') {
                actualResolution = '1920x1080';
            }

            const response = await fetch(`${LTX_API_BASE}/text-to-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    prompt,
                    model: modelName,
                    duration: Number(duration),
                    resolution: actualResolution,
                    generate_audio: generateAudio
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('LTX Error:', errorText);
                return sendJSON(res, { success: false, error: errorText }, response.status);
            }

            // LTX returns MP4 directly
            const videoBuffer = await response.arrayBuffer();
            const filename = `video_${Date.now()}.mp4`;
            const filepath = path.join(VIDEOS_DIR, filename);

            fs.writeFileSync(filepath, Buffer.from(videoBuffer));
            console.log(`✅ Video saved: ${filename}`);

            // Return base64 for immediate display
            const base64Video = Buffer.from(videoBuffer).toString('base64');

            sendJSON(res, {
                success: true,
                video: {
                    url: `data:video/mp4;base64,${base64Video}`,
                    filename,
                    path: `/generated_videos/${filename}`
                }
            });

        } catch (error) {
            console.error('Video generation error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * POST /api/video/animate - Image-to-video animation
 */
async function handleVideoAnimate(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const { imageUrl, prompt = '', duration = 6, resolution = '720p', model = 'fast', generateAudio = false } = data;

            const apiKey = process.env.LTXV_API_KEY;
            if (!apiKey) {
                return sendJSON(res, { success: false, error: 'LTX API key not configured' }, 500);
            }

            console.log('🎬 Received imageUrl type:', typeof imageUrl);
            console.log('🎬 Received imageUrl length:', imageUrl?.length || 0);
            console.log('🎬 Full data keys:', Object.keys(data));

            if (!imageUrl) {
                return sendJSON(res, { success: false, error: 'Image URL required' }, 400);
            }

            console.log(`🎬 Animating image with prompt: "${prompt.substring(0, 50)}..."`);

            const modelName = model === 'pro' ? 'ltx-2-pro' : 'ltx-2-fast';

            // LTX API expects pixel dimensions like '1920x1080', '2560x1440', '3840x2160'
            const resolutionMap = {
                '720p': '1920x1080',  // 720p not supported, use 1080p
                '1080p': '1920x1080',
                '1440p': '2560x1440',
                '4k': '3840x2160',
                '2k': '2560x1440'
            };
            const actualResolution = resolutionMap[resolution] || '1920x1080';

            const response = await fetch(`${LTX_API_BASE}/image-to-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    image_uri: imageUrl,
                    prompt: prompt || 'Gentle movement, subtle animation',
                    model: modelName,
                    duration: Number(duration),
                    resolution: actualResolution,  // Pixel dimensions: '1920x1080', '2560x1440', etc.
                    generate_audio: generateAudio
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('LTX Animation Error:', errorText);
                return sendJSON(res, { success: false, error: errorText }, response.status);
            }

            const videoBuffer = await response.arrayBuffer();
            const filename = `animated_${Date.now()}.mp4`;
            const filepath = path.join(VIDEOS_DIR, filename);

            fs.writeFileSync(filepath, Buffer.from(videoBuffer));
            console.log(`✅ Animated video saved: ${filename}`);

            const base64Video = Buffer.from(videoBuffer).toString('base64');

            sendJSON(res, {
                success: true,
                video: {
                    url: `data:video/mp4;base64,${base64Video}`,
                    filename,
                    path: `/generated_videos/${filename}`
                }
            });

        } catch (error) {
            console.error('Animation error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * GET /api/videos - List generated videos
 */
function handleListVideos(req, res) {
    try {
        if (!fs.existsSync(VIDEOS_DIR)) {
            return sendJSON(res, { success: true, videos: [] });
        }

        const files = fs.readdirSync(VIDEOS_DIR)
            .filter(f => f.endsWith('.mp4'))
            .map(f => {
                const stat = fs.statSync(path.join(VIDEOS_DIR, f));
                return {
                    filename: f,
                    path: `/generated_videos/${f}`,
                    size: stat.size,
                    created: stat.birthtime
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        sendJSON(res, { success: true, videos: files });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

// =============================================================================
// �� FILM GENERATOR - Autonomous Film Creation
// =============================================================================

// Store film generation status
const filmJobs = new Map();

/**
 * Generate a film scenario using Qwen with Flux prompt expertise
 * @param {string} theme - Film theme
 * @param {string} style - Visual style (cinematic, anime, 3d, realistic)
 * @param {string} language - Output language (fr, en, es, de, etc.)
 */
async function generateFilmScenario(theme, style = 'cinematic', language = 'fr') {
    const stylePrompts = {
        'cinematic': 'cinematic photography, dramatic lighting, film grain, 35mm lens, shallow depth of field',
        'anime': 'anime style, vibrant colors, detailed anime art, studio ghibli inspired, cel shading',
        '3d': 'pixar style 3D render, cute characters, vibrant colors, high quality CGI, octane render',
        'realistic': 'photorealistic, hyperrealistic, 8k photography, professional DSLR photo, natural lighting'
    };

    const stylePrefix = stylePrompts[style] || stylePrompts.cinematic;

    // Language-specific instructions
    const langInstructions = {
        'fr': 'Réponds en français',
        'en': 'Respond in English',
        'es': 'Responde en español',
        'de': 'Antworte auf Deutsch',
        'it': 'Rispondi in italiano',
        'pt': 'Responda em português'
    };
    const langInstruction = langInstructions[language] || langInstructions['fr'];

    const systemPrompt = `Tu es un scénariste de courts-métrages et un expert en génération d'images IA avec Flux/Stable Diffusion.

${langInstruction}. Tu dois créer un scénario de EXACTEMENT 3 scènes.

=== EXPERTISE FLUX/STABLE DIFFUSION ===
Pour créer les meilleurs prompts image, applique ces règles:
1. Structure: [style artistique], [sujet principal avec détails], [action/pose], [environnement], [éclairage], [qualité]
2. Être TRÈS descriptif: couleurs spécifiques, textures, matériaux
3. Pour les personnages: TOUJOURS inclure âge, genre, couleur cheveux/yeux, vêtements précis
4. Utiliser des termes techniques: "depth of field", "rim lighting", "octane render", "8k detailed"
5. Éviter les négations - décrire ce qu'on VEUT voir
6. Ajouter des modificateurs de qualité: "masterpiece", "highly detailed", "professional"

=== FORMAT JSON REQUIS ===
{
  "title": "Titre du film",
  "style": "${stylePrefix}",
  "main_character": {
    "name": "Nom du personnage",
    "description": "Description Flux-optimisée TRÈS détaillée: [âge] [genre], [couleur cheveux] [style cheveux], [couleur yeux], wearing [vêtement 1 avec couleur], [vêtement 2], [accessoires], [traits distinctifs comme taches de rousseur, lunettes]"
  },
  "scenes": [
    {
      "number": 1,
      "description": "Description narrative courte",
      "dialogue": "Dialogue du personnage (1-2 phrases)", 
      "image_prompt": "Flux-optimized prompt: [style], [CHARACTER DESCRIPTION COMPLÈTE], [action/pose spécifique], [lieu détaillé], [éclairage], masterpiece, highly detailed",
      "animation_prompt": "character speaking expressively, [émotion], [mouvement caméra: pan/zoom/tracking]"
    }
  ]
}

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
La description du personnage doit être IDENTIQUE dans image_prompt de chaque scène.`;

    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'yevedia-libre',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Crée un scénario de film sur le thème: "${theme}"` }
            ],
            stream: false,
            options: { temperature: 0.8 }
        })
    });

    const data = await response.json();
    const content = data.message?.content || '';

    console.log('🎬 Qwen response length:', content.length);

    // Try to extract JSON from response (handle code blocks)
    let jsonStr = content;

    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

    // Try to find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('🎬 Could not find JSON in response:', content.substring(0, 500));
        throw new Error('Invalid scenario format - no JSON found');
    }

    try {
        const scenario = JSON.parse(jsonMatch[0]);
        console.log('🎬 Scenario parsed successfully:', scenario.title);
        return scenario;
    } catch (parseError) {
        console.error('🎬 JSON parse error:', parseError.message);
        console.error('🎬 Attempted JSON:', jsonMatch[0].substring(0, 300));
        throw new Error('Invalid JSON in scenario');
    }
}

/**
 * Generate film sequentially with character consistency and dialogue
 * @param {Object} scenario - Film scenario with scenes
 * @param {string} jobId - Unique job identifier
 * @param {string} imageProvider - 'flux', 'nanobanana', or 'nanobanana-pro'
 * @param {Function} onProgress - Progress callback
 */
async function generateFilmSequentially(scenario, jobId, imageProvider = 'flux', onProgress) {
    const clips = [];
    const tempDir = `/tmp/film_${jobId}`;
    const HD_WIDTH = 1024;
    const HD_HEIGHT = 576;

    const { execSync } = require('child_process');
    execSync(`mkdir -p ${tempDir}`);

    console.log(`[Film] Using image provider: ${imageProvider}`);

    /**
     * Generate image using the selected provider
     */
    async function generateImageWithProvider(prompt, width, height, referenceImage = null) {
        // Route to appropriate API based on provider
        if (imageProvider === 'flux') {
            // Local FLUX generation
            const response = await fetch('http://localhost:8080/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    width,
                    height,
                    steps: 4,
                    reference_image: referenceImage
                })
            });
            return response.json();
        } else {
            // NanoBanana via Pollinations.ai
            console.log(`[Film] Using Pollinations - ${imageProvider}`);
            const response = await fetch('http://localhost:8080/api/pollinations/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: imageProvider, // 'nanobanana' or 'nanobanana-pro'
                    width,
                    height,
                    enhance: true
                })
            });
            return response.json();
        }
    }

    // Step 1: Generate main character portrait for reference
    let characterBase64 = null;
    if (scenario.main_character) {
        onProgress({ step: 'character', scene: 0, total: scenario.scenes.length });
        console.log('🎭 Generating character model sheet...');

        // Model sheet prompt: full body + close-up portrait side by side
        const charPrompt = `${scenario.style}, character model sheet, reference sheet, ${scenario.main_character.description}, 
        left side showing full body standing pose front view, right side showing close-up portrait face detail, 
        same character in both views, consistent design, neutral gray background, professional character design, 
        high quality, detailed features, multiple views of same person`;

        try {
            const charData = await generateImageWithProvider(charPrompt, 1536, 768);
            if (charData.success && charData.base64) {
                characterBase64 = charData.base64;
                console.log('✅ Character reference generated');
            }
        } catch (e) {
            console.log('⚠️ Character generation failed:', e.message);
        }
    }

    // Step 2: Generate each scene with character reference
    for (let i = 0; i < scenario.scenes.length; i++) {
        const scene = scenario.scenes[i];
        onProgress({ step: 'image', scene: i + 1, total: scenario.scenes.length });

        // Build image prompt with character description
        const charDesc = scenario.main_character?.description || '';
        const imagePrompt = `${scenario.style}, ${charDesc}, ${scene.image_prompt}, cinematic composition, consistent character`;

        console.log(`🎨 Scene ${i + 1}: Generating image with ${imageProvider}...`);

        const imageData = await generateImageWithProvider(imagePrompt, HD_WIDTH, HD_HEIGHT, imageProvider === 'flux' ? characterBase64 : null);
        if (!imageData.success) {
            console.error(`❌ Scene ${i + 1} image failed:`, imageData.error);
            continue;
        }

        onProgress({ step: 'video', scene: i + 1, total: scenario.scenes.length });

        const base64Image = `data:image/png;base64,${imageData.base64}`;

        // Build video prompt with dialogue
        const dialogue = scene.dialogue || '';
        const animationPrompt = `${scene.animation_prompt}, ${dialogue ? `character speaking: "${dialogue}"` : 'subtle movement'}`;

        console.log(`🎬 Scene ${i + 1}: Animating with dialogue...`);

        const videoResponse = await fetch('http://localhost:8080/api/video/animate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl: base64Image,
                prompt: animationPrompt,
                duration: 6,
                resolution: '1080p',
                model: 'fast',
                generateAudio: true  // Enable audio for dialogue
            })
        });

        const videoData = await videoResponse.json();
        if (videoData.success && videoData.video) {
            const clipData = {
                scene: i + 1,
                videoPath: path.join(__dirname, videoData.video.path.replace(/^\//, '')),
                videoUrl: videoData.video.path,
                dialogue: dialogue,
                audioPath: null
            };

            // Step 2b: Generate TTS audio for dialogue if present
            if (dialogue && dialogue.trim().length > 0) {
                onProgress({ step: 'audio', scene: i + 1, total: scenario.scenes.length });
                console.log(`🔊 Scene ${i + 1}: Generating TTS for dialogue...`);

                try {
                    const audioPath = await generateDialogueTTS(dialogue, tempDir, i + 1, scenario.language || 'French');
                    if (audioPath) {
                        clipData.audioPath = audioPath;
                        console.log(`✅ Scene ${i + 1}: TTS audio generated`);
                    }
                } catch (ttsError) {
                    console.log(`⚠️ Scene ${i + 1}: TTS failed, continuing without voice: ${ttsError.message}`);
                }
            }

            clips.push(clipData);
            console.log(`✅ Scene ${i + 1}: Video with audio generated`);
        } else {
            console.error(`❌ Scene ${i + 1} video failed:`, videoData.error);
        }
    }

    return clips;
}

/**
 * Generate TTS audio for a dialogue line
 */
async function generateDialogueTTS(dialogue, tempDir, sceneNum, language = 'French') {
    const { execSync } = require('child_process');
    const pythonPath = path.join(__dirname, 'venv', 'bin', 'python');
    const audioPath = path.join(tempDir, `dialogue_${sceneNum}.wav`);

    // Escape dialogue for shell
    const escapedDialogue = dialogue.replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, ' ');

    const ttsScript = `
import sys
sys.path.insert(0, '${__dirname}')
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
    device_map="mps" if torch.backends.mps.is_available() else "cpu",
    dtype=torch.float32,
)

wavs, sr = model.generate_custom_voice(
    text="${escapedDialogue}",
    language="${language}",
    speaker="serena",
)
sf.write("${audioPath}", wavs[0], sr)
print("SUCCESS")
`;

    try {
        execSync(`"${pythonPath}" -c '${ttsScript.replace(/'/g, "'\"'\"'")}'`, {
            timeout: 300000,  // 5 min timeout
            encoding: 'utf8',
            cwd: __dirname
        });

        if (fs.existsSync(audioPath)) {
            return audioPath;
        }
    } catch (e) {
        console.error(`TTS error for scene ${sceneNum}:`, e.message);
    }
    return null;
}

/**
 * Concatenate video clips using FFmpeg
 */
async function concatenateVideos(clips, outputPath) {
    const { execSync } = require('child_process');
    const listFile = `/tmp/concat_${Date.now()}.txt`;

    console.log(`🎬 Concatenating ${clips.length} clips to ${outputPath}`);

    // Step 1: Merge TTS audio with each video clip that has dialogue
    const processedClips = [];
    for (const c of clips) {
        if (!fs.existsSync(c.videoPath)) {
            console.log(`  ❌ Missing clip: ${c.videoPath}`);
            continue;
        }

        if (c.audioPath && fs.existsSync(c.audioPath)) {
            // Merge video with TTS audio
            const mergedPath = c.videoPath.replace('.mp4', '_dubbed.mp4');
            console.log(`  🔊 Adding TTS audio to scene ${c.scene}...`);

            try {
                // Merge audio with video - use shortest to match video length
                const mergeCmd = `ffmpeg -y -i "${c.videoPath}" -i "${c.audioPath}" -c:v copy -c:a aac -shortest "${mergedPath}" 2>&1`;
                execSync(mergeCmd, { maxBuffer: 50 * 1024 * 1024 });
                processedClips.push({ ...c, videoPath: mergedPath });
                console.log(`  ✅ Scene ${c.scene} dubbed`);
            } catch (mergeErr) {
                console.log(`  ⚠️ Audio merge failed for scene ${c.scene}, using original`);
                processedClips.push(c);
            }
        } else {
            processedClips.push(c);
            console.log(`  ✅ Clip: ${c.videoPath} (no dialogue)`);
        }
    }

    if (processedClips.length === 0) {
        throw new Error('No valid video clips to concatenate');
    }

    // Create concat list file with escaped paths
    const listContent = processedClips.map(c => `file '${c.videoPath.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFile, listContent);
    console.log(`🎬 Concat list written to ${listFile}`);

    try {
        // Run FFmpeg to concatenate
        const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" 2>&1`;
        console.log(`🎬 Running: ${cmd}`);
        execSync(cmd, { maxBuffer: 50 * 1024 * 1024 });

        console.log(`🎬 Film saved to ${outputPath}`);
    } catch (ffmpegError) {
        console.error('🎬 FFmpeg error:', ffmpegError.message);
        // Try alternative method: re-encode
        try {
            console.log('🎬 Trying re-encode method...');
            const cmd2 = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -c:a aac -preset fast -crf 23 "${outputPath}" 2>&1`;
            execSync(cmd2, { maxBuffer: 50 * 1024 * 1024 });
            console.log(`🎬 Film saved (re-encoded) to ${outputPath}`);
        } catch (e) {
            throw new Error(`FFmpeg concatenation failed: ${e.message}`);
        }
    }

    // Cleanup
    try { fs.unlinkSync(listFile); } catch (e) { }

    return outputPath;
}

/**
 * POST /api/film/scenario - Generate scenario only
 */
function handleFilmScenario(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { theme, style = 'cinematic', language = 'fr' } = JSON.parse(body);

            if (!theme) {
                return sendJSON(res, { success: false, error: 'Theme required' }, 400);
            }

            console.log(`🎬 Generating scenario for: "${theme}" (${language})`);
            const scenario = await generateFilmScenario(theme, style, language);

            sendJSON(res, { success: true, scenario });
        } catch (error) {
            console.error('Scenario error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * POST /api/film/generate - Generate complete film
 */
function handleFilmGenerate(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { theme, style = 'cinematic', scenario: providedScenario, imageProvider = 'flux' } = JSON.parse(body);
            console.log(`[Film] Starting with imageProvider: ${imageProvider}`);

            const jobId = `film_${Date.now()}`;

            // Initialize job status
            filmJobs.set(jobId, {
                status: 'starting',
                progress: 0,
                currentStep: 'Initialisation...',
                scenes: [],
                startTime: Date.now()
            });

            // Return job ID immediately
            sendJSON(res, { success: true, jobId });

            // Generate film asynchronously
            (async () => {
                try {
                    // Step 1: Generate or use provided scenario
                    filmJobs.get(jobId).currentStep = 'Génération du scénario...';
                    const scenario = providedScenario || await generateFilmScenario(theme, style);
                    filmJobs.get(jobId).scenario = scenario;
                    filmJobs.get(jobId).progress = 10;

                    // Step 2: Generate images and videos
                    const clips = await generateFilmSequentially(scenario, jobId, imageProvider, (progress) => {
                        const job = filmJobs.get(jobId);
                        job.currentStep = `${progress.step === 'image' ? '🎨 Image' : '🎬 Vidéo'} scène ${progress.scene}/${progress.total}`;
                        job.progress = 10 + (progress.scene / progress.total) * 80;
                    });

                    filmJobs.get(jobId).clips = clips.map(c => ({
                        scene: c.scene,
                        videoUrl: c.videoUrl,
                        videoPath: c.videoPath
                    }));

                    // Instead of auto-concatenating, show timeline for preview
                    if (clips.length > 0) {
                        filmJobs.get(jobId).status = 'complete';
                        filmJobs.get(jobId).progress = 100;
                        filmJobs.get(jobId).currentStep = 'Timeline prête !';
                        // No filmUrl yet - user will export from timeline
                    } else {
                        throw new Error('No clips generated');
                    }

                } catch (error) {
                    console.error('Film generation error:', error);
                    filmJobs.get(jobId).status = 'error';
                    filmJobs.get(jobId).error = error.message;
                }
            })();

        } catch (error) {
            console.error('Film generate error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * GET /api/film/status/:jobId - Get film generation status
 */
function handleFilmStatus(req, res) {
    const jobId = req.url.split('/').pop();
    const job = filmJobs.get(jobId);

    if (!job) {
        return sendJSON(res, { success: false, error: 'Job not found' }, 404);
    }

    sendJSON(res, { success: true, ...job });
}

/**
 * POST /api/film/render - Render final film from timeline clips
 */
function handleFilmRender(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { clips } = JSON.parse(body);

            if (!clips || clips.length === 0) {
                return sendJSON(res, { success: false, error: 'No clips provided' }, 400);
            }

            console.log(`🎬 Rendering film from ${clips.length} clips...`);

            // Convert URLs to file paths
            const clipPaths = clips.map(url => ({
                videoPath: path.join(__dirname, url.replace(/^\//, ''))
            }));

            // Generate output filename
            const outputFilename = `film_${Date.now()}.mp4`;
            const outputPath = path.join(VIDEOS_DIR, outputFilename);

            // Concatenate videos
            await concatenateVideos(clipPaths, outputPath);

            sendJSON(res, {
                success: true,
                filmUrl: `/generated_videos/${outputFilename}`,
                filename: outputFilename
            });

        } catch (error) {
            console.error('Film render error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * POST /api/video/delete - Delete a video
 */
function handleVideoDelete(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { filename } = JSON.parse(body);
            const filepath = path.join(VIDEOS_DIR, filename);

            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                sendJSON(res, { success: true });
            } else {
                sendJSON(res, { success: false, error: 'Video not found' }, 404);
            }
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

// =============================================================================
// 🔊 TTS - Text-to-Speech with Qwen3-TTS
// =============================================================================

const TTS_DIR = path.join(__dirname, 'generated_audio');
if (!fs.existsSync(TTS_DIR)) {
    fs.mkdirSync(TTS_DIR, { recursive: true });
}

/**
 * POST /api/tts/generate - Generate speech from text
 */
function handleTTSGenerate(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { text, language = 'Auto', speaker = 'Chelsie', instruct = '' } = JSON.parse(body);

            if (!text || text.trim().length === 0) {
                return sendJSON(res, { success: false, error: 'Text is required' }, 400);
            }

            const filename = `tts_${Date.now()}.wav`;
            const outputPath = path.join(TTS_DIR, filename);

            console.log(`🔊 TTS generating: "${text.substring(0, 50)}..." (${language}, ${speaker})`);

            const { execSync } = require('child_process');
            const pythonPath = path.join(__dirname, 'venv', 'bin', 'python');
            const scriptPath = path.join(__dirname, 'tts_generator.py');

            // Escape text for shell
            const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
            const escapedInstruct = instruct.replace(/"/g, '\\"').replace(/'/g, "\\'");

            const cmd = `"${pythonPath}" "${scriptPath}" "${escapedText}" --language "${language}" --speaker "${speaker}" --instruct "${escapedInstruct}" --output "${outputPath}"`;

            try {
                execSync(cmd, {
                    timeout: 300000,  // 5 min timeout
                    encoding: 'utf8',
                    cwd: __dirname
                });

                if (fs.existsSync(outputPath)) {
                    const audioBuffer = fs.readFileSync(outputPath);
                    const base64Audio = audioBuffer.toString('base64');

                    sendJSON(res, {
                        success: true,
                        audio: {
                            url: `data:audio/wav;base64,${base64Audio}`,
                            path: `/generated_audio/${filename}`,
                            filename
                        }
                    });
                    console.log(`✅ TTS generated: ${filename}`);
                } else {
                    throw new Error('Audio file not created');
                }
            } catch (execError) {
                console.error('TTS Error:', execError.message);
                sendJSON(res, { success: false, error: 'TTS generation failed: ' + execError.message }, 500);
            }

        } catch (error) {
            console.error('TTS Error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

/**
 * POST /api/tts/clone - Clone voice from reference audio
 */
function handleTTSClone(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { text, language = 'Auto', refAudio, refText } = JSON.parse(body);

            if (!text || text.trim().length === 0) {
                return sendJSON(res, { success: false, error: 'Text is required' }, 400);
            }
            if (!refAudio) {
                return sendJSON(res, { success: false, error: 'Reference audio is required' }, 400);
            }
            if (!refText) {
                return sendJSON(res, { success: false, error: 'Reference text is required' }, 400);
            }

            // Save reference audio to temp file
            const refFilename = `ref_${Date.now()}.wav`;
            const refPath = path.join(TTS_DIR, refFilename);
            const refBuffer = Buffer.from(refAudio, 'base64');
            fs.writeFileSync(refPath, refBuffer);

            const filename = `clone_${Date.now()}.wav`;
            const outputPath = path.join(TTS_DIR, filename);

            console.log(`🎭 TTS cloning: "${text.substring(0, 50)}..." from reference`);

            const { execSync } = require('child_process');
            const pythonPath = path.join(__dirname, 'venv', 'bin', 'python');

            // Use Python for voice cloning with Base model
            const cloneScript = `
import sys
sys.path.insert(0, '${__dirname}')
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
    device_map="mps" if torch.backends.mps.is_available() else "cpu",
    dtype=torch.float32,
)

wavs, sr = model.generate_voice_clone(
    text="${text.replace(/"/g, '\\"').replace(/\n/g, ' ')}",
    language="${language}",
    ref_audio="${refPath}",
    ref_text="${refText.replace(/"/g, '\\"').replace(/\n/g, ' ')}",
)
sf.write("${outputPath}", wavs[0], sr)
print("SUCCESS")
`;

            try {
                const result = execSync(`"${pythonPath}" -c '${cloneScript.replace(/'/g, "'\"'\"'")}'`, {
                    timeout: 600000,  // 10 min timeout for clone
                    encoding: 'utf8',
                    cwd: __dirname
                });

                if (fs.existsSync(outputPath)) {
                    const audioBuffer = fs.readFileSync(outputPath);
                    const base64Audio = audioBuffer.toString('base64');

                    // Clean up ref file
                    fs.unlinkSync(refPath);

                    sendJSON(res, {
                        success: true,
                        audio: {
                            url: `data:audio/wav;base64,${base64Audio}`,
                            path: `/generated_audio/${filename}`,
                            filename
                        }
                    });
                    console.log(`✅ Voice cloned: ${filename}`);
                } else {
                    throw new Error('Audio file not created');
                }
            } catch (execError) {
                console.error('Clone Error:', execError.message);
                sendJSON(res, { success: false, error: 'Voice cloning failed: ' + execError.message }, 500);
            }

        } catch (error) {
            console.error('Clone Error:', error);
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

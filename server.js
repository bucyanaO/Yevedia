/**
 * Yevedia AI Chat - Backend Server
 * Contrôle réel d'Ollama via le terminal
 */

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

    if (req.url === '/api/images' && req.method === 'GET') {
        return handleListImages(req, res);
    }

    if (req.url === '/api/image/delete' && req.method === 'POST') {
        return handleDeleteImage(req, res);
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
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            sendJSON(res, { success: true, models: data.models || [] });
        } else {
            sendJSON(res, { success: false, error: 'Impossible de récupérer la liste des modèles' });
        }
    } catch (error) {
        console.error('Erreur ollama tags:', error);
        sendJSON(res, { success: false, error: 'Ollama non joignable' });
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

    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Yevedia AI Chat Server                       ║
║                                                   ║
║   Serveur:  http://localhost:${PORT}                 ║
║   Status:   En cours d'exécution                  ║
║   Mémoire:  SQLite (memory.db)                    ║
║                                                   ║
║   Appuyez sur Ctrl+C pour arrêter                 ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});

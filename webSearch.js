/**
 * Yevedia Web Search Module
 * Permet au modèle de chercher des informations sur internet
 */

const http = require('http');
const https = require('https');

// Configuration des APIs de recherche
const SEARCH_CONFIG = {
    // DuckDuckGo (gratuit, pas besoin d'API key)
    duckduckgo: {
        enabled: true,
        baseUrl: 'https://api.duckduckgo.com/'
    },
    // Serper.dev (Google Search API - ACTIVÉ)
    serper: {
        enabled: true,
        apiKey: process.env.SERPER_API_KEY || 'dcd068a792da4eb9472112502fa3098ed254b324',
        baseUrl: 'https://google.serper.dev/search'
    },
    // Tavily (optionnel, optimisé pour LLM)
    tavily: {
        enabled: false,
        apiKey: process.env.TAVILY_API_KEY || '',
        baseUrl: 'https://api.tavily.com/search'
    }
};

/**
 * Recherche sur DuckDuckGo (gratuit)
 * @param {string} query - La requête de recherche
 * @returns {Promise<Object>} - Les résultats de recherche
 */
async function searchDuckDuckGo(query) {
    return new Promise((resolve, reject) => {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const results = [];

                    // Réponse instantanée
                    if (json.AbstractText) {
                        results.push({
                            title: json.Heading || 'Réponse',
                            snippet: json.AbstractText,
                            url: json.AbstractURL || ''
                        });
                    }

                    // Résultats connexes
                    if (json.RelatedTopics) {
                        for (const topic of json.RelatedTopics.slice(0, 5)) {
                            if (topic.Text) {
                                results.push({
                                    title: topic.FirstURL ? topic.FirstURL.split('/').pop() : 'Résultat',
                                    snippet: topic.Text,
                                    url: topic.FirstURL || ''
                                });
                            }
                        }
                    }

                    resolve({
                        success: true,
                        query,
                        results,
                        source: 'DuckDuckGo'
                    });
                } catch (e) {
                    reject(new Error('Erreur parsing DuckDuckGo: ' + e.message));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Recherche avec Serper.dev (Google Search API)
 * @param {string} query - La requête de recherche
 * @returns {Promise<Object>} - Les résultats de recherche
 */
async function searchSerper(query) {
    if (!SEARCH_CONFIG.serper.apiKey) {
        throw new Error('SERPER_API_KEY non configurée');
    }

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ q: query, num: 5 });

        const options = {
            hostname: 'google.serper.dev',
            path: '/search',
            method: 'POST',
            headers: {
                'X-API-KEY': SEARCH_CONFIG.serper.apiKey,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    const results = (json.organic || []).map(r => ({
                        title: r.title,
                        snippet: r.snippet,
                        url: r.link
                    }));

                    resolve({
                        success: true,
                        query,
                        results,
                        source: 'Google (Serper)'
                    });
                } catch (e) {
                    reject(new Error('Erreur parsing Serper: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Recherche avec Tavily (optimisé pour LLM)
 * @param {string} query - La requête de recherche
 * @returns {Promise<Object>} - Les résultats de recherche
 */
async function searchTavily(query) {
    if (!SEARCH_CONFIG.tavily.apiKey) {
        throw new Error('TAVILY_API_KEY non configurée');
    }

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            api_key: SEARCH_CONFIG.tavily.apiKey,
            query: query,
            search_depth: 'basic',
            include_answer: true,
            max_results: 5
        });

        const options = {
            hostname: 'api.tavily.com',
            path: '/search',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    const results = (json.results || []).map(r => ({
                        title: r.title,
                        snippet: r.content,
                        url: r.url
                    }));

                    // Tavily fournit aussi une réponse synthétisée
                    if (json.answer) {
                        results.unshift({
                            title: 'Réponse synthétisée',
                            snippet: json.answer,
                            url: ''
                        });
                    }

                    resolve({
                        success: true,
                        query,
                        results,
                        source: 'Tavily AI'
                    });
                } catch (e) {
                    reject(new Error('Erreur parsing Tavily: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Fonction principale de recherche - utilise le meilleur provider disponible
 * @param {string} query - La requête de recherche
 * @returns {Promise<Object>} - Les résultats formatés
 */
async function webSearch(query) {
    // Essayer dans l'ordre de préférence
    if (SEARCH_CONFIG.tavily.enabled && SEARCH_CONFIG.tavily.apiKey) {
        try {
            return await searchTavily(query);
        } catch (e) {
            console.log('Tavily failed, falling back...');
        }
    }

    if (SEARCH_CONFIG.serper.enabled && SEARCH_CONFIG.serper.apiKey) {
        try {
            return await searchSerper(query);
        } catch (e) {
            console.log('Serper failed, falling back...');
        }
    }

    // DuckDuckGo en dernier recours (gratuit mais limité)
    return await searchDuckDuckGo(query);
}

/**
 * Formate les résultats de recherche pour le prompt LLM
 * @param {Object} searchResults - Les résultats de webSearch()
 * @returns {string} - Texte formaté pour le contexte
 */
function formatSearchResultsForPrompt(searchResults) {
    if (!searchResults.success || !searchResults.results.length) {
        return 'Aucun résultat trouvé pour cette recherche.';
    }

    let formatted = `[RÉSULTATS DE RECHERCHE WEB - ${searchResults.source}]\n`;
    formatted += `Requête: "${searchResults.query}"\n\n`;

    for (let i = 0; i < searchResults.results.length; i++) {
        const r = searchResults.results[i];
        formatted += `${i + 1}. ${r.title}\n`;
        formatted += `   ${r.snippet}\n`;
        if (r.url) formatted += `   Source: ${r.url}\n`;
        formatted += '\n';
    }

    formatted += '[FIN DES RÉSULTATS]\n';
    formatted += 'Utilise ces informations pour répondre à la question.\n';

    return formatted;
}

/**
 * Détecte si un message nécessite une recherche internet
 * @param {string} message - Le message de l'utilisateur
 * @returns {boolean} - True si une recherche est nécessaire
 */
function shouldSearch(message) {
    const lowerMessage = message.toLowerCase();

    // Mots-clés explicites de recherche
    const searchTriggers = [
        'cherche', 'recherche', 'trouve', 'google',
        'internet', 'web', 'actualités', 'nouvelles',
        'search', 'look up', 'find out',
        'qu\'est-ce que c\'est', 'c\'est quoi', 'who is', 'what is',
        'météo', 'weather', 'prix de', 'cost of',
        'dernières nouvelles', 'latest news'
    ];

    // Questions sur des événements récents
    const recentTriggers = [
        'aujourd\'hui', 'cette semaine', 'ce mois',
        'récemment', 'actuellement', 'en ce moment',
        '2024', '2025', '2026'
    ];

    // Vérifier les triggers explicites
    for (const trigger of searchTriggers) {
        if (lowerMessage.includes(trigger)) {
            return true;
        }
    }

    // Vérifier les références à l'actualité
    for (const trigger of recentTriggers) {
        if (lowerMessage.includes(trigger)) {
            return true;
        }
    }

    return false;
}

/**
 * Extrait la requête de recherche du message utilisateur
 * @param {string} message - Le message de l'utilisateur
 * @returns {string} - La requête de recherche optimisée
 */
function extractSearchQuery(message) {
    // Nettoyer les préfixes de commande français et anglais (ordre important)
    let query = message
        // Supprimer les commandes de recherche verbales
        .replace(/^(vas?|peux-tu|pourrais-tu|essaie de|fais|fait)\s*/i, '')
        .replace(/^(chercher|cherche|rechercher|recherche|trouver|trouve|google|search|look up|find)\s*/i, '')
        .replace(/\s*(sur|on|via|dans)\s*(internet|le web|google|the web|le net)/gi, '')
        // Supprimer les questions
        .replace(/^(qu'est-ce que c'est|c'est quoi|what is|who is)\s*/i, '')
        .replace(/^(quelles? sont|donne-moi|parle-moi de|tell me about|dis-moi)\s*/i, '')
        // Supprimer les articles orphelins au début
        .replace(/^(les?|la|le|l'|un|une|des)\s+/gi, '')
        .trim();

    // Traduire mots-clés français vers anglais pour de meilleurs résultats Google
    const translations = {
        'dernières nouvelles': 'latest news',
        'dernières': 'latest',
        'nouvelles': 'news',
        'nouveautés': 'latest updates',
        'actualités': 'current news',
        'actualité': 'news',
        "aujourd'hui": 'today',
        'cette semaine': 'this week',
        'ce mois': 'this month',
        'janvier': 'January',
        'février': 'February',
        'mars': 'March',
        'avril': 'April',
        'mai': 'May',
        'juin': 'June',
        'juillet': 'July',
        'août': 'August',
        'septembre': 'September',
        'octobre': 'October',
        'novembre': 'November',
        'décembre': 'December',
        'météo': 'weather forecast',
        'prix de': 'price of',
        'comment': 'how to',
        'pourquoi': 'why',
        'quand': 'when',
        'qui est': 'who is',
        "qu'est-ce que": 'what is',
        'nom': 'name meaning',
        'prénom': 'first name meaning'
    };

    for (const [fr, en] of Object.entries(translations)) {
        query = query.replace(new RegExp(fr, 'gi'), en);
    }

    // Si trop court, utiliser le message original nettoyé
    if (query.length < 3) {
        query = message
            .replace(/^(vas?|cherche|recherche|trouve)\s*/i, '')
            .replace(/sur internet/gi, '')
            .trim();
    }

    return query;
}

module.exports = {
    webSearch,
    searchDuckDuckGo,
    searchSerper,
    searchTavily,
    formatSearchResultsForPrompt,
    shouldSearch,
    extractSearchQuery,
    SEARCH_CONFIG
};

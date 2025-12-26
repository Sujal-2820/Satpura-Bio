const axios = require('axios');

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

/**
 * Translate text using Google Translate API
 * @param {string|string[]} q - Text or array of texts to translate
 * @param {string} target - Target language code (e.g., 'hi')
 * @returns {Promise<string|string[]>} Translated text or array
 */
const translateText = async (q, target = 'hi') => {
    if (!GOOGLE_TRANSLATE_API_KEY) {
        console.warn('[Translator] No Google Translate API key found. Returning original text.');
        return q;
    }

    if (!q || (Array.isArray(q) && q.length === 0)) {
        return q;
    }

    try {
        const response = await axios.post(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            q,
            target,
            format: 'text',
            source: 'en'
        });

        const translations = response.data.data.translations;

        if (Array.isArray(q)) {
            return translations.map(t => t.translatedText);
        } else {
            return translations[0].translatedText;
        }
    } catch (error) {
        console.error('[Translator] Google API Error:', error.response?.data || error.message);
        return q; // Fallback to original
    }
};

module.exports = { translateText };

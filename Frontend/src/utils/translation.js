/**
 * Translation Utility
 * 
 * Handles translation using Google Translate API
 * Includes caching to reduce API calls
 */

const CACHE_KEY = 'ira_sathi_translations'
const CACHE_VERSION = '1.0'
const API_BATCH_SIZE = 50 // Maximum items per API call
const DEBOUNCE_DELAY = 300 // ms

const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2'
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY // Using the same API key

/**
 * Hash a string for cache key
 */
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Check if a string is an entity ID (should not be translated)
 */
function isEntityId(str) {
  if (!str || typeof str !== 'string') return false
  // Pattern: ORD-20240115-0001, PROD-123, etc.
  return /^[A-Z]{2,4}-[\dA-Z-]+$/i.test(str.trim())
}

/**
 * Load cache from localStorage
 */
function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.version === CACHE_VERSION) {
        return parsed
      }
    }
  } catch (error) {
    console.error('[Translation] Error loading cache:', error)
  }
  return { version: CACHE_VERSION, translations: {} }
}

/**
 * Save cache to localStorage
 */
function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[Translation] Error saving cache:', error)
    // If quota exceeded, clear old cache and try again
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.error('[Translation] Failed to save cache after cleanup:', e)
    }
  }
}

/**
 * Translate text using Google Translate API
 */
async function translateTextWithGoogleAPI(text, targetLang) {
  if (!API_KEY) {
    throw new Error('Google Maps API key not found')
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return text
  }

  // Don't translate entity IDs
  if (isEntityId(text)) {
    return text
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_API_URL}?key=${API_KEY}&q=${encodeURIComponent(text)}&target=${targetLang}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data && data.data.translations && data.data.translations.length > 0) {
      return data.data.translations[0].translatedText
    }
    
    throw new Error('Invalid response from translation API')
  } catch (error) {
    console.error('[Translation] API error:', error)
    throw error
  }
}

/**
 * Translate a single text
 */
export async function getTranslation(text, targetLang, forceRefresh = false) {
  if (!text || typeof text !== 'string') {
    return text
  }

  const trimmedText = text.trim()
  if (!trimmedText) {
    return text
  }

  // Don't translate entity IDs
  if (isEntityId(trimmedText)) {
    return trimmedText
  }

  // If English, return as-is
  if (targetLang === 'en') {
    return trimmedText
  }

  const cache = loadCache()
  const cacheKey = `${trimmedText}_${targetLang}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh && cache.translations[cacheKey]) {
    return cache.translations[cacheKey]
  }

  try {
    // Translate via API
    const translated = await translateTextWithGoogleAPI(trimmedText, targetLang)
    
    // Save to cache
    cache.translations[cacheKey] = translated
    saveCache(cache)
    
    return translated
  } catch (error) {
    console.error('[Translation] Error translating:', error)
    // Return original text on error
    return trimmedText
  }
}

/**
 * Translate multiple texts in batch
 */
export async function getBatchTranslations(texts, targetLang, forceRefresh = false) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return texts
  }

  // If English, return as-is
  if (targetLang === 'en') {
    return texts
  }

  const cache = loadCache()
  const results = []
  const textsToTranslate = []
  const indicesToTranslate = []

  // Check cache for each text
  texts.forEach((text, index) => {
    if (!text || typeof text !== 'string') {
      results[index] = text
      return
    }

    const trimmedText = text.trim()
    if (!trimmedText) {
      results[index] = text
      return
    }

    // Don't translate entity IDs
    if (isEntityId(trimmedText)) {
      results[index] = trimmedText
      return
    }

    const cacheKey = `${trimmedText}_${targetLang}`
    
    if (!forceRefresh && cache.translations[cacheKey]) {
      results[index] = cache.translations[cacheKey]
    } else {
      textsToTranslate.push(trimmedText)
      indicesToTranslate.push(index)
    }
  })

  // If all texts are cached, return results
  if (textsToTranslate.length === 0) {
    return results
  }

  // Translate remaining texts in batches
  try {
    for (let i = 0; i < textsToTranslate.length; i += API_BATCH_SIZE) {
      const batch = textsToTranslate.slice(i, i + API_BATCH_SIZE)
      const batchIndices = indicesToTranslate.slice(i, i + API_BATCH_SIZE)
      
      // Use Google Translate API batch endpoint
      const response = await fetch(
        `${GOOGLE_TRANSLATE_API_URL}?key=${API_KEY}&target=${targetLang}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: batch,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Batch translation API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.data && data.data.translations) {
        data.data.translations.forEach((translation, idx) => {
          const originalIndex = batchIndices[idx]
          const originalText = batch[idx]
          const translatedText = translation.translatedText
          
          results[originalIndex] = translatedText
          
          // Save to cache
          const cacheKey = `${originalText}_${targetLang}`
          cache.translations[cacheKey] = translatedText
        })
      }
    }

    // Save updated cache
    saveCache(cache)
    
    return results
  } catch (error) {
    console.error('[Translation] Batch translation error:', error)
    // Return original texts for failed translations
    textsToTranslate.forEach((text, idx) => {
      const originalIndex = indicesToTranslate[idx]
      if (results[originalIndex] === undefined) {
        results[originalIndex] = text
      }
    })
    return results
  }
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (error) {
    console.error('[Translation] Error clearing cache:', error)
  }
}


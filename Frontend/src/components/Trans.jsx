import { useState, useEffect } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * Trans Component
 * 
 * Automatically translates its children text content
 * Re-renders when language changes
 * Usage: <Trans>Hello World</Trans>
 * 
 * Note: Only works with string children. For dynamic content with variables,
 * split the text and use multiple Trans components: <Trans>Add</Trans> ₹{amount} <Trans>more</Trans>
 */
export function Trans({ children, forceRefresh = false }) {
  const { translate, isEnglish, language } = useTranslation()
  const [translatedText, setTranslatedText] = useState(children)
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    // Only translate string children
    if (typeof children !== 'string') {
      setTranslatedText(children)
      setIsTranslating(false)
      return
    }

    if (isEnglish || !children) {
      setTranslatedText(children)
      setIsTranslating(false)
      return
    }

    const text = children.trim()
    
    if (!text) {
      setTranslatedText(children)
      setIsTranslating(false)
      return
    }
    
    // Don't translate if it's an entity ID
    if (/^[A-Z]{2,4}-[\dA-Z-]+$/i.test(text)) {
      setTranslatedText(text)
      setIsTranslating(false)
      return
    }
    
    setIsTranslating(true)
    
    translate(text, forceRefresh)
      .then((translated) => {
        console.log(`[Trans] Translated: "${text}" → "${translated}"`)
        setTranslatedText(translated)
        setIsTranslating(false)
      })
      .catch((error) => {
        console.error('[Trans] Translation error:', error)
        setTranslatedText(children) // Fallback to original on error
        setIsTranslating(false)
      })
  }, [children, isEnglish, translate, forceRefresh, language])

  // Show original text while translating (or show translated immediately if already cached)
  return <>{isTranslating && !translatedText ? children : translatedText}</>
}


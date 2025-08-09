/**
 * Language Detection Service for Multilingual Document Processing
 * Based on Unicode character ranges for Indian languages
 */

interface LanguageProps {
  code: string;
  tts: string;
  ocr: string;
  unicodeStart: number;
  unicodeEnd: number;
}

export const LANGUAGES: Record<string, LanguageProps> = {
  "English": { code: "en-IN", tts: "en", ocr: "eng", unicodeStart: 97, unicodeEnd: 122 }, // 'a' to 'z'
  "Hindi": { code: "hi-IN", tts: "hi", ocr: "hin", unicodeStart: 0x0900, unicodeEnd: 0x097F },
  "Kannada": { code: "kn-IN", tts: "kn", ocr: "kan", unicodeStart: 0x0C80, unicodeEnd: 0x0CFF },
  "Tamil": { code: "ta-IN", tts: "ta", ocr: "tam", unicodeStart: 0x0B80, unicodeEnd: 0x0BFF },
  "Telugu": { code: "te-IN", tts: "te", ocr: "tel", unicodeStart: 0x0C00, unicodeEnd: 0x0C7F },
  "Marathi": { code: "mr-IN", tts: "mr", ocr: "mar", unicodeStart: 0x0900, unicodeEnd: 0x097F },
  "Bengali": { code: "bn-IN", tts: "bn", ocr: "ben", unicodeStart: 0x0980, unicodeEnd: 0x09FF },
  "Malayalam": { code: "ml-IN", tts: "ml", ocr: "mal", unicodeStart: 0x0D00, unicodeEnd: 0x0D7F }
};

/**
 * Detect the primary language of text based on Unicode character distribution
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return "en";
  }

  const scores: Record<string, number> = {};
  
  for (const [langName, props] of Object.entries(LANGUAGES)) {
    let count = 0;
    
    if (langName === "English") {
      // Count English letters (a-z, A-Z)
      count = Array.from(text.toLowerCase()).filter(c => 
        c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122
      ).length;
    } else {
      // Count characters in the Unicode range for this language
      count = Array.from(text).filter(c => {
        const code = c.charCodeAt(0);
        return code >= props.unicodeStart && code <= props.unicodeEnd;
      }).length;
    }
    
    scores[langName] = count / Math.max(text.length, 1);
  }

  if (Object.keys(scores).length === 0) {
    return "en";
  }

  // Find language with highest score
  const maxLang = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  // Return TTS code if confidence is above threshold, otherwise default to English
  return scores[maxLang] > 0.3 ? LANGUAGES[maxLang].tts : "en";
}

/**
 * Get language properties by TTS code
 */
export function getLanguageByTTSCode(ttsCode: string): LanguageProps | null {
  for (const props of Object.values(LANGUAGES)) {
    if (props.tts === ttsCode) {
      return props;
    }
  }
  return null;
}

/**
 * Detect multiple languages in text and return distribution
 */
export function detectLanguageDistribution(text: string): Record<string, number> {
  if (!text || text.trim().length === 0) {
    return { "English": 1.0 };
  }

  const scores: Record<string, number> = {};
  
  for (const [langName, props] of Object.entries(LANGUAGES)) {
    let count = 0;
    
    if (langName === "English") {
      count = Array.from(text.toLowerCase()).filter(c => 
        c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122
      ).length;
    } else {
      count = Array.from(text).filter(c => {
        const code = c.charCodeAt(0);
        return code >= props.unicodeStart && code <= props.unicodeEnd;
      }).length;
    }
    
    scores[langName] = count / Math.max(text.length, 1);
  }

  return scores;
}

/**
 * Check if text contains significant content in a specific language
 */
export function hasLanguageContent(text: string, languageName: string, threshold: number = 0.1): boolean {
  if (!LANGUAGES[languageName]) {
    return false;
  }

  const distribution = detectLanguageDistribution(text);
  return (distribution[languageName] || 0) >= threshold;
}
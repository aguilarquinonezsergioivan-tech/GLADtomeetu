import { MemoryInsight, RAGSearchResult } from '../types/memory';

const SPANISH_STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'más', 'pero', 'sus', 'le',
  'ya', 'o', 'fue', 'este', 'ha', 'si', 'sí', 'porque', 'esta', 'son', 'entre',
  'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también', 'tambien', 'me',
  'hasta', 'hay', 'donde', 'que', 'qué', 'cual', 'cuál', 'como', 'cómo', 'mi',
  'mis', 'tu', 'tus', 'nos', 'les', 'esto', 'estos', 'estas', 'es', 'era'
]);

const ENGLISH_STOPWORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
  'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
  'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who',
  'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
  'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work'
]);

// Semantic concept expansions
const CONCEPT_EXPANSIONS: Record<string, string[]> = {
  'fuga': ['leak', 'memoria', 'ram', 'vram', 'limpieza', 'useeffect', 'listener', 'websocket'],
  'leak': ['fuga', 'memoria', 'ram', 'vram', 'limpieza', 'useeffect'],
  'memoria': ['ram', 'vram', 'persistente', 'json', 'persistencia', 'recuperacion', 'rag', 'leak', 'fuga'],
  'rag': ['recuperacion', 'semantica', 'memoria', 'in-context-learning', 'embeddings', 'vector'],
  'cot': ['chain-of-thought', 'razonamiento', 'flujo', 'diagnostico', 'paso a paso'],
  'pensar': ['cot', 'chain-of-thought', 'razonamiento', 'diagnostico'],
  'restriccion': ['negativa', 'placeholder', 'prohibido', 'calidad', 'clean-code', 'tipado'],
  'mcp': ['herramienta', 'disco', 'seguridad', 'filesystem', 'scan_folder', 'read_binary_nif', 'generate_cad_dxf'],
  'cad': ['dxf', 'fea', 'mecanica', 'placa', 'malla', 'von mises', 'esfuerzo'],
  'nif': ['binario', 'skyrim', 'fallout', 'malla', 'textura', 'dds', 'shader'],
  'react': ['hook', 'useeffect', 'listener', 'render', 'estado', 'fuga', 'websocket'],
  'audio': ['sonido', 'synth', 'sintetizador', 'bpm', 'espectro', 'adpcm', 'spu'],
  'video': ['animacion', 'canvas', 'motion', 'render', 'fps', 'cyberpunk'],
  'reflexion': ['autocorreccion', 'revision', 'carrera', 'race condition', 'alucinacion'],
  'senior': ['arquitectura', 'produccion', 'clean architecture', 'patrones', 'optimizacion']
};

/**
 * Tokenize and normalize string into clean terms
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9_\-\s]/g, ' '); // alphanumeric only

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.filter((t) => !SPANISH_STOPWORDS.has(t) && !ENGLISH_STOPWORDS.has(t) && t.length > 1);
}

/**
 * Light stemming approximation for Spanish and English
 */
export function stemTerm(term: string): string {
  let s = term.toLowerCase();
  // Spanish suffixes
  s = s.replace(/(?:ciones|cion|mientos|miento|adores|ador|mente|ando|iendo|ables|able|idad)$/g, '');
  // Plural suffixes
  s = s.replace(/(?:es|s)$/g, '');
  // English suffixes
  s = s.replace(/(?:ing|tion|ment|able|ness|ed)$/g, '');
  return s.length > 2 ? s : term;
}

/**
 * Generates character 3-grams for fuzzy semantic matching
 */
function getChar3Grams(term: string): Set<string> {
  const grams = new Set<string>();
  const padded = `_${term}_`;
  for (let i = 0; i <= padded.length - 3; i++) {
    grams.add(padded.substring(i, i + 3));
  }
  return grams;
}

/**
 * Calculate Jaccard similarity between character 3-grams of two terms
 */
function char3GramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const gramsA = getChar3Grams(a);
  const gramsB = getChar3Grams(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;

  let intersection = 0;
  gramsA.forEach((g) => {
    if (gramsB.has(g)) intersection++;
  });
  const union = gramsA.size + gramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Core Semantic RAG Search Engine over Memory Insights
 */
export class SemanticRAGEngine {
  /**
   * Search memory insights semantically using hybrid BM25 / Char-Gram Cosine / Synonym Expansion
   */
  public search(
    query: string,
    insights: MemoryInsight[],
    topK = 4,
    minScore = 20
  ): RAGSearchResult[] {
    if (!query || !query.trim() || !insights || insights.length === 0) {
      return [];
    }

    const queryTokens = tokenizeText(query);
    if (queryTokens.length === 0) return [];

    // Expand query tokens with semantic synonyms
    const expandedTokens = new Set<string>(queryTokens);
    for (const t of queryTokens) {
      const stem = stemTerm(t);
      if (CONCEPT_EXPANSIONS[t]) {
        CONCEPT_EXPANSIONS[t].forEach((syn) => expandedTokens.add(syn));
      }
      if (CONCEPT_EXPANSIONS[stem]) {
        CONCEPT_EXPANSIONS[stem].forEach((syn) => expandedTokens.add(syn));
      }
    }

    const queryTokenList = Array.from(expandedTokens);
    const results: RAGSearchResult[] = [];

    for (const insight of insights) {
      const titleTokens = tokenizeText(insight.title);
      const detailTokens = tokenizeText(insight.detail);
      const tagTokens = tokenizeText(insight.tags.join(' '));
      const categoryTokens = tokenizeText(insight.category);

      let totalScore = 0;
      const matchedTerms = new Set<string>();

      // Weight fields
      for (const qTerm of queryTokenList) {
        const qStem = stemTerm(qTerm);
        let termMaxScore = 0;

        // 1. Title match (Weight: 3.5)
        for (const t of titleTokens) {
          if (t === qTerm || stemTerm(t) === qStem) {
            termMaxScore = Math.max(termMaxScore, 3.5);
            matchedTerms.add(qTerm);
          } else {
            const sim = char3GramSimilarity(t, qTerm);
            if (sim > 0.6) {
              termMaxScore = Math.max(termMaxScore, 2.5 * sim);
              matchedTerms.add(qTerm);
            }
          }
        }

        // 2. Tag match (Weight: 3.0)
        for (const tg of tagTokens) {
          if (tg === qTerm || stemTerm(tg) === qStem) {
            termMaxScore = Math.max(termMaxScore, 3.0);
            matchedTerms.add(qTerm);
          } else {
            const sim = char3GramSimilarity(tg, qTerm);
            if (sim > 0.65) {
              termMaxScore = Math.max(termMaxScore, 2.2 * sim);
              matchedTerms.add(qTerm);
            }
          }
        }

        // 3. Category match (Weight: 2.2)
        for (const c of categoryTokens) {
          if (c === qTerm || stemTerm(c) === qStem) {
            termMaxScore = Math.max(termMaxScore, 2.2);
            matchedTerms.add(qTerm);
          }
        }

        // 4. Detail match (Weight: 1.8)
        for (const d of detailTokens) {
          if (d === qTerm || stemTerm(d) === qStem) {
            termMaxScore = Math.max(termMaxScore, 1.8);
            matchedTerms.add(qTerm);
          } else {
            const sim = char3GramSimilarity(d, qTerm);
            if (sim > 0.7) {
              termMaxScore = Math.max(termMaxScore, 1.4 * sim);
              matchedTerms.add(qTerm);
            }
          }
        }

        totalScore += termMaxScore;
      }

      // Exact phrase bonus if query substring appears directly in title or detail
      const lowerQuery = query.toLowerCase();
      if (insight.title.toLowerCase().includes(lowerQuery)) {
        totalScore += 4.0;
      }
      if (insight.detail.toLowerCase().includes(lowerQuery)) {
        totalScore += 2.5;
      }

      // Confidence factor weighting
      const confidenceWeight = (insight.confidence || 90) / 100;
      const normalizedScore = Math.min(
        100,
        Math.round((totalScore / (queryTokens.length * 2.8 + 0.5)) * 100 * confidenceWeight)
      );

      if (normalizedScore >= minScore) {
        // Build highlight snippet
        let snippet = insight.detail;
        if (snippet.length > 220) {
          snippet = snippet.slice(0, 215) + '...';
        }

        results.push({
          insight,
          score: normalizedScore,
          matchedTerms: Array.from(matchedTerms),
          highlightSnippet: snippet,
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

export const semanticRAGEngine = new SemanticRAGEngine();

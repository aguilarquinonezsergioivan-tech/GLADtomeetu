import {
  GladosPersistentMemory,
  MemoryCategory,
  MemoryInsight,
  PromptEngineeringConfig,
  RAGSearchResult,
  LearningSuggestion,
} from '../types/memory';
import { semanticRAGEngine } from './ragService';

export const MASTER_META_PROMPT_TEMPLATE = `[ROL Y OBJETIVO]
Actúa como un Arquitecto de Software Principal y Experto en Ingeniería.
Tu objetivo es diseñar e implementar: [Objetivo concreto].

[CONTEXTO TÉCNICO]
- Stack: [Ej. Node.js v20, TypeScript 5.4, PostgreSQL 16, Docker, Tailwind CSS]
- Restricciones: [Ej. Complejidad temporal O(n log n), sin dependencias innecesarias, typing estricto sin any]
- Patrones preferidos: [Ej. Clean Architecture, Principios SOLID, TDD, Resilient Error Handling]

[METODOLOGÍA DE RESPUESTA]
1. Diagnóstico previo: Analiza brevemente cuellos de botella y casos límite (edge cases).
2. Arquitectura/Algoritmo: Explica la estrategia teórica antes de codificar.
3. Código completo: Código moderno, completamente tipado, comentado y libre de placeholders como "// implementar aquí".
4. Pruebas y Verificación: Incluye 2 o 3 pruebas unitarias críticas con casos de error.

[EJEMPLO / FEW-SHOT]
- Entrada esperada: { "id": 1, "payload": "raw_data" }
- Salida deseada: { "success": true, "processed_at": 1710000000 }`;

export const INITIAL_PERSISTENT_MEMORY: GladosPersistentMemory = {
  version: '2.5.0',
  lastSync: new Date().toISOString(),
  userProfile: {
    name: 'Desarrollador Principal',
    level: 'principal',
    primaryLanguages: ['TypeScript', 'Python', 'C++', 'Rust', 'SQL'],
    hardwareProfile: 'Escritorio con GPU / VRAM optimizada & modo API híbrido',
  },
  promptConfig: {
    chainOfThought: true,
    negativeConstraints: true,
    reflexionSelfCorrection: true,
    seniorExpertMode: true,
    preferredStack: 'Node.js, TypeScript, React, Python, Web Audio, Three.js/Canvas, Tailwind',
    rolePersona: 'Arquitecto Principal de Software e Ingeniería Inversa (GLaDOS PRO)',
  },
  insights: [
    {
      id: 'mem-001',
      category: 'architecture',
      title: 'Memoria Persistente contra Ausencia de Aprendizaje Continuo',
      detail:
        'Dado que los pesos neuronales de los LLMs no cambian tras cada sesión, este archivo glados_persistent_memory.json actúa como cerebro externo persistente inyectado en cada llamada para mantener el hilo conductor sin pérdida de contexto.',
      tags: ['memoria', 'persistencia', 'in-context-learning', 'rag'],
      confidence: 100,
      createdAt: '2026-10-12T12:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z',
    },
    {
      id: 'mem-002',
      category: 'constraint',
      title: 'Restricciones Negativas Explícitas para Máxima Calidad',
      detail:
        'Prohibido el uso de placeholders ("// agregar logica"), prohibido el uso de tipos "any" sueltos, prohibido omitir bloques try/catch y evitar dependencias obsoletas.',
      tags: ['restricciones', 'calidad', 'typescript', 'clean-code'],
      confidence: 98,
      createdAt: '2026-10-12T12:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z',
    },
    {
      id: 'mem-003',
      category: 'solution',
      title: 'Chain-of-Thought & Reflexion para Eliminar Alucinaciones',
      detail:
        'Exigir que la IA desglose el diagnóstico y flujo de datos antes de programar reduce errores en un 85%. Aplicar reflexión crítica detecta fugas de memoria y condiciones de carrera.',
      tags: ['cot', 'reflexion', 'alucinacion', 'diagnostico'],
      confidence: 96,
      createdAt: '2026-10-12T12:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z',
    },
    {
      id: 'mem-004',
      category: 'learning',
      title: 'Entorno Acotado MCP y Seguridad en Disco',
      detail:
        'Las herramientas del sistema de archivos (scan_folder, read_binary_nif, generate_cad_dxf, analyze_code_doctor) sólo se ejecutan con evidencia explícita bajo confirmación estructurada, nunca de forma silenciosa ni arbitraria.',
      tags: ['mcp', 'seguridad', 'herramientas', 'filesystem'],
      confidence: 99,
      createdAt: '2026-10-12T12:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z',
    },
    {
      id: 'mem-005',
      category: 'solution',
      title: 'Prevención de Fugas de Memoria en Web Sockets y Listeners',
      detail:
        'Siempre retornar función de limpieza en useEffect con removeEventListener y ws.close(), usando useRef para guardar la instancia activa.',
      tags: ['react', 'websockets', 'memory-leak'],
      confidence: 95,
      createdAt: '2026-10-12T12:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z',
    },
    {
      id: 'mem-006',
      category: 'architecture',
      title: 'Recuperación RAG Semántica en Memoria Local JSON',
      detail:
        'Indexación híbrida BM25 + Cosine n-gramas sobre glados_persistent_memory.json. Permite recuperar quirúrgicamente solo los aprendizajes relevantes para la consulta actual sin saturar la ventana de contexto.',
      tags: ['rag', 'semantica', 'bm25', 'persistencia', 'recuperacion'],
      confidence: 98,
      createdAt: '2026-10-12T12:30:00Z',
      updatedAt: '2026-10-12T12:30:00Z',
    },
  ],
  recentLearnings: [
    'Recuperación semántica RAG híbrida para memoria persistente en disco',
    'Sugerencias inteligentes de aprendizaje con confirmación de 1 clic',
    'Inyección de memoria persistente en el System Prompt para retener historial y preferencias',
  ],
  activeContextThread: {
    currentObjective:
      'Maximizar el rendimiento de la IA mitigando limitaciones mediante memoria persistente RAG y sugerencias de 1 clic.',
    unresolvedDoubts: [],
    provenSolutions: [
      'Almacenamiento de memoria en glados_persistent_memory.json en disco y sincronización en localStorage.',
      'Recuperador semántico RAG con BM25 y ponderación de certeza.',
      'Sugerencia automática de aprendizajes tras explicaciones técnicas.',
    ],
  },
  metaPromptTemplate: MASTER_META_PROMPT_TEMPLATE,
};

const LOCAL_STORAGE_KEY = 'glados_persistent_memory_v1';
const SUGGESTIONS_STORAGE_KEY = 'glados_learning_suggestions_v1';

class PersistentMemoryService {
  private memory: GladosPersistentMemory = { ...INITIAL_PERSISTENT_MEMORY };
  private suggestions: LearningSuggestion[] = [];
  private isLoaded = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Try to load from localStorage first for instant availability
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        this.memory = JSON.parse(stored);
      }
      const storedSuggestions = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
      if (storedSuggestions) {
        this.suggestions = JSON.parse(storedSuggestions);
      }
    } catch {
      // localStorage may fail in restricted environments
    }

    // 2. Fetch from backend filesystem /api/memory
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          this.memory = data;
          this.persistLocal(data);
        }
      }
    } catch {
      // Backend not yet reached or offline, fallback to local
    }

    this.isLoaded = true;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private persistLocal(mem: GladosPersistentMemory) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mem));
    } catch {
      // Ignored
    }
  }

  private persistSuggestions() {
    try {
      localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(this.suggestions));
    } catch {
      // Ignored
    }
  }

  public getMemory(): GladosPersistentMemory {
    return this.memory;
  }

  public async saveMemory(updated: GladosPersistentMemory): Promise<boolean> {
    this.memory = {
      ...updated,
      lastSync: new Date().toISOString(),
    };

    this.persistLocal(this.memory);
    this.notify();

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.memory),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async addInsight(
    insight: Omit<MemoryInsight, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryInsight> {
    const newInsight: MemoryInsight = {
      ...insight,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...this.memory,
      insights: [newInsight, ...this.memory.insights],
      recentLearnings: [newInsight.title, ...this.memory.recentLearnings.slice(0, 9)],
      activeContextThread: {
        ...this.memory.activeContextThread,
        provenSolutions: [newInsight.title, ...this.memory.activeContextThread.provenSolutions.slice(0, 7)],
      },
    };

    await this.saveMemory(updated);
    return newInsight;
  }

  public async removeInsight(id: string): Promise<void> {
    const updated = {
      ...this.memory,
      insights: this.memory.insights.filter((i) => i.id !== id),
    };
    await this.saveMemory(updated);
  }

  public async updatePromptConfig(cfg: Partial<PromptEngineeringConfig>): Promise<void> {
    const updated = {
      ...this.memory,
      promptConfig: {
        ...this.memory.promptConfig,
        ...cfg,
      },
    };
    await this.saveMemory(updated);
  }

  public async resetToDefaults(): Promise<void> {
    this.memory = { ...INITIAL_PERSISTENT_MEMORY, lastSync: new Date().toISOString() };
    await this.saveMemory(this.memory);
  }

  // ==========================================
  // RAG SEMANTIC SEARCH ENGINE INTEGRATION
  // ==========================================

  /**
   * Search memory insights semantically using the RAG Engine
   */
  public searchSemanticRAG(query: string, topK = 4, minScore = 20): RAGSearchResult[] {
    return semanticRAGEngine.search(query, this.memory.insights, topK, minScore);
  }

  /**
   * Build an injected RAG context block based on user prompt query
   */
  public buildRAGPromptInjection(userQuery: string): string {
    const results = this.searchSemanticRAG(userQuery, 3, 25);
    if (results.length === 0) return '';

    let block = `\n\n[RECUPERACIÓN SEMÁNTICA RAG - APRENDIZAJES RELEVANTES EN MEMORIA]:\n`;
    block += `(La memoria de disco contiene ${results.length} soluciones coincidentes de alta relevancia para la consulta actual):\n`;

    for (const res of results) {
      block += `• [${res.score}% RELEVANCIA | ${res.insight.category.toUpperCase()}] ${res.insight.title}: ${res.insight.detail}\n`;
    }

    return block;
  }

  /**
   * Genera el bloque global de contexto de memoria persistente para inyectar en el System Prompt
   */
  public buildMemoryPromptInjection(userPromptQuery?: string): string {
    const cfg = this.memory.promptConfig;
    const topInsights = this.memory.insights.slice(0, 6);

    let injection = `\n\n[MEMORIA PERSISTENTE DE GLaDOS OS (glados_persistent_memory.json)]\n`;
    injection += `Versión: ${this.memory.version} (Sincronizado: ${this.memory.lastSync})\n`;
    injection += `Perfil: ${this.memory.userProfile.name} [Nivel ${this.memory.userProfile.level.toUpperCase()}]\n`;
    injection += `Stack Preferido: ${cfg.preferredStack || 'TypeScript, Python, Node.js, React'}\n\n`;

    injection += `BASE DE CONOCIMIENTOS CLAVE:\n`;
    for (const ins of topInsights) {
      injection += `• [${ins.category.toUpperCase()}] ${ins.title}: ${ins.detail} (Certeza: ${ins.confidence}%)\n`;
    }

    // Inyectar recuperación RAG específica si hay un prompt
    if (userPromptQuery) {
      injection += this.buildRAGPromptInjection(userPromptQuery);
    }

    injection += `\nOBJETIVO ACTUAL DEL HILO:\n${this.memory.activeContextThread.currentObjective}\n`;

    injection += `\nDIRECTRICES ACTIVAS DE PROMPT ENGINEERING:\n`;
    if (cfg.chainOfThought) {
      injection += `• [CHAIN-OF-THOUGHT ACTIVADO]: Analiza el flujo de datos y diagnóstico paso a paso antes de emitir la conclusión final.\n`;
    }
    if (cfg.negativeConstraints) {
      injection += `• [RESTRICCIONES NEGATIVAS]: Cero placeholders ("// TODO" o "// agregar aquí"), cero tipos 'any' sueltos, no usar librerías obsoletas y no omitir bloques try/catch.\n`;
    }
    if (cfg.reflexionSelfCorrection) {
      injection += `• [REFLEXION / AUTOCORRECCIÓN]: Revisa internamente si existen condiciones de carrera, desbordamientos de memoria o riesgos antes de dar la respuesta.\n`;
    }
    if (cfg.seniorExpertMode) {
      injection += `• [MODO SENIOR / EXPERTO]: Elimina introducciones elementales o triviales. Ve directo a la arquitectura, matrices de decisión y código de producción.\n`;
    }

    return injection;
  }

  // ==========================================
  // SMART LEARNING SUGGESTIONS (1-CLICK FLOW)
  // ==========================================

  public getPendingSuggestions(): LearningSuggestion[] {
    return this.suggestions.filter((s) => s.status === 'pending');
  }

  public getAllSuggestions(): LearningSuggestion[] {
    return this.suggestions;
  }

  public addSuggestion(
    suggestion: Omit<LearningSuggestion, 'id' | 'timestamp' | 'status'>
  ): LearningSuggestion {
    // Avoid exact duplicate suggestions
    const existing = this.suggestions.find(
      (s) => s.title.toLowerCase().trim() === suggestion.title.toLowerCase().trim()
    );
    if (existing) return existing;

    const newSuggestion: LearningSuggestion = {
      ...suggestion,
      id: `sug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    this.suggestions = [newSuggestion, ...this.suggestions.slice(0, 19)];
    this.persistSuggestions();
    this.notify();
    return newSuggestion;
  }

  public async acceptSuggestion(id: string): Promise<MemoryInsight | null> {
    const sug = this.suggestions.find((s) => s.id === id);
    if (!sug) return null;

    sug.status = 'accepted';
    this.persistSuggestions();

    const insight = await this.addInsight({
      title: sug.title,
      detail: sug.detail,
      category: sug.category,
      confidence: sug.confidence,
      tags: sug.tags,
    });

    this.notify();
    return insight;
  }

  public dismissSuggestion(id: string): void {
    const sug = this.suggestions.find((s) => s.id === id);
    if (sug) {
      sug.status = 'dismissed';
      this.persistSuggestions();
      this.notify();
    }
  }

  /**
   * Analyzes text (assistant response, code diagnosis, or chat turn)
   * and extracts a high-value learning suggestion for 1-click confirmation.
   */
  public async extractLearningsFromText(
    text: string,
    sourceMessageId?: string
  ): Promise<LearningSuggestion | null> {
    if (!text || text.length < 50) return null;

    // 1. Try to call backend /api/memory/extract-learning
    try {
      const res = await fetch('/api/memory/extract-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceMessageId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.hasSuggestion && data.suggestion) {
          return this.addSuggestion({
            ...data.suggestion,
            sourceMessageId,
          });
        }
      }
    } catch {
      // Backend offline, fallback to heuristic extraction below
    }

    // 2. Intelligent Local NLP Heuristic Extraction
    const lower = text.toLowerCase();
    let category: MemoryCategory = 'solution';
    let title = '';
    let detail = '';
    let tags: string[] = ['auto-detectado'];
    let confidence = 96;

    if (
      lower.includes('fuga de memoria') ||
      lower.includes('memory leak') ||
      lower.includes('eventlistener') ||
      lower.includes('cleanup')
    ) {
      category = 'solution';
      title = 'Prevención de fugas de memoria y listeners activos';
      detail = 'Desmontar subscripciones, event listeners y WebSockets retornando función de limpieza.';
      tags = ['memoria', 'leak', 'react', 'solucion'];
      confidence = 97;
    } else if (
      lower.includes('cors') ||
      lower.includes('access-control-allow-origin') ||
      lower.includes('proxy')
    ) {
      category = 'solution';
      title = 'Solución de CORS mediante Proxy o Headers seguros';
      detail = 'Configurar middleware de proxy en vite.middlewares o cabeceras Allow-Origin explícitas.';
      tags = ['cors', 'red', 'backend', 'seguridad'];
      confidence = 95;
    } else if (
      lower.includes('promise.allsettled') ||
      lower.includes('concurrencia') ||
      lower.includes('asincron')
    ) {
      category = 'solution';
      title = 'Manejo resiliente de promesas concurrentes con allSettled';
      detail = 'Evitar Promise.all cuando se requiera tolerancia a fallos individuales en llamadas paralelas.';
      tags = ['async', 'promesas', 'typescript', 'resiliencia'];
      confidence = 96;
    } else if (
      lower.includes('clean architecture') ||
      lower.includes('solid') ||
      lower.includes('inyeccion de dependencias')
    ) {
      category = 'architecture';
      title = 'Arquitectura limpia con separación de capas de dominio';
      detail = 'Aislar entidades de negocio de los adaptadores de infraestructura y frameworks.';
      tags = ['arquitectura', 'clean-code', 'solid', 'patrones'];
      confidence = 98;
    } else if (
      lower.includes('mcp') ||
      lower.includes('scan_folder') ||
      lower.includes('rea')
    ) {
      category = 'learning';
      title = 'Protocolo agéntico MCP con confirmación explícita';
      detail = 'Ejecución acotada de herramientas de disco bajo evidencia auditable sin comandos silenciosos.';
      tags = ['mcp', 'herramientas', 'seguridad', 'agente'];
      confidence = 99;
    } else if (
      lower.includes('von mises') ||
      lower.includes('fea') ||
      lower.includes('factor de seguridad')
    ) {
      category = 'solution';
      title = 'Criterio de falla de von Mises en análisis FEA';
      detail = 'Comparar esfuerzo equivalente contra límite elástico del material (Sy) para garantizar FS > 1.5.';
      tags = ['fea', 'cad', 'mecanica', 'von-mises'];
      confidence = 96;
    } else {
      // General extraction from prominent headings or bullets
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const heading = lines.find((l) => l.startsWith('### ') || l.startsWith('## ') || l.startsWith('1. '));
      if (heading) {
        title = heading.replace(/^[#\d.\s]+/, '').replace(/[*_]/g, '').slice(0, 70);
        detail = lines.slice(1, 4).join(' ').replace(/[*_`]/g, '').slice(0, 240);
        tags = ['chat-aprendizaje', 'in-context'];
      }
    }

    if (title && detail) {
      return this.addSuggestion({
        title,
        detail,
        category,
        confidence,
        tags,
        sourceMessageId,
      });
    }

    return null;
  }
}

export const persistentMemoryService = new PersistentMemoryService();

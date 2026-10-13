import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Terminal as TerminalIcon,
  Wrench,
  Database,
  Copy,
  Check,
  Trash2,
  Download,
  Bot,
  User,
  Cpu,
  HelpCircle,
  Code2,
  Compass,
  Brain,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  FileText,
  Sliders,
  ChevronRight,
  BookmarkPlus,
  BookOpen,
  Search,
  Lightbulb,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, ProjectPreset } from '../../types/glados';
import { OrchestratorService } from '../../services/orchestratorService';
import {
  persistentMemoryService,
  MASTER_META_PROMPT_TEMPLATE,
} from '../../services/persistentMemoryService';
import {
  GladosPersistentMemory,
  MemoryCategory,
  MemoryInsight,
  RAGSearchResult,
  LearningSuggestion,
} from '../../types/memory';

interface ChatPanelProps {
  orchestrator: OrchestratorService;
  activeProject: ProjectPreset | null;
}

type PromptCategory = 'solutions' | 'code' | 'modding' | 'mcp_tools';
type MemoryModalTab = 'techniques' | 'insights' | 'rag_search' | 'json' | 'limitations' | 'add_new';

export const ChatPanel: React.FC<ChatPanelProps> = ({
  orchestrator,
  activeProject,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'system',
      content: `[SISTEMA GLaDOS PRO]: Núcleo de IA General & Bucle Agéntico MCP Activado.
• Memoria Persistente en Disco: Vinculada a 'glados_persistent_memory.json'.
• Mitigación de Limitaciones: In-Context Learning + Inyección de Historial + Chain-of-Thought + Restricciones Negativas.
• Modo Asignado: IA Universal (Solución de dudas, arquitectura, depuración y explicaciones senior) + Herramientas MCP autorizadas.`,
      timestamp: new Date().toTimeString().split(' ')[0],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('solutions');
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryModalTab, setMemoryModalTab] = useState<MemoryModalTab>('techniques');
  const [persistentMemory, setPersistentMemory] = useState<GladosPersistentMemory>(
    persistentMemoryService.getMemory()
  );

  // RAG & Smart Learning Suggestions State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<RAGSearchResult[]>(() =>
    persistentMemoryService.searchSemanticRAG('', 6, 10)
  );
  const [pendingSuggestions, setPendingSuggestions] = useState<LearningSuggestion[]>(() =>
    persistentMemoryService.getPendingSuggestions()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExtractingLearning, setIsExtractingLearning] = useState(false);
  const [activeRagMatches, setActiveRagMatches] = useState<RAGSearchResult[]>([]);

  // Form state for adding manual insight
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('solution');
  const [newConfidence, setNewConfidence] = useState(98);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to persistent memory changes (learning additions, suggestions, etc.)
  useEffect(() => {
    const unsub = persistentMemoryService.subscribe(() => {
      setPersistentMemory(persistentMemoryService.getMemory());
      setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
    });
    return () => unsub();
  }, []);

  // Sync memory on mount and whenever modal opens
  useEffect(() => {
    setPersistentMemory(persistentMemoryService.getMemory());
    setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
  }, [showMemoryModal]);

  // Real-time RAG matching when user types prompt
  useEffect(() => {
    if (inputValue.trim().length > 4) {
      const matches = persistentMemoryService.searchSemanticRAG(inputValue, 2, 28);
      setActiveRagMatches(matches);
    } else {
      setActiveRagMatches([]);
    }
  }, [inputValue]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages, isProcessing, pendingSuggestions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmSuggestion = async (id: string) => {
    const saved = await persistentMemoryService.acceptSuggestion(id);
    if (saved) {
      setPersistentMemory(persistentMemoryService.getMemory());
      setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
      showToast(`✓ Aprendizaje guardado en glados_persistent_memory.json: "${saved.title}"`);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    persistentMemoryService.dismissSuggestion(id);
    setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
  };

  const handleManualExtract = async (msgContent: string, msgId?: string) => {
    setIsExtractingLearning(true);
    try {
      const sug = await persistentMemoryService.extractLearningsFromText(msgContent, msgId);
      if (sug) {
        setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
        showToast(`💡 ¡Nuevo aprendizaje detectado y listo para confirmar con 1 clic!`);
      } else {
        showToast('ℹ️ No se detectaron reglas nuevas en este mensaje.');
      }
    } finally {
      setIsExtractingLearning(false);
    }
  };

  const handleRunRAGSearch = (q: string) => {
    setRagQuery(q);
    const results = persistentMemoryService.searchSemanticRAG(q, 8, 15);
    setRagResults(results);
  };

  const handleInjectRAGResultIntoInput = (res: RAGSearchResult) => {
    setInputValue((prev) => {
      const injection = `[Contexto RAG: ${res.insight.title} - ${res.insight.detail}]\n`;
      return prev ? `${injection}\n${prev}` : injection;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    showToast(`✓ Inyectado en el prompt: "${res.insight.title}"`);
  };

  const handleSendCommand = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isProcessing) return;

    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsProcessing(true);

    try {
      await orchestrator.processUserInput(text, messages, (updatedMsg) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === updatedMsg.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedMsg;
            return next;
          }
          return [...prev, updatedMsg];
        });
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'system',
        content: `[SISTEMA]: Conversación reiniciada. La memoria persistente ('glados_persistent_memory.json') sigue activa con ${persistentMemory.insights.length} aprendizajes retenidos. ¿En qué puedo ayudarte?`,
        timestamp: new Date().toTimeString().split(' ')[0],
      },
    ]);
  };

  const handleExportMarkdown = () => {
    const exportText = messages
      .map((m) => {
        const header = m.role === 'user' ? '### 👤 Usuario' : m.role === 'assistant' ? '### 🤖 GLaDOS PRO' : '### ⚙️ Sistema';
        return `${header} (${m.timestamp})\n\n${m.content}\n\n---`;
      })
      .join('\n\n');

    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glados-conversacion-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadMetaPromptTemplate = () => {
    setInputValue(MASTER_META_PROMPT_TEMPLATE);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTogglePromptConfig = async (key: keyof GladosPersistentMemory['promptConfig']) => {
    const current = persistentMemory.promptConfig[key];
    await persistentMemoryService.updatePromptConfig({ [key]: !current });
    setPersistentMemory(persistentMemoryService.getMemory());
  };

  const handleSaveNewInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDetail.trim()) return;

    await persistentMemoryService.addInsight({
      title: newTitle.trim(),
      detail: newDetail.trim(),
      category: newCategory,
      confidence: newConfidence,
      tags: ['manual', newCategory, 'in-context'],
    });

    setPersistentMemory(persistentMemoryService.getMemory());
    setNewTitle('');
    setNewDetail('');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleDeleteInsight = async (id: string) => {
    await persistentMemoryService.removeInsight(id);
    setPersistentMemory(persistentMemoryService.getMemory());
  };

  const handleQuickRememberMessage = async (msg: ChatMessage) => {
    const titleSnippet = msg.content.slice(0, 60).replace(/[#*`\n]/g, ' ').trim();
    const detailSnippet = msg.content.slice(0, 450).trim();

    await persistentMemoryService.addInsight({
      title: `Aprendizaje: ${titleSnippet}...`,
      detail: detailSnippet,
      category: 'solution',
      confidence: 96,
      tags: ['auto-guardado', 'solucion-chat'],
    });

    setPersistentMemory(persistentMemoryService.getMemory());
    setCopiedId(`saved-${msg.id}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadMemoryJson = () => {
    const jsonStr = JSON.stringify(persistentMemory, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glados_persistent_memory.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const promptCategories: Record<PromptCategory, { label: string; icon: React.ReactNode; items: Array<{ title: string; prompt: string }> }> = {
    solutions: {
      label: '💡 Dudas & Soluciones',
      icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
      items: [
        {
          title: '🧠 Fugas de memoria en código',
          prompt: '¿Cómo identificar, diagnosticar y solucionar fugas de memoria (memory leaks) en mi aplicación?',
        },
        {
          title: '🌐 Solución a error de CORS',
          prompt: 'Tengo un error de CORS: "No Access-Control-Allow-Origin header is present". ¿Cómo lo resuelvo tanto en backend como con un proxy frontend?',
        },
        {
          title: '⚡ Asincronismo y Event Loop',
          prompt: 'Explícame cómo funciona el Event Loop y la diferencia clave entre concurrencia y paralelismo con ejemplos prácticos.',
        },
        {
          title: '📐 Esfuerzo de von Mises (FEA)',
          prompt: 'Explícame el cálculo de esfuerzos de von Mises en ingeniería mecánica y cómo se evalúa el factor de seguridad.',
        },
      ],
    },
    code: {
      label: '💻 Código & Arquitectura',
      icon: <Code2 className="w-3.5 h-3.5 text-cyan-400" />,
      items: [
        {
          title: '🐍 Decorador de caché LRU en Python',
          prompt: 'Escribe un decorador elegante en Python con caché de resultados, tipos estrictos y medición de tiempo de ejecución en milisegundos.',
        },
        {
          title: '🔄 Promise.allSettled resiliente',
          prompt: 'Muestra un ejemplo en TypeScript para manejar múltiples peticiones asíncronas concurrentes sin que un fallo bloquee el resto.',
        },
        {
          title: '🏗️ Arquitectura Limpia (Clean Code)',
          prompt: 'Explica los principios de Clean Architecture y cómo estructurar carpetas y capas de dominio en un proyecto real.',
        },
        {
          title: '🎯 Detección de colisiones 3D (AABB)',
          prompt: '¿Cómo programar un algoritmo de detección de colisiones 3D tipo Axis-Aligned Bounding Box (AABB) con vectores matemáticos?',
        },
      ],
    },
    modding: {
      label: '🎮 Modding & Gráficos 3D',
      icon: <Compass className="w-3.5 h-3.5 text-purple-400" />,
      items: [
        {
          title: '📦 Estructura interna de archivo .NIF',
          prompt: 'Explica la estructura interna de los archivos binarios .NIF de Bethesda (nodos, mallas, shaders y texturas DDS).',
        },
        {
          title: '🎨 Formatos de textura DDS (BC7 vs BC5)',
          prompt: '¿Cuáles son las diferencias entre texturas DDS en formatos BC1, BC5 y BC7 y cómo optimizar la VRAM en videojuegos?',
        },
      ],
    },
    mcp_tools: {
      label: '🛠️ Comandos Agénticos (MCP)',
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" />,
      items: [
        {
          title: '📁 Escanear carpeta de proyecto',
          prompt: activeProject
            ? `Por favor, escanea la carpeta de mi proyecto en '${activeProject.rootPath}' y detecta las extensiones de archivo.`
            : 'Por favor, escanea la carpeta de mi proyecto actual.',
        },
        {
          title: '🧪 Inspeccionar NIF binario',
          prompt: 'Por favor, inspecciona el archivo NIF binario PlasmaCarbine_Receiver.nif y evalúa su estructura.',
        },
        {
          title: '📐 Diseñar placa CAD DXF',
          prompt: 'Genera una placa paramétrica en formato DXF con ancho de 160mm, alto de 100mm y barrenos de sujeción.',
        },
        {
          title: '🧠 Auditoría Code Doctor',
          prompt: 'Ejecuta el Code Doctor sobre los módulos internos de GLaDOS OS y propón una refactorización.',
        },
      ],
    },
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] p-4 overflow-hidden select-text relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-[#121c2b] border border-cyan-400 text-cyan-200 text-xs px-4 py-2.5 rounded-md shadow-2xl flex items-center gap-2.5 animate-bounce font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-3 flex flex-wrap items-center justify-between border-b border-[#1f2637] pb-2 font-mono gap-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-200">
            💬 CHAT GENERAL &amp; ASISTENTE INTELIGENTE (GLaDOS PRO)
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 font-semibold">
            IA Universal + MCP
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          {/* RAG Semantic Search Button */}
          <button
            onClick={() => {
              setShowMemoryModal(true);
              setMemoryModalTab('rag_search');
              handleRunRAGSearch(ragQuery);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161226] hover:bg-[#201838] text-purple-300 border border-purple-800/60 hover:border-purple-500 transition-all cursor-pointer shadow-xs group"
            title="Abrir Recuperador RAG Semántico sobre la Memoria JSON"
          >
            <Search className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-[11px]">Búsqueda RAG</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/20 text-purple-300 font-mono">
              BM25
            </span>
          </button>

          {/* Persistent Memory Status Button */}
          <button
            onClick={() => setShowMemoryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131b2c] hover:bg-[#1a253d] text-cyan-300 border border-cyan-800/60 hover:border-cyan-500 transition-all cursor-pointer shadow-xs group"
            title="Abrir Memoria Persistente JSON & Técnicas de Prompting"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-[11px]">Memoria JSON</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-500/20 text-cyan-300 font-mono">
              {persistentMemory.insights.length} aprendizajes
            </span>
          </button>

          {/* Model info pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#121620] px-2 py-1 rounded border border-[#1d2436]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-300">
              Motor: <span className="text-cyan-400 font-semibold">{orchestrator.getModel()}</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportMarkdown}
              title="Exportar conversación como Markdown"
              className="p-1.5 rounded hover:bg-[#1a2233] text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#253047] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearChat}
              title="Limpiar conversación (la memoria JSON permanece intacta)"
              className="p-1.5 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-900/40 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Prompt Engineering Active Toggles Strip */}
      <div className="mb-2 bg-[#0a0d13] border border-[#1b2336] rounded px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-slate-500 flex items-center gap-1 font-semibold shrink-0">
            <Sliders className="w-3 h-3 text-cyan-400" />
            In-Context Directivas:
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors select-none shrink-0">
            <input
              type="checkbox"
              checked={persistentMemory.promptConfig.chainOfThought}
              onChange={() => handleTogglePromptConfig('chainOfThought')}
              className="rounded bg-[#151c2a] border-[#29364f] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Chain-of-Thought</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors select-none shrink-0">
            <input
              type="checkbox"
              checked={persistentMemory.promptConfig.negativeConstraints}
              onChange={() => handleTogglePromptConfig('negativeConstraints')}
              className="rounded bg-[#151c2a] border-[#29364f] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Restricciones Negativas</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors select-none shrink-0">
            <input
              type="checkbox"
              checked={persistentMemory.promptConfig.reflexionSelfCorrection}
              onChange={() => handleTogglePromptConfig('reflexionSelfCorrection')}
              className="rounded bg-[#151c2a] border-[#29364f] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Reflexion</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors select-none shrink-0">
            <input
              type="checkbox"
              checked={persistentMemory.promptConfig.seniorExpertMode}
              onChange={() => handleTogglePromptConfig('seniorExpertMode')}
              className="rounded bg-[#151c2a] border-[#29364f] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Modo Senior</span>
          </label>
        </div>

        <button
          onClick={handleLoadMetaPromptTemplate}
          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px] bg-amber-950/30 hover:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40 cursor-pointer shrink-0 transition-all"
        >
          <FileText className="w-3 h-3" />
          <span>Cargar Plantilla Meta-Prompt</span>
        </button>
      </div>

      {/* Smart Learning Suggestions Banner (1-Click Confirmation) */}
      {pendingSuggestions.length > 0 && (
        <div className="mb-2 p-3 rounded-md bg-[#101928] border border-cyan-500/70 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
                  💡 Aprendizaje Sugerido por IA
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {pendingSuggestions[0].confidence}% Certeza
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#192438] text-cyan-200">
                  {pendingSuggestions[0].category}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 mt-1">{pendingSuggestions[0].title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{pendingSuggestions[0].detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono">
            <button
              onClick={() => handleConfirmSuggestion(pendingSuggestions[0].id)}
              className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar en Memoria (1 Clic)</span>
            </button>
            <button
              onClick={() => handleDismissSuggestion(pendingSuggestions[0].id)}
              className="p-1.5 rounded hover:bg-[#1a2334] text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Ignorar sugerencia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Terminal / Chat View */}
      <div
        ref={terminalRef}
        className="flex-1 bg-[#090b0e] border border-[#1f2637] rounded-md p-4 overflow-y-auto text-xs text-slate-300 space-y-4 shadow-inner"
      >
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div
                key={msg.id}
                className="text-emerald-300 border-l-2 border-emerald-500 pl-3 py-2 bg-emerald-950/20 rounded-r border-t border-r border-b border-emerald-900/30"
              >
                <div className="text-[10px] text-emerald-400/90 mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold">
                    <User className="w-3 h-3 text-emerald-400" />
                    [USUARIO]
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-emerald-100">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.isAgenticProcess) {
            const isToolCall = msg.content.includes('[ORQUESTADOR]');
            const isEvidence = msg.content.includes('EVIDENCE');
            return (
              <div
                key={msg.id}
                className={`text-xs pl-3 py-2 rounded-r border-l-2 font-mono ${
                  isToolCall
                    ? 'border-amber-500 bg-amber-950/25 text-amber-300 font-semibold flex items-start gap-2'
                    : isEvidence
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-purple-500 bg-purple-950/20 text-purple-300 italic'
                }`}
              >
                {isToolCall && <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                {isEvidence && <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />}
                <div className="flex-1 whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            );
          }

          if (msg.role === 'assistant') {
            const isSaved = copiedId === `saved-${msg.id}`;
            const inlineSug = pendingSuggestions.find((s) => s.sourceMessageId === msg.id);

            return (
              <div
                key={msg.id}
                className="text-slate-100 border-l-2 border-cyan-400 pl-3.5 py-3 bg-[#111520] rounded-r border-t border-r border-b border-[#1b2336] shadow-sm group/msg"
              >
                <div className="text-[10px] text-cyan-400 font-mono font-bold mb-2 flex items-center justify-between border-b border-[#1c2438] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>[GLaDOS PRO]:</span>
                    <span className="text-[9px] text-slate-500 font-normal">IA &amp; Razonador</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-normal">{msg.timestamp}</span>

                    {/* Quick Save to Persistent Memory Button */}
                    <button
                      onClick={() => handleQuickRememberMessage(msg)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer text-[10px] ${
                        isSaved
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : 'hover:bg-[#1c2438] text-slate-400 hover:text-cyan-300'
                      }`}
                      title="Guardar solución clave en glados_persistent_memory.json"
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>¡En Memoria JSON!</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3 text-cyan-400" />
                          <span className="hidden sm:inline">Guardar en Memoria</span>
                        </>
                      )}
                    </button>

                    {/* Extract learning with AI */}
                    <button
                      onClick={() => handleManualExtract(msg.content, msg.id)}
                      disabled={isExtractingLearning}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#1c2438] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer text-[10px]"
                      title="Analizar y extraer aprendizaje clave con IA"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Extraer con IA</span>
                    </button>

                    <button
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="p-1 rounded hover:bg-[#1c2438] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Copiar texto completo"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Formatted Markdown Content */}
                <div className="font-sans text-xs leading-relaxed text-slate-200">
                  <MarkdownRenderer content={msg.content} />
                </div>

                {/* Inline 1-Click Learning Suggestion for this message */}
                {inlineSug && (
                  <div className="mt-3 p-2.5 rounded bg-[#0d1624] border border-cyan-600/70 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-slate-200">
                        Sugerencia detectada: <strong className="text-cyan-300">{inlineSug.title}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleConfirmSuggestion(inlineSug.id)}
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer text-[10px] flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3 h-3" />
                        <span>Guardar (1 Clic)</span>
                      </button>
                      <button
                        onClick={() => handleDismissSuggestion(inlineSug.id)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        title="Descartar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="text-slate-400 border-l-2 border-slate-600 pl-2.5 py-1.5 bg-slate-900/30 rounded-r text-[11px] font-mono whitespace-pre-wrap leading-relaxed"
            >
              {msg.content}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2.5 text-cyan-400 font-mono text-xs py-2 bg-cyan-950/20 px-3 rounded border border-cyan-900/40 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>[GLaDOS procesando con memoria persistente: razonando flujo CoT, aplicando restricciones y compilando respuesta...]</span>
          </div>
        )}
      </div>

      {/* Categorized Quick Prompts Bar */}
      <div className="mt-2.5 space-y-1.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1b2336] pb-1 text-[11px] font-mono overflow-x-auto">
          <span className="text-slate-500 shrink-0 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Sugerencias:
          </span>
          {(Object.keys(promptCategories) as PromptCategory[]).map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 rounded text-[11px] shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161c28]'
                }`}
              >
                {promptCategories[cat].icon}
                <span>{promptCategories[cat].label}</span>
              </button>
            );
          })}
        </div>

        {/* Chips for Active Category */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
          {promptCategories[activeCategory].items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendCommand(item.prompt)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded bg-[#141924] hover:bg-[#1d2537] text-slate-300 hover:text-cyan-300 border border-[#20293d] shrink-0 transition-colors cursor-pointer disabled:opacity-50 text-left"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Live Active RAG Context Matcher */}
      {activeRagMatches.length > 0 && (
        <div className="mt-1.5 px-3 py-1.5 bg-[#121124] border border-purple-800/60 rounded flex items-center justify-between text-[11px] font-mono text-purple-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="flex items-center gap-1 text-purple-300 font-bold shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              RAG Activo ({activeRagMatches.length} coincidencias):
            </span>
            {activeRagMatches.map((m, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50 shrink-0 text-[10px] flex items-center gap-1 cursor-pointer hover:border-purple-400"
                onClick={() => handleInjectRAGResultIntoInput(m)}
                title={`Haz clic para inyectar este detalle en tu prompt:\n${m.insight.detail}`}
              >
                <span className="font-bold text-emerald-400">{m.score}%</span>
                <span>{m.insight.title.slice(0, 30)}...</span>
              </span>
            ))}
          </div>
          <span className="text-[10px] text-purple-400 shrink-0 hidden sm:inline">
            Inyectado en System Prompt
          </span>
        </div>
      )}

      {/* Input Frame */}
      <div className="mt-2 flex items-end gap-2">
        <div className="relative flex-1 bg-[#12161f] border border-[#252f44] focus-within:border-cyan-500 rounded p-1.5 transition-colors">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Pregúntame cualquier duda, pide soluciones técnicas, código, o ejecuta comandos... (Shift+Enter para nueva línea)"
            className="w-full bg-transparent resize-none focus:outline-hidden text-xs font-sans text-slate-100 placeholder-slate-500 transition-colors leading-relaxed px-1"
          />
          <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-slate-500 font-mono border-t border-[#1a2130]">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                Presiona <kbd className="px-1 py-0.2 bg-[#1b2230] rounded text-slate-300">Enter ↵</kbd>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400/80">
                Memoria Activa: {persistentMemory.insights.length} reglas inyectadas
              </span>
            </div>
            <span>{inputValue.length} caracteres</span>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={() => handleSendCommand()}
          disabled={!inputValue.trim() || isProcessing}
          className="w-28 h-14 flex flex-col items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#18202d] disabled:text-slate-600 text-white font-mono text-xs font-semibold rounded transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>Enviar</span>
        </button>
      </div>

      {/* Persistent Memory & Prompt Engineering Modal */}
      {showMemoryModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-[#25324a] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#121722] border-b border-[#212b3d] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Memoria Persistente JSON &amp; In-Context Learning</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                      glados_persistent_memory.json
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mitigación de límites de LLMs mediante memoria externa persistente y técnicas de alto rendimiento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="p-1 rounded hover:bg-[#1f283a] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="flex items-center gap-2 px-5 py-2 bg-[#0b0e14] border-b border-[#1c2434] text-xs font-mono overflow-x-auto">
              <button
                onClick={() => setMemoryModalTab('techniques')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'techniques'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Técnicas de Razonamiento (CoT/Reflexion)</span>
              </button>

              <button
                onClick={() => setMemoryModalTab('insights')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'insights'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Aprendizajes en Memoria ({persistentMemory.insights.length})</span>
              </button>

              <button
                onClick={() => {
                  setMemoryModalTab('rag_search');
                  handleRunRAGSearch(ragQuery);
                }}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'rag_search'
                    ? 'bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Búsqueda RAG Semántica</span>
              </button>

              <button
                onClick={() => setMemoryModalTab('add_new')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'add_new'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Aprendizaje</span>
              </button>

              <button
                onClick={() => setMemoryModalTab('json')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'json'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Visor JSON en Disco</span>
              </button>

              <button
                onClick={() => setMemoryModalTab('limitations')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                  memoryModalTab === 'limitations'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Límites &amp; Mitigaciones</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300 space-y-4">
              {/* TAB 1: TECHNIQUES */}
              {memoryModalTab === 'techniques' && (
                <div className="space-y-4">
                  <div className="bg-[#131926] p-4 rounded-md border border-[#222c3d]">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Técnicas Clave para Elevar el Nivel de Respuesta (In-Context Learning)
                    </h4>
                    <p className="text-slate-300 leading-relaxed mb-4">
                      Dado que los pesos de la red neuronal no cambian en tiempo real, estas técnicas modifican la
                      dinámica de atención del modelo forzándolo a pensar antes de emitir código, filtrando malas
                      prácticas y evaluando fallos.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* CoT */}
                      <div className="bg-[#0c1017] p-3.5 rounded border border-[#1e2738] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs">1. Exigir Razonamiento Previo (CoT)</span>
                          <input
                            type="checkbox"
                            checked={persistentMemory.promptConfig.chainOfThought}
                            onChange={() => handleTogglePromptConfig('chainOfThought')}
                            className="rounded bg-[#1a2334] border-[#313f59] text-cyan-500 w-4 h-4"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Agrega la directiva: <em>"Analiza el flujo de datos paso a paso antes de emitir la solución final"</em>.
                          Reduce drásticamente los errores lógicos y falsas asunciones.
                        </p>
                      </div>

                      {/* Restricciones Negativas */}
                      <div className="bg-[#0c1017] p-3.5 rounded border border-[#1e2738] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs">2. Restricciones Negativas Explícitas</span>
                          <input
                            type="checkbox"
                            checked={persistentMemory.promptConfig.negativeConstraints}
                            onChange={() => handleTogglePromptConfig('negativeConstraints')}
                            className="rounded bg-[#1a2334] border-[#313f59] text-cyan-500 w-4 h-4"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Indica lo que <strong>NO</strong> se tolera: <em>"Cero placeholders, cero dependencias obsoletas, sin tipos 'any' sueltos y no omitir bloques try/catch"</em>.
                        </p>
                      </div>

                      {/* Reflexion */}
                      <div className="bg-[#0c1017] p-3.5 rounded border border-[#1e2738] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs">3. Crítica / Autocorrección (Reflexion)</span>
                          <input
                            type="checkbox"
                            checked={persistentMemory.promptConfig.reflexionSelfCorrection}
                            onChange={() => handleTogglePromptConfig('reflexionSelfCorrection')}
                            className="rounded bg-[#1a2334] border-[#313f59] text-cyan-500 w-4 h-4"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Fuerza al modelo a auditarse a sí mismo: <em>"Identifica si existe alguna condición de carrera, vulnerabilidad de memoria o fuga de recursos"</em>.
                        </p>
                      </div>

                      {/* Modo Senior */}
                      <div className="bg-[#0c1017] p-3.5 rounded border border-[#1e2738] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs">4. Modo Experto / Nivel Senior</span>
                          <input
                            type="checkbox"
                            checked={persistentMemory.promptConfig.seniorExpertMode}
                            onChange={() => handleTogglePromptConfig('seniorExpertMode')}
                            className="rounded bg-[#1a2334] border-[#313f59] text-cyan-500 w-4 h-4"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Elimina explicaciones introductorias elementales o triviales. Va directo a la arquitectura,
                          matrices de decisión y código de producción listo para usar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plantilla Meta-Prompt */}
                  <div className="bg-[#111622] p-4 rounded-md border border-[#1f283b] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-400" />
                        🛠️ Plantilla de Prompt Maestro (Meta-Prompt)
                      </h4>
                      <button
                        onClick={handleLoadMetaPromptTemplate}
                        className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/60 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>Insertar en el Chat</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-[#080a0e] rounded text-[11px] font-mono text-slate-300 overflow-x-auto border border-[#1c2436] leading-relaxed">
                      {MASTER_META_PROMPT_TEMPLATE}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: INSIGHTS LIST */}
              {memoryModalTab === 'insights' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1c2438]">
                    <span className="text-slate-400">
                      Total de conocimientos activos en <code>glados_persistent_memory.json</code>: {persistentMemory.insights.length}
                    </span>
                    <button
                      onClick={() => setMemoryModalTab('add_new')}
                      className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo Aprendizaje</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {persistentMemory.insights.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#121620] border border-[#212b3d] rounded-md p-3.5 hover:border-cyan-700/50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                              {item.category}
                            </span>
                            <h5 className="font-bold text-slate-100 text-xs">{item.title}</h5>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-emerald-400">
                              {item.confidence}% certeza
                            </span>
                            <button
                              onClick={() => handleDeleteInsight(item.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar aprendizaje"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed">{item.detail}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-500 font-mono">
                          {item.tags.map((t, idx) => (
                            <span key={idx} className="bg-[#18202d] px-1.5 py-0.2 rounded text-slate-400">
                              #{t}
                            </span>
                          ))}
                          <span className="ml-auto text-slate-600">ID: {item.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: RAG SEMANTIC SEARCH */}
              {memoryModalTab === 'rag_search' && (
                <div className="space-y-4">
                  {/* Search Engine Header & Query Box */}
                  <div className="bg-[#131224] p-4 rounded-md border border-[#2a2245] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-bold text-white">
                          Motor de Recuperación Semántica RAG (BM25 + Cosine n-gram)
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {persistentMemory.insights.length} documentos indexados
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      El algoritmo indexa los campos <code>title</code>, <code>tags</code>, <code>category</code> y <code>detail</code> de{' '}
                      <code>glados_persistent_memory.json</code>. Evalúa relevancia semántica en tiempo real y devuelve las directivas
                      con mayor concordancia para inyectar en el prompt.
                    </p>

                    {/* Search Input Box */}
                    <div className="relative">
                      <input
                        type="text"
                        value={ragQuery}
                        onChange={(e) => {
                          setRagQuery(e.target.value);
                          handleRunRAGSearch(e.target.value);
                        }}
                        placeholder="Busca por duda, concepto o regla (ej: 'fugas de memoria en react', 'restricciones negativas', 'cad von mises')..."
                        className="w-full bg-[#0a0914] border border-[#2d2250] focus:border-purple-500 rounded px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 font-sans"
                      />
                      <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
                      {ragQuery && (
                        <button
                          onClick={() => {
                            setRagQuery('');
                            handleRunRAGSearch('');
                          }}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Query Test Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-500">Consultas de prueba:</span>
                      {[
                        'Fugas de memoria y listeners',
                        'Restricciones negativas sin placeholders',
                        'Entorno acotado MCP en disco',
                        'Chain of Thought y Reflexion',
                        'Esfuerzo de von Mises en FEA',
                        'WebSockets y limpieza useEffect',
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setRagQuery(chip);
                            handleRunRAGSearch(chip);
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1833] hover:bg-[#28224a] text-purple-200 border border-[#2f2757] cursor-pointer transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>Resultados relevantes recuperados: {ragResults.length}</span>
                      <span className="text-purple-400">Umbral de coincidencia RAG</span>
                    </div>

                    {ragResults.length > 0 ? (
                      <div className="space-y-2.5">
                        {ragResults.map((res, idx) => (
                          <div
                            key={idx}
                            className="bg-[#10121d] border border-[#24263f] hover:border-purple-600/60 rounded-md p-3.5 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                  {res.insight.category}
                                </span>
                                <h5 className="font-bold text-slate-100 text-xs">{res.insight.title}</h5>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono">
                                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>{res.score}% Match</span>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar of relevance */}
                            <div className="w-full bg-[#181a2b] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all"
                                style={{ width: `${res.score}%` }}
                              />
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed">{res.insight.detail}</p>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px]">
                              <div className="flex flex-wrap items-center gap-1 text-slate-400">
                                {res.insight.tags.map((t, tIdx) => (
                                  <span key={tIdx} className="bg-[#181c2b] px-1.5 py-0.2 rounded text-slate-300">
                                    #{t}
                                  </span>
                                ))}
                                {res.matchedTerms.length > 0 && (
                                  <span className="text-purple-400 ml-1">
                                    (Términos: {res.matchedTerms.join(', ')})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    handleInjectRAGResultIntoInput(res);
                                    setShowMemoryModal(false);
                                  }}
                                  className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/60 cursor-pointer flex items-center gap-1 transition-colors"
                                  title="Inyectar esta regla en el prompt del chat"
                                >
                                  <ChevronRight className="w-3 h-3 text-purple-300" />
                                  <span>Inyectar en Chat</span>
                                </button>
                                <button
                                  onClick={() => handleCopyText(`rag-${res.insight.id}`, res.insight.detail)}
                                  className="px-2 py-1 rounded bg-[#161a29] hover:bg-[#20263c] text-slate-300 cursor-pointer flex items-center gap-1"
                                >
                                  {copiedId === `rag-${res.insight.id}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copiado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-[#0a0d14] rounded border border-[#1b2234] text-slate-500 font-mono text-xs">
                        No se encontraron resultados para "{ragQuery}". Prueba con términos como "memoria", "fuga", "mcp", "cot" o "arquitectura".
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ADD NEW INSIGHT */}
              {memoryModalTab === 'add_new' && (
                <form onSubmit={handleSaveNewInsight} className="space-y-3.5 max-w-xl mx-auto py-2">
                  <div className="bg-[#131926] p-4 rounded border border-[#222c3d]">
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <BookmarkPlus className="w-4 h-4 text-cyan-400" />
                      Registrar Nuevo Aprendizaje o Solución en Memoria
                    </h4>
                    <p className="text-slate-400 text-xs mb-3">
                      Todo lo que registres aquí se guardará físicamente en el disco duro y se inyectará en cada turno de
                      la IA para que no olvide el hilo conductor ni las reglas de tu arquitectura.
                    </p>

                    {saveSuccessMsg && (
                      <div className="mb-3 p-2.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-mono text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>¡Guardado con éxito en glados_persistent_memory.json y sincronizado!</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">
                          Título del Conocimiento / Solución:
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="ej: Algoritmo de detección de colisiones optimizado sin O(n²)"
                          className="w-full bg-[#0a0d13] border border-[#252f44] focus:border-cyan-500 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">Categoría:</label>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                            className="w-full bg-[#0a0d13] border border-[#252f44] focus:border-cyan-500 rounded px-2.5 py-2 text-xs text-slate-200"
                          >
                            <option value="solution">Solución Técnica (Solution)</option>
                            <option value="architecture">Arquitectura (Architecture)</option>
                            <option value="constraint">Restricción (Constraint)</option>
                            <option value="learning">Aprendizaje (Learning)</option>
                            <option value="preference">Preferencia (Preference)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">
                            Nivel de Certeza (%): {newConfidence}%
                          </label>
                          <input
                            type="range"
                            min="80"
                            max="100"
                            value={newConfidence}
                            onChange={(e) => setNewConfidence(Number(e.target.value))}
                            className="w-full accent-cyan-400 mt-2 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">
                          Detalle / Regla Concreta / Implementación:
                        </label>
                        <textarea
                          rows={4}
                          value={newDetail}
                          onChange={(e) => setNewDetail(e.target.value)}
                          placeholder="Describe la solución exacta, la regla que debe recordar, o el patrón de código validado..."
                          className="w-full bg-[#0a0d13] border border-[#252f44] focus:border-cyan-500 rounded px-3 py-2 text-xs text-white placeholder-slate-500 leading-relaxed resize-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Guardar Permanentemente en Disco</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 4: JSON VIEWER */}
              {memoryModalTab === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1c2438]">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-400" />
                      <span className="font-mono text-slate-300 text-xs">
                        Ubicación: <code>./glados_persistent_memory.json</code>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadMemoryJson}
                        className="px-2.5 py-1 rounded bg-[#18202d] hover:bg-[#222c3d] text-slate-300 hover:text-white border border-[#2c384e] font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar JSON</span>
                      </button>
                      <button
                        onClick={() => handleCopyText('json-full', JSON.stringify(persistentMemory, null, 2))}
                        className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'json-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'json-full' ? 'Copiado' : 'Copiar JSON'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 bg-[#07090d] rounded-md border border-[#1e2638] text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[55vh] leading-relaxed shadow-inner">
                    {JSON.stringify(persistentMemory, null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB 5: LIMITATIONS & MITIGATIONS */}
              {memoryModalTab === 'limitations' && (
                <div className="space-y-3.5">
                  <div className="bg-[#131926] p-4 rounded border border-[#222c3d]">
                    <h4 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Auditoría de Límites Operativos &amp; Mitigaciones Implementadas
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed mb-4">
                      Los Modelos de Lenguaje (LLMs) tienen restricciones intrínsecas de arquitectura. Esta es la
                      matriz exacta de cómo GLaDOS OS las neutraliza:
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-[#0a0d13] rounded border border-[#1d2538] space-y-1">
                        <div className="font-bold text-rose-400 text-xs">
                          1. Límite: Ausencia de Aprendizaje Persistente Continuo
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          <em>Causa:</em> Los pesos neuronales no se actualizan tras cada sesión.
                          <br />
                          <strong className="text-emerald-400">🛡️ Mitigación:</strong> El archivo{' '}
                          <code>glados_persistent_memory.json</code> almacena de forma acumulativa todas las
                          soluciones, reglas y preferencias, y se inyecta dinámicamente en el System Prompt en cada
                          interacción.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0a0d13] rounded border border-[#1d2538] space-y-1">
                        <div className="font-bold text-rose-400 text-xs">
                          2. Límite: Entorno de Ejecución Acotado (MCP)
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          <em>Causa:</em> No se deben ejecutar comandos silenciosos no supervisados.
                          <br />
                          <strong className="text-emerald-400">🛡️ Mitigación:</strong> Protocolo REA (Reasoning,
                          Execution, Action) con herramientas explícitas autorizadas (<code>scan_folder</code>,{' '}
                          <code>read_binary_nif</code>, <code>generate_cad_dxf</code>, <code>analyze_code_doctor</code>)
                          que devuelven evidencia auditable en la terminal.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0a0d13] rounded border border-[#1d2538] space-y-1">
                        <div className="font-bold text-rose-400 text-xs">
                          3. Límite: Corte de Conocimiento &amp; Datos Privados
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          <em>Causa:</em> La IA no conoce repositorios privados ni datos locales sin contexto.
                          <br />
                          <strong className="text-emerald-400">🛡️ Mitigación:</strong> In-Context Learning mediante
                          la Plantilla Meta-Prompt, Few-Shot Prompting y lectura de archivos de proyecto en tiempo real.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0a0d13] rounded border border-[#1d2538] space-y-1">
                        <div className="font-bold text-rose-400 text-xs">
                          4. Límite: Alucinación en Casos Extremos
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          <em>Causa:</em> Respuestas plausibles pero matemáticamente o lógicamente erróneas en APIs
                          oscuras.
                          <br />
                          <strong className="text-emerald-400">🛡️ Mitigación:</strong> Cadena de Razonamiento
                          (Chain-of-Thought) obligatoria para desglosar el flujo antes de codificar, más paso de
                          Reflexion (autocorrección crítica previa a la respuesta).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#111622] border-t border-[#1e2637] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Archivo: <span className="text-cyan-400 font-bold">glados_persistent_memory.json</span> (v{persistentMemory.version})
              </span>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer transition-colors"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Lightweight Markdown & Code Renderer for Assistant Messages
 */
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Split by code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_\-#+]*)\n([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'plaintext',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <div
              key={idx}
              className="my-2.5 rounded-md overflow-hidden border border-[#222c3f] bg-[#07090c] shadow-md font-mono text-xs"
            >
              {/* Code Header Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#10141d] border-b border-[#1d2536] text-[11px] text-slate-400">
                <span className="text-cyan-400 font-semibold">{part.lang}</span>
                <button
                  onClick={() => handleCopyCode(part.content, idx)}
                  className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-[#1a2336] transition-colors cursor-pointer text-[10px]"
                >
                  {copiedCodeIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Body */}
              <pre className="p-3 overflow-x-auto text-slate-200 text-xs leading-relaxed">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        // Render plain text paragraphs with formatting
        const lines = part.content.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1.5" />;
              }

              // Heading 3: ###
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={lIdx} className="text-sm font-bold text-cyan-300 pt-2 pb-0.5 flex items-center gap-1.5">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }

              // Heading 2: ##
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={lIdx} className="text-base font-bold text-white pt-2.5 pb-1 border-b border-[#1c2438]">
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }

              // Heading 1: #
              if (trimmed.startsWith('# ')) {
                return (
                  <h1 key={lIdx} className="text-lg font-bold text-white pt-3 pb-1 border-b border-[#252f44]">
                    {trimmed.replace('# ', '')}
                  </h1>
                );
              }

              // Divider: ---
              if (trimmed === '---') {
                return <hr key={lIdx} className="border-[#1e2638] my-2" />;
              }

              // Bullet item: - or *
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const itemText = trimmed.replace(/^[-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-cyan-400 shrink-0 font-bold">•</span>
                    <span className="leading-relaxed">{renderInlineFormatting(itemText)}</span>
                  </div>
                );
              }

              // Numbered item: 1. 2.
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-cyan-400 font-mono font-semibold shrink-0">{numMatch[1]}.</span>
                    <span className="leading-relaxed">{renderInlineFormatting(numMatch[2])}</span>
                  </div>
                );
              }

              // Blockquote: >
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote
                    key={lIdx}
                    className="border-l-2 border-cyan-500 pl-3 py-1 bg-cyan-950/20 text-cyan-200 italic my-1 rounded-r"
                  >
                    {renderInlineFormatting(trimmed.replace('> ', ''))}
                  </blockquote>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Parses bold (**text**), inline code (`code`), and italic (*text*)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const tokens = text.split(inlineRegex);

  return (
    <>
      {tokens.map((token, i) => {
        if (!token) return null;
        if (token.startsWith('`') && token.endsWith('`')) {
          return (
            <code
              key={i}
              className="bg-[#1b2233] text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-cyan-900/40"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        if (token.startsWith('**') && token.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-white">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return (
            <em key={i} className="italic text-slate-300">
              {token.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Stethoscope,
  FolderSearch,
  BookOpen,
  Terminal,
  FileCheck,
  CheckCircle,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Send,
  ShieldCheck,
  FilePlus,
  RotateCcw,
  Search,
  Brain,
  Lightbulb,
  Check,
  Copy,
  Plus,
  X,
  Sliders,
} from 'lucide-react';
import {
  LearningProposal,
  ProjectPreset,
  TestSuiteResult,
} from '../../types/glados';
import { learningService } from '../../services/learningService';
import { loggerService } from '../../services/loggerService';
import { persistentMemoryService } from '../../services/persistentMemoryService';
import {
  GladosPersistentMemory,
  LearningSuggestion,
  RAGSearchResult,
  MemoryInsight,
} from '../../types/memory';

interface LearningPanelProps {
  activeProject: ProjectPreset | null;
}

export const LearningPanel: React.FC<LearningPanelProps> = ({ activeProject }) => {
  const [activeMode, setActiveMode] = useState<'doctor' | 'tester' | 'journal' | 'rag_memory'>('doctor');
  const [outputTerminal, setOutputTerminal] = useState<string>(
    `[SISTEMA]: Motor de Auto-Aprendizaje (Learning Engine v3.2) activo.
Opciones disponibles:
1. DOCTOR: Detección de cuellos de botella en VRAM, dependencias circulares y refactorización.
2. TESTER: Ejecución automatizada de pruebas unitarias, contratos MCP y límites matemáticos.
3. JOURNAL: Bitácora de parches históricos registrados en disco con Nivel de Certeza.
4. RAG MEMORY: Motor de recuperación semántica sobre glados_persistent_memory.json y sugerencias con 1 clic.`
  );
  const [isBusy, setIsBusy] = useState(false);
  const [proposals, setProposals] = useState<LearningProposal[]>(() =>
    learningService.getProposals()
  );
  const [selectedProposal, setSelectedProposal] = useState<LearningProposal | null>(
    null
  );
  const [testResult, setTestResult] = useState<TestSuiteResult | null>(null);

  // Persistent Memory & RAG State
  const [persistentMemory, setPersistentMemory] = useState<GladosPersistentMemory>(() =>
    persistentMemoryService.getMemory()
  );
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<RAGSearchResult[]>(() =>
    persistentMemoryService.searchSemanticRAG('', 8, 10)
  );
  const [pendingSuggestions, setPendingSuggestions] = useState<LearningSuggestion[]>(() =>
    persistentMemoryService.getPendingSuggestions()
  );
  const [selectedMemoryInsight, setSelectedMemoryInsight] = useState<MemoryInsight | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct Learning Request State
  const [learningGoalInput, setLearningGoalInput] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = persistentMemoryService.subscribe(() => {
      setPersistentMemory(persistentMemoryService.getMemory());
      setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmSuggestion = async (id: string) => {
    const saved = await persistentMemoryService.acceptSuggestion(id);
    if (saved) {
      setPersistentMemory(persistentMemoryService.getMemory());
      setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
      showToast(`✓ Guardado con 1 clic en glados_persistent_memory.json: "${saved.title}"`);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    persistentMemoryService.dismissSuggestion(id);
    setPendingSuggestions(persistentMemoryService.getPendingSuggestions());
  };

  const handleRunRAGSearch = (q: string) => {
    setRagQuery(q);
    const results = persistentMemoryService.searchSemanticRAG(q, 10, 15);
    setRagResults(results);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnalyzeGlados = async () => {
    setIsBusy(true);
    setOutputTerminal((prev) => prev + '\n\n[SISTEMA] Iniciando escaneo de módulos del núcleo GLaDOS OS. Por favor espera...');
    try {
      const report = await learningService.analyzeGladosCore();
      setOutputTerminal((prev) => prev + '\n\n' + report);
      setProposals(learningService.getProposals());
    } finally {
      setIsBusy(false);
    }
  };

  const handleAnalyzeProject = async () => {
    setIsBusy(true);
    setOutputTerminal((prev) => prev + `\n\n[SISTEMA] Conectando 'Project Doctor' para ${activeProject?.name || 'Workspace'}...`);
    try {
      const report = await learningService.analyzeProject(activeProject);
      setOutputTerminal((prev) => prev + '\n\n' + report);
      setProposals(learningService.getProposals());
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunTester = async () => {
    setIsBusy(true);
    try {
      const res = await learningService.runTestSuite();
      setTestResult(res);
      setOutputTerminal((prev) => prev + `\n\n[TESTER]: Suite '${res.suiteName}' completada en ${res.durationMs}ms. ${res.passed}/${res.totalTests} pruebas superadas.`);
    } finally {
      setIsBusy(false);
    }
  };

  // Submit Natural Language Change / Scaffolding Request to Learning Engine
  const handleSubmitLearningGoal = async (presetGoal?: string) => {
    const goalToUse = presetGoal || learningGoalInput.trim();
    if (!goalToUse) return;

    setIsSubmittingGoal(true);
    loggerService.log('COMMAND', `Solicitud a Aprendizaje: "${goalToUse}"`);

    try {
      const proposal = await learningService.requestImprovementFromLearning(
        goalToUse,
        activeProject
      );
      setProposals(learningService.getProposals());
      setSelectedProposal(proposal);
      setLearningGoalInput('');
      setOutputTerminal(
        (prev) =>
          prev +
          `\n\n[APRENDIZAJE]: Propuesta ${proposal.id} generada con Certeza del ${proposal.certaintyScore}%.` +
          `\n${proposal.propuesta}`
      );
      showToast(`✓ Propuesta generada con ${proposal.certaintyScore}% de certeza.`);
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  // Apply proposal into the active project workspace
  const handleApplyProposalToWorkspace = (prop: LearningProposal) => {
    if (!activeProject) {
      showToast('No hay un proyecto activo en el Workspace.');
      return;
    }
    const res = learningService.applyProposalToProject(prop, activeProject);
    setProposals([...learningService.getProposals()]);
    if (selectedProposal?.id === prop.id) {
      setSelectedProposal({ ...prop, applied: true });
    }
    showToast(res.message);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] p-4 overflow-hidden relative select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-[#162232] border border-cyan-500 text-cyan-200 text-xs px-3.5 py-2 rounded shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-3 border-b border-[#1f2637] pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 font-mono">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">
            LEARNING ENGINE: AUDITORÍA, TESTER &amp; SOLICITUDES DE APRENDIZAJE
          </h2>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#141822] p-0.5 rounded border border-[#212838] font-mono text-xs">
          <button
            onClick={() => setActiveMode('doctor')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeMode === 'doctor'
                ? 'bg-purple-900/50 text-purple-200 font-bold border border-purple-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor (Auditoría)</span>
          </button>

          <button
            onClick={() => setActiveMode('tester')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeMode === 'tester'
                ? 'bg-purple-900/50 text-purple-200 font-bold border border-purple-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Tester (Unit Tests)</span>
          </button>

          <button
            onClick={() => setActiveMode('journal')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeMode === 'journal'
                ? 'bg-purple-900/50 text-purple-200 font-bold border border-purple-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journal &amp; Certeza ({proposals.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('rag_memory');
              handleRunRAGSearch(ragQuery);
            }}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeMode === 'rag_memory'
                ? 'bg-purple-900/50 text-purple-200 font-bold border border-purple-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-cyan-300" />
            <span>RAG &amp; Memoria JSON ({persistentMemory.insights.length})</span>
          </button>
        </div>
      </div>

      {/* Interactive Learning Request Bar (Solicitar Mejora con Certeza) */}
      <div className="mb-3 p-2.5 rounded bg-[#10141f] border border-[#222d42] space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-purple-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Solicitar Mejora o Estructura al Motor de Aprendizaje:
          </span>
          <span className="text-slate-500 text-[10px]">
            Calcula Nivel de Certeza &amp; Aplica con 1 Clic
          </span>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleSubmitLearningGoal('Optimizar gestión de buffers y texturas para PS1 / Fallout 4')}
            className="px-2 py-0.5 rounded bg-[#171f2d] hover:bg-[#202c40] text-cyan-300 text-[10px] border border-[#233147] cursor-pointer"
          >
            + Optimizar Buffers
          </button>
          <button
            onClick={() => handleSubmitLearningGoal('Crear controlador de audio y decodificador de samples ADPCM')}
            className="px-2 py-0.5 rounded bg-[#172520] hover:bg-[#20342d] text-emerald-300 text-[10px] border border-[#244238] cursor-pointer"
          >
            + Controlador Audio SPU
          </button>
          <button
            onClick={() => handleSubmitLearningGoal('Incorporar ventana deslizante de tokens para no saturar 8GB VRAM')}
            className="px-2 py-0.5 rounded bg-[#251d38] hover:bg-[#342750] text-purple-300 text-[10px] border border-[#3e2c60] cursor-pointer"
          >
            + Ventana Deslizante VRAM
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={learningGoalInput}
            onChange={(e) => setLearningGoalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitLearningGoal();
            }}
            placeholder="Pide al aprendizaje optimizar, crear carpetas o parchear módulos..."
            className="flex-1 bg-[#090c12] border border-[#1f283a] focus:border-purple-500 focus:outline-hidden rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-600"
          />
          <button
            onClick={() => handleSubmitLearningGoal()}
            disabled={isSubmittingGoal || !learningGoalInput.trim()}
            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:bg-[#1c1628] disabled:text-slate-600 text-white font-bold rounded text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSubmittingGoal ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Solicitar</span>
          </button>
        </div>
      </div>

      {/* Button Frame depending on Active Mode */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5 font-mono text-xs">
        {activeMode === 'doctor' ? (
          <>
            <button
              onClick={handleAnalyzeGlados}
              disabled={isBusy}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#5a2e8c] hover:bg-[#7a3ea8] disabled:bg-[#341b52] text-white rounded font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Stethoscope className="w-3.5 h-3.5 text-purple-200" />
              <span>Project Doctor: Analizar GLaDOS</span>
            </button>

            <button
              onClick={handleAnalyzeProject}
              disabled={isBusy}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2b5c8f] hover:bg-[#3a7cb8] disabled:bg-[#183452] text-white rounded font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <FolderSearch className="w-3.5 h-3.5 text-cyan-200" />
              <span>Project Doctor: Analizar {activeProject?.name || 'Workspace'}</span>
            </button>
          </>
        ) : activeMode === 'tester' ? (
          <button
            onClick={handleRunTester}
            disabled={isBusy}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-[#183325] text-white rounded font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Ejecutar Suite Completa de Tests</span>
          </button>
        ) : null}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#090b0e] border border-[#1f2637] rounded-md p-3 flex flex-col overflow-hidden font-mono text-xs">
        {activeMode === 'doctor' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-2 border-b border-[#1b212f] mb-2 flex items-center justify-between text-slate-400">
              <span className="text-purple-300 font-semibold">
                learning/engine.py &middot; Doctor de Arquitectura &amp; VRAM
              </span>
              <span className="text-[10px] text-slate-500">learning/proposals/</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto text-slate-200 p-3 bg-[#06080b] rounded border border-[#161c28]">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {outputTerminal}
              </pre>
              {isBusy && (
                <div className="flex items-center gap-2 text-purple-400 py-3 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>[SISTEMA]: Evaluando estabilidad de hilos y memoria...</span>
                </div>
              )}
            </div>
          </div>
        ) : activeMode === 'tester' ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="pb-2 border-b border-[#1b212f] flex items-center justify-between text-slate-400">
              <span className="text-emerald-300 font-semibold">
                Runner de Pruebas Unitarias y de Integración (GLaDOS Tester)
              </span>
              {testResult && (
                <span className="text-slate-300">
                  {testResult.passed} de {testResult.totalTests} pruebas superadas ({testResult.durationMs}ms)
                </span>
              )}
            </div>

            {testResult ? (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-1">
                {testResult.details.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-[#10141d] border border-[#1c2434] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {t.status === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="text-slate-200 font-semibold">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.durationMs}ms
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'PASS'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                Haz clic en "Ejecutar Suite Completa de Tests" para auditar NifParserNativo, CAD B-Rep y el Orquestador MCP.
              </div>
            )}
          </div>
        ) : activeMode === 'journal' ? (
          /* JOURNAL & CERTEZA MODE */
          <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
            {/* List */}
            <div className="col-span-5 bg-[#0a0c10] border border-[#1b212f] rounded p-2 overflow-y-auto space-y-2">
              <div className="text-[11px] font-bold text-slate-400 px-1 py-0.5 border-b border-[#1c2331]">
                Propuestas &amp; Registro de Certeza
              </div>
              {proposals.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProposal(prop)}
                  className={`p-2.5 rounded cursor-pointer border transition-colors ${
                    selectedProposal?.id === prop.id
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                      : 'bg-[#10141d] border-[#1d2535] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-amber-400">{prop.id}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                      {prop.certaintyScore || 96}% Certeza
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {prop.problema}
                  </p>
                  {prop.applied && (
                    <span className="text-[9px] text-cyan-400 block mt-1">
                      ✓ Aplicada en el proyecto
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Detail */}
            <div className="col-span-7 bg-[#06080b] border border-[#1b212f] rounded p-3 overflow-y-auto text-slate-200 space-y-3">
              {selectedProposal ? (
                <>
                  <div className="border-b border-[#1f2638] pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-purple-300">
                        {selectedProposal.id}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        learning/proposals/{selectedProposal.fileName}
                      </p>
                    </div>

                    {/* Certainty & Apply Button */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700 text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Certeza: {selectedProposal.certaintyScore || 96}%
                      </span>

                      {!selectedProposal.applied ? (
                        <button
                          onClick={() => handleApplyProposalToWorkspace(selectedProposal)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <FilePlus className="w-3 h-3" />
                          <span>Aplicar al Workspace</span>
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded border border-cyan-700 text-[10px] font-semibold">
                          ✓ Aplicado
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedProposal.certaintyRationale && (
                    <div className="p-2 rounded bg-[#0d1422] border border-[#1c293f] text-[11px]">
                      <span className="font-bold text-cyan-300 block mb-0.5">
                        Justificación del Nivel de Certeza:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {selectedProposal.certaintyRationale}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                      PROBLEMA / REQUERIMIENTO:
                    </h4>
                    <p className="bg-[#10141d] p-2 rounded text-slate-300">
                      {selectedProposal.problema}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      PROPUESTA TÉCNICA:
                    </h4>
                    <p className="bg-[#10141d] p-2 rounded text-slate-300">
                      {selectedProposal.propuesta}
                    </p>
                  </div>

                  {selectedProposal.archivosAfectados && selectedProposal.archivosAfectados.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                        ARCHIVOS / CARPETAS AFECTADAS:
                      </h4>
                      <p className="bg-[#10141d] p-2 rounded text-amber-200/90 font-mono text-[11px]">
                        {selectedProposal.archivosAfectados.join(', ')}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      BENEFICIO:
                    </h4>
                    <p className="bg-[#10141d] p-2 rounded text-slate-300">
                      {selectedProposal.beneficio}
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600">
                  Selecciona una propuesta del Journal para inspeccionar su Nivel de Certeza y aplicarla.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* RAG & MEMORIA SEMÁNTICA MODE */
          <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
            {/* Pending Suggestions Banner (1-Click Confirm) */}
            {pendingSuggestions.length > 0 && (
              <div className="p-3 rounded bg-[#101928] border border-cyan-500/70 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase">
                        Sugerencia de Aprendizaje Detectada
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {pendingSuggestions[0].confidence}% Certeza
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#182335] text-slate-300">
                        {pendingSuggestions[0].category}
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-100 text-xs mt-0.5">
                      {pendingSuggestions[0].title}
                    </h5>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      {pendingSuggestions[0].detail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono">
                  <button
                    onClick={() => handleConfirmSuggestion(pendingSuggestions[0].id)}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar en Memoria (1 Clic)</span>
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(pendingSuggestions[0].id)}
                    className="p-1 hover:bg-[#1a2334] text-slate-400 hover:text-white rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* RAG Search Engine Bar */}
            <div className="p-2.5 rounded bg-[#0d101a] border border-[#1e273a] flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-[260px] relative">
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => handleRunRAGSearch(e.target.value)}
                  placeholder="Búsqueda semántica RAG (ej: 'fugas de memoria', 'mcp disco', 'clean code', 'von mises')..."
                  className="w-full bg-[#06080e] border border-[#253248] focus:border-purple-500 rounded px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500"
                />
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-2.5" />
                {ragQuery && (
                  <button
                    onClick={() => handleRunRAGSearch('')}
                    className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Query Chips */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                {['fuga memoria', 'restricciones', 'mcp', 'cot', 'fea von mises'].map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleRunRAGSearch(c)}
                    className="px-2 py-0.5 rounded bg-[#161d2d] hover:bg-[#202a3f] text-cyan-300 border border-[#212d44] cursor-pointer shrink-0"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Column Explorer: List vs Detail */}
            <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
              {/* Left Column: Ranked Matches */}
              <div className="col-span-5 bg-[#0a0c12] border border-[#1c2436] rounded p-2 overflow-y-auto space-y-2">
                <div className="text-[11px] font-bold text-slate-400 px-1 py-0.5 border-b border-[#1c2436] flex items-center justify-between">
                  <span>Memoria JSON Indexada</span>
                  <span className="text-purple-400">{ragResults.length} resultados</span>
                </div>

                {ragResults.map((item, idx) => {
                  const isSelected = selectedMemoryInsight?.id === item.insight.id;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedMemoryInsight(item.insight)}
                      className={`p-2.5 rounded cursor-pointer border transition-colors space-y-1 ${
                        isSelected
                          ? 'bg-purple-950/50 border-purple-500/70 text-purple-200'
                          : 'bg-[#10141e] border-[#1d2638] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-[#182133] text-cyan-300">
                          {item.insight.category}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          {item.score}% Match
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-100 text-xs line-clamp-1">{item.insight.title}</h5>
                      <p className="text-slate-400 text-[11px] line-clamp-2">{item.highlightSnippet}</p>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Detailed Inspector */}
              <div className="col-span-7 bg-[#07090e] border border-[#1c2436] rounded p-3 overflow-y-auto space-y-3">
                {selectedMemoryInsight ? (
                  <>
                    <div className="border-b border-[#1d2638] pb-2 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {selectedMemoryInsight.category}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            {selectedMemoryInsight.confidence}% Certeza
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 mt-1">
                          {selectedMemoryInsight.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleCopyText(`detail-${selectedMemoryInsight.id}`, selectedMemoryInsight.detail)}
                        className="px-2 py-1 rounded bg-[#131b29] hover:bg-[#1a2538] text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === `detail-${selectedMemoryInsight.id}` ? (
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

                    <div>
                      <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                        DETALLE TÉCNICO &amp; SOLUCIÓN:
                      </h5>
                      <p className="bg-[#0f1420] p-2.5 rounded text-slate-200 text-xs leading-relaxed border border-[#1b2336]">
                        {selectedMemoryInsight.detail}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                        ETIQUETAS SEMÁNTICAS:
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMemoryInsight.tags.map((t: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-[#161e2e] text-purple-300 text-[10px] border border-[#212c42]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b0e15] border border-[#192233] text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span>ID: <code>{selectedMemoryInsight.id}</code></span>
                        <span>Registrado: {selectedMemoryInsight.createdAt}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Almacenado permanentemente en <code>./glados_persistent_memory.json</code>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Search className="w-6 h-6 text-slate-600" />
                    <span>Selecciona un aprendizaje de la lista para inspeccionar sus directivas semánticas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  GitBranch,
  Github,
  Search,
  Copy,
  Check,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
} from 'lucide-react';
import { GitRepositoryStudy } from '../../types/glados';
import {
  BUILTIN_GIT_STUDIES,
  gitStudioService,
} from '../../services/gitStudioService';
import { loggerService } from '../../services/loggerService';

interface GitStudioPanelProps {
  onNavigateToProject?: (presetId: string) => void;
}

export const GitStudioPanel: React.FC<GitStudioPanelProps> = ({ onNavigateToProject }) => {
  const [repoUrl, setRepoUrl] = useState<string>(
    'https://github.com/cualquiercosa327/psretrox'
  );
  const [currentStudy, setCurrentStudy] = useState<GitRepositoryStudy>(
    BUILTIN_GIT_STUDIES['https://github.com/cualquiercosa327/psretrox']
  );
  const [isStudying, setIsStudying] = useState<boolean>(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const handleStudy = async (urlToStudy: string) => {
    setRepoUrl(urlToStudy);
    setIsStudying(true);
    try {
      const study = await gitStudioService.studyRepository(urlToStudy);
      setCurrentStudy(study);
      setSelectedFileIndex(0);
    } finally {
      setIsStudying(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePresetId = repoUrl.includes('psretrox')
    ? 'psretrox-ps1'
    : repoUrl.includes('rea')
    ? 'rea-mcp'
    : 'psretrox-ps1';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] p-4 overflow-hidden">
      {/* Header Banner */}
      <div className="mb-3 border-b border-[#1f2637] pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 font-mono">
          <Github className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">
            GIT STUDIO: ESTUDIAR Y REPLICAR REPOSITORIOS
          </h2>
        </div>

        {/* Preset Repo Buttons & Open in Projects */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500">Bases Principales:</span>
          <button
            onClick={() =>
              handleStudy('https://github.com/cualquiercosa327/psretrox')
            }
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              repoUrl.includes('psretrox')
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60 font-semibold'
                : 'bg-[#151a24] text-slate-400 border-[#273247] hover:text-slate-200'
            }`}
          >
            psretrox (PS1 Decomp)
          </button>
          <button
            onClick={() => handleStudy('https://github.com/morluto/rea')}
            className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              repoUrl.includes('rea')
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60 font-semibold'
                : 'bg-[#151a24] text-slate-400 border-[#273247] hover:text-slate-200'
            }`}
          >
            rea (Reverse Engineer Anything)
          </button>

          {onNavigateToProject && (
            <button
              onClick={() => onNavigateToProject(activePresetId)}
              className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/60 text-xs font-bold transition-all cursor-pointer shadow-xs ml-2 flex items-center gap-1.5"
              title="Abrir este repositorio en el Gestor de Proyectos para desensamblado e ingeniería inversa"
            >
              <span>Abrir en Proyectos &amp; Replicador</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* URL Input Bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Introduce URL de repositorio Git (ej: https://github.com/usuario/repo)..."
            className="w-full bg-[#12161f] border border-[#252f44] focus:border-cyan-500 focus:outline-hidden rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500"
          />
        </div>
        <button
          onClick={() => handleStudy(repoUrl)}
          disabled={isStudying || !repoUrl.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-[#1a2330] disabled:text-slate-600 text-white font-mono text-xs font-semibold rounded transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Estudiar con IA</span>
        </button>
      </div>

      {/* Main Grid: Left Study & Mechanics (5 cols), Right Replicated Modules (7 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left: Architecture Analysis & How It Works */}
        <div className="col-span-5 bg-[#0a0c10] border border-[#1f2637] rounded-md p-3 flex flex-col overflow-y-auto font-mono text-xs text-slate-300 space-y-3">
          <div className="border-b border-[#1b212f] pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span>{currentStudy.repoName}</span>
              <span className="text-slate-500 font-normal">por {currentStudy.owner}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#151c27] text-cyan-400 border border-[#232e42] text-[10px]">
              {currentStudy.primaryLanguage}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Descripción &amp; Arquitectura:
            </span>
            <p className="bg-[#10141d] p-2.5 rounded border border-[#1d2638] text-slate-300 leading-relaxed text-[11px]">
              {currentStudy.description}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Módulos Críticos del Repositorio:
            </span>
            <div className="space-y-1.5">
              {currentStudy.keyModules.map((mod) => (
                <div
                  key={mod.path}
                  className="p-2 rounded bg-[#0f131a] border border-[#1c2434] text-[11px]"
                >
                  <div className="flex items-center justify-between font-semibold text-cyan-300 mb-0.5">
                    <span>{mod.path}</span>
                    <span className="text-slate-500 font-normal">{mod.lines} lín</span>
                  </div>
                  <p className="text-slate-400 text-[10px]">{mod.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1 text-amber-400">
              <Sparkles className="w-3 h-3" />
              Estrategia de Integración en GLaDOS OS:
            </span>
            <div className="bg-[#121620] p-2.5 rounded border border-[#222d42] text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
              {currentStudy.gladosIntegrationIdea}
            </div>
          </div>
        </div>

        {/* Right: Replicated Modules Hub */}
        <div className="col-span-7 bg-[#090b0e] border border-[#1f2637] rounded-md p-3 flex flex-col overflow-hidden font-mono text-xs">
          <div className="pb-2 border-b border-[#1b212f] mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Módulos Replicados para GLaDOS OS</span>
              <span className="text-slate-500 font-normal">
                ({currentStudy.replicatedFiles.length} archivos)
              </span>
            </div>

            {currentStudy.replicatedFiles.length > 0 && (
              <button
                onClick={() =>
                  handleCopyCode(
                    currentStudy.replicatedFiles[selectedFileIndex]?.code || ''
                  )
                }
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#171e2c] hover:bg-[#202a3d] text-slate-300 hover:text-white border border-[#26334a] transition-colors cursor-pointer text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Módulo</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Module Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0">
            {currentStudy.replicatedFiles.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => setSelectedFileIndex(idx)}
                className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                  selectedFileIndex === idx
                    ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-600/60'
                    : 'bg-[#121620] text-slate-400 hover:text-slate-200'
                }`}
              >
                {file.path}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 min-h-0 bg-[#06080b] rounded border border-[#161c28] p-3 overflow-y-auto text-slate-200">
            {currentStudy.replicatedFiles.length > 0 ? (
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                {currentStudy.replicatedFiles[selectedFileIndex]?.code}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">
                No hay módulos replicados para este repositorio.
              </div>
            )}
          </div>

          {/* Footer banner */}
          <div className="mt-2 pt-2 border-t border-[#1b212f] flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Código nativo adaptado para el orquestador MCP
            </span>
            <span>Compatible con emuladores, hardware y herramientas de disco</span>
          </div>
        </div>
      </div>
    </div>
  );
};

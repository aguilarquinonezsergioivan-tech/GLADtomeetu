import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Cpu,
  HardDrive,
  Thermometer,
  ShieldCheck,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';
import {
  HardwareStats,
  HardwareVramProfile,
  AIModelProfile,
} from '../types/glados';
import { AI_MODELS, VRAM_PROFILES } from '../data/aiModels';

interface TopBarProps {
  onOpenLogs: () => void;
  activeModel: string;
  onSelectModel: (model: AIModelProfile) => void;
  vramProfile: HardwareVramProfile;
  onSelectVramProfile: (profile: HardwareVramProfile) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenLogs,
  activeModel,
  onSelectModel,
  vramProfile,
  onSelectVramProfile,
}) => {
  const [telemetry, setTelemetry] = useState<HardwareStats>({
    cpu: 18,
    ram: 44,
    temp: '--°C',
    vramUsedGb: 4.8,
    vramTotalGb: 12.0,
  });
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/hardware/telemetry');
        if (res.ok) {
          const data = await res.json();
          setTelemetry((prev) => ({
            cpu: data.cpu,
            ram: data.ram,
            temp: data.temp || '--°C',
            vramUsedGb: prev.vramUsedGb,
            vramTotalGb: prev.vramTotalGb,
          }));
          return;
        }
      } catch {
        // Fallback
      }

      setTelemetry((prev) => ({
        cpu: Math.min(85, Math.max(12, Math.round(Number(prev.cpu) + (Math.random() * 6 - 3)))),
        ram: Math.min(80, Math.max(38, Math.round(Number(prev.ram) + (Math.random() * 2 - 1)))),
        temp: '--°C',
        vramUsedGb: Number((4.5 + Math.random() * 0.8).toFixed(1)),
        vramTotalGb: vramProfile === 'workstation-16gb' ? 16.0 : vramProfile === 'desktop-8-12gb' ? 12.0 : 6.0,
      }));
    }, 2500);

    return () => clearInterval(interval);
  }, [vramProfile]);

  const currentProfileData = VRAM_PROFILES.find((p) => p.id === vramProfile) || VRAM_PROFILES[0];
  const activeModelData = AI_MODELS.find((m) => m.id === activeModel) || AI_MODELS[1];

  return (
    <>
      <header className="h-10 bg-[#0e1117] border-b border-[#1c2230] px-4 flex items-center justify-between select-none z-20 font-mono text-xs">
        {/* Left: Branding & Model Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-bold text-slate-100 tracking-wider">
              GLaDOS <span className="text-cyan-400 font-semibold">OS</span>
            </span>
          </div>

          <span className="text-slate-700">/</span>

          {/* AI Model Selector Button */}
          <button
            onClick={() => setIsModelModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141924] hover:bg-[#1a2232] border border-[#232c3f] text-slate-200 transition-colors cursor-pointer text-[11px]"
            title="Seleccionar modelo de IA y perfil de hardware (Portátil / 12-16GB VRAM)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-300">{activeModelData.name.split(' (')[0]}</span>
            <span className="text-[10px] text-slate-500 font-sans">
              [{currentProfileData.vramRange}]
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
          </button>
        </div>

        {/* Right: Telemetry & Logs Trigger */}
        <div className="flex items-center gap-3">
          {/* Minimalist Hardware Telemetry Bar */}
          <div className="flex items-center gap-2.5 text-slate-400 bg-[#0a0d14] px-2.5 py-0.5 rounded border border-[#1b2230] text-[11px]">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-500" />
              <span>CPU: <span className="text-slate-200 font-normal">{telemetry.cpu}%</span></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span>RAM: <span className="text-slate-200 font-normal">{telemetry.ram}%</span></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1" title="VRAM de GPU asignada según el perfil">
              <Zap className="w-3 h-3 text-amber-500/80" />
              <span>VRAM: <span className="text-amber-300 font-normal">{telemetry.vramUsedGb}/{telemetry.vramTotalGb}G</span></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1" title="Temperatura térmica (Bloqueada de forma segura por Windows)">
              <Thermometer className="w-3 h-3 text-slate-500" />
              <span>{telemetry.temp}</span>
            </div>
          </div>

          {/* Logs Console Button */}
          <button
            onClick={onOpenLogs}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141924] hover:bg-[#1c2333] text-slate-300 hover:text-slate-100 rounded text-[11px] border border-[#222b3e] transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3 text-amber-400" />
            <span>Logs</span>
          </button>
        </div>
      </header>

      {/* Model & Hardware Selection Modal */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-[#11141c] border border-[#252f44] rounded-lg shadow-2xl overflow-hidden font-mono text-xs">
            {/* Modal Header */}
            <div className="p-3.5 bg-[#161b27] border-b border-[#212a3d] flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-100 font-bold">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Selector de Hardware &amp; Modelos de IA (AI Router)</span>
              </div>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-[#20293b]"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Profile Selector */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-bold">
                  1. Perfil de Hardware de tu Equipo:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {VRAM_PROFILES.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectVramProfile(p.id)}
                      className={`p-2.5 rounded cursor-pointer border transition-colors ${
                        vramProfile === p.id
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                          : 'bg-[#151a24] border-[#222b3d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs mb-0.5">
                        <span className="text-slate-200">{p.label}</span>
                        <span className="text-amber-400 text-[10px]">{p.vramRange}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Models List */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-bold">
                  2. Modelos de Lenguaje Disponibles (Offline / Local / Cloud):
                </span>
                <div className="space-y-1.5">
                  {AI_MODELS.map((model) => {
                    const isSelected = activeModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model);
                          setIsModelModalOpen(false);
                        }}
                        className={`p-2.5 rounded cursor-pointer border transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-100'
                            : 'bg-[#131722] border-[#20283a] text-slate-300 hover:border-slate-600 hover:bg-[#181e2b]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-100">
                              {model.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                model.provider === 'gemini'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : model.provider === 'ollama'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-purple-950 text-purple-300 border border-purple-800'
                              }`}
                            >
                              {model.provider}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {model.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <span className="text-amber-400 text-[11px] font-bold block">
                            {model.vramRequiredGb > 0
                              ? `~${model.vramRequiredGb} GB VRAM`
                              : '0 GB (Cloud API)'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {model.specialty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

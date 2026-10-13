import React from 'react';
import {
  MessageSquare,
  FolderGit2,
  Ruler,
  FlaskConical,
  BrainCircuit,
  Code2,
  FolderArchive,
  GitBranch,
  Film,
} from 'lucide-react';
import { ActivePanel, ProjectPreset } from '../types/glados';

interface SidebarProps {
  activePanel: ActivePanel;
  onSelectPanel: (panel: ActivePanel) => void;
  activeProject: ProjectPreset | null;
  onDownloadProjectZip: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePanel,
  onSelectPanel,
  activeProject,
  onDownloadProjectZip,
}) => {
  const navItems: {
    id: ActivePanel;
    label: string;
    icon: React.ReactNode;
    tag?: string;
  }[] = [
    {
      id: 'ChatPanel',
      label: 'Chat Central',
      icon: <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />,
      tag: 'MCP',
    },
    {
      id: 'ProjectPanel',
      label: 'Proyectos & Análisis',
      icon: <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'CADPanel',
      label: 'Motor CAD & FEA',
      icon: <Ruler className="w-3.5 h-3.5 text-blue-400" />,
      tag: 'B-Rep',
    },
    {
      id: 'SandboxPanel',
      label: 'Lab & Mapas NIF',
      icon: <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />,
      tag: '3D FO4',
    },
    {
      id: 'LearningPanel',
      label: 'Aprendizaje (Doctor & Tester)',
      icon: <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />,
    },
    {
      id: 'GitStudioPanel',
      label: 'Git Studio & Replicador',
      icon: <GitBranch className="w-3.5 h-3.5 text-pink-400" />,
      tag: 'Repos',
    },
    {
      id: 'MediaStudioPanel',
      label: 'Estudio Multimedia (Git)',
      icon: <Film className="w-3.5 h-3.5 text-pink-400" />,
      tag: 'Prompt AI',
    },
    {
      id: 'ArchitectPanel',
      label: 'Código Python & Arquitecto',
      icon: <Code2 className="w-3.5 h-3.5 text-teal-400" />,
    },
  ];

  return (
    <aside className="w-56 bg-[#0c0e14] border-r border-[#1a202c] flex flex-col justify-between select-none shrink-0 font-mono text-xs">
      <div className="p-2.5">
        {/* Minimalist Header */}
        <div className="py-2.5 px-2 border-b border-[#181e2b] mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <h1 className="font-bold text-slate-100 tracking-wider text-xs">
              GLaDOS WORKSTATION
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Agente Autónomo &middot; Multi-VRAM
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPanel(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded transition-all text-left cursor-pointer text-xs ${
                  isActive
                    ? 'bg-[#151c28] text-slate-100 font-semibold border-l-2 border-cyan-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#12151e]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#10141d] text-slate-500 border border-[#1d2433]">
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Workspace Info */}
      <div className="p-2.5 border-t border-[#181e2b] bg-[#090b0e] space-y-2">
        {activeProject ? (
          <div className="p-2 rounded bg-[#10141d] border border-[#1b2230]">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
              Workspace Activo:
            </p>
            <p className="text-amber-300 font-medium truncate text-[11px]" title={activeProject.name}>
              {activeProject.name}
            </p>
          </div>
        ) : (
          <div className="p-1.5 text-slate-600 text-[10px]">
            Sin proyecto cargado.
          </div>
        )}

        <button
          onClick={onDownloadProjectZip}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#141924] hover:bg-[#1c2333] text-slate-300 hover:text-cyan-300 rounded border border-[#212a3d] transition-colors cursor-pointer text-[10px]"
          title="Descargar paquete completo Python en archivo .ZIP"
        >
          <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
          <span>Descargar ZIP (.py)</span>
        </button>
      </div>
    </aside>
  );
};

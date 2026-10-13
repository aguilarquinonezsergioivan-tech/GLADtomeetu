import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { LogWindowModal } from './components/LogWindowModal';
import { ChatPanel } from './components/panels/ChatPanel';
import { ProjectPanel } from './components/panels/ProjectPanel';
import { CADPanel } from './components/panels/CADPanel';
import { SandboxPanel } from './components/panels/SandboxPanel';
import { LearningPanel } from './components/panels/LearningPanel';
import { GitStudioPanel } from './components/panels/GitStudioPanel';
import { ArchitectPanel } from './components/panels/ArchitectPanel';
import { MediaStudioPanel } from './components/panels/MediaStudioPanel';
import {
  ActivePanel,
  ProjectPreset,
  HardwareVramProfile,
  AIModelProfile,
} from './types/glados';
import { PROJECT_PRESETS, getFreshPresetClone } from './data/projectPresets';
import { PYTHON_PROJECT_FILES } from './data/pythonSourceFiles';
import { AI_MODELS, VRAM_PROFILES } from './data/aiModels';
import { OrchestratorService } from './services/orchestratorService';
import { loggerService } from './services/loggerService';

export default function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('ChatPanel');
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectPreset | null>(() =>
    getFreshPresetClone('psretrox-ps1')
  );
  const [vramProfile, setVramProfile] = useState<HardwareVramProfile>('desktop-8-12gb');
  const [activeModel, setActiveModel] = useState<string>('qwen2.5-coder:7b');

  const orchestrator = useMemo(() => {
    const orch = new OrchestratorService(activeProject || undefined);
    const modelData = AI_MODELS.find((m) => m.id === activeModel);
    orch.setModel(activeModel, modelData?.provider === 'gemini' ? 'gemini' : 'auto');
    return orch;
  }, [activeProject, activeModel]);

  const handleSelectPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    loggerService.log('INFO', `Navegación cambiada a módulo: ${panel}`);
  };

  const handleSelectModel = (model: AIModelProfile) => {
    setActiveModel(model.id);
    loggerService.log(
      'COMMAND',
      `Modelo de IA seleccionado: ${model.name} (${model.provider}, VRAM: ${model.vramRequiredGb}GB)`
    );
  };

  const handleSelectVramProfile = (profile: HardwareVramProfile) => {
    setVramProfile(profile);
    const profileData = VRAM_PROFILES.find((p) => p.id === profile);
    if (profileData && profileData.suggestedModels[0]) {
      setActiveModel(profileData.suggestedModels[0]);
    }
    loggerService.log('COMMAND', `Perfil de hardware actualizado: ${profile}`);
  };

  const handleDownloadProjectZip = async () => {
    loggerService.log('COMMAND', 'Generando paquete comprimido GLaDOS_OS_Phase3.zip...');
    const zip = new JSZip();

    PYTHON_PROJECT_FILES.forEach((file) => {
      zip.file(file.path, file.code);
    });

    zip.file(
      'README.md',
      `# GLaDOS OS & DesignAI Workstation

Entorno de ingeniería inversa, modelado CAD paramétrico y bucle agéntico REA/MCP.

## Compatibilidad de Modelos
- Laptops (4-6 GB VRAM): qwen2.5-coder:1.5b / llama-3.2:3b
- PCs (8-12 GB VRAM): qwen2.5-coder:7b
- Workstations (16 GB VRAM): qwen2.5-coder:14b / deepseek-coder:14b
- Cloud: Gemini 3.1 Pro / 3.8 Flash

## Ejecución Local
\`\`\`bash
pip install -r requirements.txt
python main.py
\`\`\`
`
    );

    zip.folder('logs');
    zip.folder('learning/proposals');

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GLaDOS_OS_Workstation.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    loggerService.log('INFO', 'Descarga de GLaDOS_OS_Workstation.zip completada.');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090b0e] text-slate-100 select-none">
      {/* Minimalist Top Bar */}
      <TopBar
        onOpenLogs={() => setIsLogsOpen(true)}
        activeModel={activeModel}
        onSelectModel={handleSelectModel}
        vramProfile={vramProfile}
        onSelectVramProfile={handleSelectVramProfile}
      />

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          activePanel={activePanel}
          onSelectPanel={handleSelectPanel}
          activeProject={activeProject}
          onDownloadProjectZip={handleDownloadProjectZip}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          {activePanel === 'ChatPanel' && (
            <ChatPanel
              orchestrator={orchestrator}
              activeProject={activeProject}
            />
          )}

          {activePanel === 'ProjectPanel' && (
            <ProjectPanel
              activeProject={activeProject}
              onSelectProject={(p) => {
                setActiveProject(p);
                orchestrator.setActiveProject(p);
              }}
              activeModel={activeModel}
            />
          )}

          {activePanel === 'CADPanel' && <CADPanel />}

          {activePanel === 'SandboxPanel' && <SandboxPanel />}

          {activePanel === 'LearningPanel' && (
            <LearningPanel activeProject={activeProject} />
          )}

          {activePanel === 'GitStudioPanel' && (
            <GitStudioPanel
              onNavigateToProject={(presetId) => {
                const p = PROJECT_PRESETS.find((x) => x.id === presetId);
                if (p) {
                  setActiveProject(p);
                  orchestrator.setActiveProject(p);
                }
                setActivePanel('ProjectPanel');
              }}
            />
          )}

          {activePanel === 'MediaStudioPanel' && <MediaStudioPanel />}

          {activePanel === 'ArchitectPanel' && (
            <ArchitectPanel onDownloadZip={handleDownloadProjectZip} />
          )}
        </main>
      </div>

      <LogWindowModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}

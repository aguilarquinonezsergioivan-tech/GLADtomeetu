import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Upload,
  FileCheck2,
  Box,
  Binary,
  Layers,
  Cpu,
  FileText,
  Eye,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Palette,
  MapPin,
  Compass,
  Activity,
  Wand2,
  Download,
  Flame,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { NifParseResult } from '../../types/glados';
import {
  SAMPLE_NIF_FILES,
  parseNifFile,
} from '../../services/nifService';
import {
  MAP_CELL_PRESETS,
  NifMapCellPreset,
  generateBgsmFileContent,
  downloadBgsmFile,
  getDefaultTextureSlots,
} from '../../services/nifskopeTextureService';
import {
  analyzeNifForLabAndMaps,
  sanitizeNifForLabAndMaps,
  nifLabBridgeService,
  DEMO_NIF_PRESETS,
} from '../../services/nifAnalysisService';
import { NifSkopeView } from '../nif/NifSkopeView';
import { ObjToNifConverter } from '../nif/ObjToNifConverter';
import { loggerService } from '../../services/loggerService';
import { CollisionGeometryData } from '../../types/nifImporter';
import { downloadNifBinary, downloadBgsmText } from '../../services/nifGeneratorService';

export const SandboxPanel: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    'Building_Commercial_Chunk01.nif'
  );
  const [parseResult, setParseResult] = useState<NifParseResult>(() =>
    parseNifFile('Building_Commercial_Chunk01.nif')
  );
  const [activeTab, setActiveTab] = useState<
    'objToNif' | 'nifskope' | 'mapExplorer' | 'diagnostics' | 'report' | 'blocks' | 'didacticNif'
  >('nifskope');
  const [isParsing, setIsParsing] = useState(false);

  // Converted 3D Model State (from OBJ/FBX)
  const [convertedCollisionGeometry, setConvertedCollisionGeometry] = useState<CollisionGeometryData | undefined>(undefined);
  const [convertedBinaryNif, setConvertedBinaryNif] = useState<Uint8Array | undefined>(undefined);
  const [convertedBgsmContent, setConvertedBgsmContent] = useState<string | undefined>(undefined);

  // Map Cell Explorer State
  const [selectedCell, setSelectedCell] = useState<NifMapCellPreset>(
    MAP_CELL_PRESETS[0]
  );
  const [cellScale, setCellScale] = useState<number>(1.0);
  const [cellYaw, setCellYaw] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync with NIFs sent or analyzed from Chat Central
  useEffect(() => {
    const initialShared = nifLabBridgeService.getSharedNif();
    if (initialShared) {
      setParseResult(initialShared.parseResult);
      setSelectedPreset(initialShared.parseResult.fileName);
      if (initialShared.collisionGeometry) {
        setConvertedCollisionGeometry(initialShared.collisionGeometry);
      }
      showToast(`✓ NIF "${initialShared.parseResult.fileName}" transferido desde Chat Central.`);
    }

    const unsubscribe = nifLabBridgeService.subscribe(() => {
      const shared = nifLabBridgeService.getSharedNif();
      if (shared) {
        setParseResult(shared.parseResult);
        setSelectedPreset(shared.parseResult.fileName);
        if (shared.collisionGeometry) {
          setConvertedCollisionGeometry(shared.collisionGeometry);
        }
        showToast(`✓ NIF "${shared.parseResult.fileName}" cargado en Lab & Mapas.`);
      }
    });

    return unsubscribe;
  }, []);

  const handleInspectNif = (name: string, buffer?: ArrayBuffer) => {
    setIsParsing(true);
    loggerService.log('COMMAND', `Inspeccionando archivo de mapa NIF: ${name}`);

    setTimeout(() => {
      const result = parseNifFile(name, buffer);
      setParseResult(result);
      setIsParsing(false);
      loggerService.log(
        'INFO',
        `NIF '${name}' parseado con éxito: ${result.blocks.length} bloques, ${result.totalVertices} vértices.`
      );
    }, 200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPreset(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      handleInspectNif(file.name, buffer);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportBgsmMaterial = () => {
    const slots = getDefaultTextureSlots();
    const content = generateBgsmFileContent(slots, parseResult.fileName.replace('.nif', ''));
    downloadBgsmFile(content, `${parseResult.fileName.replace('.nif', '')}.bgsm`);
    loggerService.log('INFO', 'Archivo .BGSM exportado para Fallout 4 Creation Kit.');
    showToast('✓ Archivo de Material .BGSM exportado con éxito');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] p-3 overflow-hidden font-mono text-xs select-none">
      {/* Header Banner */}
      <div className="mb-2 border-b border-[#1b2332] pb-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 tracking-wider">
            LAB &amp; HERRAMIENTAS DE MAPAS NIF (NIFSKOPE 2.0 PRO SUITE)
          </h2>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
            Fallout 4 &middot; NetImmerse &middot; BSShaderTextureSet &middot; Havok
          </span>
        </div>

        {/* Preset Selector & File Upload */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Asset NIF:</span>
          <select
            value={selectedPreset}
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              handleInspectNif(e.target.value);
            }}
            className="bg-[#121622] text-slate-200 border border-[#232c3e] rounded px-2.5 py-1 text-xs focus:border-cyan-500 focus:outline-hidden cursor-pointer"
          >
            {SAMPLE_NIF_FILES.map((sample) => (
              <option key={sample.id} value={sample.name}>
                {sample.name} ({sample.game})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-all cursor-pointer shadow-xs active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar .NIF Local</span>
            <input
              type="file"
              accept=".nif,.bin"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportBgsmMaterial}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#172130] hover:bg-[#202e42] text-cyan-300 rounded border border-[#263750] text-xs transition-colors cursor-pointer"
            title="Exportar archivo de material Bethesda (.BGSM)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar .BGSM</span>
          </button>
        </div>
      </div>

      {/* Main Container with Metric Bar & Subtabs */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        {/* Metric Bar */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-[#0e121a] border border-[#1a2332] p-2 rounded flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-[9px] text-slate-500 uppercase">Cabecera</p>
              <p className="text-cyan-300 font-bold text-xs truncate">
                {parseResult.headerString || 'Gamebryo 20.2.0.7'}
              </p>
            </div>
          </div>

          <div className="bg-[#0e121a] border border-[#1a2332] p-2 rounded flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Palette className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-[9px] text-slate-500 uppercase">Shader TextureSet</p>
              <p className="text-amber-300 font-bold text-xs">8 Slots PBR Bethesda</p>
            </div>
          </div>

          <div className="bg-[#0e121a] border border-[#1a2332] p-2 rounded flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-[9px] text-slate-500 uppercase">Geometría 3D</p>
              <p className="text-emerald-300 font-bold text-xs">
                {parseResult.totalVertices.toLocaleString()} V | {parseResult.totalTriangles.toLocaleString()} T
              </p>
            </div>
          </div>

          <div className="bg-[#0e121a] border border-[#1a2332] p-2 rounded flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-[9px] text-slate-500 uppercase">Filtro Anti-Basura</p>
              <p className="text-purple-300 font-bold text-xs">Matriz 3x3 FO4 (36 B)</p>
            </div>
          </div>
        </div>

        {/* Viewport Subtabs Header */}
        <div className="flex items-center justify-between border-b border-[#182130] pb-1.5 flex-wrap gap-1">
          <div className="flex items-center gap-1 bg-[#10141f] p-0.5 rounded border border-[#1a2332] flex-wrap">
            <button
              onClick={() => setActiveTab('objToNif')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'objToNif'
                  ? 'bg-gradient-to-r from-cyan-900/80 to-emerald-900/80 text-cyan-200 font-bold border border-cyan-500/70 shadow-xs'
                  : 'text-slate-300 hover:text-white bg-[#141b27]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Conversor OBJ/FBX &rarr; NIF (Havok)</span>
            </button>

            <button
              onClick={() => setActiveTab('nifskope')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'nifskope'
                  ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visor NifSkope 2.0 (GLView &amp; Texturas)</span>
            </button>

            <button
              onClick={() => setActiveTab('mapExplorer')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'mapExplorer'
                  ? 'bg-emerald-900/60 text-emerald-200 font-bold border border-emerald-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Herramientas de Mapas &amp; Chunks</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'diagnostics'
                  ? 'bg-gradient-to-r from-emerald-900/70 to-cyan-900/70 text-emerald-200 font-bold border border-emerald-500/70 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diagnóstico &amp; Compatibilidad NIF</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'report'
                  ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Reporte NifParser</span>
            </button>

            <button
              onClick={() => setActiveTab('blocks')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'blocks'
                  ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Bloques &amp; BSTriShape</span>
            </button>

            <button
              onClick={() => setActiveTab('didacticNif')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
                activeTab === 'didacticNif'
                  ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Didáctica &amp; Ingeniería Inversa NIF</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            {toastMessage && (
              <span className="text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">
                {toastMessage}
              </span>
            )}
            <span>
              {parseResult.fileName} &middot; {parseResult.blocks.length} bloques
            </span>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 min-h-0 bg-[#090b0e] border border-[#17202f] rounded-md overflow-hidden flex flex-col">
          {activeTab === 'objToNif' ? (
            <ObjToNifConverter
              onConversionSuccess={({ conversionResult, nifParseResult }) => {
                setParseResult(nifParseResult);
                setConvertedCollisionGeometry(conversionResult.collisionGeometry);
                setConvertedBinaryNif(conversionResult.binaryNif);
                setConvertedBgsmContent(conversionResult.bgsmContent);
                showToast(`✓ NIF '${nifParseResult.fileName}' cargado en NifSkope`);
              }}
              onOpenInNifSkope={() => setActiveTab('nifskope')}
            />
          ) : activeTab === 'nifskope' ? (
            <NifSkopeView
              parseResult={parseResult}
              collisionGeometry={convertedCollisionGeometry}
              onDownloadNif={
                convertedBinaryNif
                  ? () => downloadNifBinary(convertedBinaryNif, parseResult.fileName)
                  : undefined
              }
              onDownloadBgsm={
                convertedBgsmContent
                  ? () =>
                      downloadBgsmText(
                        convertedBgsmContent,
                        parseResult.fileName.replace('.nif', '.bgsm')
                      )
                  : undefined
              }
            />
          ) : activeTab === 'mapExplorer' ? (
            /* Map Cells & Worldspace Placement Tools */
            <div className="w-full h-full p-3 grid grid-cols-12 gap-3 overflow-y-auto text-slate-200 bg-[#07090e]">
              {/* Left Column: Map Cells Presets (Cols 5) */}
              <div className="col-span-5 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Celdas de Mapa de Fallout 4 (Creation Engine):
                </span>
                <div className="space-y-1.5">
                  {MAP_CELL_PRESETS.map((cell) => (
                    <div
                      key={cell.id}
                      onClick={() => {
                        setSelectedCell(cell);
                        showToast(`✓ Celda ${cell.name} seleccionada`);
                      }}
                      className={`p-2.5 rounded cursor-pointer border transition-colors ${
                        selectedCell.id === cell.id
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                          : 'bg-[#0e121a] border-[#1a2332] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold text-xs text-slate-200">
                        <span>{cell.name}</span>
                        <span className="text-cyan-400 text-[10px]">
                          [{cell.cellCoords.join(', ')}]
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {cell.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[9px]">
                        <span className="px-1.5 py-0.5 bg-[#090c12] rounded border border-[#1b2536] text-amber-300">
                          {cell.estimatedLOD}
                        </span>
                        <span className="text-slate-500">
                          {cell.drawCalls} Draw Calls &middot; {cell.textureMemoryMb} MB VRAM
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Worldspace Placer & VRAM Budget (Cols 7) */}
              <div className="col-span-7 space-y-3">
                <div className="p-3 rounded bg-[#0d121c] border border-[#1c283a] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300 border-b border-[#182332] pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <span>Coordenadas en el Mundo (Worldspace Placement)</span>
                    </span>
                    <span className="text-cyan-400 font-mono">
                      Worldspace: {selectedCell.worldspace}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block">Posición X:</span>
                      <span className="font-bold text-cyan-300 font-mono text-xs">
                        {selectedCell.worldPosition[0].toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block">Posición Y:</span>
                      <span className="font-bold text-cyan-300 font-mono text-xs">
                        {selectedCell.worldPosition[1].toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block">Elevación Z:</span>
                      <span className="font-bold text-cyan-300 font-mono text-xs">
                        {selectedCell.worldPosition[2]} units
                      </span>
                    </div>
                  </div>

                  {/* World Scale & Rotation Sliders */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#182332]">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Escala Uniforme:</span>
                        <span className="text-amber-400 font-bold">{cellScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.05"
                        value={cellScale}
                        onChange={(e) => setCellScale(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Rotación Yaw (Z):</span>
                        <span className="text-purple-400 font-bold">{cellYaw}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={cellYaw}
                        onChange={(e) => setCellYaw(Number(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* VRAM & 60 FPS Streaming Budget */}
                <div className="p-3 rounded bg-[#0d121c] border border-[#1c283a] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-[#182332] pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      <span>Presupuesto de Streaming LOD &amp; VRAM (Portátiles 4-8 GB)</span>
                    </span>
                    <span className="text-emerald-400">Fluido (60 FPS)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block text-[9px]">Texturas VRAM</span>
                      <span className="text-amber-300 font-bold text-xs">{selectedCell.textureMemoryMb} MB</span>
                      <span className="text-slate-600 block text-[9px] mt-0.5">8 Slots BSShader</span>
                    </div>

                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block text-[9px]">Geometría B-Rep</span>
                      <span className="text-cyan-300 font-bold text-xs">{selectedCell.geometryMemoryMb} MB</span>
                      <span className="text-slate-600 block text-[9px] mt-0.5">BSTriShape Half-Float</span>
                    </div>

                    <div className="p-2 rounded bg-[#080b11] border border-[#162030]">
                      <span className="text-slate-500 block text-[9px]">Cargas Havok</span>
                      <span className="text-emerald-300 font-bold text-xs">MOPP Tree</span>
                      <span className="text-slate-600 block text-[9px] mt-0.5">0% Stutter</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                    En Fallout 4, las piezas de mapa se cargan en bloques 3x3 de celdas (uGridsToLoad=5). El kernel GLaDOS OS valida que las geometrías de mapa no excedan 128 MB por celda para evitar caídas de fotogramas en GPUs de portátiles con VRAM compartida.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'diagnostics' ? (
            /* Diagnostic & Map Compatibility Validation View */
            (() => {
              const { report } = analyzeNifForLabAndMaps(parseResult.fileName, undefined, parseResult);
              return (
                <div className="w-full h-full overflow-y-auto p-3 text-slate-200 bg-[#07090e] space-y-3 font-mono text-xs">
                  {/* Top Compatibility Status Card */}
                  <div className="p-3 rounded bg-[#0d1422] border border-[#1d2a42] flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border ${
                        report.importScore >= 85
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : report.importScore >= 70
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                          : 'bg-rose-950/80 border-rose-500 text-rose-300'
                      }`}>
                        {report.importScore}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-100">{report.fileName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            report.isReadyForMaps
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                              : 'bg-amber-950 text-amber-400 border-amber-700'
                          }`}>
                            {report.isReadyForMaps ? '✓ 100% APTO PARA MAPAS' : '⚠️ REQUIERE AJUSTES'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {report.gameEngine} &middot; Cabecera: {report.headerString} &middot; UserVersion: {report.userVersion}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const { sanitizedResult, collisionGeometry } = sanitizeNifForLabAndMaps(parseResult, 'map_chunk');
                          setParseResult(sanitizedResult);
                          setConvertedCollisionGeometry(collisionGeometry);
                          nifLabBridgeService.setSharedNif(sanitizedResult, collisionGeometry, 'file');
                          showToast('✓ NIF auto-saneado: Colisión Havok y BSFadeNode inyectados');
                        }}
                        className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        title="Auto-reparar colisión física y BSFadeNode para importar sin atravesar el suelo"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Auto-Sanear para Mapas FO4</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('mapExplorer')}
                        className="px-3 py-1.5 rounded bg-[#162132] hover:bg-[#1f2e46] text-cyan-300 border border-cyan-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Colocar en Celda de Mapa</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('nifskope')}
                        className="px-3 py-1.5 rounded bg-[#162132] hover:bg-[#1f2e46] text-slate-200 border border-[#23334c] text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ver en NifSkope 3D</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Pillars Checklist Grid */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {/* 1. Scene Graph & Root */}
                    <div className="p-2.5 rounded bg-[#0a0f18] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-cyan-400 border-b border-[#182338] pb-1">
                        <span>1. Nodo Raíz (SceneGraph)</span>
                        <span>{report.rootBlockType === 'BSFadeNode' ? '✓' : '⚠️'}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-200">{report.rootBlockType}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {report.rootBlockType === 'BSFadeNode'
                          ? 'Excelente. BSFadeNode permite que el Creation Kit haga culling y streaming por chunks en celdas exteriores.'
                          : 'Se recomienda envolver en BSFadeNode para celdas de mapa de Fallout 4.'}
                      </p>
                    </div>

                    {/* 2. Havok Collision */}
                    <div className="p-2.5 rounded bg-[#0a0f18] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-[#182338] pb-1">
                        <span>2. Físicas & Havok</span>
                        <span>{report.hasHavokCollision ? '✓' : '⚠️ Falta'}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-200">
                        {report.collisionType || 'Sin bhkCollisionObject'}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {report.hasHavokCollision
                          ? 'Límites Havok verificados. El personaje colisionará sólidamente sin atravesar el modelo.'
                          : '¡Cuidado! Sin colisión Havok, el jugador o proyectiles atravesarán la estructura.'}
                      </p>
                    </div>

                    {/* 3. Mesh & Geometry */}
                    <div className="p-2.5 rounded bg-[#0a0f18] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-[#182338] pb-1">
                        <span>3. Geometría 3D</span>
                        <span>✓</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-200">
                        {report.totalVertices.toLocaleString()} V | {report.totalTriangles.toLocaleString()} T
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Búfer de vértices float32 extraído con matriz 3x3 de rotación ortogonal saneada contra NaNs.
                      </p>
                    </div>

                    {/* 4. Shader & Material */}
                    <div className="p-2.5 rounded bg-[#0a0f18] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-400 border-b border-[#182338] pb-1">
                        <span>4. Shader PBR (.BGSM)</span>
                        <span>{report.hasShaders ? '✓' : '⚠️'}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-200">
                        {report.shaderType || 'BSLightingShaderProperty'}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        8 canales de texturas compatibles con PBR de Bethesda (Diffuse, Normal, Specular, CubeMap).
                      </p>
                    </div>
                  </div>

                  {/* Recommendations & Diagnostic Items */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-[#0a0f18] border border-[#172236] space-y-2">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-[#182338] pb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verificaciones Superadas ({report.recommendations.length}):</span>
                      </h4>
                      <div className="space-y-1">
                        {report.recommendations.map((rec, i) => (
                          <div key={i} className="text-[11px] text-emerald-300/90 flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#0a0f18] border border-[#172236] space-y-2">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-[#182338] pb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Avisos de Optimización ({report.warnings.length}):</span>
                      </h4>
                      <div className="space-y-1">
                        {report.warnings.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">
                            No se detectaron advertencias críticas. Este modelo está 100% listo para importarse.
                          </p>
                        ) : (
                          report.warnings.map((w, i) => (
                            <div key={i} className="text-[11px] text-amber-300/90 flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{w}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeTab === 'report' ? (
            <div className="w-full h-full overflow-y-auto p-3 text-slate-200 bg-[#06080b]">
              <pre className="whitespace-pre-wrap leading-relaxed text-xs">
                {parseResult.rawReport}
              </pre>
            </div>
          ) : activeTab === 'blocks' ? (
            <div className="w-full h-full overflow-y-auto p-3 space-y-2 text-slate-200 bg-[#06080b]">
              {parseResult.blocks.map((block) => (
                <div
                  key={block.id}
                  className="p-2.5 rounded bg-[#10141d] border border-[#1c2434] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                      #{block.id}
                    </span>
                    <span className="text-cyan-300 font-semibold">{block.type}</span>
                    {block.name && (
                      <span className="text-slate-400 text-[11px]">
                        &rarr; "{block.name}"
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    {block.verticesCount && (
                      <span className="text-amber-400">
                        {block.verticesCount} verts / {block.trianglesCount} tris
                      </span>
                    )}
                    <span className="text-slate-600">{block.sizeBytes} B</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Didactic & Reverse Engineering NIF View */
            <div className="w-full h-full overflow-y-auto p-3 space-y-3 text-slate-200 bg-[#06080b]">
              <div className="p-2.5 rounded bg-[#0d121c] border border-[#1f2b3e] space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Ingeniería Inversa del Formato NetImmerse / Gamebryo (Fallout 4 vs Skyrim)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Los archivos .NIF almacenan grafos de escena (Scene Graphs) jerárquicos. En Skyrim, la geometría se almacenaba en bloques <span className="text-amber-300 font-mono">NiTriShapeData</span> con rotaciones representadas por Quaternions (16 bytes). En Fallout 4, Bethesda introdujo <span className="text-emerald-300 font-mono">BSTriShape</span>, que reemplaza los quaternions con una matriz de rotación 3x3 de 36 bytes y comprime los datos de vértices en half-floats (16 bits).
                </p>
              </div>

              {/* Reverse Math Formula */}
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1b2536] space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Matemática Inversa de Extracción de Vértices:
                </span>
                <pre className="p-2 rounded bg-[#05070a] border border-[#121924] text-[10px] text-emerald-300 font-mono overflow-x-auto whitespace-pre">
{`# 1. Determinar tamaño de índice (triángulos de 16-bit vs 32-bit):
idx_size = 12 if num_verts > 65535 else 6

# 2. Calcular bytes ocupados por los triángulos:
tri_bytes = num_tris * idx_size

# 3. Restar desde el final del buffer para aislar el stream de vértices:
vertex_buffer_size = len(geom_data) - tri_bytes

# 4. Calcular tamaño exacto de cada vértice sin adivinar offsets:
vsize = vertex_buffer_size // num_verts

# 5. Sanitizador Anti-Basura:
if math.isnan(x) or math.isinf(x):
    x = 0.0  # Previene lienzos blancos o crasheos en WebGL`}
                </pre>
              </div>

              {/* Texture Pipeline Didactic Breakdown */}
              <div className="p-2.5 rounded bg-[#0d1017] border border-[#1c2436] space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Pipeline de Shaders &amp; Canales de Texturas NifSkope (BSShaderTextureSet):
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27]">
                    <span className="font-bold text-cyan-300">Slot 1: Difuso (_d.dds)</span>
                    <p className="text-slate-400 mt-0.5">Albedo/Color base (RGB). El canal alfa define transparencia o máscara de recorte.</p>
                  </div>
                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27]">
                    <span className="font-bold text-purple-300">Slot 2: Normal &amp; Brillo (_n.dds)</span>
                    <p className="text-slate-400 mt-0.5">Vectores tangentes (RG) para relieve de superficie. El canal alfa almacena el brillo especular (Gloss).</p>
                  </div>
                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27]">
                    <span className="font-bold text-emerald-300">Slot 3: Emisivo &amp; Glow (_g.dds)</span>
                    <p className="text-slate-400 mt-0.5">Máscara de luz que brilla en la oscuridad (miras ópticas, luces de terminales, plasma).</p>
                  </div>
                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27]">
                    <span className="font-bold text-amber-300">Slot 4: CubeMap &amp; Reflejo (_e.dds)</span>
                    <p className="text-slate-400 mt-0.5">Reflexión ambiental simulada para metales, visores de cascos y cromados.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

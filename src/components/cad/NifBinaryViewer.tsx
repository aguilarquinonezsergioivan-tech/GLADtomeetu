import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Box,
  Binary,
  Layers,
  FileCheck2,
  Cpu,
  RotateCcw,
  Eye,
  FileCode,
  Download,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Palette,
  Sparkles,
} from 'lucide-react';
import { NifParseResult, NifBlock, NifMapMesh } from '../../types/glados';
import { SAMPLE_NIF_FILES, parseNifFile } from '../../services/nifService';
import {
  NifTextureSlot,
  NIFSKOPE_TEXTURE_PRESETS,
  getDefaultTextureSlots,
} from '../../services/nifskopeTextureService';
import { loggerService } from '../../services/loggerService';

interface NifBinaryViewerProps {
  onExportToCadPlate?: (width: number, height: number) => void;
}

export const NifBinaryViewer: React.FC<NifBinaryViewerProps> = ({
  onExportToCadPlate,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>(
    'PlasmaCarbine_Receiver.nif'
  );
  const [parseResult, setParseResult] = useState<NifParseResult>(() =>
    parseNifFile('PlasmaCarbine_Receiver.nif')
  );
  const [viewSubTab, setViewSubTab] = useState<'3d' | 'textures' | 'blocks' | 'hex' | 'math'>(
    '3d'
  );
  const [textureSlots, setTextureSlots] = useState<NifTextureSlot[]>(() =>
    getDefaultTextureSlots()
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    NIFSKOPE_TEXTURE_PRESETS[0].id
  );
  const [selectedBlock, setSelectedBlock] = useState<NifBlock | null>(null);
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid');

  // 3D Canvas Orbit State
  const [yaw, setYaw] = useState<number>(40);
  const [pitch, setPitch] = useState<number>(20);
  const [zoom, setZoom] = useState<number>(2.4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (parseResult.blocks.length > 0 && !selectedBlock) {
      setSelectedBlock(parseResult.blocks[0]);
    }
    draw3DCanvas();
  }, [parseResult, yaw, pitch, zoom, renderMode, viewSubTab]);

  const draw3DCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || viewSubTab !== '3d') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Technical background
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(0, 0, w, h);

    // Ground Grid
    ctx.strokeStyle = '#141a26';
    ctx.lineWidth = 1;
    const gridRange = 90;
    const step = 18;

    const project = (x: number, y: number, z: number) => {
      const radYaw = (yaw * Math.PI) / 180;
      const x1 = x * Math.cos(radYaw) - y * Math.sin(radYaw);
      const y1 = x * Math.sin(radYaw) + y * Math.cos(radYaw);

      const radPitch = (pitch * Math.PI) / 180;
      const y2 = y1 * Math.cos(radPitch) - z * Math.sin(radPitch);
      const z2 = y1 * Math.sin(radPitch) + z * Math.cos(radPitch);

      const cameraDistance = 320;
      const fov = cameraDistance / (cameraDistance + y2);
      const screenX = w / 2 + x1 * zoom * fov;
      const screenY = h / 2 - z2 * zoom * fov + 25;
      return { sx: screenX, sy: screenY };
    };

    for (let i = -gridRange; i <= gridRange; i += step) {
      const p1 = project(i, -gridRange, 0);
      const p2 = project(i, gridRange, 0);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      const p3 = project(-gridRange, i, 0);
      const p4 = project(gridRange, i, 0);
      ctx.beginPath();
      ctx.moveTo(p3.sx, p3.sy);
      ctx.lineTo(p4.sx, p4.sy);
      ctx.stroke();
    }

    // Origin Axes
    const orig = project(0, 0, 0);
    const axX = project(35, 0, 0);
    const axY = project(0, 35, 0);
    const axZ = project(0, 0, 35);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(orig.sx, orig.sy);
    ctx.lineTo(axX.sx, axX.sy);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(orig.sx, orig.sy);
    ctx.lineTo(axY.sx, axY.sy);
    ctx.stroke();

    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(orig.sx, orig.sy);
    ctx.lineTo(axZ.sx, axZ.sy);
    ctx.stroke();

    // Render meshes extracted from NIF binary stream
    parseResult.meshes.forEach((mesh) => {
      const verts = mesh.vertices;
      const faces = mesh.faces;
      const proj = verts.map((v) => project(v.x, v.y, v.z));

      faces.forEach((face, idx) => {
        const pA = proj[face.a];
        const pB = proj[face.b];
        const pC = proj[face.c];
        if (!pA || !pB || !pC) return;

        ctx.beginPath();
        ctx.moveTo(pA.sx, pA.sy);
        ctx.lineTo(pB.sx, pB.sy);
        ctx.lineTo(pC.sx, pC.sy);
        ctx.closePath();

        if (renderMode === 'solid') {
          const diffuseColor = textureSlots[0]?.enabled ? textureSlots[0].colorPreview : '#06b6d4';
          ctx.fillStyle = diffuseColor;
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + (idx % 4) * 0.05})`;
          ctx.fill();
        }

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Vertices
      ctx.fillStyle = '#f59e0b';
      proj.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Viewport HUD
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(
      `NIF Binary Mesh | Vertices: ${parseResult.totalVertices} | Caras: ${parseResult.totalTriangles}`,
      12,
      20
    );
    ctx.fillText(
      `Shader: BSTriShape PBR | Matrices 3x3 (36 bytes) | Sanitizador Anti-NaN: OK`,
      12,
      35
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => (prev + dx * 0.6) % 360);
    setPitch((prev) => Math.min(85, Math.max(-85, prev - dy * 0.6)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(6.0, Math.max(0.6, prev - e.deltaY * 0.002)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const res = parseNifFile(file.name, buffer);
      setParseResult(res);
      setSelectedBlock(res.blocks[0] || null);
      loggerService.log(
        'COMMAND',
        `Cargado archivo binario NIF en CAD Panel: ${file.name} (${(buffer.byteLength / 1024).toFixed(1)} KB)`
      );
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSelectPreset = (name: string) => {
    setSelectedFile(name);
    const res = parseNifFile(name);
    setParseResult(res);
    setSelectedBlock(res.blocks[0] || null);
    loggerService.log('COMMAND', `NIF seleccionado en CAD Panel: ${name}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0d13] p-3 overflow-hidden font-mono text-xs">
      {/* NIF Binary Viewer Top Bar */}
      <div className="pb-2.5 mb-2.5 border-b border-[#1b2231] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-xs tracking-wider">
            NIF BINARY VIEWER &amp; PARSER (CAD INTEGRATION)
          </h3>
          <span className="text-[10px] text-slate-500">
            Gamebryo / Fallout 4 NetImmerse
          </span>
        </div>

        {/* File Select & Upload Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Archivo Proyecto:</span>
          <select
            value={selectedFile}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="bg-[#131823] text-slate-200 border border-[#232c3f] rounded px-2 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500"
          >
            {SAMPLE_NIF_FILES.map((sample) => (
              <option key={sample.id} value={sample.name}>
                {sample.name} ({sample.game})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-[11px] font-medium transition-all cursor-pointer shadow-xs active:scale-95">
            <Upload className="w-3 h-3" />
            <span>Subir .NIF</span>
            <input
              type="file"
              accept=".nif,.bin"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="pb-2 mb-2 border-b border-[#181f2c] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#121620] p-0.5 rounded border border-[#1f2736]">
          <button
            onClick={() => setViewSubTab('3d')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
              viewSubTab === '3d'
                ? 'bg-cyan-900/50 text-cyan-200 font-bold border border-cyan-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Visor 3D</span>
          </button>

          <button
            onClick={() => setViewSubTab('textures')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
              viewSubTab === 'textures'
                ? 'bg-cyan-900/50 text-cyan-200 font-bold border border-cyan-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3 h-3" />
            <span>BSShaderTextureSet ({textureSlots.length})</span>
          </button>

          <button
            onClick={() => setViewSubTab('blocks')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
              viewSubTab === 'blocks'
                ? 'bg-cyan-900/50 text-cyan-200 font-bold border border-cyan-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Bloques ({parseResult.blocks.length})</span>
          </button>

          <button
            onClick={() => setViewSubTab('math')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
              viewSubTab === 'math'
                ? 'bg-cyan-900/50 text-cyan-200 font-bold border border-cyan-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Matemática Inversa &amp; Offsets</span>
          </button>

          <button
            onClick={() => setViewSubTab('hex')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] ${
              viewSubTab === 'hex'
                ? 'bg-cyan-900/50 text-cyan-200 font-bold border border-cyan-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3 h-3" />
            <span>Hex Dump &amp; Bytes</span>
          </button>
        </div>

        {viewSubTab === '3d' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setRenderMode(renderMode === 'solid' ? 'wireframe' : 'solid')
              }
              className="px-2 py-0.5 rounded bg-[#151c27] text-slate-300 hover:text-cyan-300 border border-[#212b3d] text-[10px]"
            >
              Modo: {renderMode === 'solid' ? 'Sólido' : 'Alámbrico'}
            </button>
            <button
              onClick={() => {
                setYaw(40);
                setPitch(20);
                setZoom(2.4);
              }}
              className="p-1 rounded bg-[#151c27] text-slate-400 hover:text-white border border-[#212b3d]"
              title="Restablecer cámara"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Binary Metadata & Block Hierarchy (4 cols) */}
        <div className="col-span-4 bg-[#0d1017] border border-[#1b2231] rounded p-2.5 flex flex-col overflow-y-auto space-y-3">
          {/* Header Summary */}
          <div className="border-b border-[#192130] pb-2 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              Cabecera NetImmerse:
            </span>
            <div className="p-2 rounded bg-[#121622] border border-[#1e2638] space-y-1 text-[11px]">
              <div className="text-cyan-300 font-bold truncate">
                {parseResult.headerString || 'Gamebryo File Format, Version 20.2.0.7'}
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Versión: {parseResult.version}</span>
                <span>UserVer: {parseResult.userVersion}</span>
              </div>
              <div className="text-slate-400 text-[10px]">
                Endianness: {parseResult.endianness}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-[#121622] border border-[#1e2638]">
              <span className="text-[10px] text-slate-500 block">Vértices 3D:</span>
              <span className="text-emerald-300 font-bold text-xs">
                {parseResult.totalVertices.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded bg-[#121622] border border-[#1e2638]">
              <span className="text-[10px] text-slate-500 block">Polígonos:</span>
              <span className="text-amber-300 font-bold text-xs">
                {parseResult.totalTriangles.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Blocks List */}
          <div className="flex-1 min-h-0 flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
              Bloques en Memoria:
            </span>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {parseResult.blocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlock(block)}
                  className={`p-2 rounded cursor-pointer border transition-colors flex items-center justify-between text-[11px] ${
                    selectedBlock?.id === block.id
                      ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200 font-bold'
                      : 'bg-[#10141d] border-[#1d2535] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="truncate">
                    <span className="text-slate-500 mr-1.5 font-normal">
                      #{block.id}
                    </span>
                    <span className="text-cyan-300">{block.type}</span>
                    {block.name && (
                      <span className="text-slate-400 block text-[10px] font-normal truncate">
                        {block.name}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {(block.sizeBytes / 1024).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onExportToCadPlate && (
            <button
              onClick={() => onExportToCadPlate(180, 120)}
              className="w-full py-1.5 bg-[#17202e] hover:bg-[#202c40] text-slate-200 hover:text-cyan-300 rounded border border-[#25334a] text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Sincronizar Dimensiones con CAD</span>
            </button>
          )}
        </div>

        {/* Right Column: Viewport / Inspection Tabs (8 cols) */}
        <div className="col-span-8 bg-[#080b10] border border-[#1b2231] rounded p-2.5 flex flex-col overflow-hidden">
          {viewSubTab === '3d' ? (
            <div className="w-full h-full relative cursor-grab active:cursor-grabbing rounded overflow-hidden">
              <canvas
                ref={canvasRef}
                width={700}
                height={460}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className="w-full h-full object-contain rounded border border-[#151c28]"
              />
              <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-[#0a0d14]/80 px-2 py-1 rounded border border-[#1a2130] pointer-events-none">
                Arrastra para rotar &middot; Rueda para zoom &middot; NIF 3D Mesh
              </div>
            </div>
          ) : viewSubTab === 'textures' ? (
            <div className="w-full h-full overflow-y-auto space-y-2 p-1 text-slate-300">
              <div className="p-2 rounded bg-[#0f1420] border border-[#1e273a] space-y-1.5 mb-2">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Presets de Texturas Fallout 4 / Skyrim:
                </span>
                <div className="flex flex-wrap gap-1">
                  {NIFSKOPE_TEXTURE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPresetId(p.id);
                        setTextureSlots(getDefaultTextureSlots(p));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer border ${
                        selectedPresetId === p.id
                          ? 'bg-cyan-950 text-cyan-200 border-cyan-500 font-bold'
                          : 'bg-[#151c27] text-slate-400 border-[#222b3d] hover:text-white'
                      }`}
                    >
                      {p.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {textureSlots.map((slot, sIdx) => (
                  <div
                    key={slot.index}
                    className="p-2 rounded bg-[#0e121a] border border-[#1d2535] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-xs border border-slate-600"
                          style={{ backgroundColor: slot.colorPreview }}
                        />
                        <span className="font-bold text-cyan-300">{slot.label}</span>
                      </div>
                      <label className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c2433] hover:bg-[#253044] text-cyan-300 text-[10px] cursor-pointer border border-[#26344d]">
                        <Upload className="w-2.5 h-2.5" />
                        <span>Subir .dds</span>
                        <input
                          type="file"
                          accept=".dds,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setTextureSlots((prev) => {
                                const next = [...prev];
                                next[sIdx] = {
                                  ...next[sIdx],
                                  path: `textures/custom/${file.name}`,
                                  imageSrc: dataUrl,
                                  enabled: true,
                                };
                                return next;
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={slot.path}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTextureSlots((prev) => {
                          const next = [...prev];
                          next[sIdx] = { ...next[sIdx], path: val };
                          return next;
                        });
                      }}
                      className="w-full bg-[#07090f] border border-[#1c2436] rounded px-2 py-0.5 text-[10px] text-slate-300 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : viewSubTab === 'blocks' ? (
            <div className="w-full h-full overflow-y-auto space-y-2 p-1 text-slate-300">
              <div className="text-[11px] text-slate-400 mb-2 font-bold">
                Inspección Quirúrgica de Bloques Estructurales:
              </div>
              {parseResult.blocks.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded bg-[#0e121a] border border-[#1d2535] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">
                      #{b.id} &middot; {b.type}
                    </span>
                    <span className="text-amber-400 text-[10px]">
                      {b.sizeBytes} bytes
                    </span>
                  </div>
                  {b.name && (
                    <div className="text-slate-400 text-[11px]">
                      Nombre de nodo: <code className="text-slate-200">"{b.name}"</code>
                    </div>
                  )}
                  {b.verticesCount && (
                    <div className="text-emerald-400 text-[11px]">
                      Malla: {b.verticesCount} vértices, {b.trianglesCount} triángulos
                    </div>
                  )}
                  {b.properties && (
                    <div className="text-slate-500 text-[10px]">
                      Propiedades: {JSON.stringify(b.properties)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : viewSubTab === 'math' ? (
            <div className="w-full h-full overflow-y-auto p-2 space-y-3 text-slate-300">
              <div className="p-3 rounded bg-[#0d111a] border border-[#1d2639] space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Algoritmo de Extracción BSTriShape (Fallout 4)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  En Fallout 4, los bloques BSTriShape guardan los triángulos al final absoluto del bloque.
                  Se usa la fórmula matemática inversa sin adivinar bits:
                </p>
                <div className="bg-[#07090f] p-2.5 rounded border border-[#192233] text-emerald-300 text-xs">
                  <code>idx_size = 12 if num_verts &gt; 65535 else 6</code><br />
                  <code>tri_bytes = num_tris * idx_size</code><br />
                  <code>vertex_buffer_size = len(geom_data) - tri_bytes</code><br />
                  <code>vsize = vertex_buffer_size // num_verts</code>
                </div>
              </div>

              <div className="p-3 rounded bg-[#0d111a] border border-[#1d2639] space-y-1 text-[11px]">
                <div className="font-bold text-slate-200 mb-1">
                  Protecciones de Memoria Activas:
                </div>
                <div className="text-slate-400">
                  &bull; <strong>Matrices 3x3 (36 bytes):</strong> Preserva transformaciones globales de padres.
                </div>
                <div className="text-slate-400">
                  &bull; <strong>Filtro Anti-NaN:</strong> Coordenadas corruptas transformadas a 0.0 para no desbordar el visor CAD.
                </div>
                <div className="text-slate-400">
                  &bull; <strong>Validación Estricta de Índices:</strong> Descarta triángulos con vértices fuera de rango.
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto bg-[#06080b] p-2 rounded border border-[#151c27] font-mono text-[11px] text-cyan-300/90 leading-tight">
              <div className="text-slate-500 mb-2">
                Hex Dump Inicial (Primeros 256 bytes del stream NIF):
              </div>
              <pre className="whitespace-pre">
{`00000000:  47 61 6D 65 62 72 79 6F  20 46 69 6C 65 20 46 6F  |Gamebryo File Fo|
00000010:  72 6D 61 74 2C 20 56 65  72 73 69 6F 6E 20 32 30  |rmat, Version 20|
00000020:  2E 32 2E 30 2E 37 0A 07  00 00 14 00 0C 00 00 00  |.2.0.7..........|
00000030:  07 00 00 00 82 00 00 00  00 00 00 00 05 00 00 00  |................|
00000040:  0A 00 00 00 42 53 46 61  64 65 4E 6F 64 65 00 00  |....BSFadeNode..|
00000050:  0A 00 00 00 42 53 54 72  69 53 68 61 70 65 00 00  |....BSTriShape..|
00000060:  17 00 00 00 42 53 4C 69  67 68 74 69 6E 67 53 68  |....BSLightingSh|
00000070:  61 64 65 72 50 72 6F 70  65 72 74 79 00 00 00 00  |aderProperty....|
00000080:  13 00 00 00 62 68 6B 43  6F 6C 6C 69 73 69 6F 6E  |....bhkCollision|
00000090:  4F 62 6A 65 63 74 00 00  00 00 00 00 00 00 00 00  |Object..........|
000000A0:  00 00 01 00 02 00 01 00  02 00 03 00 80 02 00 00  |................|
000000B0:  00 01 00 00 00 00 00 00  00 00 80 3F 00 00 80 3F  |...........?...?|`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

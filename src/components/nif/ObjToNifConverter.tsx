import React, { useState } from 'react';
import {
  Upload,
  Box,
  Shield,
  Crosshair,
  MapPin,
  Sparkles,
  Download,
  FileCheck2,
  CheckCircle2,
  Layers,
  Cpu,
  Flame,
  Info,
  Sliders,
  Play,
  RotateCcw,
  Trash2,
  Plus,
  FileCode,
  FileUp,
  AlertTriangle,
} from 'lucide-react';
import {
  AssetCategory,
  HavokMaterial,
  HavokCollisionConfig,
  ImportedMeshData,
  CollisionGeometryData,
  NifConversionResult,
} from '../../types/nifImporter';
import {
  parseObjFile,
  parseFbxText,
} from '../../services/meshImporterService';
import {
  getDefaultCollisionConfig,
  generateHavokCollisionGeometry,
} from '../../services/havokCollisionService';
import {
  convertMeshToNif,
  downloadNifBinary,
  downloadBgsmText,
} from '../../services/nifGeneratorService';
import { NifParseResult } from '../../types/glados';
import { loggerService } from '../../services/loggerService';

export interface UserAddedModel {
  id: string;
  name: string;
  format: 'obj' | 'fbx';
  sizeBytes: number;
  content: string;
  parsedMesh: ImportedMeshData;
  addedAt: string;
}

interface ObjToNifConverterProps {
  onConversionSuccess: (result: {
    conversionResult: NifConversionResult;
    nifParseResult: NifParseResult;
  }) => void;
  onOpenInNifSkope: () => void;
}

export const ObjToNifConverter: React.FC<ObjToNifConverterProps> = ({
  onConversionSuccess,
  onOpenInNifSkope,
}) => {
  // User uploaded models (NO PRESETS - pure user added models)
  const [userModels, setUserModels] = useState<UserAddedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Paste OBJ text modal
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteName, setPasteName] = useState<string>('MiModelo3D.obj');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Asset Category
  const [category, setCategory] = useState<AssetCategory>('weapons_props');

  // Havok Collision Parameters
  const [havokMaterial, setHavokMaterial] = useState<HavokMaterial>('HAV_MAT_METAL');
  const [massKg, setMassKg] = useState<number>(3.2);
  const [friction, setFriction] = useState<number>(0.65);
  const [restitution, setRestitution] = useState<number>(0.25);
  const [engineTarget, setEngineTarget] = useState<'fallout4' | 'skyrim_se'>('fallout4');

  // NavMesh flags (for static maps)
  const [navmeshWalkable, setNavmeshWalkable] = useState<boolean>(true);
  const [navmeshObstacle, setNavmeshObstacle] = useState<boolean>(true);
  const [navmeshCover, setNavmeshCover] = useState<boolean>(true);

  // Conversion state
  const [lastConversion, setLastConversion] = useState<NifConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeModel = userModels.find((m) => m.id === selectedModelId) || userModels[0] || null;

  // Process and add a new user model
  const addModelFromText = (name: string, content: string, sizeBytes: number) => {
    try {
      const isFbx = name.toLowerCase().endsWith('.fbx');
      const parsedMesh = isFbx
        ? parseFbxText(content, name)
        : parseObjFile(content, name);

      if (parsedMesh.vertices.length === 0) {
        showToast('⚠ El archivo no contenía vértices 3D válidos.');
        return;
      }

      const newModel: UserAddedModel = {
        id: `model-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        format: isFbx ? 'fbx' : 'obj',
        sizeBytes,
        content,
        parsedMesh,
        addedAt: new Date().toLocaleTimeString(),
      };

      setUserModels((prev) => [newModel, ...prev]);
      setSelectedModelId(newModel.id);

      // Heuristic auto-category detection
      const lower = name.toLowerCase();
      if (
        lower.includes('armor') ||
        lower.includes('helmet') ||
        lower.includes('cuirass') ||
        lower.includes('clothes') ||
        lower.includes('ropa') ||
        lower.includes('body')
      ) {
        setCategory('clothing_armor');
        setHavokMaterial('HAV_MAT_FLESH');
      } else if (
        lower.includes('sword') ||
        lower.includes('gun') ||
        lower.includes('rifle') ||
        lower.includes('weapon') ||
        lower.includes('espada') ||
        lower.includes('pistol')
      ) {
        setCategory('weapons_props');
        setHavokMaterial('HAV_MAT_METAL');
      } else if (
        lower.includes('bunker') ||
        lower.includes('wall') ||
        lower.includes('floor') ||
        lower.includes('building') ||
        lower.includes('chunk') ||
        lower.includes('map')
      ) {
        setCategory('maps_statics');
        setHavokMaterial('HAV_MAT_CONCRETE');
        setMassKg(0);
      }

      loggerService.log(
        'COMMAND',
        `[3D Import]: Agregado modelo '${name}' (${parsedMesh.vertices.length} verts, ${parsedMesh.faces.length} caras).`
      );
      showToast(`✓ Modelo '${name}' agregado (${parsedMesh.vertices.length} vértices)`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showToast(`❌ Error al procesar archivo: ${errorMsg}`);
    }
  };

  // Upload local file (OBJ or FBX)
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        addModelFromText(file.name, text, file.size);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        addModelFromText(file.name, text, file.size);
      };
      reader.readAsText(file);
    }
  };

  // Delete an added model
  const handleDeleteModel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserModels((prev) => prev.filter((m) => m.id !== id));
    if (selectedModelId === id) {
      const remaining = userModels.filter((m) => m.id !== id);
      setSelectedModelId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('✓ Modelo eliminado de la lista');
  };

  // Execute Conversion
  const handleRunConversion = () => {
    if (!activeModel) {
      showToast('⚠ Primero debes agregar o seleccionar un archivo .OBJ o .FBX.');
      return;
    }

    setIsConverting(true);

    setTimeout(() => {
      try {
        const mesh = activeModel.parsedMesh;

        // Configure Havok
        const baseConfig = getDefaultCollisionConfig(category, mesh);
        const finalConfig: HavokCollisionConfig = {
          ...baseConfig,
          engineTarget,
          havokMaterial,
          massKg: category === 'maps_statics' ? 0 : massKg,
          friction,
          restitution,
          navmeshFlags: {
            walkable: navmeshWalkable,
            obstacle: navmeshObstacle,
            coverEdge: navmeshCover,
          },
        };

        // Generate Havok Collision Geometry (Convex Hull, Partitions, or Mesh)
        const collisionGeom = generateHavokCollisionGeometry(mesh, finalConfig);

        // Convert and assemble Bethesda NIF
        const { conversionResult, nifParseResult } = convertMeshToNif(
          mesh,
          finalConfig,
          collisionGeom
        );

        setLastConversion(conversionResult);
        setIsConverting(false);

        loggerService.log(
          'INFO',
          `Conversión OBJ/FBX a NIF exitosa: ${nifParseResult.fileName} (${nifParseResult.blocks.length} bloques, ${nifParseResult.totalVertices} vértices reales).`
        );
        showToast('✓ Conversión a NIF Bethesda completada. Abriendo visor 3D...');

        onConversionSuccess({ conversionResult, nifParseResult });
      } catch (err: unknown) {
        setIsConverting(false);
        const errorMsg = err instanceof Error ? err.message : String(err);
        loggerService.log('ERROR', `Error al convertir OBJ/FBX a NIF: ${errorMsg}`);
        showToast(`❌ Error al convertir: ${errorMsg}`);
      }
    }, 250);
  };

  return (
    <div className="w-full h-full p-3 grid grid-cols-12 gap-3 overflow-y-auto text-slate-200 bg-[#080b10] font-mono select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-[#121c2b] border border-cyan-500/80 text-cyan-200 px-3 py-1.5 rounded shadow-lg text-xs font-bold animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Paste OBJ Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0f1420] border border-[#233148] rounded-lg max-w-xl w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c2738] pb-2">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>Pegar Código / Geometría Wavefront OBJ</span>
              </h4>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Nombre del Archivo:</label>
              <input
                type="text"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                className="w-full bg-[#141b27] border border-[#233148] rounded px-2.5 py-1 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Contenido OBJ (vértices 'v', caras 'f'):</label>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={10}
                placeholder={"v 0.0 0.0 0.0\nv 10.0 0.0 0.0\nv 5.0 10.0 0.0\nf 1 2 3"}
                className="w-full bg-[#141b27] border border-[#233148] rounded p-2 text-xs font-mono text-slate-300 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2738]">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!pasteContent.trim()) {
                    showToast('⚠ El texto pegado está vacío.');
                    return;
                  }
                  addModelFromText(pasteName, pasteContent, pasteContent.length);
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-bold cursor-pointer"
              >
                Agregar Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Input Selection & Category Picker (Cols 6) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col space-y-3">
        {/* Banner */}
        <div className="bg-[#0f1420] border border-[#1d273a] p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>CONVERSOR UNIVERSAL 3D (OBJ / FBX &rarr; NIF BETHESDA)</span>
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 font-semibold">
              Fallout 4 v130 &middot; BSTriShape &middot; Havok
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Importa tus propios modelos 3D y conviértelos directamente en archivos <code className="text-cyan-300">.nif</code> y <code className="text-amber-300">.bgsm</code> con colisiones Havok calculadas exactamente según el tipo de asset (ropa/armadura, armas o mapas).
          </p>
        </div>

        {/* 1. Selector de Modelo 3D (100% User Added - No Pre-established Models) */}
        <div className="bg-[#0b0f17] border border-[#192233] p-3 rounded-md space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Modelo 3D de Origen (OBJ / FBX)</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPasteModal(true)}
                className="px-2 py-1 bg-[#141d2a] hover:bg-[#1e2a3c] text-slate-300 rounded text-[10.5px] border border-[#223145] flex items-center gap-1 cursor-pointer transition-colors"
                title="Pegar código OBJ crudo directamente"
              >
                <FileCode className="w-3 h-3 text-cyan-400" />
                <span>Pegar OBJ</span>
              </button>

              <label className="flex items-center gap-1 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-xs active:scale-95">
                <Upload className="w-3.5 h-3.5" />
                <span>+ Cargar Modelo Propio</span>
                <input
                  type="file"
                  multiple
                  accept=".obj,.fbx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-md p-4 text-center transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 scale-[1.01]'
                : userModels.length === 0
                ? 'border-[#263750] bg-[#0d121c] text-slate-400 hover:border-cyan-600/70'
                : 'border-[#1b2535] bg-[#0c1017] text-slate-400'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <FileUp className={`w-6 h-6 ${isDragging ? 'text-cyan-300 animate-bounce' : 'text-slate-500'}`} />
              <p className="text-xs font-semibold text-slate-300">
                Arrastra y suelta tu archivo <strong>.OBJ</strong> o <strong>.FBX</strong> aquí
              </p>
              <p className="text-[10px] text-slate-500">
                Sin modelos preestablecidos. Todo se genera a partir de los archivos que tú agregues.
              </p>
            </div>
          </div>

          {/* List of User Added Models */}
          {userModels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Modelos 3D que has agregado ({userModels.length}):
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {userModels.map((model) => {
                  const isSelected = activeModel?.id === model.id;
                  const bounds = model.parsedMesh.bounds;
                  const width = (bounds.max[0] - bounds.min[0]).toFixed(1);
                  const depth = (bounds.max[1] - bounds.min[1]).toFixed(1);
                  const height = (bounds.max[2] - bounds.min[2]).toFixed(1);

                  return (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50 text-cyan-100'
                          : 'bg-[#101522] border-[#1e283d] text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-cyan-900/80 text-cyan-200' : 'bg-[#17202f] text-slate-400'
                        }`}>
                          <Box className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-200 truncate">
                              {model.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1c2738] text-cyan-300 uppercase">
                              .{model.format}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 mt-0.5">
                            {model.parsedMesh.vertices.length.toLocaleString()} vértices &middot;{' '}
                            {model.parsedMesh.faces.length.toLocaleString()} caras &middot; Dim: {width}×{depth}×{height}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isSelected && (
                          <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/90 border border-cyan-600/70 px-1.5 py-0.5 rounded">
                            Activo
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteModel(model.id, e)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded transition-colors"
                          title="Eliminar de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Selector Especializado de Categoría (Bethesda Havok Rules) */}
        <div className="bg-[#0b0f17] border border-[#192233] p-3 rounded-md space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>2. Tipo de Asset y Comportamiento Havok Bethesda</span>
          </span>

          <div className="grid grid-cols-3 gap-2">
            {/* Clothing / Armor */}
            <button
              onClick={() => {
                setCategory('clothing_armor');
                setHavokMaterial('HAV_MAT_FLESH');
                setMassKg(12.5);
              }}
              className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex flex-col justify-between ${
                category === 'clothing_armor'
                  ? 'bg-purple-950/70 border-purple-500 ring-1 ring-purple-500/50 text-purple-100'
                  : 'bg-[#101522] border-[#1e283d] text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1 text-purple-300 font-bold text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Ropa / Armadura</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-snug">
                  <strong>Sin colisión estática</strong>. Configura <code className="text-purple-300">BSDismemberSkinInstance</code> con particiones de cuerpo para ragdoll.
                </p>
              </div>
              <span className="text-[9px] text-purple-400 font-semibold mt-2">
                Particiones Anatómicas
              </span>
            </button>

            {/* Weapons / Props */}
            <button
              onClick={() => {
                setCategory('weapons_props');
                setHavokMaterial('HAV_MAT_METAL');
                setMassKg(3.2);
              }}
              className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex flex-col justify-between ${
                category === 'weapons_props'
                  ? 'bg-amber-950/70 border-amber-500 ring-1 ring-amber-500/50 text-amber-100'
                  : 'bg-[#101522] border-[#1e283d] text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1 text-amber-300 font-bold text-xs">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Armas &amp; Props</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-snug">
                  Colisión convexa <code className="text-amber-300">bhkConvexVerticesShape</code> con masa dinámica y sockets de enganche de mano/cañón.
                </p>
              </div>
              <span className="text-[9px] text-amber-400 font-semibold mt-2">
                Física Dinámica &amp; Sockets
              </span>
            </button>

            {/* Maps / Statics */}
            <button
              onClick={() => {
                setCategory('maps_statics');
                setHavokMaterial('HAV_MAT_CONCRETE');
                setMassKg(0);
              }}
              className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex flex-col justify-between ${
                category === 'maps_statics'
                  ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500/50 text-emerald-100'
                  : 'bg-[#101522] border-[#1e283d] text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1 text-emerald-300 font-bold text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Mapas &amp; Estáticos</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-snug">
                  Malla estática <code className="text-emerald-300">bhkCompressedMeshShape</code> fija (masa 0 kg) con bloqueo de balas y NavMesh para NPCs.
                </p>
              </div>
              <span className="text-[9px] text-emerald-400 font-semibold mt-2">
                Colisión Rígida &amp; NavMesh
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Havok Physics Parameters & Conversion Action (Cols 6) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col space-y-3">
        {/* Havok Configuration Parameters */}
        <div className="bg-[#0b0f17] border border-[#192233] p-3 rounded-md space-y-3">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>3. Parámetros Físicos Havok &amp; Shaders Bethesda</span>
          </span>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Target Engine */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">
                Motor Bethesda Destino:
              </label>
              <select
                value={engineTarget}
                onChange={(e) => setEngineTarget(e.target.value as 'fallout4' | 'skyrim_se')}
                className="w-full bg-[#121622] text-slate-200 border border-[#232c3e] rounded p-1.5 text-xs focus:border-cyan-500 focus:outline-hidden"
              >
                <option value="fallout4">Fallout 4 (BSTriShape / v130) [Recomendado]</option>
                <option value="skyrim_se">Skyrim Special Edition (NiTriShape / v83)</option>
              </select>
            </div>

            {/* Havok Material */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">
                Material Físico Havok:
              </label>
              <select
                value={havokMaterial}
                onChange={(e) => setHavokMaterial(e.target.value as HavokMaterial)}
                className="w-full bg-[#121622] text-slate-200 border border-[#232c3e] rounded p-1.5 text-xs focus:border-cyan-500 focus:outline-hidden"
              >
                <option value="HAV_MAT_METAL">HAV_MAT_METAL (Metal / Chispas Balísticas)</option>
                <option value="HAV_MAT_CONCRETE">HAV_MAT_CONCRETE (Hormigón / Polvo &amp; Rebote)</option>
                <option value="HAV_MAT_STONE">HAV_MAT_STONE (Piedra / Roca Natural)</option>
                <option value="HAV_MAT_WOOD">HAV_MAT_WOOD (Madera / Astillas)</option>
                <option value="HAV_MAT_FLESH">HAV_MAT_FLESH (Carne / Tela Acolchada)</option>
                <option value="HAV_MAT_DIRT">HAV_MAT_DIRT (Tierra / Barro)</option>
                <option value="HAV_MAT_GLASS">HAV_MAT_GLASS (Vidrio / Sonido Cristal)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Mass or Static Mass */}
          {category === 'weapons_props' && (
            <div className="p-2.5 bg-[#121724] border border-[#20293d] rounded-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Masa Física del Arma / Prop:</span>
                </span>
                <span className="text-amber-200 font-bold">{massKg.toFixed(1)} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25.0"
                step="0.1"
                value={massKg}
                onChange={(e) => setMassKg(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Determina la gravedad y fuerza de retroceso cuando el arma cae o es lanzada por una explosión.
              </p>
            </div>
          )}

          {category === 'clothing_armor' && (
            <div className="p-2.5 bg-[#171224] border border-[#2d2042] rounded-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Particiones BSDismemberSkinInstance:</span>
                </span>
                <span className="text-purple-200 text-[10px]">Fallout 4 Body Rig</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="bg-purple-900/60 border border-purple-600/60 text-purple-200 px-2 py-0.5 rounded">
                  BP_TORSO (ID 30)
                </span>
                <span className="bg-purple-900/60 border border-purple-600/60 text-purple-200 px-2 py-0.5 rounded">
                  BP_HEAD (ID 31)
                </span>
                <span className="bg-purple-900/60 border border-purple-600/60 text-purple-200 px-2 py-0.5 rounded">
                  BP_LEFTARM (ID 32)
                </span>
                <span className="bg-purple-900/60 border border-purple-600/60 text-purple-200 px-2 py-0.5 rounded">
                  BP_RIGHTARM (ID 33)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Al desmembrar extremidades en combate con armas pesadas, Fallout 4 ocultará automáticamente la partición correspondiente sin romper la malla.
              </p>
            </div>
          )}

          {category === 'maps_statics' && (
            <div className="p-2.5 bg-[#101b17] border border-[#1b332b] rounded-md space-y-1.5">
              <span className="text-emerald-300 font-semibold text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Flags de NavMesh para IA de Bethesda:</span>
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={navmeshWalkable}
                    onChange={(e) => setNavmeshWalkable(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Walkable (Caminable)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={navmeshObstacle}
                    onChange={(e) => setNavmeshObstacle(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Obstacle (Bloqueo)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={navmeshCover}
                    onChange={(e) => setNavmeshCover(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>CoverEdge (Cobertura)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="bg-[#0b0f17] border border-[#192233] p-3 rounded-md space-y-2.5">
          <button
            onClick={handleRunConversion}
            disabled={isConverting || !activeModel}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 via-emerald-600 to-cyan-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-md text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConverting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Ensamblando NIF Bethesda &amp; Colisiones Havok...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-200" />
                <span>
                  {activeModel
                    ? `⚡ CONVERTIR "${activeModel.name}" A NIF BETHESDA`
                    : '⚡ SELECCIONA O SUBE UN MODELO PRIMERO'}
                </span>
              </>
            )}
          </button>

          {!activeModel && (
            <p className="text-[10px] text-amber-400 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sube un archivo .OBJ o .FBX en la sección izquierda para habilitar la conversión.</span>
            </p>
          )}

          {/* Diagnostics and direct download after conversion */}
          {lastConversion && (
            <div className="p-3 bg-[#0d131f] border border-[#1c2940] rounded-md space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Archivo NIF Listo para Fallout 4!</span>
                </span>
                <button
                  onClick={onOpenInNifSkope}
                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Abrir en Visor 3D &rarr;
                </button>
              </div>

              <div className="space-y-1 text-[10.5px] text-slate-300 border-t border-[#182338] pt-2">
                {lastConversion.diagnostics.map((diag, idx) => (
                  <p key={idx} className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">{diag}</span>
                  </p>
                ))}
              </div>

              {/* Direct Downloads */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#182338]">
                <button
                  onClick={() =>
                    downloadNifBinary(
                      lastConversion.binaryNif,
                      lastConversion.nifFileName
                    )
                  }
                  className="flex-1 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Descargar {lastConversion.nifFileName}</span>
                </button>

                <button
                  onClick={() =>
                    downloadBgsmText(
                      lastConversion.bgsmContent,
                      lastConversion.bgsmFileName
                    )
                  }
                  className="flex-1 py-1.5 bg-[#121c2d] hover:bg-[#1a2942] text-cyan-300 border border-[#243756] rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Descargar {lastConversion.bgsmFileName}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

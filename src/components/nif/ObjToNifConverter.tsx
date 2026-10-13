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
  BUILTIN_PRESET_MODELS,
  BuiltinPresetModel,
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
  // Selected source
  const [selectedPresetId, setSelectedPresetId] = useState<string>('weapon-sword');
  const [customFileContent, setCustomFileContent] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);

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
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch preset
  const handleSelectPreset = (preset: BuiltinPresetModel) => {
    setSelectedPresetId(preset.id);
    setCustomFileContent(null);
    setCustomFileName(null);
    setCategory(preset.category);
    setHavokMaterial(preset.recommendedMaterial);
    if (preset.category === 'weapons_props') {
      setMassKg(3.2);
    } else if (preset.category === 'clothing_armor') {
      setMassKg(12.5);
    } else {
      setMassKg(0);
    }
    showToast(`✓ Modelo preset cargado: ${preset.name}`);
  };

  // Upload local file (OBJ or FBX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCustomFileContent(text);
      setCustomFileName(file.name);
      setSelectedPresetId('');

      // Auto-detect category from file name
      const lower = file.name.toLowerCase();
      if (lower.includes('armor') || lower.includes('helmet') || lower.includes('cuirass') || lower.includes('clothes') || lower.includes('body')) {
        setCategory('clothing_armor');
        setHavokMaterial('HAV_MAT_FLESH');
      } else if (lower.includes('sword') || lower.includes('gun') || lower.includes('rifle') || lower.includes('weapon') || lower.includes('knife')) {
        setCategory('weapons_props');
        setHavokMaterial('HAV_MAT_METAL');
      } else if (lower.includes('bunker') || lower.includes('wall') || lower.includes('floor') || lower.includes('chunk') || lower.includes('building')) {
        setCategory('maps_statics');
        setHavokMaterial('HAV_MAT_CONCRETE');
      }

      loggerService.log('COMMAND', `Archivo 3D importado para conversión NIF: ${file.name}`);
      showToast(`✓ Archivo '${file.name}' cargado (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  };

  // Execute Conversion
  const handleRunConversion = () => {
    setIsConverting(true);

    setTimeout(() => {
      try {
        let mesh: ImportedMeshData;
        const meshName = customFileName || BUILTIN_PRESET_MODELS[selectedPresetId]?.name || 'ImportedMesh';

        if (customFileContent) {
          if (customFileName?.toLowerCase().endsWith('.fbx')) {
            mesh = parseFbxText(customFileContent, meshName);
          } else {
            mesh = parseObjFile(customFileContent, meshName);
          }
        } else {
          const preset = BUILTIN_PRESET_MODELS[selectedPresetId] || BUILTIN_PRESET_MODELS['weapon-sword'];
          mesh = parseObjFile(preset.objData, preset.name);
        }

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
          `Conversión OBJ/FBX a NIF exitosa: ${nifParseResult.fileName} (${nifParseResult.blocks.length} bloques, ${nifParseResult.totalVertices} vértices).`
        );
        showToast('✓ Conversión a NIF Bethesda completada con éxito');

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
            Convierte modelos 3D directamente a archivos <code className="text-cyan-300">.nif</code> y <code className="text-amber-300">.bgsm</code> con tangentes automáticas y generación de colisiones Havok precisas para armas, ropa o mapas.
          </p>
        </div>

        {/* 1. Selector de Modelo 3D */}
        <div className="bg-[#0b0f17] border border-[#192233] p-3 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Modelo 3D de Origen (OBJ / FBX)</span>
            </span>
            <label className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-xs active:scale-95">
              <Upload className="w-3 h-3" />
              <span>Subir OBJ/FBX Propio</span>
              <input
                type="file"
                accept=".obj,.fbx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {customFileName && (
            <div className="p-2 bg-emerald-950/50 border border-emerald-700/60 rounded text-[11px] text-emerald-200 flex items-center justify-between">
              <span>Archivo Local Cargado: <strong>{customFileName}</strong></span>
              <button
                onClick={() => {
                  setCustomFileContent(null);
                  setCustomFileName(null);
                  setSelectedPresetId('weapon-sword');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Volver a Presets
              </button>
            </div>
          )}

          {/* Preset Cards */}
          <div className="grid grid-cols-3 gap-2">
            {Object.values(BUILTIN_PRESET_MODELS).map((preset) => {
              const isSelected = selectedPresetId === preset.id && !customFileName;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50 text-cyan-200'
                      : 'bg-[#101522] border-[#1e283d] text-slate-400 hover:text-slate-200 hover:bg-[#151c2d]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {preset.category === 'weapons_props'
                          ? '🗡️ Arma'
                          : preset.category === 'clothing_armor'
                          ? '🛡️ Armadura'
                          : '🏛️ Mapa/Estático'}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] font-bold text-slate-100 leading-tight">
                      {preset.name.split('(')[0]}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                  <span className="text-[9px] text-cyan-400/80 mt-2 block">
                    Preset OBJ Listo
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selector Especializado de Categoría (Crucial Bethesda Havok Rules) */}
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
            disabled={isConverting}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 via-emerald-600 to-cyan-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-md text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isConverting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Ensamblando NIF Bethesda &amp; Colisiones Havok...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-200" />
                <span>⚡ CONVERTIR A NIF BETHESDA &amp; CARGAR EN NIFSKOPE</span>
              </>
            )}
          </button>

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

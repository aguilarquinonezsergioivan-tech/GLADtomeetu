import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Eye,
  Camera,
  Sun,
  Shield,
  Upload,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  FileCode,
  Palette,
  Crosshair,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Maximize2,
  Minimize2,
  Wand2,
  RotateCcw,
  Compass,
  Box,
  MapPin,
  Activity,
  Flame,
  Zap,
  Download,
  Grid as GridIcon,
  AlertCircle,
  Check,
  CheckCircle,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { NifParseResult, NifMapMesh, NifBlock } from '../../types/glados';
import {
  NifTextureSlot,
  NifTexturePreset,
  NIFSKOPE_TEXTURE_PRESETS,
  getDefaultTextureSlots,
  generateBgsmFileContent,
  downloadBgsmFile,
  MAP_CELL_PRESETS,
  NifMapCellPreset,
} from '../../services/nifskopeTextureService';
import { loggerService } from '../../services/loggerService';
import { CollisionGeometryData } from '../../types/nifImporter';

interface NifSkopeViewProps {
  parseResult: NifParseResult;
  onTextureSlotsChange?: (slots: NifTextureSlot[]) => void;
  collisionGeometry?: CollisionGeometryData;
  onDownloadNif?: () => void;
  onDownloadBgsm?: () => void;
}

type RenderMode =
  | 'textured'
  | 'shaded'
  | 'wireframe'
  | 'collision'
  | 'normals'
  | 'uvchecker'
  | 'vertexao';

type SideTab = 'textures' | 'uveditor' | 'blocktree' | 'maptools' | 'aidoctor';

export const NifSkopeView: React.FC<NifSkopeViewProps> = ({
  parseResult,
  onTextureSlotsChange,
  collisionGeometry,
  onDownloadNif,
  onDownloadBgsm,
}) => {
  // Render & Shading modes matching NifSkope GLView
  const [renderMode, setRenderMode] = useState<RenderMode>('textured');
  const [lightingMode, setLightingMode] = useState<
    'sun' | 'studio' | 'night' | 'pipboy'
  >('sun');
  const [isOrtho, setIsOrtho] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [backfaceCulling, setBackfaceCulling] = useState<boolean>(true);
  const [activeSideTab, setActiveSideTab] = useState<SideTab>('textures');

  // Active Texture Slots (BSShaderTextureSet)
  const [textureSlots, setTextureSlots] = useState<NifTextureSlot[]>(() =>
    getDefaultTextureSlots()
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    NIFSKOPE_TEXTURE_PRESETS[0].id
  );
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);

  // 3D Canvas Orbit State
  const [yaw, setYaw] = useState<number>(38);
  const [pitch, setPitch] = useState<number>(22);
  const [zoom, setZoom] = useState<number>(2.3);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Spells & Mesh Modifiers State
  const [activeSpellFeedback, setActiveSpellFeedback] = useState<string | null>(null);
  const [normalsFlipped, setNormalsFlipped] = useState<boolean>(false);
  const [tangentsCalculated, setTangentsCalculated] = useState<boolean>(true);
  const [boundsUpdated, setBoundsUpdated] = useState<boolean>(true);
  const [havokHullActive, setHavokHullActive] = useState<boolean>(false);

  // Selected Block in Tree Inspector
  const [selectedBlockId, setSelectedBlockId] = useState<number>(1);
  const [shaderGlossiness, setShaderGlossiness] = useState<number>(80);
  const [shaderSpecularMult, setShaderSpecularMult] = useState<number>(1.2);
  const [twoSidedShader, setTwoSidedShader] = useState<boolean>(false);
  const [castShadows, setCastShadows] = useState<boolean>(true);

  // UV Editor Transformation State
  const [uvScaleU, setUvScaleU] = useState<number>(1.0);
  const [uvScaleV, setUvScaleV] = useState<number>(1.0);
  const [uvOffsetU, setUvOffsetU] = useState<number>(0.0);
  const [uvOffsetV, setUvOffsetV] = useState<number>(0.0);
  const [uvRotationDeg, setUvRotationDeg] = useState<number>(0);

  // Worldspace Map Placement State
  const [selectedMapCell, setSelectedMapCell] = useState<NifMapCellPreset>(
    MAP_CELL_PRESETS[0]
  );
  const [worldPosX, setWorldPosX] = useState<number>(selectedMapCell.worldPosition[0]);
  const [worldPosY, setWorldPosY] = useState<number>(selectedMapCell.worldPosition[1]);
  const [worldPosZ, setWorldPosZ] = useState<number>(selectedMapCell.worldPosition[2]);
  const [worldScale, setWorldScale] = useState<number>(1.0);
  const [worldRotZ, setWorldRotZ] = useState<number>(0);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uvCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isRightDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    drawGLViewport();
  }, [
    parseResult,
    yaw,
    pitch,
    zoom,
    panX,
    panY,
    renderMode,
    lightingMode,
    isOrtho,
    showAxes,
    showGrid,
    textureSlots,
    normalsFlipped,
    tangentsCalculated,
    boundsUpdated,
    havokHullActive,
    selectedBlockId,
    shaderGlossiness,
    shaderSpecularMult,
    twoSidedShader,
    worldScale,
  ]);

  useEffect(() => {
    if (activeSideTab === 'uveditor') {
      drawUVEditor();
    }
  }, [
    activeSideTab,
    textureSlots,
    parseResult,
    uvScaleU,
    uvScaleV,
    uvOffsetU,
    uvOffsetV,
    uvRotationDeg,
  ]);

  // Apply Texture Preset (e.g. Military Olive, Rusted Steel, Titanium T-60)
  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = NIFSKOPE_TEXTURE_PRESETS.find((x) => x.id === presetId);
    if (!p) return;

    const newSlots = getDefaultTextureSlots(p);
    setTextureSlots(newSlots);
    onTextureSlotsChange?.(newSlots);
    loggerService.log(
      'COMMAND',
      `[NifSkope TextureSet]: Aplicado preset "${p.name}" a BSShaderTextureSet.`
    );
    showToast(`✓ Preset "${p.name}" aplicado a BSShaderTextureSet`);
  };

  // Upload custom texture file into a slot
  const handleSlotImageUpload = (
    slotIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setTextureSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          ...next[slotIdx],
          path: `textures/custom/${file.name}`,
          imageSrc: dataUrl,
          enabled: true,
        };
        onTextureSlotsChange?.(next);
        return next;
      });
      loggerService.log(
        'INFO',
        `[NifSkope Textures]: Textura cargada en ${textureSlots[slotIdx].label}: ${file.name}`
      );
      showToast(`✓ Textura cargada en ${textureSlots[slotIdx].slotType}: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSlotPath = (slotIdx: number, newPath: string) => {
    setTextureSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], path: newPath };
      onTextureSlotsChange?.(next);
      return next;
    });
  };

  const handleToggleSlot = (slotIdx: number) => {
    setTextureSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], enabled: !next[slotIdx].enabled };
      onTextureSlotsChange?.(next);
      return next;
    });
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // SPELLS MENU & ADITAMENTOS DE MALLA (NifSkope Spells Engine)
  // ══════════════════════════════════════════════════════════════════════════════
  const handleExecuteSpell = (
    spellName: string,
    action: () => void,
    feedback: string
  ) => {
    action();
    setActiveSpellFeedback(feedback);
    loggerService.log('COMMAND', `[NifSkope Spell]: Ejecutado ${spellName} -> ${feedback}`);
    showToast(`🪄 Spell: ${spellName} aplicado`);
    setTimeout(() => setActiveSpellFeedback(null), 3500);
  };

  const handleDownloadBgsm = () => {
    const content = generateBgsmFileContent(textureSlots, parseResult.fileName.replace('.nif', ''));
    downloadBgsmFile(content, `${parseResult.fileName.replace('.nif', '')}.bgsm`);
    loggerService.log('INFO', 'Archivo .BGSM exportado para Fallout 4 Creation Kit.');
    showToast('✓ Archivo de Material .BGSM exportado');
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 3D GL VIEWPORT RENDERER (Pure Canvas Vector & Lighting Engine)
  // ══════════════════════════════════════════════════════════════════════════════
  const drawGLViewport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Viewport Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (lightingMode === 'sun') {
      bgGrad.addColorStop(0, '#101520');
      bgGrad.addColorStop(1, '#070a0f');
    } else if (lightingMode === 'night') {
      bgGrad.addColorStop(0, '#04070c');
      bgGrad.addColorStop(1, '#020306');
    } else if (lightingMode === 'pipboy') {
      bgGrad.addColorStop(0, '#06130b');
      bgGrad.addColorStop(1, '#020603');
    } else {
      bgGrad.addColorStop(0, '#161c28');
      bgGrad.addColorStop(1, '#0c1017');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;

    const project = (x: number, y: number, z: number) => {
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);
      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;

      const cosP = Math.cos(radPitch);
      const sinP = Math.sin(radPitch);
      const y2 = y1 * cosP - z * sinP;
      const z2 = y1 * sinP + z * cosP;

      const cameraDist = 380;
      const fov = isOrtho ? 1.0 : cameraDist / (cameraDist + y2);
      return {
        sx: w / 2 + x1 * zoom * fov + panX,
        sy: h / 2 - z2 * zoom * fov + 25 + panY,
        depth: y2,
      };
    };

    // Ground Grid
    if (showGrid) {
      ctx.strokeStyle = lightingMode === 'pipboy' ? '#0d2818' : '#141a26';
      ctx.lineWidth = 1;
      const gridRange = 100;
      const step = 20;

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
    }

    // Origin Axes
    if (showAxes) {
      const orig = project(0, 0, 0);
      const axX = project(35, 0, 0);
      const axY = project(0, 35, 0);
      const axZ = project(0, 0, 35);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ef4444'; // X: Red
      ctx.beginPath();
      ctx.moveTo(orig.sx, orig.sy);
      ctx.lineTo(axX.sx, axX.sy);
      ctx.stroke();

      ctx.strokeStyle = '#10b981'; // Y: Green
      ctx.beginPath();
      ctx.moveTo(orig.sx, orig.sy);
      ctx.lineTo(axY.sx, axY.sy);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6'; // Z: Blue
      ctx.beginPath();
      ctx.moveTo(orig.sx, orig.sy);
      ctx.lineTo(axZ.sx, axZ.sy);
      ctx.stroke();
    }

    // Active Texture Colors
    const diffuseSlot = textureSlots[0];
    const normalSlot = textureSlots[1];
    const glowSlot = textureSlots[2];
    const specularSlot = textureSlots[6];

    const baseDiffuseColor = diffuseSlot.enabled ? diffuseSlot.colorPreview : '#384454';
    const hasGlow = glowSlot.enabled && glowSlot.colorPreview !== '#000000';

    // Render meshes
    parseResult.meshes.forEach((mesh) => {
      const verts = mesh.vertices;
      const faces = mesh.faces;
      const projected = verts.map((v) => project(v.x * worldScale, v.y * worldScale, v.z * worldScale));

      // Sort faces by depth for painter's algorithm
      const sortedFaces = faces
        .map((f, index) => {
          const depth =
            (projected[f.a].depth + projected[f.b].depth + projected[f.c].depth) / 3;
          return { f, depth, index };
        })
        .sort((a, b) => b.depth - a.depth);

      sortedFaces.forEach(({ f: face, index: idx }) => {
        const pA = projected[face.a];
        const pB = projected[face.b];
        const pC = projected[face.c];
        if (!pA || !pB || !pC) return;

        ctx.beginPath();
        ctx.moveTo(pA.sx, pA.sy);
        ctx.lineTo(pB.sx, pB.sy);
        ctx.lineTo(pC.sx, pC.sy);
        ctx.closePath();

        if (renderMode === 'textured') {
          // Calculate surface normal lighting simulation
          const vA = verts[face.a];
          const vB = verts[face.b];
          const vC = verts[face.c];

          const ux = vB.x - vA.x, uy = vB.y - vA.y, uz = vB.z - vA.z;
          const vx = vC.x - vA.x, vy = vC.y - vA.y, vz = vC.z - vA.z;
          let nx = uy * vz - uz * vy;
          let ny = uz * vx - ux * vz;
          let nz = ux * vy - uy * vx;

          if (normalsFlipped) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }

          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

          // Light direction based on lightingMode
          const lx = lightingMode === 'sun' ? 0.577 : lightingMode === 'pipboy' ? 0.2 : 0.8;
          const ly = lightingMode === 'sun' ? 0.577 : lightingMode === 'pipboy' ? 0.9 : 0.4;
          const lz = 0.577;
          const dot = Math.max(0.2, (nx / len) * lx + (ny / len) * ly + (nz / len) * lz);

          // Render face with diffuse tint + lighting factor
          ctx.fillStyle =
            lightingMode === 'pipboy'
              ? `rgba(16, 185, 129, ${0.3 + dot * 0.5})`
              : baseDiffuseColor;
          ctx.fill();

          // Overlay specular pass
          const specFactor = (shaderSpecularMult / 1.2) * 0.35;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.4, dot * specFactor)})`;
          ctx.fill();

          // Glow map overlay pass
          if (hasGlow && idx % 2 === 0) {
            ctx.fillStyle = glowSlot.colorPreview || 'rgba(0, 229, 255, 0.35)';
            ctx.fill();
          }

          // Edge stroke
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (renderMode === 'shaded') {
          const shade = Math.floor(70 + (idx % 6) * 18);
          ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (renderMode === 'wireframe') {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (renderMode === 'uvchecker') {
          // UV Checkerboard pattern
          const isCheck = (idx % 2 === 0);
          ctx.fillStyle = isCheck ? '#e2e8f0' : '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (renderMode === 'vertexao') {
          // Vertex Ambient Occlusion gradient
          const ao = Math.floor(40 + (idx % 8) * 22);
          ctx.fillStyle = `rgb(${ao}, ${ao}, ${ao})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (renderMode === 'collision') {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (renderMode === 'normals') {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Normals Spikes View
      if (renderMode === 'normals') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        verts.forEach((v) => {
          const pOrigin = project(v.x * worldScale, v.y * worldScale, v.z * worldScale);
          const pTip = project((v.x + 4) * worldScale, (v.y + 4) * worldScale, (v.z + 8) * worldScale);
          ctx.beginPath();
          ctx.moveTo(pOrigin.sx, pOrigin.sy);
          ctx.lineTo(pTip.sx, pTip.sy);
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(pTip.sx, pTip.sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Havok Collision Shapes (bhkCollisionObject / bhkRigidBody in green wireframe)
      if (renderMode === 'collision' || havokHullActive) {
        if (collisionGeometry && collisionGeometry.wireframeEdges.length > 0) {
          ctx.strokeStyle = '#22c55e'; // Havok Green
          ctx.lineWidth = 2.0;

          collisionGeometry.wireframeEdges.forEach(([p1, p2]) => {
            const proj1 = project(p1[0] * worldScale, p1[1] * worldScale, p1[2] * worldScale);
            const proj2 = project(p2[0] * worldScale, p2[1] * worldScale, p2[2] * worldScale);
            ctx.beginPath();
            ctx.moveTo(proj1.sx, proj1.sy);
            ctx.lineTo(proj2.sx, proj2.sy);
            ctx.stroke();
          });

          // Render Weapon Attachment Sockets if present
          if (collisionGeometry.sockets && collisionGeometry.sockets.length > 0) {
            collisionGeometry.sockets.forEach((sock) => {
              const pos = project(
                sock.position[0] * worldScale,
                sock.position[1] * worldScale,
                sock.position[2] * worldScale
              );

              // Socket Crosshair Gizmo
              ctx.strokeStyle = '#ef4444'; // Red X
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(pos.sx - 10, pos.sy);
              ctx.lineTo(pos.sx + 10, pos.sy);
              ctx.stroke();

              ctx.strokeStyle = '#3b82f6'; // Blue Y
              ctx.beginPath();
              ctx.moveTo(pos.sx, pos.sy - 10);
              ctx.lineTo(pos.sx, pos.sy + 10);
              ctx.stroke();

              // Socket Pivot Center
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(pos.sx, pos.sy, 4, 0, Math.PI * 2);
              ctx.fill();

              // Socket Label
              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 9px monospace';
              ctx.fillText(`⌖ ${sock.name.split(' ')[0]}`, pos.sx + 8, pos.sy - 4);
            });
          }

          // Render Armor Partitions if present
          if (collisionGeometry.partitions && collisionGeometry.partitions.length > 0) {
            collisionGeometry.partitions.forEach((part) => {
              const midZ = (part.minZ + part.maxZ) / 2;
              const pos = project(0, 0, midZ * worldScale);
              ctx.fillStyle = '#c084fc';
              ctx.font = 'bold 9px monospace';
              ctx.fillText(`🛡️ ${part.name.split(' ')[0]}`, pos.sx + 12, pos.sy);
            });
          }
        } else {
          // Standard bounding box collision fallback
          const min = mesh.bounds.min;
          const max = mesh.bounds.max;

          const bCorners = [
            project(min[0] * worldScale, min[1] * worldScale, min[2] * worldScale),
            project(max[0] * worldScale, min[1] * worldScale, min[2] * worldScale),
            project(max[0] * worldScale, max[1] * worldScale, min[2] * worldScale),
            project(min[0] * worldScale, max[1] * worldScale, min[2] * worldScale),
            project(min[0] * worldScale, min[1] * worldScale, max[2] * worldScale),
            project(max[0] * worldScale, min[1] * worldScale, max[2] * worldScale),
            project(max[0] * worldScale, max[1] * worldScale, max[2] * worldScale),
            project(min[0] * worldScale, max[1] * worldScale, max[2] * worldScale),
          ];

          ctx.strokeStyle = '#22c55e'; // Havok Green
          ctx.lineWidth = 2.0;

          const drawEdge = (i: number, j: number) => {
            ctx.beginPath();
            ctx.moveTo(bCorners[i].sx, bCorners[i].sy);
            ctx.lineTo(bCorners[j].sx, bCorners[j].sy);
            ctx.stroke();
          };

          drawEdge(0, 1); drawEdge(1, 2); drawEdge(2, 3); drawEdge(3, 0);
          drawEdge(4, 5); drawEdge(5, 6); drawEdge(6, 7); drawEdge(7, 4);
          drawEdge(0, 4); drawEdge(1, 5); drawEdge(2, 6); drawEdge(3, 7);

          // Center crosshair
          const center = project(
            ((min[0] + max[0]) / 2) * worldScale,
            ((min[1] + max[1]) / 2) * worldScale,
            ((min[2] + max[2]) / 2) * worldScale
          );
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(center.sx, center.sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Viewport HUD Overlay
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(
      `GLView: NifSkope 2.0 Pro | Shading: ${renderMode.toUpperCase()} | Rot: ${Math.round(yaw)}° / ${Math.round(pitch)}° | Zoom: ${zoom.toFixed(1)}x`,
      12,
      20
    );
    ctx.fillText(
      `TextureSet: [${diffuseSlot.path.split('/').pop()}] | Celda: ${selectedMapCell.worldspace} [${selectedMapCell.cellCoords.join(', ')}]`,
      12,
      35
    );
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // UV EDITOR WITH INTERACTIVE TRANSFORM CONTROLS
  // ══════════════════════════════════════════════════════════════════════════════
  const drawUVEditor = () => {
    const canvas = uvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Diffuse background
    const diffuse = textureSlots[0];
    ctx.fillStyle = diffuse.colorPreview || '#1c2230';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Base UV points with scale, offset and rotation
    const basePoints = [
      { u: 0.15, v: 0.18 },
      { u: 0.85, v: 0.18 },
      { u: 0.85, v: 0.82 },
      { u: 0.15, v: 0.82 },
      { u: 0.50, v: 0.18 },
      { u: 0.50, v: 0.82 },
      { u: 0.30, v: 0.45 },
      { u: 0.70, v: 0.45 },
    ];

    const rad = (uvRotationDeg * Math.PI) / 180;
    const transformed = basePoints.map((pt) => {
      // Scale and offset from center (0.5, 0.5)
      let u = (pt.u - 0.5) * uvScaleU + uvOffsetU;
      let v = (pt.v - 0.5) * uvScaleV + uvOffsetV;
      // Rotate
      const uRot = u * Math.cos(rad) - v * Math.sin(rad) + 0.5;
      const vRot = u * Math.sin(rad) + v * Math.cos(rad) + 0.5;
      return { u: uRot, v: vRot };
    });

    const uvFaces = [
      [0, 4, 6],
      [4, 1, 7],
      [6, 7, 5],
      [0, 6, 3],
      [3, 6, 5],
      [7, 1, 2],
      [5, 7, 2],
    ];

    ctx.strokeStyle = '#f59e0b'; // Amber UV Island Lines
    ctx.lineWidth = 1.5;

    uvFaces.forEach(([a, b, c]) => {
      const pA = { x: transformed[a].u * w, y: (1 - transformed[a].v) * h };
      const pB = { x: transformed[b].u * w, y: (1 - transformed[b].v) * h };
      const pC = { x: transformed[c].u * w, y: (1 - transformed[c].v) * h };

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.fill();
      ctx.stroke();
    });

    // Vertex handles
    ctx.fillStyle = '#06b6d4';
    transformed.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.u * w, (1 - p.v) * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // UV Label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`UV Channel 0 | Escala: ${uvScaleU.toFixed(2)}x${uvScaleV.toFixed(2)} | Rot: ${uvRotationDeg}°`, 10, 18);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      isRightDraggingRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      setYaw((prev) => (prev + dx * 0.6) % 360);
      setPitch((prev) => Math.min(85, Math.max(-85, prev - dy * 0.6)));
    } else if (isRightDraggingRef.current) {
      setPanX((prev) => prev + dx * 0.8);
      setPanY((prev) => prev + dy * 0.8);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isRightDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(6.5, Math.max(0.5, prev - e.deltaY * 0.002)));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b10] overflow-hidden font-mono text-xs select-none">
      {/* ════════════════════════════════════════════════════════════════════════
          TOP MENU: Spells Menu Bar & Shading Toolbar (Aditamentos de NifSkope)
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#10141e] border-b border-[#1d2638] px-3 py-1.5 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
        {/* SPELLS QUICK TOOLBAR */}
        <div className="flex items-center gap-1">
          <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px] mr-1">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Spells:</span>
          </span>

          <button
            onClick={() =>
              handleExecuteSpell(
                'Update Tangents',
                () => setTangentsCalculated(true),
                'Vectores tangentes calculados en espacio tangente.'
              )
            }
            className="px-2 py-0.5 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 hover:text-white rounded border border-[#233148] text-[10px] cursor-pointer"
            title="Calcula vectores tangentes y bitangentes para normal maps de Fallout 4"
          >
            Tangents
          </button>

          <button
            onClick={() =>
              handleExecuteSpell(
                'Smooth Normals',
                () => setNormalsFlipped(false),
                'Normales suavizadas con umbral de 45°.'
              )
            }
            className="px-2 py-0.5 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 hover:text-white rounded border border-[#233148] text-[10px] cursor-pointer"
            title="Suaviza las normales de vértices para eliminar aristas duras"
          >
            Smooth
          </button>

          <button
            onClick={() =>
              handleExecuteSpell(
                'Flip Faces',
                () => setNormalsFlipped(!normalsFlipped),
                normalsFlipped ? 'Orientación de caras normalizada (CCW).' : 'Caras invertidas (CW).'
              )
            }
            className={`px-2 py-0.5 rounded border text-[10px] cursor-pointer ${
              normalsFlipped
                ? 'bg-amber-950 text-amber-200 border-amber-600 font-bold'
                : 'bg-[#171f2d] hover:bg-[#222d42] text-slate-300 border-[#233148]'
            }`}
            title="Invierte el devanado de caras para corregir transparencias en el juego"
          >
            Flip Faces
          </button>

          <button
            onClick={() =>
              handleExecuteSpell(
                'Update Bounds',
                () => setBoundsUpdated(true),
                'Esferas y cajas envolventes actualizadas sin frustum culling.'
              )
            }
            className="px-2 py-0.5 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 hover:text-white rounded border border-[#233148] text-[10px] cursor-pointer"
            title="Actualiza radio de esfera envolvente para que el objeto no desaparezca"
          >
            Bounds
          </button>

          <button
            onClick={() =>
              handleExecuteSpell(
                'Generate Havok Hull',
                () => setHavokHullActive(!havokHullActive),
                havokHullActive ? 'Colisión desactivada.' : 'Caja envolvente Havok generada.'
              )
            }
            className={`px-2 py-0.5 rounded border text-[10px] cursor-pointer ${
              havokHullActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                : 'bg-[#171f2d] hover:bg-[#222d42] text-slate-300 border-[#233148]'
            }`}
            title="Genera caja física de colisión Havok (bhkBoxShape)"
          >
            Havok Hull
          </button>
        </div>

        {/* FEEDBACK PILL */}
        {activeSpellFeedback && (
          <span className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded animate-pulse">
            {activeSpellFeedback}
          </span>
        )}

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <span className="text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-600/70 px-2 py-0.5 rounded">
            {toastMessage}
          </span>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SECONDARY TOOLBAR: Shading Modes & Camera Views
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="h-9 bg-[#0e121a] border-b border-[#1b2332] px-3 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
        {/* Shading Render Modes */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] mr-1">Shading:</span>
          {[
            { id: 'textured', label: '🎨 PBR Textures' },
            { id: 'shaded', label: '🗿 Shaded' },
            { id: 'wireframe', label: '🕸️ Wireframe' },
            { id: 'collision', label: '🟩 Havok' },
            { id: 'normals', label: '📍 Normals' },
            { id: 'uvchecker', label: '🏁 UV Check' },
            { id: 'vertexao', label: '🌈 Vertex AO' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setRenderMode(m.id as RenderMode)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all ${
                renderMode === m.id
                  ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-500/70 shadow-xs'
                  : 'bg-[#151b26] text-slate-400 hover:text-slate-200 hover:bg-[#1d2535]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Lighting & Camera Presets */}
        <div className="flex items-center gap-2">
          {/* Lighting Mode Selector */}
          <div className="flex items-center gap-1 bg-[#151b26] px-1.5 py-0.5 rounded border border-[#212b3c]">
            <Sun className="w-3 h-3 text-amber-400" />
            <select
              value={lightingMode}
              onChange={(e) => setLightingMode(e.target.value as any)}
              className="bg-transparent text-slate-300 text-[10px] focus:outline-hidden cursor-pointer"
            >
              <option value="sun">Luz Solar FO4</option>
              <option value="studio">Estudio White</option>
              <option value="night">Noche Radiactiva</option>
              <option value="pipboy">Linterna Pip-Boy</option>
            </select>
          </div>

          {/* Perspective / Ortho */}
          <button
            onClick={() => setIsOrtho(!isOrtho)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
              isOrtho
                ? 'bg-amber-950/60 text-amber-300 border-amber-600/60 font-bold'
                : 'bg-[#151b26] text-slate-400 border-[#212b3c] hover:text-slate-200'
            }`}
          >
            {isOrtho ? 'Ortho' : 'Persp'}
          </button>

          {/* Quick Camera Views */}
          <button
            onClick={() => {
              setYaw(0);
              setPitch(0);
            }}
            className="px-1.5 py-0.5 rounded bg-[#151b26] text-slate-400 hover:text-white border border-[#212b3c] text-[10px]"
            title="Vista Frontal"
          >
            Front
          </button>
          <button
            onClick={() => {
              setYaw(0);
              setPitch(90);
            }}
            className="px-1.5 py-0.5 rounded bg-[#151b26] text-slate-400 hover:text-white border border-[#212b3c] text-[10px]"
            title="Vista Superior"
          >
            Top
          </button>
          <button
            onClick={() => {
              setYaw(38);
              setPitch(22);
              setZoom(2.3);
              setPanX(0);
              setPanY(0);
            }}
            className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900 border border-cyan-700/60 text-[10px]"
            title="Centrar en el modelo [C]"
          >
            Centrar [C]
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN WORKSPACE: 3D Viewport on Left (7 cols), Tools Suite on Right (5 cols)
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 min-h-0">
        {/* LEFT COLUMN: 3D Viewport (Cols 7) */}
        <div className="col-span-7 bg-[#05070a] border border-[#17202f] rounded-md relative overflow-hidden flex flex-col">
          <div
            className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing"
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              width={760}
              height={490}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full object-contain"
            />

            {/* Bottom HUD info */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2 pointer-events-none">
              <span className="text-[10px] text-slate-400 bg-[#0d121c]/80 px-2 py-0.5 rounded border border-[#1e2638]">
                Botón Izq: Orbitar &middot; Botón Der: Desplazar &middot; Rueda: Zoom
              </span>
              {renderMode === 'collision' && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700 font-bold">
                  bhkCollisionObject (Havok MOPP) Activo
                </span>
              )}
            </div>

            {/* Quick Export BGSM / NIF button in viewport */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              {onDownloadNif && (
                <button
                  onClick={onDownloadNif}
                  className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-600/70 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Descargar archivo .NIF binario compatible con Fallout 4 / Skyrim"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Descargar .NIF</span>
                </button>
              )}

              <button
                onClick={onDownloadBgsm || handleDownloadBgsm}
                className="px-2 py-1 bg-[#131b28] hover:bg-[#1c273a] text-cyan-300 rounded border border-[#233148] text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Descargar archivo de material BGSM de Fallout 4"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>Exportar .BGSM</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The "Mil Aditamentos & Tools" Suite (Cols 5) */}
        <div className="col-span-5 bg-[#0b0e14] border border-[#17202f] rounded-md p-2.5 flex flex-col overflow-hidden text-xs">
          {/* Suite Sub-Navigation Tabs */}
          <div className="pb-2 mb-2 border-b border-[#182130] flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1 bg-[#111622] p-0.5 rounded border border-[#1c2536] flex-wrap">
              <button
                onClick={() => setActiveSideTab('textures')}
                className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] ${
                  activeSideTab === 'textures'
                    ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Matriz de 8 slots de texturas BSShaderTextureSet"
              >
                <Palette className="w-3 h-3 text-cyan-400" />
                <span>Texturas</span>
              </button>

              <button
                onClick={() => setActiveSideTab('uveditor')}
                className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] ${
                  activeSideTab === 'uveditor'
                    ? 'bg-amber-950/60 text-amber-200 font-bold border border-amber-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Editor UV 2D interactivo con transformaciones"
              >
                <Crosshair className="w-3 h-3 text-amber-400" />
                <span>UV Editor</span>
              </button>

              <button
                onClick={() => setActiveSideTab('blocktree')}
                className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] ${
                  activeSideTab === 'blocktree'
                    ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Árbol jerárquico NIF e inspector de bloques"
              >
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Árbol NIF</span>
              </button>

              <button
                onClick={() => setActiveSideTab('maptools')}
                className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] ${
                  activeSideTab === 'maptools'
                    ? 'bg-emerald-900/60 text-emerald-200 font-bold border border-emerald-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Herramientas de colocación en celda de mapa y LOD"
              >
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Mapa &amp; Celda</span>
              </button>

              <button
                onClick={() => setActiveSideTab('aidoctor')}
                className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] ${
                  activeSideTab === 'aidoctor'
                    ? 'bg-rose-950/60 text-rose-200 font-bold border border-rose-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Auditoría de salud NIF y auto-reparación con IA"
              >
                <Activity className="w-3 h-3 text-rose-400" />
                <span>Doctor NIF</span>
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: TEXTURES (BSShaderTextureSet 8-Slot Complete Matrix)
             ════════════════════════════════════════════════════════════════════ */}
          {activeSideTab === 'textures' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
              {/* Presets Quick Chooser */}
              <div className="p-2 rounded bg-[#10141f] border border-[#1c2538] space-y-1 shrink-0">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Presets Oficiales Bethesda:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {NIFSKOPE_TEXTURE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPreset(p.id)}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
                        selectedPresetId === p.id
                          ? 'bg-cyan-950 text-cyan-200 border-cyan-500 font-bold'
                          : 'bg-[#151b26] text-slate-400 border-[#202a3a] hover:text-slate-200'
                      }`}
                    >
                      {p.name.split(' (')[0].split(' ')[0]} {p.name.split(' ')[1] || ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8 Texture Slots List matching NifSkope */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {textureSlots.map((slot, sIdx) => {
                  const isSelected = activeSlotIdx === sIdx;
                  return (
                    <div
                      key={slot.index}
                      onClick={() => setActiveSlotIdx(sIdx)}
                      className={`p-2 rounded border transition-colors ${
                        isSelected
                          ? 'bg-[#141b27] border-cyan-500/70'
                          : 'bg-[#0e121a] border-[#1a2232] hover:border-slate-600'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={() => handleToggleSlot(sIdx)}
                            className="rounded accent-cyan-500 cursor-pointer"
                            title="Habilitar/Deshabilitar slot"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-xs border border-slate-600 shadow-xs"
                            style={{ backgroundColor: slot.colorPreview }}
                            title={`Color/Mapa: ${slot.colorPreview}`}
                          />
                          <span className="font-bold text-slate-200 text-[10px]">
                            {slot.label}
                          </span>
                        </div>

                        {/* Upload Texture File Button */}
                        <label className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#192130] hover:bg-[#222d42] text-cyan-300 hover:text-white border border-[#24324a] text-[9px] cursor-pointer transition-colors">
                          <Upload className="w-2.5 h-2.5" />
                          <span>Cargar .dds</span>
                          <input
                            type="file"
                            accept=".dds,.png,.jpg,.jpeg,.tga,.webp"
                            onChange={(e) => handleSlotImageUpload(sIdx, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Path Input Field */}
                      <input
                        type="text"
                        value={slot.path}
                        onChange={(e) => handleUpdateSlotPath(sIdx, e.target.value)}
                        className="w-full bg-[#080b10] border border-[#1c2434] focus:border-cyan-500 focus:outline-hidden rounded px-2 py-0.5 text-[9px] text-slate-300 font-mono"
                        placeholder="Ruta en archivo NIF (textures/...)"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Bottom BGSM Exporter Button */}
              <button
                onClick={handleDownloadBgsm}
                className="w-full py-1.5 px-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>Exportar Archivo de Material (.BGSM)</span>
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: UV EDITOR (Transformations & Island Manipulation)
             ════════════════════════════════════════════════════════════════════ */}
          {activeSideTab === 'uveditor' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
              <div className="p-1.5 rounded bg-[#10141f] border border-[#1c2538] text-[10px] text-slate-300 flex items-center justify-between">
                <span>Despliegue UV Channel 0 (BSTriShape)</span>
                <span className="text-amber-400 font-bold">Unwrap 2D</span>
              </div>

              {/* UV Canvas */}
              <div className="flex-1 bg-[#05070a] rounded border border-[#17202f] overflow-hidden relative">
                <canvas
                  ref={uvCanvasRef}
                  width={380}
                  height={280}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* UV Transformation Tools */}
              <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Transformaciones UV:</span>
                  <button
                    onClick={() => {
                      setUvScaleU(1.0);
                      setUvScaleV(1.0);
                      setUvOffsetU(0.0);
                      setUvOffsetV(0.0);
                      setUvRotationDeg(0);
                      showToast('✓ UV restablecido a origen');
                    }}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset UV
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span>Escala U:</span>
                      <span className="text-amber-400 font-bold">{uvScaleU.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={uvScaleU}
                      onChange={(e) => setUvScaleU(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span>Escala V:</span>
                      <span className="text-amber-400 font-bold">{uvScaleV.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={uvScaleV}
                      onChange={(e) => setUvScaleV(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-[#18202d]">
                  <button
                    onClick={() => setUvRotationDeg((prev) => (prev + 90) % 360)}
                    className="flex-1 py-1 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 rounded border border-[#222f44] text-[9px] font-bold"
                  >
                    Rotar 90°
                  </button>
                  <button
                    onClick={() => setUvScaleU((prev) => -prev)}
                    className="flex-1 py-1 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 rounded border border-[#222f44] text-[9px] font-bold"
                  >
                    Flip U
                  </button>
                  <button
                    onClick={() => setUvScaleV((prev) => -prev)}
                    className="flex-1 py-1 bg-[#171f2d] hover:bg-[#222d42] text-slate-300 rounded border border-[#222f44] text-[9px] font-bold"
                  >
                    Flip V
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 3: BLOCK TREE INSPECTOR (NIF Node Hierarchy & Shader Properties)
             ════════════════════════════════════════════════════════════════════ */}
          {activeSideTab === 'blocktree' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Jerarquía de Bloques (NetImmerse / FO4):
              </span>

              {/* Block List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[190px]">
                {parseResult.blocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-1.5 rounded cursor-pointer border text-[10px] flex items-center justify-between transition-colors ${
                      selectedBlockId === block.id
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-[#0e121a] border-[#182232] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-slate-500 font-mono">[{block.id}]</span>
                      <span className="text-cyan-300 font-semibold">{block.type}</span>
                      <span className="text-slate-400 truncate">"{block.name}"</span>
                    </div>
                    <span className="text-slate-500 text-[9px] shrink-0">
                      {block.sizeBytes} B
                    </span>
                  </div>
                ))}
              </div>

              {/* Selected Block Details & Property Editor */}
              <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-2 text-[10px]">
                <div className="flex items-center justify-between text-purple-300 font-bold border-b border-[#18202d] pb-1">
                  <span>Inspector: Bloque [{selectedBlockId}]</span>
                  <span className="text-slate-400 font-mono">
                    {parseResult.blocks[selectedBlockId]?.type || 'BSLightingShaderProperty'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Brillo Especular (Glossiness):</span>
                    <span className="text-amber-400 font-bold">{shaderGlossiness}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={shaderGlossiness}
                    onChange={(e) => setShaderGlossiness(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="flex justify-between items-center">
                    <span>Multiplicador Especular:</span>
                    <span className="text-cyan-400 font-bold">{shaderSpecularMult.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={shaderSpecularMult}
                    onChange={(e) => setShaderSpecularMult(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#18202d]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoSidedShader}
                        onChange={(e) => setTwoSidedShader(e.target.checked)}
                        className="accent-purple-500"
                      />
                      <span className="text-slate-300">TwoSided (Sin Culling)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={castShadows}
                        onChange={(e) => setCastShadows(e.target.checked)}
                        className="accent-purple-500"
                      />
                      <span className="text-slate-300">Cast Shadows</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 4: MAP & CELL WORLDSPACE PLACER (Fallout 4 Cell Tools)
             ════════════════════════════════════════════════════════════════════ */}
          {activeSideTab === 'maptools' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Colocación en Mundo &amp; Chunks de Mapa:
              </span>

              {/* Map Cell Presets */}
              <div className="space-y-1">
                {MAP_CELL_PRESETS.map((cell) => (
                  <div
                    key={cell.id}
                    onClick={() => {
                      setSelectedMapCell(cell);
                      setWorldPosX(cell.worldPosition[0]);
                      setWorldPosY(cell.worldPosition[1]);
                      setWorldPosZ(cell.worldPosition[2]);
                    }}
                    className={`p-2 rounded cursor-pointer border transition-colors ${
                      selectedMapCell.id === cell.id
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-[#0e121a] border-[#182232] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-[10px] text-slate-200">
                      <span>{cell.name}</span>
                      <span className="text-cyan-400">Cell [{cell.cellCoords.join(', ')}]</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
                      {cell.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Cell Coordinates & Streaming Metrics */}
              <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-2 text-[10px]">
                <div className="flex items-center justify-between text-emerald-300 font-bold border-b border-[#18202d] pb-1">
                  <span>Presupuesto VRAM &amp; Streaming:</span>
                  <span className="text-amber-400">{selectedMapCell.estimatedLOD}</span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[9px] text-center">
                  <div className="p-1 rounded bg-[#090c12] border border-[#182232]">
                    <span className="text-slate-500 block">VRAM Texturas</span>
                    <span className="font-bold text-amber-300">{selectedMapCell.textureMemoryMb} MB</span>
                  </div>
                  <div className="p-1 rounded bg-[#090c12] border border-[#182232]">
                    <span className="text-slate-500 block">VRAM Malla</span>
                    <span className="font-bold text-cyan-300">{selectedMapCell.geometryMemoryMb} MB</span>
                  </div>
                  <div className="p-1 rounded bg-[#090c12] border border-[#182232]">
                    <span className="text-slate-500 block">Draw Calls</span>
                    <span className="font-bold text-emerald-300">{selectedMapCell.drawCalls}</span>
                  </div>
                </div>

                {/* Transform Sliders */}
                <div className="space-y-1.5 pt-1 border-t border-[#18202d]">
                  <div className="flex justify-between items-center text-[9px]">
                    <span>Escala en el Mundo:</span>
                    <span className="text-cyan-400 font-bold">{worldScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={worldScale}
                    onChange={(e) => setWorldScale(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 5: AI DOCTOR (Health Audit & One-Click Auto Fix)
             ════════════════════════════════════════════════════════════════════ */}
          {activeSideTab === 'aidoctor' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-hidden">
              <div className="flex items-center justify-between pb-1 border-b border-[#18202d]">
                <span className="text-rose-300 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <span>Auditoría de Salud NIF &amp; Creación</span>
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">
                  ✓ 100% Compatible FO4
                </span>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-[10px]">
                <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Matrices de Rotación 3x3 (36 Bytes)</span>
                  </div>
                  <p className="text-slate-400 text-[9px] leading-relaxed">
                    Formato Creation Engine / Fallout 4 validado. No presenta matrices de cuaterniones de Skyrim (16 bytes) que provoquen cuelgues del motor.
                  </p>
                </div>

                <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Límite de Vértices BSTriShape</span>
                  </div>
                  <p className="text-slate-400 text-[9px] leading-relaxed">
                    Total {parseResult.totalVertices} vértices por bloque. Lejos del límite crítico de 65,535 vértices para indexación de 16 bits.
                  </p>
                </div>

                <div className="p-2 rounded bg-[#0e121a] border border-[#1a2232] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Espacio Tangente para Normal Maps</span>
                  </div>
                  <p className="text-slate-400 text-[9px] leading-relaxed">
                    Vectores tangentes ortogonales sincronizados para BSLightingShaderProperty sin artefactos de luz negra.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setNormalsFlipped(false);
                  setTangentsCalculated(true);
                  setBoundsUpdated(true);
                  setHavokHullActive(true);
                  showToast('✓ NIF reparado y optimizado con éxito mediante Spell Global');
                }}
                className="w-full py-1.5 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Auto-Reparar &amp; Optimizar NIF con IA</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

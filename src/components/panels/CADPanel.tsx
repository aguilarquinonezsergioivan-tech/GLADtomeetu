import React, { useState, useRef, useEffect } from 'react';
import {
  Ruler,
  Download,
  Eye,
  Code,
  RefreshCw,
  CheckCircle2,
  Layers,
  Activity,
  Cpu,
  FileCheck,
  AlertTriangle,
  FileCode,
  Binary,
  Sparkles,
  Camera,
  Image as ImageIcon,
  MessageSquare,
  Wrench,
  Sliders,
  Upload,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
  Maximize2,
  Info,
  Flame,
} from 'lucide-react';
import {
  CadParameters,
  CadShapeType,
  CadWorkspace,
  MaterialData,
  FeaSimulationResult,
  CadFromPhotoAnalysis,
  CadFromDescriptionResult,
} from '../../types/glados';
import {
  DEFAULT_CAD_PARAMS,
  MATERIALS_DATABASE,
  getDefaultFeatures,
  generateDxfString,
  downloadDxfFile,
  downloadCadQueryFile,
} from '../../services/cadService';
import {
  cadAiService,
  PHOTO_PRESETS,
  PhotoPreset,
} from '../../services/cadAiService';
import { NifBinaryViewer } from '../cad/NifBinaryViewer';
import { loggerService } from '../../services/loggerService';

type CreationMode = 'photo' | 'description' | 'wizard' | 'manual';
type CanvasViewMode = '2d' | '3d' | 'fea' | 'deformed';

export const CADPanel: React.FC = () => {
  // Main CAD & FEA Parameters
  const [params, setParams] = useState<CadParameters>(() => ({
    ...DEFAULT_CAD_PARAMS,
    shapeType: 'plate',
    creationMethod: 'manual',
    certaintyScore: 97,
    certaintyRationale: 'Parámetros paramétricos inicializados con tolerancias ISO 2768-m.',
    loadNewtons: 4500,
  }));

  const [workspace, setWorkspace] = useState<CadWorkspace>('DESIGN');
  const [activeTab, setActiveTab] = useState<
    'canvas' | 'cadquery' | 'dxfCode' | 'nifBinary' | 'didacticCad'
  >('canvas');

  // Creation Mode State: photo | description | wizard | manual
  const [creationMode, setCreationMode] = useState<CreationMode>('manual');
  const [viewMode, setViewMode] = useState<CanvasViewMode>('3d');

  // FEA State
  const [appliedLoad, setAppliedLoad] = useState<number>(4500);
  const [deformationAmp, setDeformationAmp] = useState<number>(15);
  const [feaResult, setFeaResult] = useState<FeaSimulationResult>(() =>
    cadAiService.calculateAdvancedFea(DEFAULT_CAD_PARAMS, 4500)
  );

  // Photo Creation State
  const [selectedPhotoPreset, setSelectedPhotoPreset] = useState<PhotoPreset>(PHOTO_PRESETS[0]);
  const [customPhotoBase64, setCustomPhotoBase64] = useState<string | null>(null);
  const [customPhotoName, setCustomPhotoName] = useState<string>('');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<CadFromPhotoAnalysis | null>(null);

  // Description Creation State
  const [descriptionPrompt, setDescriptionPrompt] = useState<string>(
    'Soporte en escuadra para motor NEMA 17 con ranuras de ajuste y chaflán en aluminio 6061'
  );
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [descResult, setDescResult] = useState<CadFromDescriptionResult | null>(null);

  // Wizard Creation State (Step-by-step guided creation)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardShape, setWizardShape] = useState<CadShapeType>('l_bracket');
  const [wizardWidth, setWizardWidth] = useState<number>(150);
  const [wizardHeight, setWizardHeight] = useState<number>(100);
  const [wizardThickness, setWizardThickness] = useState<number>(6.0);
  const [wizardHoleRadius, setWizardHoleRadius] = useState<number>(5.0);
  const [wizardHasCenterHole, setWizardHasCenterHole] = useState<boolean>(true);
  const [wizardCenterRadius, setWizardCenterRadius] = useState<number>(20);
  const [wizardMaterialId, setWizardMaterialId] = useState<string>('al-6061');
  const [wizardLoadN, setWizardLoadN] = useState<number>(3500);

  // 3D Canvas Orbit State (Pure Canvas rotation)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotX, setRotX] = useState<number>(28);
  const [rotY, setRotY] = useState<number>(-35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update FEA whenever parameters or load changes
  useEffect(() => {
    const res = cadAiService.calculateAdvancedFea(params, appliedLoad);
    setFeaResult(res);
  }, [params, appliedLoad]);

  // Redraw canvas whenever geometry, load or view mode changes
  useEffect(() => {
    if (activeTab === 'canvas') {
      drawCanvas();
    }
  }, [params, appliedLoad, viewMode, rotX, rotY, deformationAmp, activeTab, feaResult]);

  const activeMaterial =
    MATERIALS_DATABASE.find((m) => m.id === params.materialId) ||
    MATERIALS_DATABASE[0];

  const features = getDefaultFeatures(params);

  // ══════════════════════════════════════════════════════════════════════════════
  // ACTIONS: Photo Analysis
  // ══════════════════════════════════════════════════════════════════════════════
  const handleAnalyzePhoto = async (preset?: PhotoPreset) => {
    const targetPreset = preset || selectedPhotoPreset;
    setIsAnalyzingPhoto(true);
    loggerService.log('COMMAND', `Analizando fotografía para reconstrucción CAD: ${targetPreset.name}`);

    try {
      const res = await cadAiService.analyzePhotoToCad(
        customPhotoName || targetPreset.id,
        customPhotoBase64 || undefined,
        targetPreset.description
      );
      setPhotoAnalysisResult(res);
      setParams(res.params);
      setAppliedLoad(res.recommendedLoadNewtons);
      loggerService.log(
        'INFO',
        `Reconstrucción de foto completada con certeza del ${res.confidenceScore}%.`
      );
    } catch {
      // Handled in service fallback
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setCustomPhotoBase64(b64);
      setCustomPhotoName(file.name);
      loggerService.log('INFO', `Fotografía de usuario cargada: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ACTIONS: Description / Prompt Generation
  // ══════════════════════════════════════════════════════════════════════════════
  const handleGenerateFromPrompt = async (promptOverride?: string) => {
    const promptToUse = promptOverride || descriptionPrompt;
    if (!promptToUse.trim()) return;

    setIsGeneratingDesc(true);
    loggerService.log('COMMAND', `Generando CAD por descripción: "${promptToUse}"`);

    try {
      const res = await cadAiService.generateFromDescription(
        promptToUse,
        params.materialId,
        appliedLoad
      );
      setDescResult(res);
      setParams(res.params);
      setAppliedLoad(res.suggestedLoadN);
      loggerService.log(
        'INFO',
        `Modelo generado por IA para "${res.title}" con certeza del ${res.confidenceScore}%.`
      );
    } catch {
      // Handled in service
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ACTIONS: Wizard Step-by-Step Creation
  // ══════════════════════════════════════════════════════════════════════════════
  const handleFinishWizard = () => {
    const newParams: CadParameters = {
      width: wizardWidth,
      height: wizardHeight,
      thickness: wizardThickness,
      cornerFillet: 8,
      holeRadius: wizardHoleRadius,
      numHolesX: 2,
      numHolesY: 2,
      marginX: Math.round(wizardWidth * 0.12),
      marginY: Math.round(wizardHeight * 0.14),
      hasCenterHole: wizardHasCenterHole,
      centerHoleRadius: wizardCenterRadius,
      materialId: wizardMaterialId,
      shapeType: wizardShape,
      flangeHeight: wizardShape === 'l_bracket' ? Math.round(wizardHeight * 0.7) : undefined,
      flangeThickness: wizardThickness,
      ribThickness: Math.round(wizardThickness * 0.75),
      outerDiameter: wizardShape === 'circular_flange' ? wizardWidth : undefined,
      innerDiameter: wizardShape === 'circular_flange' ? wizardCenterRadius * 2 : undefined,
      boltCircleRadius: wizardShape === 'circular_flange' ? Math.round(wizardWidth * 0.38) : undefined,
      numBolts: wizardShape === 'circular_flange' ? 6 : undefined,
      webThickness: wizardShape === 'i_beam' ? Math.round(wizardThickness * 0.7) : undefined,
      creationMethod: 'wizard',
      certaintyScore: 99,
      certaintyRationale: 'Construcción paso a paso validada con parámetros explícitos del usuario.',
      loadNewtons: wizardLoadN,
    };

    setParams(newParams);
    setAppliedLoad(wizardLoadN);
    setCreationMode('manual');
    setViewMode('3d');
    loggerService.log('INFO', 'Pieza ensamblada mediante el Constructor Guiado Paso a Paso.');
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // CANVAS RENDERING ENGINE (2D Blueprint, 3D Isometric Solid, and FEA Mesh)
  // ══════════════════════════════════════════════════════════════════════════════
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#080b11';
    ctx.fillRect(0, 0, w, h);

    // Subtle Engineering Grid
    ctx.strokeStyle = '#121824';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (viewMode === '2d') {
      draw2DBlueprint(ctx, w, h);
    } else {
      draw3DIsometricSolid(ctx, w, h);
    }
  };

  // 2D Blueprint with Technical Dimensions & Centerlines
  const draw2DBlueprint = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const margin = 90;
    const scaleX = (w - margin * 2) / params.width;
    const scaleY = (h - margin * 2) / params.height;
    const scale = Math.min(scaleX, scaleY, 2.4);

    const ox = (w - params.width * scale) / 2;
    const oy = (h - params.height * scale) / 2;
    const shape = params.shapeType || 'plate';

    ctx.save();

    if (shape === 'circular_flange') {
      const cx = w / 2;
      const cy = h / 2;
      const r = (params.width / 2) * scale;
      const ir = params.centerHoleRadius * scale;
      const bcr = (params.boltCircleRadius || Math.round(params.width * 0.38)) * scale;

      // Outer circle
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bolt circle dash
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, bcr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center hole
      ctx.fillStyle = '#080b11';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 6 Bolts
      const numB = params.numBolts || 6;
      for (let i = 0; i < numB; i++) {
        const ang = (i * 2 * Math.PI) / numB;
        const bx = cx + bcr * Math.cos(ang);
        const by = cy + bcr * Math.sin(ang);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(bx, by, params.holeRadius * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Plate or L-Bracket or I-Beam
      ctx.fillStyle = 'rgba(6, 182, 212, 0.07)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(ox, oy, params.width * scale, params.height * scale);
      ctx.fillRect(ox, oy, params.width * scale, params.height * scale);

      // Holes
      const holes = [
        [params.marginX, params.marginY],
        [params.width - params.marginX, params.marginY],
        [params.width - params.marginX, params.height - params.marginY],
        [params.marginX, params.height - params.marginY],
      ];

      holes.forEach(([hx, hy]) => {
        const px = ox + hx * scale;
        const py = oy + hy * scale;
        const r = params.holeRadius * scale;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Center cross
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - r * 1.5, py);
        ctx.lineTo(px + r * 1.5, py);
        ctx.moveTo(px, py - r * 1.5);
        ctx.lineTo(px, py + r * 1.5);
        ctx.stroke();
      });

      // Center Bore
      if (params.hasCenterHole) {
        const cx = ox + (params.width / 2) * scale;
        const cy = oy + (params.height / 2) * scale;
        const cr = params.centerHoleRadius * scale;
        ctx.fillStyle = '#080b11';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Dimensions text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(
      `${params.width.toFixed(1)} mm`,
      ox + (params.width * scale) / 2 - 25,
      oy + params.height * scale + 24
    );

    ctx.save();
    ctx.translate(ox - 20, oy + (params.height * scale) / 2 + 15);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${params.height.toFixed(1)} mm`, 0, 0);
    ctx.restore();

    ctx.restore();
  };

  // 3D Isometric Projection with Orbit Controls and FEA Stress Shading
  const draw3DIsometricSolid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Convert angles to radians
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    // 3D Projection Helper
    const project = (x: number, y: number, z: number) => {
      // Rotate around Y
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // Rotate around X
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective Scale
      const scale = 1.35;
      return {
        px: x1 * scale,
        py: y2 * scale,
        depth: z2,
      };
    };

    const halfW = params.width / 2;
    const halfH = params.height / 2;
    const t = params.thickness * 1.5;

    // Apply deformation offset if in deformed or fea mode
    const defOffset =
      viewMode === 'deformed'
        ? (appliedLoad / 5000) * (deformationAmp / 5)
        : viewMode === 'fea'
        ? (appliedLoad / 8000) * 2
        : 0;

    // Build solid vertices for Prism / Bracket
    const v = [
      // Bottom face: 0..3
      project(-halfW, -halfH, -t / 2),
      project(halfW, -halfH, -t / 2),
      project(halfW, halfH - defOffset, -t / 2),
      project(-halfW, halfH - defOffset, -t / 2),
      // Top face: 4..7
      project(-halfW, -halfH, t / 2),
      project(halfW, -halfH, t / 2),
      project(halfW, halfH - defOffset, t / 2),
      project(-halfW, halfH - defOffset, t / 2),
    ];

    // If L-bracket, add the upright flange vertices
    const isLBracket = params.shapeType === 'l_bracket';
    const flangeH = params.flangeHeight || 65;
    const vFlange = isLBracket
      ? [
          project(-halfW, -halfH, t / 2 + flangeH),
          project(halfW, -halfH, t / 2 + flangeH),
          project(halfW, -halfH + t, t / 2 + flangeH),
          project(-halfW, -halfH + t, t / 2 + flangeH),
        ]
      : [];

    // Colormap for FEA or normal shaded render
    let topFill = 'rgba(6, 182, 212, 0.25)';
    let sideFill = 'rgba(2, 132, 199, 0.35)';
    let edgeStroke = '#38bdf8';

    if (viewMode === 'fea') {
      // Color gradient based on safety factor & peak stress
      topFill =
        feaResult.status === 'SAFE'
          ? 'rgba(16, 185, 129, 0.45)'
          : feaResult.status === 'WARNING'
          ? 'rgba(245, 158, 11, 0.45)'
          : 'rgba(239, 68, 68, 0.55)';
      sideFill =
        feaResult.status === 'SAFE'
          ? 'rgba(5, 150, 105, 0.6)'
          : feaResult.status === 'WARNING'
          ? 'rgba(217, 119, 6, 0.6)'
          : 'rgba(220, 38, 38, 0.7)';
      edgeStroke =
        feaResult.status === 'SAFE'
          ? '#34d399'
          : feaResult.status === 'WARNING'
          ? '#fbbf24'
          : '#f87171';
    } else if (viewMode === 'deformed') {
      topFill = 'rgba(236, 72, 153, 0.35)';
      sideFill = 'rgba(190, 24, 93, 0.45)';
      edgeStroke = '#f472b6';
    }

    // Draw Side Faces
    const drawFace = (indices: number[], fill: string, stroke: string) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = v[idx];
        if (i === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };

    // Draw bottom
    drawFace([0, 1, 2, 3], 'rgba(10, 15, 25, 0.8)', '#1e293b');
    // Draw sides
    drawFace([0, 1, 5, 4], sideFill, edgeStroke);
    drawFace([1, 2, 6, 5], sideFill, edgeStroke);
    drawFace([2, 3, 7, 6], sideFill, edgeStroke);
    drawFace([3, 0, 4, 7], sideFill, edgeStroke);
    // Draw top
    drawFace([4, 5, 6, 7], topFill, edgeStroke);

    // If L-bracket, draw vertical wing
    if (isLBracket && vFlange.length === 4) {
      ctx.beginPath();
      ctx.moveTo(v[4].px, v[4].py);
      ctx.lineTo(v[5].px, v[5].py);
      ctx.lineTo(vFlange[1].px, vFlange[1].py);
      ctx.lineTo(vFlange[0].px, vFlange[0].py);
      ctx.closePath();
      ctx.fillStyle = topFill;
      ctx.fill();
      ctx.strokeStyle = edgeStroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // FEA Stress Heatmap Nodes & Load Vector
    if (viewMode === 'fea') {
      // Hotspot node at center
      const centerHotspot = project(0, 0, t / 2);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(centerHotspot.px, centerHotspot.py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Stress callout
      ctx.fillStyle = '#f87171';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(
        `σ_max = ${feaResult.maxStressMpa} MPa`,
        centerHotspot.px + 10,
        centerHotspot.py - 10
      );
    }

    // Force Vector Arrow
    const loadPt = project(0, halfH - defOffset, t / 2);
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(loadPt.px, loadPt.py - 35);
    ctx.lineTo(loadPt.px, loadPt.py);
    ctx.stroke();
    // Arrow tip
    ctx.beginPath();
    ctx.moveTo(loadPt.px - 5, loadPt.py - 8);
    ctx.lineTo(loadPt.px, loadPt.py);
    ctx.lineTo(loadPt.px + 5, loadPt.py - 8);
    ctx.fill();

    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText(`${appliedLoad} N`, loadPt.px + 8, loadPt.py - 20);

    ctx.restore();
  };

  // Canvas Mouse Orbit Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY((prev) => prev + dx * 0.6);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.6)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] p-3 overflow-hidden text-slate-200 font-mono">
      {/* ════════════════════════════════════════════════════════════════════════
          HEADER: Engine Title & Creation Mode Switcher
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="mb-2 border-b border-[#1b2230] pb-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-100 tracking-wider">
            MOTOR CAD &amp; FEA: FOTOS, DESCRIPCIÓN &amp; CONSTRUCTOR PASO A PASO
          </h2>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
            OpenCASCADE / CalculiX
          </span>
        </div>

        {/* 4 CREATION MODES: Photo | Description | Wizard | Manual */}
        <div className="flex items-center gap-1 bg-[#121622] p-0.5 rounded border border-[#1f283a] text-xs">
          <button
            onClick={() => setCreationMode('photo')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              creationMode === 'photo'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-600/60 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Generar o reconstruir pieza CAD a partir de una fotografía o plano técnico"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Desde Foto / Imagen</span>
          </button>

          <button
            onClick={() => setCreationMode('description')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              creationMode === 'description'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-600/60 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Describir la pieza en lenguaje natural para generarla mediante IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Por Descripción (IA)</span>
          </button>

          <button
            onClick={() => setCreationMode('wizard')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              creationMode === 'wizard'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Constructor interactivo guiado en 5 pasos para crear la pieza desde cero"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            <span>Constructor Guiado</span>
          </button>

          <button
            onClick={() => setCreationMode('manual')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-colors text-[11px] font-semibold ${
              creationMode === 'manual'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-600/60 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ajuste fino paramétrico y árbol de operaciones B-Rep"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Ajustes Manuales</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PROVENANCE & CERTAINTY BANNER
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="mb-2 p-1.5 bg-[#0e131d] border border-[#1b2536] rounded flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Pieza Activa: <strong className="text-white">{params.shapeType?.toUpperCase() || 'PLACA'}</strong> ({params.width}x{params.height}x{params.thickness} mm &middot; {activeMaterial.name})
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 text-[10px]">
            Método: {params.creationMethod === 'photo' ? 'Fotografía CV' : params.creationMethod === 'description' ? 'Prompt IA' : params.creationMethod === 'wizard' ? 'Constructor Guiado' : 'Diseño Paramétrico'}
          </span>
        </div>

        {params.certaintyScore && (
          <div className="flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-700/50 text-[10px] text-emerald-300 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Certeza: {params.certaintyScore}%</span>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN VIEW: Split into Controls / Wizard on the left & 3D/2D Viewport on the right
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN: Controls tailored to Creation Mode (Cols 4) */}
        <div className="col-span-4 bg-[#0c0f16] border border-[#1a2232] rounded-md p-2.5 flex flex-col overflow-y-auto space-y-2.5 text-xs">
          {/* MODE 1: PHOTO TO CAD */}
          {creationMode === 'photo' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#18202e]">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reconstrucción CAD desde Foto</span>
                </span>
                <span className="text-[10px] text-slate-500">OpenCV + IA</span>
              </div>

              {/* Upload Custom Photo or Select Presets */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider">
                  Subir Fotografía o Plano Técnico:
                </label>
                <div className="border border-dashed border-[#233148] hover:border-cyan-500 rounded p-2 text-center bg-[#090d14] transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="photo-upload-input"
                  />
                  <label htmlFor="photo-upload-input" className="cursor-pointer block">
                    <Upload className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-300 block">
                      {customPhotoName ? `✓ ${customPhotoName}` : 'Arrastra una foto o haz clic para subir'}
                    </span>
                    <span className="text-[9px] text-slate-500">PNG, JPG, BMP o plano en blanco y negro</span>
                  </label>
                </div>
              </div>

              {/* Preset Engineering Photos */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  O Selecciona una Foto de Pieza Mecánica:
                </span>
                <div className="space-y-1">
                  {PHOTO_PRESETS.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPhotoPreset(p);
                        setCustomPhotoBase64(null);
                        setCustomPhotoName('');
                        handleAnalyzePhoto(p);
                      }}
                      className={`p-2 rounded cursor-pointer border transition-colors ${
                        selectedPhotoPreset.id === p.id && !customPhotoBase64
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                          : 'bg-[#0f141f] border-[#1c2638] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>{p.name}</span>
                        <span className="text-[9px] text-cyan-400 bg-cyan-950/40 px-1 rounded">
                          {p.category.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Analysis Trigger Button */}
              <button
                onClick={() => handleAnalyzePhoto()}
                disabled={isAnalyzingPhoto}
                className="w-full py-1.5 px-3 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isAnalyzingPhoto ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Detectando Contornos y Barrenos...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Reconstruir en CAD &amp; FEA</span>
                  </>
                )}
              </button>

              {/* Photo Analysis Result Summary */}
              {photoAnalysisResult && (
                <div className="p-2 rounded bg-[#090d14] border border-[#1b2638] space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>Resultado de Visión Artificial:</span>
                    <span className="text-emerald-400">{photoAnalysisResult.confidenceScore}% Certeza</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {photoAnalysisResult.summary}
                  </p>
                  <div className="space-y-0.5 pt-1 border-t border-[#18202d]">
                    {photoAnalysisResult.detectedFeatures.map((f, i) => (
                      <div key={i} className="flex justify-between text-slate-400">
                        <span>{f.feature}:</span>
                        <span className="text-slate-200 font-semibold">{f.estimatedValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: DESCRIPTION (IA PROMPT) */}
          {creationMode === 'description' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#18202e]">
                <span className="text-purple-300 font-bold flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Generar Pieza por Descripción</span>
                </span>
                <span className="text-[10px] text-slate-500">LLM + CadQuery</span>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider">
                  Describe la pieza geométrica y requerimientos:
                </label>
                <textarea
                  rows={3}
                  value={descriptionPrompt}
                  onChange={(e) => setDescriptionPrompt(e.target.value)}
                  placeholder="ej: Placa de soporte de 180x120mm con 4 barrenos de 10mm y aligeramiento central en aluminio 6061 para 4000 N..."
                  className="w-full bg-[#090d14] border border-[#233148] rounded p-2 text-slate-200 text-xs focus:outline-hidden focus:border-purple-500 resize-none font-sans"
                />
              </div>

              {/* Quick Prompt Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Prompts de Ejemplo Rápido:
                </span>
                <div className="flex flex-col gap-1">
                  {[
                    'Soporte en escuadra para motor NEMA 17 con 4 orificios M3 y chaflán',
                    'Placa base de aluminio 6061 de 200x140mm aligerada para 5000 N',
                    'Brida circular de acople con 6 pernos M8 para tubería hidráulica',
                    'Viga I-Beam estructural de acero A36 de 150mm de peralte para 12 kN',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDescriptionPrompt(chip);
                        handleGenerateFromPrompt(chip);
                      }}
                      className="text-left p-1.5 rounded bg-[#101522] hover:bg-[#182032] border border-[#1e293c] text-[10px] text-slate-300 transition-colors cursor-pointer"
                    >
                      &bull; {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => handleGenerateFromPrompt()}
                disabled={isGeneratingDesc}
                className="w-full py-1.5 px-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isGeneratingDesc ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deduciendo Geometría y Cargas FEA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar Modelo CAD &amp; Simular</span>
                  </>
                )}
              </button>

              {/* Description Result */}
              {descResult && (
                <div className="p-2 rounded bg-[#090d14] border border-[#271d3a] space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-purple-300 font-bold">
                    <span>{descResult.title}</span>
                    <span className="text-emerald-400">{descResult.confidenceScore}% Certeza</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {descResult.certaintyRationale}
                  </p>
                  <p className="text-amber-300 font-semibold pt-1">
                    FEA: {descResult.feaRecommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: WIZARD (STEP BY STEP CONSTRUCTOR) */}
          {creationMode === 'wizard' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#18202e]">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Constructor Guiado (Paso {wizardStep} de 5)</span>
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      onClick={() => setWizardStep(s)}
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] cursor-pointer ${
                        wizardStep === s
                          ? 'bg-emerald-500 text-black font-bold'
                          : wizardStep > s
                          ? 'bg-emerald-900 text-emerald-300'
                          : 'bg-[#18202e] text-slate-500'
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* STEP 1: Shape Typology */}
              {wizardStep === 1 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Paso 1: Selecciona la Tipología Base
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { id: 'plate', label: 'Placa Rectangular', icon: '🔲' },
                      { id: 'l_bracket', label: 'Escuadra en L', icon: '📐' },
                      { id: 'circular_flange', label: 'Brida Circular', icon: '⭕' },
                      { id: 'i_beam', label: 'Viga en I (Doble T)', icon: '🏗️' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setWizardShape(item.id as CadShapeType)}
                        className={`p-2 rounded border text-left cursor-pointer transition-colors ${
                          wizardShape === item.id
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                            : 'bg-[#101522] border-[#1d273a] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-base block mb-0.5">{item.icon}</span>
                        <span className="font-bold block text-[10px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Dimensions */}
              {wizardStep === 2 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Paso 2: Dimensiones Principales
                  </span>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>Largo / Ancho X:</span>
                        <span className="text-cyan-400 font-bold">{wizardWidth} mm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="300"
                        value={wizardWidth}
                        onChange={(e) => setWizardWidth(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>Alto / Diámetro Y:</span>
                        <span className="text-cyan-400 font-bold">{wizardHeight} mm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="300"
                        value={wizardHeight}
                        onChange={(e) => setWizardHeight(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>Espesor (Grosor Z):</span>
                        <span className="text-emerald-400 font-bold">{wizardThickness} mm</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="25"
                        step="0.5"
                        value={wizardThickness}
                        onChange={(e) => setWizardThickness(Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Holes & Operations */}
              {wizardStep === 3 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Paso 3: Operaciones &amp; Barrenos
                  </span>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>Radio de Barrenos de Fijación:</span>
                        <span className="text-amber-400 font-bold">⌀{(wizardHoleRadius * 2).toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        step="0.5"
                        value={wizardHoleRadius}
                        onChange={(e) => setWizardHoleRadius(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div className="pt-1 border-t border-[#1b2536]">
                      <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                        <input
                          type="checkbox"
                          checked={wizardHasCenterHole}
                          onChange={(e) => setWizardHasCenterHole(e.target.checked)}
                          className="accent-pink-500"
                        />
                        <span className="text-pink-300 font-bold text-[11px]">Bore / Agujero Central</span>
                      </label>

                      {wizardHasCenterHole && (
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span>Radio Central:</span>
                            <span className="text-pink-400 font-bold">{wizardCenterRadius} mm</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="45"
                            value={wizardCenterRadius}
                            onChange={(e) => setWizardCenterRadius(Number(e.target.value))}
                            className="w-full accent-pink-500 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Material */}
              {wizardStep === 4 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Paso 4: Material &amp; Resistencia
                  </span>
                  <div className="space-y-1">
                    {MATERIALS_DATABASE.map((mat) => (
                      <div
                        key={mat.id}
                        onClick={() => setWizardMaterialId(mat.id)}
                        className={`p-2 rounded cursor-pointer border transition-colors ${
                          wizardMaterialId === mat.id
                            ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                            : 'bg-[#101522] border-[#1d273a] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between text-xs font-bold text-slate-200">
                          <span>{mat.name}</span>
                          <span className="text-emerald-400">{mat.yieldStrength} MPa</span>
                        </div>
                        <div className="text-[9px] text-slate-500">
                          E: {mat.youngModulus} GPa &middot; Densidad: {mat.density} kg/m³
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: Load & Solve */}
              {wizardStep === 5 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Paso 5: Cargas &amp; Condiciones de Contorno
                  </span>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>Carga Estructural Aplicada:</span>
                        <span className="text-rose-400 font-bold">{wizardLoadN} N</span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="15000"
                        step="250"
                        value={wizardLoadN}
                        onChange={(e) => setWizardLoadN(Number(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>

                    <div className="p-2 rounded bg-[#0d121c] border border-[#202c3e] space-y-1 text-[10px]">
                      <span className="text-cyan-300 font-bold block">Condición de Fijación:</span>
                      <p className="text-slate-300">
                        Empotramiento rígido en los 4 barrenos de fijación (6 grados de libertad restringidos).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#18202e]">
                {wizardStep > 1 ? (
                  <button
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-3 py-1 bg-[#18202e] hover:bg-[#253248] text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    &larr; Anterior
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 5 ? (
                  <button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[11px] cursor-pointer"
                  >
                    Siguiente &rarr;
                  </button>
                ) : (
                  <button
                    onClick={handleFinishWizard}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs"
                  >
                    ✓ Finalizar y Generar Sólido
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODE 4: MANUAL CONTROLS & FEATURE TREE */}
          {creationMode === 'manual' && (
            <div className="space-y-2.5">
              <div className="border-b border-[#18202e] pb-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                  Árbol de Operaciones (Part B-Rep):
                </span>
                <div className="space-y-1">
                  {features.map((feat) => (
                    <div
                      key={feat.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#0f141f] border border-[#1b2536] text-[11px]"
                    >
                      <span className="text-cyan-300 font-medium">{feat.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Ancho (X):</span>
                    <span className="text-cyan-400 font-bold">{params.width} mm</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="300"
                    value={params.width}
                    onChange={(e) => setParams({ ...params, width: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Alto (Y):</span>
                    <span className="text-cyan-400 font-bold">{params.height} mm</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="240"
                    value={params.height}
                    onChange={(e) => setParams({ ...params, height: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Espesor (Z):</span>
                    <span className="text-emerald-400 font-bold">{params.thickness} mm</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="25"
                    step="0.5"
                    value={params.thickness}
                    onChange={(e) => setParams({ ...params, thickness: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Radio de Barrenos:</span>
                    <span className="text-amber-400 font-bold">⌀{(params.holeRadius * 2).toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={params.holeRadius}
                    onChange={(e) => setParams({ ...params, holeRadius: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Carga Aplicada:</span>
                    <span className="text-rose-400 font-bold">{appliedLoad} N</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="15000"
                    step="250"
                    value={appliedLoad}
                    onChange={(e) => setAppliedLoad(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FEA Real-Time Dashboard (Always Visible) */}
          <div className="mt-auto pt-2 border-t border-[#18202e] space-y-1.5 text-[11px] bg-[#090d13] p-2 rounded border">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 pb-1 border-b border-[#1b2332]">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Simulación FEA (CalculiX)</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  feaResult.status === 'SAFE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                    : feaResult.status === 'WARNING'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                    : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                }`}
              >
                {feaResult.status === 'SAFE'
                  ? 'SEGURO'
                  : feaResult.status === 'WARNING'
                  ? 'PRECAUCIÓN'
                  : 'FALLA ELÁSTICA'}
              </span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Esfuerzo Von Mises Máx:</span>
              <span className="font-bold text-amber-300">{feaResult.maxStressMpa} MPa</span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Límite Elástico ({activeMaterial.name.split(' ')[0]}):</span>
              <span className="text-slate-200">{feaResult.yieldStressMpa} MPa</span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Factor de Seguridad:</span>
              <span className="font-bold text-emerald-400">{feaResult.safetyFactor}x</span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Deformación Estimada:</span>
              <span className="text-cyan-400">{feaResult.maxDisplacementMm} mm</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Viewport & Code/Simulation Subtabs (Cols 8) */}
        <div className="col-span-8 bg-[#090b0e] border border-[#1b2231] rounded-md p-2.5 flex flex-col overflow-hidden">
          {/* Viewport Top Bar */}
          <div className="pb-2 border-b border-[#18202d] mb-2 flex items-center justify-between flex-wrap gap-2 text-xs">
            {/* View Mode Switcher: 2D Blueprint | 3D Solid | FEA Heatmap | Deformed */}
            <div className="flex items-center gap-1 bg-[#121620] p-0.5 rounded border border-[#1e2736]">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                  viewMode === '3d'
                    ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista 3D interactiva con órbita arrastrando el ratón"
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>Sólido 3D</span>
              </button>

              <button
                onClick={() => setViewMode('2d')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                  viewMode === '2d'
                    ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Plano técnico 2D con cotas dimensionales"
              >
                <Ruler className="w-3 h-3 text-cyan-400" />
                <span>Plano 2D</span>
              </button>

              <button
                onClick={() => setViewMode('fea')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                  viewMode === 'fea'
                    ? 'bg-rose-950/70 text-rose-200 border border-rose-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Malla de tensiones Von Mises FEA"
              >
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Mapa FEA</span>
              </button>

              <button
                onClick={() => setViewMode('deformed')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                  viewMode === 'deformed'
                    ? 'bg-pink-950/70 text-pink-200 border border-pink-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Simulación de deformación elástica amplificada"
              >
                <Activity className="w-3 h-3 text-pink-400" />
                <span>Deformación ({deformationAmp}x)</span>
              </button>
            </div>

            {/* Subtabs: Script CadQuery | DXF | Didactic | NIF */}
            <div className="flex items-center gap-1 bg-[#121620] p-0.5 rounded border border-[#1e2736]">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] ${
                  activeTab === 'canvas'
                    ? 'bg-blue-900/50 text-blue-200 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Viewport
              </button>

              <button
                onClick={() => setActiveTab('cadquery')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] flex items-center gap-1 ${
                  activeTab === 'cadquery'
                    ? 'bg-blue-900/50 text-blue-200 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3 h-3 text-blue-400" />
                <span>CadQuery</span>
              </button>

              <button
                onClick={() => setActiveTab('dxfCode')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] flex items-center gap-1 ${
                  activeTab === 'dxfCode'
                    ? 'bg-blue-900/50 text-blue-200 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck className="w-3 h-3 text-blue-400" />
                <span>DXF</span>
              </button>

              <button
                onClick={() => setActiveTab('didacticCad')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] flex items-center gap-1 ${
                  activeTab === 'didacticCad'
                    ? 'bg-purple-900/50 text-purple-200 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Didáctica</span>
              </button>

              <button
                onClick={() => setActiveTab('nifBinary')}
                className="px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] bg-cyan-950/70 text-cyan-300 border border-cyan-700/50 font-bold flex items-center gap-1"
              >
                <Binary className="w-3 h-3 text-cyan-400" />
                <span>NIF</span>
              </button>
            </div>
          </div>

          {/* Viewport Content */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center bg-[#07090e] rounded border border-[#141b27] overflow-hidden">
            {activeTab === 'canvas' ? (
              <div className="w-full h-full relative flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={480}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                />

                {/* 3D Orbit Helper Badge */}
                {viewMode !== '2d' && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#0d121c]/90 rounded border border-[#1d273a] text-[10px] text-slate-400 flex items-center gap-2 pointer-events-none">
                    <span>Arrastra para rotar en 3D</span>
                    <span className="text-cyan-400 font-mono">
                      (X: {rotX}°, Y: {rotY}°)
                    </span>
                  </div>
                )}

                {/* Export Buttons Floating */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const script = cadAiService.generateCadQueryForShape(params);
                      downloadCadQueryFile(script, `cadquery_${params.shapeType || 'part'}.py`);
                      loggerService.log('INFO', 'Script CadQuery exportado.');
                    }}
                    className="px-2 py-1 bg-[#131b28] hover:bg-[#1c273a] text-cyan-300 rounded border border-[#233148] text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Exportar a script Python CadQuery / Build123d"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Script .py</span>
                  </button>

                  <button
                    onClick={() => {
                      const code = generateDxfString(params);
                      downloadDxfFile(code, `plano_${params.shapeType || 'part'}.dxf`);
                      loggerService.log('INFO', 'Archivo DXF exportado.');
                    }}
                    className="px-2 py-1 bg-[#131b28] hover:bg-[#1c273a] text-amber-300 rounded border border-[#233148] text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Exportar a DXF de AutoCAD para corte láser o CNC"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>DXF 2D</span>
                  </button>
                </div>
              </div>
            ) : activeTab === 'cadquery' ? (
              <textarea
                readOnly
                value={cadAiService.generateCadQueryForShape(params)}
                className="w-full h-full bg-[#06080b] text-cyan-300 font-mono text-xs p-3 resize-none focus:outline-hidden"
              />
            ) : activeTab === 'dxfCode' ? (
              <textarea
                readOnly
                value={generateDxfString(params)}
                className="w-full h-full bg-[#06080b] text-cyan-300 font-mono text-xs p-3 resize-none focus:outline-hidden"
              />
            ) : activeTab === 'nifBinary' ? (
              <div className="w-full h-full flex flex-col">
                <NifBinaryViewer
                  onExportToCadPlate={(w, h) => {
                    setParams((prev) => ({ ...prev, width: w, height: h }));
                    setActiveTab('canvas');
                    loggerService.log('INFO', `Dimensiones NIF sincronizadas con CAD: ${w}x${h} mm.`);
                  }}
                />
              </div>
            ) : (
              /* Didactic CAD & FEA Breakdown */
              <div className="w-full h-full overflow-y-auto p-3 space-y-3 bg-[#06080b] text-slate-300 text-xs">
                <div className="p-2.5 rounded bg-[#0d121c] border border-[#1f2b3e] space-y-1">
                  <span className="text-xs font-bold text-cyan-300">
                    Didáctica de Modelado CAD &amp; Formulación FEA
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    A diferencia de los archivos STL que almacenan una nube de triángulos planos discretizados, el kernel de modelado OpenCASCADE B-Rep y el motor de elementos finitos CalculiX representan la pieza analíticamente mediante ecuaciones diferenciales de tensión y superficies NURBS continuas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27] space-y-1">
                    <span className="font-bold text-amber-300 block">
                      1. Síntesis desde Fotografía:
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      El filtro Canny detecta gradientes de intensidad de píxeles, la transformada de Hough circular aísla los barrenos y el modelo heurístico extrapola el espesor de pared y las relaciones de aspecto proporcionales.
                    </p>
                  </div>

                  <div className="p-2 rounded bg-[#080b11] border border-[#141b27] space-y-1">
                    <span className="font-bold text-purple-300 block">
                      2. Síntesis desde Lenguaje Natural:
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      El parser semántico extrae la tipología (escuadra, brida, placa, viga), mapea tolerancias dimensionales en milímetros y selecciona el material adecuado según el límite elástico requerido.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1b2536] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Criterio de Falla de Von Mises:
                  </span>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    El factor de seguridad calculado ({feaResult.safetyFactor}x) compara la tensión equivalente de Von Mises ({feaResult.maxStressMpa.toFixed(1)} MPa) contra el límite elástico del {activeMaterial.name} ({activeMaterial.yieldStrength} MPa). Un factor superior a 1.5x garantiza que la pieza opera dentro del régimen elástico sin deformación plástica permanente ni fatiga temprana.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

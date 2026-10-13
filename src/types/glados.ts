export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'COMMAND';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type ActivePanel =
  | 'ChatPanel'
  | 'ProjectPanel'
  | 'CADPanel'
  | 'SandboxPanel'
  | 'LearningPanel'
  | 'GitStudioPanel'
  | 'ArchitectPanel'
  | 'MediaStudioPanel';

export type HardwareVramProfile =
  | 'laptop-4gb'       // Laptops 4-6 GB VRAM / CPU-only: qwen2.5-coder:1.5b / 7b q4
  | 'desktop-8-12gb'   // Standard Desktop 8-12 GB VRAM: qwen2.5-coder:7b q8 / llama-3.2
  | 'workstation-16gb' // High-end Desktop 16 GB VRAM: qwen2.5-coder:14b / deepseek-coder
  | 'cloud-api';       // Gemini 3.1 Pro / Gemini 3.8 Flash (No local VRAM needed)

export interface AIModelProfile {
  id: string;
  name: string;
  provider: 'ollama' | 'gemini' | 'local-gguf';
  vramRequiredGb: number;
  description: string;
  recommendedHardware: string;
  specialty: 'code' | 'general' | 'reasoning' | 'vision';
}

export interface HardwareStats {
  cpu: number | string;
  ram: number | string;
  temp: string;
  vramUsedGb?: number;
  vramTotalGb?: number;
  isSimulated?: boolean;
}

export type AttachmentMediaType = 'image' | 'video' | 'nif';

export interface ChatMediaAttachment {
  id: string;
  name: string;
  type: AttachmentMediaType;
  mimeType: string;
  dataUrl: string;
  base64Data?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  nifDiagnostic?: {
    gameEngine: string;
    totalVertices: number;
    totalTriangles: number;
    hasHavokCollision: boolean;
    importScore: number;
    isReadyForMaps: boolean;
    recommendations: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: ChatMediaAttachment[];
  isAgenticProcess?: boolean;
  toolCall?: {
    tool: string;
    args: Record<string, unknown>;
    evidence?: string;
  };
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  extension?: string;
  size?: number;
  lines?: number;
  content?: string;
  children?: ProjectFile[];
  isModified?: boolean;
  isNew?: boolean;
}

export interface DidacticGuide {
  topic: string;
  title: string;
  whatItDoes: string;       // "¿Qué hace?"
  whyItMatters: string;     // "¿Por qué importa?"
  exampleSnippet: string;   // "Ejemplo de código"
  explanation: string;      // "Explicación paso a paso"
  reverseEngineeringInsight: string; // "Perspectiva de Ingeniería Inversa"
}

export interface ProjectPreset {
  id: string;
  name: string;
  description: string;
  rootPath: string;
  repoUrl?: string;
  architectureSummary: string;
  files: ProjectFile[];
  detectedExtensions: string[];
  baselineFiles?: ProjectFile[];
  hasModifications?: boolean;
}

export interface NifBlock {
  id: number;
  type: string;
  name?: string;
  sizeBytes: number;
  verticesCount?: number;
  trianglesCount?: number;
  childrenIds?: number[];
  properties?: Record<string, unknown>;
}

export interface NifVertex3D {
  x: number;
  y: number;
  z: number;
}

export interface NifFace3D {
  a: number;
  b: number;
  c: number;
}

export interface NifMapMesh {
  id: string;
  name: string;
  blockType: string;
  vertices: NifVertex3D[];
  faces: NifFace3D[];
  transform: {
    translation: [number, number, number];
    rotationMatrix: number[]; // 3x3 array (9 numbers)
    scale: number;
  };
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  sanitizerWarnings: string[];
}

export interface NifParseResult {
  fileName: string;
  headerString: string;
  version: string;
  userVersion: number;
  endianness: string;
  numBlocks: number;
  blockTypesCount: Record<string, number>;
  blocks: NifBlock[];
  totalVertices: number;
  totalTriangles: number;
  estimatedVramKb: number;
  rawReport: string;
  meshes: NifMapMesh[];
}

// CAD & DesignAI Types (from PDF 2)
export type CadWorkspace =
  | 'DESIGN'
  | 'ANALYSIS'
  | 'SIMULATION'
  | 'MATERIALS'
  | 'MANUFACTURING'
  | 'DOCUMENTATION';

export interface MaterialData {
  id: string;
  name: string;
  category: string;
  density: number; // kg/m3
  youngModulus: number; // GPa
  poissonRatio: number;
  yieldStrength: number; // MPa
  ultimateStrength: number; // MPa
  thermalConductivity: number; // W/m·K
  corrosionResistance: 'Baja' | 'Media' | 'Alta' | 'Excelente';
}

export interface CadFeature {
  id: string;
  name: string;
  type: 'base_plate' | 'hole_pattern' | 'fillet' | 'pocket' | 'boss' | 'material';
  parameters: Record<string, number | string | boolean>;
  enabled: boolean;
}

export interface FeaSimulationResult {
  maxStressMpa: number;
  yieldStressMpa: number;
  safetyFactor: number;
  maxDisplacementMm: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  heatmapZones: { node: number; stress: number; x: number; y: number }[];
}

export type CadShapeType =
  | 'plate'
  | 'l_bracket'
  | 'circular_flange'
  | 'i_beam'
  | 'cylindrical_shaft'
  | 'box_enclosure';

export interface CadParameters {
  width: number;
  height: number;
  thickness: number;
  cornerFillet: number;
  holeRadius: number;
  numHolesX: number;
  numHolesY: number;
  marginX: number;
  marginY: number;
  hasCenterHole: boolean;
  centerHoleRadius: number;
  materialId?: string;
  // Extended parametric geometry for shapes & photo/description generation
  shapeType?: CadShapeType;
  flangeHeight?: number;
  flangeThickness?: number;
  ribThickness?: number;
  outerDiameter?: number;
  innerDiameter?: number;
  boltCircleRadius?: number;
  numBolts?: number;
  webThickness?: number;
  chamfer?: number;
  // Provenance & AI metadata
  creationMethod?: 'manual' | 'photo' | 'description' | 'wizard';
  sourcePrompt?: string;
  sourceImageName?: string;
  certaintyScore?: number;
  certaintyRationale?: string;
  loadNewtons?: number;
  constraintType?: 'fixed_holes' | 'cantilever' | 'bottom_plate' | 'flange_bolts';
}

export interface CadFromPhotoAnalysis {
  detectedShape: CadShapeType;
  confidenceScore: number;
  summary: string;
  detectedFeatures: {
    feature: string;
    estimatedValue: string;
    confidence: number;
  }[];
  dimensions: {
    widthMm: number;
    heightMm: number;
    thicknessMm: number;
    holeDiameterMm: number;
  };
  recommendedMaterial: string;
  recommendedLoadNewtons: number;
  notes: string;
  params: CadParameters;
}

export interface CadFromDescriptionResult {
  title: string;
  shapeType: CadShapeType;
  confidenceScore: number;
  certaintyRationale: string;
  params: CadParameters;
  suggestedLoadN: number;
  feaRecommendation: string;
  cadQueryScript?: string;
}


// Learning Engine & Tester
export interface LearningProposal {
  id: string;
  timestamp: string;
  fileName: string;
  problema: string;
  propuesta: string;
  archivosAfectados: string[];
  beneficio: string;
  rawText: string;
  source: 'glados_core' | 'project_doctor' | 'web_request' | 'user_learning';
  certaintyScore?: number; // Porcentaje de certeza (ej. 96%)
  certaintyRationale?: string; // Justificación del nivel de certeza
  actionType?: 'create_folder' | 'create_file' | 'refactor_code' | 'structure_module' | 'general';
  targetFolder?: string;
  targetFile?: string;
  generatedContent?: string;
  applied?: boolean;
}

export interface TestSuiteResult {
  id: string;
  timestamp: string;
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  details: {
    name: string;
    status: 'PASS' | 'FAIL';
    durationMs: number;
    error?: string;
  }[];
}

// Git Studio & Repo Study
export interface GitRepositoryStudy {
  url: string;
  repoName: string;
  owner: string;
  description: string;
  primaryLanguage: string;
  architectureType: string;
  keyModules: {
    path: string;
    purpose: string;
    lines: number;
  }[];
  gladosIntegrationIdea: string;
  replicatedFiles: {
    path: string;
    code: string;
  }[];
}

// Code Manipulation & Replication Targets
export type CodeReplicationTarget = 'python-mcp' | 'typescript' | 'c-portable' | 'mock-engine';

export interface CodeReplicationRecord {
  id: string;
  timestamp: string;
  sourceFileName: string;
  targetLanguage: CodeReplicationTarget;
  code: string;
  didacticRationale: string;
}


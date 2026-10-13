import {
  CadParameters,
  CadFeature,
  MaterialData,
  FeaSimulationResult,
} from '../types/glados';

export const MATERIALS_DATABASE: MaterialData[] = [
  {
    id: 'al-6061',
    name: 'Aluminio 6061-T6',
    category: 'Metales No Ferrosos',
    density: 2700,
    youngModulus: 68.9,
    poissonRatio: 0.33,
    yieldStrength: 276,
    ultimateStrength: 310,
    thermalConductivity: 167,
    corrosionResistance: 'Alta',
  },
  {
    id: 'steel-a36',
    name: 'Acero Estructural ASTM A36',
    category: 'Aceros al Carbono',
    density: 7850,
    youngModulus: 200.0,
    poissonRatio: 0.29,
    yieldStrength: 250,
    ultimateStrength: 400,
    thermalConductivity: 50,
    corrosionResistance: 'Baja',
  },
  {
    id: 'ti-6al4v',
    name: 'Titanio Grado 5 (Ti-6Al-4V)',
    category: 'Aleaciones Aeroespaciales',
    density: 4430,
    youngModulus: 114.0,
    poissonRatio: 0.34,
    yieldStrength: 880,
    ultimateStrength: 950,
    thermalConductivity: 6.7,
    corrosionResistance: 'Excelente',
  },
  {
    id: 'abs-plastic',
    name: 'Polímero Técnico ABS',
    category: 'Termoplásticos de Ingeniería',
    density: 1040,
    youngModulus: 2.3,
    poissonRatio: 0.38,
    yieldStrength: 42,
    ultimateStrength: 48,
    thermalConductivity: 0.2,
    corrosionResistance: 'Excelente',
  },
  {
    id: 'brass-c360',
    name: 'Latón de Corte Libre C36000',
    category: 'Cobre y Aleaciones',
    density: 8500,
    youngModulus: 97.0,
    poissonRatio: 0.31,
    yieldStrength: 310,
    ultimateStrength: 390,
    thermalConductivity: 115,
    corrosionResistance: 'Alta',
  },
];

export const DEFAULT_CAD_PARAMS: CadParameters = {
  width: 160,
  height: 110,
  thickness: 6,
  cornerFillet: 8,
  holeRadius: 5.0,
  numHolesX: 2,
  numHolesY: 2,
  marginX: 18,
  marginY: 18,
  hasCenterHole: true,
  centerHoleRadius: 20,
  materialId: 'al-6061',
};

export function getDefaultFeatures(params: CadParameters): CadFeature[] {
  const mat = MATERIALS_DATABASE.find((m) => m.id === params.materialId) || MATERIALS_DATABASE[0];
  return [
    {
      id: 'feat-base',
      name: 'Base Plate (Prisma BREP)',
      type: 'base_plate',
      enabled: true,
      parameters: { width: params.width, height: params.height, thickness: params.thickness },
    },
    {
      id: 'feat-fillet',
      name: 'Filetes de Esquina (R' + params.cornerFillet + ')',
      type: 'fillet',
      enabled: true,
      parameters: { radius: params.cornerFillet },
    },
    {
      id: 'feat-holes',
      name: 'Patrón de Barrenos M' + params.holeRadius * 2 + ' (4x)',
      type: 'hole_pattern',
      enabled: true,
      parameters: { radius: params.holeRadius, marginX: params.marginX, marginY: params.marginY },
    },
    {
      id: 'feat-pocket',
      name: 'Bore Central de Aligeramiento (⌀' + params.centerHoleRadius * 2 + ')',
      type: 'pocket',
      enabled: params.hasCenterHole,
      parameters: { radius: params.centerHoleRadius },
    },
    {
      id: 'feat-material',
      name: `Material: ${mat.name}`,
      type: 'material',
      enabled: true,
      parameters: { materialId: mat.id, yieldStrength: mat.yieldStrength },
    },
  ];
}

// Generates CadQuery / Build123d Python script (from PDF 2: DesignAI recommended stack)
export function generateCadQueryPythonScript(params: CadParameters): string {
  const mat = MATERIALS_DATABASE.find((m) => m.id === params.materialId) || MATERIALS_DATABASE[0];
  return `"""
DesignAI CAD Engine - Script Paramétrico OpenCASCADE (CadQuery / Build123d)
Generado automáticamente por el subsistema CAD de GLaDOS OS.
Material asignado: ${mat.name} (Límite Elástico: ${mat.yieldStrength} MPa)
"""
import cadquery as cq

# 1. Definición de Parámetros de Diseño
ANCHO = ${params.width}
ALTO = ${params.height}
ESPESOR = ${params.thickness}
RADIO_BARRENO = ${params.holeRadius}
MARGEN_X = ${params.marginX}
MARGEN_Y = ${params.marginY}
FILETE_ESQUINAS = ${params.cornerFillet}
RADIO_CENTRAL = ${params.centerHoleRadius}

# 2. Construcción de Geometría Sólida B-Rep
placa = (
    cq.Workplane("XY")
    .box(ANCHO, ALTO, ESPESOR)
    .edges("|Z")
    .fillet(FILETE_ESQUINAS)
)

# 3. Barrenos de Sujeción en las 4 Esquinas
posiciones_barrenos = [
    (ANCHO/2 - MARGEN_X, ALTO/2 - MARGEN_Y),
    (-ANCHO/2 + MARGEN_X, ALTO/2 - MARGEN_Y),
    (-ANCHO/2 + MARGEN_X, -ALTO/2 + MARGEN_Y),
    (ANCHO/2 - MARGEN_X, -ALTO/2 + MARGEN_Y),
]

placa = (
    placa.faces(">Z")
    .workplane()
    .pushPoints(posiciones_barrenos)
    .hole(RADIO_BARRENO * 2)
)

${params.hasCenterHole ? `
# 4. Barreno / Bore Central Pasante
placa = (
    placa.faces(">Z")
    .workplane()
    .hole(RADIO_CENTRAL * 2)
)
` : ''}

# 5. Exportar a formatos estándar de la industria
cq.exporters.export(placa, "placa_designai.step")
cq.exporters.export(placa, "placa_designai.stl")
print("✓ Geometría B-Rep ensamblada y exportada con éxito.")
`;
}

// FEA Simulation Calculator (CalculiX style)
export function calculateFeaSimulation(params: CadParameters, appliedForceNewtons = 4500): FeaSimulationResult {
  const mat = MATERIALS_DATABASE.find((m) => m.id === params.materialId) || MATERIALS_DATABASE[0];

  // Effective cross-section area in mm2 minus center hole
  const crossSectionAreaMm2 = Math.max(50, (params.height - (params.hasCenterHole ? params.centerHoleRadius * 2 : 0)) * params.thickness);
  
  // Nominal stress in MPa (N / mm2) with stress concentration factor near holes (~2.4)
  const stressConcentrationFactor = params.hasCenterHole ? 2.45 : 1.8;
  const maxStress = (appliedForceNewtons / crossSectionAreaMm2) * stressConcentrationFactor;
  const roundedMaxStress = Math.round(maxStress * 10) / 10;

  // Safety factor: Yield Strength / Max Stress
  const safetyFactor = Math.round((mat.yieldStrength / roundedMaxStress) * 100) / 100;

  // Max displacement estimation (Hooke's law in mm)
  const displacementMm = Math.round(((appliedForceNewtons * params.width) / (crossSectionAreaMm2 * mat.youngModulus * 1000)) * 1000) / 1000;

  // Status
  const status: 'SAFE' | 'WARNING' | 'CRITICAL' =
    safetyFactor >= 1.5 ? 'SAFE' : safetyFactor >= 1.0 ? 'WARNING' : 'CRITICAL';

  // Heatmap nodes
  const heatmapZones = [
    { node: 1, stress: roundedMaxStress, x: params.width / 2, y: params.height / 2 },
    { node: 2, stress: roundedMaxStress * 0.75, x: params.marginX, y: params.marginY },
    { node: 3, stress: roundedMaxStress * 0.72, x: params.width - params.marginX, y: params.marginY },
    { node: 4, stress: roundedMaxStress * 0.35, x: params.width / 2, y: params.height - 10 },
    { node: 5, stress: roundedMaxStress * 0.15, x: 10, y: params.height / 2 },
  ];

  return {
    maxStressMpa: roundedMaxStress,
    yieldStressMpa: mat.yieldStrength,
    safetyFactor,
    maxDisplacementMm: displacementMm,
    status,
    heatmapZones,
  };
}

export function generateDxfString(params: CadParameters): string {
  const { width, height, holeRadius, marginX, marginY, hasCenterHole, centerHoleRadius } = params;
  const lines: string[] = [];

  lines.push('0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC');
  lines.push('0\nSECTION\n2\nTABLES');
  lines.push('0\nTABLE\n2\nLAYER\n70\n2');
  lines.push('0\nLAYER\n2\nPLACA_CONTORNO\n70\n0\n62\n3\n6\nCONTINUOUS\n0\nENDTAB');
  lines.push('0\nTABLE\n2\nLAYER\n70\n2');
  lines.push('0\nLAYER\n2\nBARRENOS\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nENDTAB');
  lines.push('0\nENDSEC');
  lines.push('0\nSECTION\n2\nENTITIES');

  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];

  for (let i = 0; i < 4; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 4];
    lines.push(`0\nLINE\n8\nPLACA_CONTORNO\n10\n${x1.toFixed(3)}\n20\n${y1.toFixed(3)}\n11\n${x2.toFixed(3)}\n21\n${y2.toFixed(3)}`);
  }

  const holePositions = [
    [marginX, marginY],
    [width - marginX, marginY],
    [width - marginX, height - marginY],
    [marginX, height - marginY],
  ];

  holePositions.forEach(([hx, hy]) => {
    lines.push(`0\nCIRCLE\n8\nBARRENOS\n10\n${hx.toFixed(3)}\n20\n${hy.toFixed(3)}\n40\n${holeRadius.toFixed(3)}`);
  });

  if (hasCenterHole) {
    const cx = width / 2;
    const cy = height / 2;
    lines.push(`0\nCIRCLE\n8\nBARRENOS\n10\n${cx.toFixed(3)}\n20\n${cy.toFixed(3)}\n40\n${centerHoleRadius.toFixed(3)}`);
  }

  lines.push('0\nENDSEC\n0\nEOF');
  return lines.join('\n');
}

export function downloadDxfFile(dxfContent: string, filename = 'placa_designai.dxf'): void {
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCadQueryFile(scriptContent: string, filename = 'placa_cadquery.py'): void {
  const blob = new Blob([scriptContent], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

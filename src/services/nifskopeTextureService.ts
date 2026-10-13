export interface NifTextureSlot {
  index: number;
  label: string;
  slotType: 'Diffuse' | 'Normal' | 'Glow' | 'Height' | 'EnvCube' | 'EnvMask' | 'Specular' | 'Detail';
  extensionSuffix: string;
  path: string;
  colorPreview: string;
  imageSrc?: string;
  enabled: boolean;
}

export interface NifTexturePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  slots: {
    diffuse: string;
    diffuseColor: string;
    normal: string;
    normalColor: string;
    specular: string;
    glow?: string;
  };
}

export const NIFSKOPE_TEXTURE_PRESETS: NifTexturePreset[] = [
  {
    id: 'plasma-carbine',
    name: 'Fallout 4 Military Olive & Energy Coil',
    category: 'Weapons',
    description: 'Acabado PBR militar estándar de Bethesda con bobinas de energía verde/cyan emissive.',
    slots: {
      diffuse: 'textures/weapons/plasma/plasmacarbine_d.dds',
      diffuseColor: '#364539', // Military Olive Green
      normal: 'textures/weapons/plasma/plasmacarbine_n.dds',
      normalColor: '#7f7fff', // Tangent Normal Map
      specular: 'textures/weapons/plasma/plasmacarbine_s.dds',
      glow: 'textures/weapons/plasma/plasmacarbine_g.dds',
    },
  },
  {
    id: 'vault-rusty-steel',
    name: 'Wasteland Corroded Steel & Rust',
    category: 'Architecture / Props',
    description: 'Chapa de acero con picaduras de óxido oxidado, arañazos y desconchones de pintura.',
    slots: {
      diffuse: 'textures/architecture/metal/rustedsheet_d.dds',
      diffuseColor: '#78432a', // Rust Red-Brown
      normal: 'textures/architecture/metal/rustedsheet_n.dds',
      normalColor: '#7e7eff',
      specular: 'textures/architecture/metal/rustedsheet_s.dds',
    },
  },
  {
    id: 't60-power-armor',
    name: 'T-60 Brotherhood Titanium Alloy',
    category: 'Armor',
    description: 'Placas balísticas de titanio T-60 con brillo especular alto y remaches marcados.',
    slots: {
      diffuse: 'textures/armor/t60/torso_chest_d.dds',
      diffuseColor: '#4f5561', // Dark Gunmetal Steel
      normal: 'textures/armor/t60/torso_chest_n.dds',
      normalColor: '#8080ff',
      specular: 'textures/armor/t60/torso_chest_s.dds',
      glow: 'textures/armor/t60/torso_chest_g.dds',
    },
  },
  {
    id: 'boston-brick-concrete',
    name: 'Commonwealth Concrete & Red Brick',
    category: 'Map Cells / Buildings',
    description: 'Textura arquitectónica de celda de mapa exterior con relieve de mortero profundo.',
    slots: {
      diffuse: 'textures/architecture/buildings/boston_brick_d.dds',
      diffuseColor: '#8d4838', // Brick Red
      normal: 'textures/architecture/buildings/boston_brick_n.dds',
      normalColor: '#8181ff',
      specular: 'textures/architecture/buildings/boston_brick_s.dds',
    },
  },
  {
    id: 'institute-clean-composite',
    name: 'Institute Pure White Composite',
    category: 'Tech / Sci-Fi',
    description: 'Compuesto cerámico blanco impoluto del Instituto con alto brillo reflectante.',
    slots: {
      diffuse: 'textures/architecture/institute/composite_d.dds',
      diffuseColor: '#d6dde6', // Pure Synth Off-White
      normal: 'textures/architecture/institute/composite_n.dds',
      normalColor: '#7f7fff',
      specular: 'textures/architecture/institute/composite_s.dds',
      glow: 'textures/architecture/institute/composite_g.dds',
    },
  },
];

export function getDefaultTextureSlots(preset?: NifTexturePreset): NifTextureSlot[] {
  const p = preset || NIFSKOPE_TEXTURE_PRESETS[0];

  return [
    {
      index: 0,
      label: 'Slot 1: Diffuse Map',
      slotType: 'Diffuse',
      extensionSuffix: '_d.dds',
      path: p.slots.diffuse,
      colorPreview: p.slots.diffuseColor,
      enabled: true,
    },
    {
      index: 1,
      label: 'Slot 2: Normal / Gloss Map',
      slotType: 'Normal',
      extensionSuffix: '_n.dds',
      path: p.slots.normal,
      colorPreview: p.slots.normalColor,
      enabled: true,
    },
    {
      index: 2,
      label: 'Slot 3: Glow / Emissive Map',
      slotType: 'Glow',
      extensionSuffix: '_g.dds',
      path: p.slots.glow || 'textures/shared/default_black_g.dds',
      colorPreview: p.slots.glow ? '#00e5ff' : '#000000',
      enabled: !!p.slots.glow,
    },
    {
      index: 3,
      label: 'Slot 4: Parallax / Height Map',
      slotType: 'Height',
      extensionSuffix: '_h.dds',
      path: 'textures/shared/default_height_h.dds',
      colorPreview: '#808080',
      enabled: false,
    },
    {
      index: 4,
      label: 'Slot 5: Environment Cube Map',
      slotType: 'EnvCube',
      extensionSuffix: '_e.dds',
      path: 'textures/cubemaps/wasteland_sky_e.dds',
      colorPreview: '#4a6984',
      enabled: true,
    },
    {
      index: 5,
      label: 'Slot 6: Environment Mask',
      slotType: 'EnvMask',
      extensionSuffix: '_m.dds',
      path: 'textures/shared/default_mask_m.dds',
      colorPreview: '#a0a0a0',
      enabled: true,
    },
    {
      index: 6,
      label: 'Slot 7: Smoothness / Specular',
      slotType: 'Specular',
      extensionSuffix: '_s.dds',
      path: p.slots.specular,
      colorPreview: '#9ca3af',
      enabled: true,
    },
    {
      index: 7,
      label: 'Slot 8: Detail / Backlight Map',
      slotType: 'Detail',
      extensionSuffix: '_b.dds',
      path: 'textures/shared/default_detail_b.dds',
      colorPreview: '#737373',
      enabled: false,
    },
  ];
}

// Generates Bethesda Game Studio Material File (.BGSM) format for Fallout 4
export function generateBgsmFileContent(
  textureSlots: NifTextureSlot[],
  materialName = 'Material_FO4'
): string {
  const getSlot = (idx: number) => textureSlots[idx]?.path || '';

  return JSON.stringify(
    {
      FormatVersion: 2,
      Signature: 'BGSM',
      MaterialName: materialName,
      TileU: true,
      TileV: true,
      UOffset: 0.0,
      VOffset: 0.0,
      UScale: 1.0,
      VScale: 1.0,
      Alpha: 1.0,
      AlphaBlendMode: 'None',
      AlphaTestRef: 128,
      ZBufferWrite: true,
      ZBufferTest: true,
      ScreenSpaceReflections: true,
      WetnessControlScreenSpaceReflections: true,
      Decal: false,
      TwoSided: false,
      CastShadows: true,
      ReceiveShadows: true,
      SpecularEnabled: true,
      Smoothness: 0.85,
      SpecularColor: [1.0, 1.0, 1.0],
      SpecularMult: 1.0,
      GlowMult: 1.0,
      RimPower: 2.0,
      SubsurfaceLightingRolloff: 0.3,
      Textures: {
        Diffuse: getSlot(0),
        Normal: getSlot(1),
        SmoothnessSpec: getSlot(6),
        GreyscaleHeight: getSlot(3),
        EnvironmentCube: getSlot(4),
        EnvironmentMask: getSlot(5),
        Glow: getSlot(2),
        Backlight: getSlot(7),
      },
      ShaderFlags: {
        EnableSpecular: true,
        ModelSpaceNormals: false,
        VertexAlpha: false,
        Tree: false,
        AnisoLighting: false,
      },
    },
    null,
    2
  );
}

export function downloadBgsmFile(
  content: string,
  filename = 'custom_material.bgsm'
): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface NifMapCellPreset {
  id: string;
  name: string;
  worldspace: string;
  cellCoords: [number, number];
  worldPosition: [number, number, number];
  estimatedLOD: 'LOD0 (Detalle Alto)' | 'LOD1 (Media Distancia)' | 'LOD2 (Lejano)' | 'LOD3 (Terreno)';
  drawCalls: number;
  textureMemoryMb: number;
  geometryMemoryMb: number;
  description: string;
}

export const MAP_CELL_PRESETS: NifMapCellPreset[] = [
  {
    id: 'sanctuary-hills',
    name: 'Sanctuary Hills (Puente & Casas Prefabricadas)',
    worldspace: 'Commonwealth',
    cellCoords: [4, -2],
    worldPosition: [16384, -8192, 120],
    estimatedLOD: 'LOD0 (Detalle Alto)',
    drawCalls: 142,
    textureMemoryMb: 24.5,
    geometryMemoryMb: 8.2,
    description: 'Celda residencial con edificios de madera, follaje y puentes de hormigón reforzado.',
  },
  {
    id: 'diamond-city',
    name: 'Diamond City Market (Fenway Park Ruins)',
    worldspace: 'DiamondCityInterior',
    cellCoords: [-1, -3],
    worldPosition: [-4096, -12288, 50],
    estimatedLOD: 'LOD0 (Detalle Alto)',
    drawCalls: 285,
    textureMemoryMb: 48.0,
    geometryMemoryMb: 14.6,
    description: 'Alta densidad de chabolas metálicas, tuberías de vapor y cientos de piezas Havok dinámicas.',
  },
  {
    id: 'boston-financial',
    name: 'Boston Financial District (Rascacielos Ruinas)',
    worldspace: 'Commonwealth',
    cellCoords: [2, -5],
    worldPosition: [8192, -20480, 450],
    estimatedLOD: 'LOD1 (Media Distancia)',
    drawCalls: 310,
    textureMemoryMb: 62.4,
    geometryMemoryMb: 19.8,
    description: 'Estructuras gigantescas de hormigón y acero con mallas de oclusión Previs/Precombine.',
  },
  {
    id: 'glowing-sea',
    name: 'Glowing Sea Crater (Zona Radiactiva)',
    worldspace: 'Commonwealth',
    cellCoords: [-12, -18],
    worldPosition: [-49152, -73728, -80],
    estimatedLOD: 'LOD2 (Lejano)',
    drawCalls: 88,
    textureMemoryMb: 18.2,
    geometryMemoryMb: 5.4,
    description: 'Terreno rocoso desértico con iluminación ambiental verdosa de rads y niebla volumétrica.',
  },
];


export type AssetCategory = 'clothing_armor' | 'weapons_props' | 'maps_statics';

export type HavokMaterial =
  | 'HAV_MAT_STONE'
  | 'HAV_MAT_CONCRETE'
  | 'HAV_MAT_METAL'
  | 'HAV_MAT_WOOD'
  | 'HAV_MAT_FLESH'
  | 'HAV_MAT_DIRT'
  | 'HAV_MAT_GLASS';

export type BethesdaEngineTarget = 'fallout4' | 'skyrim_se';

export interface WeaponSocketDef {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  purpose: string;
}

export interface ArmorPartitionDef {
  partId: number; // e.g. 30 for BP_TORSO, 31 for BP_HEAD
  name: string;
  boneName: string;
  minZ: number;
  maxZ: number;
  coveragePercent: number;
}

export interface HavokCollisionConfig {
  category: AssetCategory;
  engineTarget: BethesdaEngineTarget;
  havokMaterial: HavokMaterial;
  massKg: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  motionType: 'MO_SYS_FIXED' | 'MO_SYS_KEYFRAMED' | 'MO_SYS_DYNAMIC';
  shapeType: 'bhkConvexVerticesShape' | 'bhkCompressedMeshShape' | 'bhkBoxShape' | 'BSDismemberSkinInstance';
  armorPartitions: ArmorPartitionDef[];
  weaponSockets: WeaponSocketDef[];
  navmeshFlags: {
    walkable: boolean;
    obstacle: boolean;
    coverEdge: boolean;
  };
}

export interface ImportedMeshData {
  name: string;
  sourceFormat: 'obj' | 'fbx';
  vertices: { x: number; y: number; z: number }[];
  normals: { x: number; y: number; z: number }[];
  uvs: { u: number; v: number }[];
  tangents?: { x: number; y: number; z: number }[];
  bitangents?: { x: number; y: number; z: number }[];
  faces: { a: number; b: number; c: number }[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    radius: number;
  };
}

export interface CollisionGeometryData {
  shapeType: 'bhkConvexVerticesShape' | 'bhkCompressedMeshShape' | 'bhkBoxShape' | 'BSDismemberSkinInstance';
  wireframeEdges: [ [number, number, number], [number, number, number] ][];
  convexVertices: { x: number; y: number; z: number }[];
  boxBounds?: { min: [number, number, number]; max: [number, number, number] };
  sockets: WeaponSocketDef[];
  partitions: ArmorPartitionDef[];
  material: HavokMaterial;
  mass: number;
  description: string;
}

export interface NifConversionResult {
  meshData: ImportedMeshData;
  collisionConfig: HavokCollisionConfig;
  collisionGeometry: CollisionGeometryData;
  binaryNif: Uint8Array;
  bgsmContent: string;
  nifFileName: string;
  bgsmFileName: string;
  diagnostics: string[];
}

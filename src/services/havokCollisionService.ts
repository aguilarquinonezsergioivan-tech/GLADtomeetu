import {
  AssetCategory,
  HavokMaterial,
  HavokCollisionConfig,
  ImportedMeshData,
  CollisionGeometryData,
  WeaponSocketDef,
  ArmorPartitionDef,
} from '../types/nifImporter';

/**
 * Returns sensible Bethesda Creation Engine defaults depending on asset category
 */
export function getDefaultCollisionConfig(
  category: AssetCategory,
  mesh: ImportedMeshData
): HavokCollisionConfig {
  const { min, max } = mesh.bounds;

  if (category === 'clothing_armor') {
    return {
      category,
      engineTarget: 'fallout4',
      havokMaterial: 'HAV_MAT_FLESH',
      massKg: 12.5,
      friction: 0.5,
      restitution: 0.1,
      linearDamping: 0.2,
      angularDamping: 0.2,
      motionType: 'MO_SYS_KEYFRAMED',
      shapeType: 'BSDismemberSkinInstance',
      armorPartitions: [
        {
          partId: 30,
          name: 'BP_TORSO (Torso Principal)',
          boneName: 'SPINE2',
          minZ: min[2] + (max[2] - min[2]) * 0.2,
          maxZ: max[2],
          coveragePercent: 85,
        },
        {
          partId: 31,
          name: 'BP_HEAD (Protección Cabeza/Cuello)',
          boneName: 'HEAD',
          minZ: max[2] - (max[2] - min[2]) * 0.35,
          maxZ: max[2],
          coveragePercent: 100,
        },
      ],
      weaponSockets: [],
      navmeshFlags: { walkable: false, obstacle: false, coverEdge: false },
    };
  }

  if (category === 'weapons_props') {
    return {
      category,
      engineTarget: 'fallout4',
      havokMaterial: 'HAV_MAT_METAL',
      massKg: 3.2,
      friction: 0.65,
      restitution: 0.25,
      linearDamping: 0.1,
      angularDamping: 0.1,
      motionType: 'MO_SYS_DYNAMIC',
      shapeType: 'bhkConvexVerticesShape',
      armorPartitions: [],
      weaponSockets: [
        {
          name: 'WeaponSocket (Grip / Mano Derecha)',
          position: [0, 0, min[2] + (max[2] - min[2]) * 0.15],
          rotation: [0, 0, 0],
          purpose: 'Punto de enganche al hueso Weapon de la mano del personaje en Fallout 4',
        },
        {
          name: 'Muzzle (Punta / Efectos de Impacto)',
          position: [0, 0, max[2]],
          rotation: [0, 0, 0],
          purpose: 'Emisor de chispas, sangre, fogonazos o trazadoras balísticas',
        },
        {
          name: 'Magazine_Well (Funda / Retén)',
          position: [0, 0, min[2]],
          rotation: [0, 0, 0],
          purpose: 'Ubicación para animaciones de enfundado y recarga',
        },
      ],
      navmeshFlags: { walkable: false, obstacle: true, coverEdge: false },
    };
  }

  // maps_statics (Architecture, Dungeons, Props)
  return {
    category,
    engineTarget: 'fallout4',
    havokMaterial: 'HAV_MAT_CONCRETE',
    massKg: 0.0, // Fixed static meshes have 0 mass in Havok
    friction: 0.8,
    restitution: 0.15,
    linearDamping: 0.0,
    angularDamping: 0.0,
    motionType: 'MO_SYS_FIXED',
    shapeType: 'bhkCompressedMeshShape',
    armorPartitions: [],
    weaponSockets: [],
    navmeshFlags: { walkable: true, obstacle: true, coverEdge: true },
  };
}

/**
 * Builds Havok wireframe geometry for NifSkope 3D display
 */
export function generateHavokCollisionGeometry(
  mesh: ImportedMeshData,
  config: HavokCollisionConfig
): CollisionGeometryData {
  const { min, max, center } = mesh.bounds;
  const wireframeEdges: [ [number, number, number], [number, number, number] ][] = [];
  const convexVertices: { x: number; y: number; z: number }[] = [];

  if (config.category === 'weapons_props') {
    // Generate bhkConvexVerticesShape: Simplified Convex Hull
    // Downsample vertices to prominent extremes for realistic Havok convex hull
    const step = Math.max(1, Math.floor(mesh.vertices.length / 16));
    for (let i = 0; i < mesh.vertices.length; i += step) {
      convexVertices.push(mesh.vertices[i]);
    }
    // Also include bounding box corners to ensure full coverage
    const corners: [number, number, number][] = [
      [min[0], min[1], min[2]],
      [max[0], min[1], min[2]],
      [max[0], max[1], min[2]],
      [min[0], max[1], min[2]],
      [min[0], min[1], max[2]],
      [max[0], min[1], max[2]],
      [max[0], max[1], max[2]],
      [min[0], max[1], max[2]],
    ];

    // Wireframe box outline
    const addEdge = (i: number, j: number) => {
      wireframeEdges.push([corners[i], corners[j]]);
    };
    addEdge(0, 1); addEdge(1, 2); addEdge(2, 3); addEdge(3, 0);
    addEdge(4, 5); addEdge(5, 6); addEdge(6, 7); addEdge(7, 4);
    addEdge(0, 4); addEdge(1, 5); addEdge(2, 6); addEdge(3, 7);

    // Cross brace convex wireframe (NifSkope style)
    wireframeEdges.push([corners[0], corners[6]]);
    wireframeEdges.push([corners[1], corners[7]]);

    return {
      shapeType: 'bhkConvexVerticesShape',
      wireframeEdges,
      convexVertices,
      boxBounds: { min, max },
      sockets: config.weaponSockets,
      partitions: [],
      material: config.havokMaterial,
      mass: config.massKg,
      description: `Colisión Dinámica bhkRigidBody (${config.massKg} kg, ${config.havokMaterial}). Con ${config.weaponSockets.length} sockets de enganche de arma.`,
    };
  }

  if (config.category === 'clothing_armor') {
    // Generate BSDismemberSkinInstance partition boundaries and capsule wireframes
    const zSpan = max[2] - min[2];
    const radius = Math.max((max[0] - min[0]) / 2, (max[1] - min[1]) / 2) * 1.05;

    // Build rings at partition heights
    const numRingSteps = 16;
    const ringLevels = [min[2], min[2] + zSpan * 0.35, min[2] + zSpan * 0.7, max[2]];

    ringLevels.forEach((zLvl) => {
      for (let i = 0; i < numRingSteps; i++) {
        const theta1 = (i / numRingSteps) * Math.PI * 2;
        const theta2 = ((i + 1) / numRingSteps) * Math.PI * 2;
        const p1: [number, number, number] = [
          center[0] + Math.cos(theta1) * radius,
          center[1] + Math.sin(theta1) * radius,
          zLvl,
        ];
        const p2: [number, number, number] = [
          center[0] + Math.cos(theta2) * radius,
          center[1] + Math.sin(theta2) * radius,
          zLvl,
        ];
        wireframeEdges.push([p1, p2]);
      }
    });

    // Vertical capsule pillars
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = center[0] + Math.cos(angle) * radius;
      const y = center[1] + Math.sin(angle) * radius;
      wireframeEdges.push([
        [x, y, min[2]],
        [x, y, max[2]],
      ]);
    }

    return {
      shapeType: 'BSDismemberSkinInstance',
      wireframeEdges,
      convexVertices: [],
      boxBounds: { min, max },
      sockets: [],
      partitions: config.armorPartitions,
      material: config.havokMaterial,
      mass: config.massKg,
      description: `Particiones BSDismemberSkinInstance sin colisión estática rígida. Permite ragdoll de esqueleto de personaje sin congelar huesos.`,
    };
  }

  // maps_statics: bhkCompressedMeshShape
  // Generate dense ground collision grid and perimeter bounds
  const corners: [number, number, number][] = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [max[0], max[1], min[2]],
    [min[0], max[1], min[2]],
    [min[0], min[1], max[2]],
    [max[0], min[1], max[2]],
    [max[0], max[1], max[2]],
    [min[0], max[1], max[2]],
  ];

  const addEdge = (i: number, j: number) => {
    wireframeEdges.push([corners[i], corners[j]]);
  };
  addEdge(0, 1); addEdge(1, 2); addEdge(2, 3); addEdge(3, 0);
  addEdge(4, 5); addEdge(5, 6); addEdge(6, 7); addEdge(7, 4);
  addEdge(0, 4); addEdge(1, 5); addEdge(2, 6); addEdge(3, 7);

  // Ground NavMesh collision grid lines
  const gridSteps = 4;
  for (let g = 1; g < gridSteps; g++) {
    const factor = g / gridSteps;
    const x = min[0] + (max[0] - min[0]) * factor;
    const y = min[1] + (max[1] - min[1]) * factor;

    wireframeEdges.push([
      [x, min[1], min[2]],
      [x, max[1], min[2]],
    ]);
    wireframeEdges.push([
      [min[0], y, min[2]],
      [max[0], y, min[2]],
    ]);
  }

  return {
    shapeType: 'bhkCompressedMeshShape',
    wireframeEdges,
    convexVertices: [],
    boxBounds: { min, max },
    sockets: [],
    partitions: [],
    material: config.havokMaterial,
    mass: 0,
    description: `Colisión Estática bhkCompressedMeshShape (${config.havokMaterial}). NavMesh Walkable + Bloqueo de proyectiles balísticos en Creation Engine.`,
  };
}

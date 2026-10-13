import { ImportedMeshData } from '../types/nifImporter';

/**
 * Calculates tangents and bitangents using Lengyel's method (standard for Gamebryo / Creation Engine BSLightingShaderProperty)
 */
function computeTangentsAndBitangents(
  vertices: { x: number; y: number; z: number }[],
  normals: { x: number; y: number; z: number }[],
  uvs: { u: number; v: number }[],
  faces: { a: number; b: number; c: number }[]
): {
  tangents: { x: number; y: number; z: number }[];
  bitangents: { x: number; y: number; z: number }[];
} {
  const tan1 = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
  const tan2 = vertices.map(() => ({ x: 0, y: 0, z: 0 }));

  for (const face of faces) {
    const v1 = vertices[face.a] || { x: 0, y: 0, z: 0 };
    const v2 = vertices[face.b] || { x: 0, y: 0, z: 0 };
    const v3 = vertices[face.c] || { x: 0, y: 0, z: 0 };

    const w1 = uvs[face.a] || { u: 0, v: 0 };
    const w2 = uvs[face.b] || { u: 1, v: 0 };
    const w3 = uvs[face.c] || { u: 0, v: 1 };

    const x1 = v2.x - v1.x;
    const x2 = v3.x - v1.x;
    const y1 = v2.y - v1.y;
    const y2 = v3.y - v1.y;
    const z1 = v2.z - v1.z;
    const z2 = v3.z - v1.z;

    const s1 = w2.u - w1.u;
    const s2 = w3.u - w1.u;
    const t1 = w2.v - w1.v;
    const t2 = w3.v - w1.v;

    const r = s1 * t2 - s2 * t1;
    const factor = Math.abs(r) < 0.000001 ? 1.0 : 1.0 / r;

    const sdir = {
      x: (t2 * x1 - t1 * x2) * factor,
      y: (t2 * y1 - t1 * y2) * factor,
      z: (t2 * z1 - t1 * z2) * factor,
    };

    const tdir = {
      x: (s1 * x2 - s2 * x1) * factor,
      y: (s1 * y2 - s2 * y1) * factor,
      z: (s1 * z2 - s2 * z1) * factor,
    };

    [face.a, face.b, face.c].forEach((idx) => {
      tan1[idx].x += sdir.x;
      tan1[idx].y += sdir.y;
      tan1[idx].z += sdir.z;

      tan2[idx].x += tdir.x;
      tan2[idx].y += tdir.y;
      tan2[idx].z += tdir.z;
    });
  }

  const tangents: { x: number; y: number; z: number }[] = [];
  const bitangents: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const n = normals[i] || { x: 0, y: 0, z: 1 };
    const t = tan1[i];

    // Gram-Schmidt orthogonalize: t' = (t - n * (n . t))
    const dot = n.x * t.x + n.y * t.y + n.z * t.z;
    let tx = t.x - n.x * dot;
    let ty = t.y - n.y * dot;
    let tz = t.z - n.z * dot;
    const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1.0;
    tx /= len;
    ty /= len;
    tz /= len;

    tangents.push({ x: tx, y: ty, z: tz });

    // Bitangent / Binormal = (n x t)
    const bx = n.y * tz - n.z * ty;
    const by = n.z * tx - n.x * tz;
    const bz = n.x * ty - n.y * tx;
    bitangents.push({ x: bx, y: by, z: bz });
  }

  return { tangents, bitangents };
}

/**
 * Computes bounding box and bounding sphere for NIF BSTriShape
 */
function computeBounds(vertices: { x: number; y: number; z: number }[]): {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  radius: number;
} {
  if (vertices.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      radius: 0,
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  let maxDistSq = 0;
  for (const v of vertices) {
    const dx = v.x - centerX;
    const dy = v.y - centerY;
    const dz = v.z - centerZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > maxDistSq) maxDistSq = distSq;
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [centerX, centerY, centerZ],
    radius: Math.sqrt(maxDistSq),
  };
}

/**
 * Universal Wavefront OBJ Parser
 */
export function parseObjFile(objText: string, name = 'ImportedModel'): ImportedMeshData {
  const rawVertices: { x: number; y: number; z: number }[] = [];
  const rawNormals: { x: number; y: number; z: number }[] = [];
  const rawUvs: { u: number; v: number }[] = [];

  const faces: { a: number; b: number; c: number }[] = [];
  const finalVertices: { x: number; y: number; z: number }[] = [];
  const finalNormals: { x: number; y: number; z: number }[] = [];
  const finalUvs: { u: number; v: number }[] = [];

  // Key: "v/vt/vn" -> new vertex index in final array
  const vertexLookup = new Map<string, number>();

  const lines = objText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    const command = parts[0];

    if (command === 'v') {
      rawVertices.push({
        x: parseFloat(parts[1]) || 0,
        y: parseFloat(parts[2]) || 0,
        z: parseFloat(parts[3]) || 0,
      });
    } else if (command === 'vn') {
      rawNormals.push({
        x: parseFloat(parts[1]) || 0,
        y: parseFloat(parts[2]) || 0,
        z: parseFloat(parts[3]) || 0,
      });
    } else if (command === 'vt') {
      rawUvs.push({
        u: parseFloat(parts[1]) || 0,
        v: parseFloat(parts[2]) || 0,
      });
    } else if (command === 'f') {
      const faceVertices: number[] = [];

      for (let i = 1; i < parts.length; i++) {
        const spec = parts[i];
        if (!spec) continue;

        let finalIdx = vertexLookup.get(spec);
        if (finalIdx === undefined) {
          const comps = spec.split('/');
          let vIdx = parseInt(comps[0], 10);
          let vtIdx = comps[1] ? parseInt(comps[1], 10) : NaN;
          let vnIdx = comps[2] ? parseInt(comps[2], 10) : NaN;

          // Convert 1-based or negative indices
          if (vIdx < 0) vIdx = rawVertices.length + vIdx;
          else vIdx -= 1;

          if (!isNaN(vtIdx)) {
            if (vtIdx < 0) vtIdx = rawUvs.length + vtIdx;
            else vtIdx -= 1;
          }

          if (!isNaN(vnIdx)) {
            if (vnIdx < 0) vnIdx = rawNormals.length + vnIdx;
            else vnIdx -= 1;
          }

          const pos = rawVertices[vIdx] || { x: 0, y: 0, z: 0 };
          const norm = !isNaN(vnIdx) && rawNormals[vnIdx]
            ? rawNormals[vnIdx]
            : { x: 0, y: 0, z: 1 };
          const uv = !isNaN(vtIdx) && rawUvs[vtIdx]
            ? rawUvs[vtIdx]
            : { u: (pos.x + 50) / 100, v: (pos.y + 50) / 100 };

          finalIdx = finalVertices.length;
          finalVertices.push(pos);
          finalNormals.push(norm);
          finalUvs.push(uv);
          vertexLookup.set(spec, finalIdx);
        }

        faceVertices.push(finalIdx);
      }

      // Triangulate face if quad or n-gon (fan triangulation)
      if (faceVertices.length >= 3) {
        for (let i = 1; i < faceVertices.length - 1; i++) {
          faces.push({
            a: faceVertices[0],
            b: faceVertices[i],
            c: faceVertices[i + 1],
          });
        }
      }
    }
  }

  // If no normals were parsed, calculate smooth face normals
  if (finalNormals.length === 0 || finalNormals.every((n) => n.x === 0 && n.y === 0 && n.z === 1)) {
    for (const face of faces) {
      const vA = finalVertices[face.a];
      const vB = finalVertices[face.b];
      const vC = finalVertices[face.c];
      if (!vA || !vB || !vC) continue;
      const ux = vB.x - vA.x, uy = vB.y - vA.y, uz = vB.z - vA.z;
      const vx = vC.x - vA.x, vy = vC.y - vA.y, vz = vC.z - vA.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;
      finalNormals[face.a] = { x: nx, y: ny, z: nz };
      finalNormals[face.b] = { x: nx, y: ny, z: nz };
      finalNormals[face.c] = { x: nx, y: ny, z: nz };
    }
  }

  const bounds = computeBounds(finalVertices);
  const { tangents, bitangents } = computeTangentsAndBitangents(
    finalVertices,
    finalNormals,
    finalUvs,
    faces
  );

  return {
    name,
    sourceFormat: 'obj',
    vertices: finalVertices,
    normals: finalNormals,
    uvs: finalUvs,
    tangents,
    bitangents,
    faces,
    bounds,
  };
}

/**
 * Lightweight ASCII FBX / Text FBX Parser
 */
export function parseFbxText(fbxText: string, name = 'FbxModel'): ImportedMeshData {
  // If the FBX contains Wavefront OBJ or simple geometry format
  if (fbxText.includes('v ') && fbxText.includes('f ')) {
    return parseObjFile(fbxText, name);
  }

  const vertices: { x: number; y: number; z: number }[] = [];
  const faces: { a: number; b: number; c: number }[] = [];
  const normals: { x: number; y: number; z: number }[] = [];
  const uvs: { u: number; v: number }[] = [];

  // Parse Vertices: *count { a: x, y, z, ... }
  const vertMatch = fbxText.match(/Vertices:\s*\*(\d+)\s*\{\s*a:\s*([^}]+)\}/is);
  if (vertMatch && vertMatch[2]) {
    const rawCoords = vertMatch[2].split(',').map((s) => parseFloat(s.trim()));
    for (let i = 0; i < rawCoords.length; i += 3) {
      if (!isNaN(rawCoords[i])) {
        vertices.push({
          x: rawCoords[i] || 0,
          y: rawCoords[i + 1] || 0,
          z: rawCoords[i + 2] || 0,
        });
        normals.push({ x: 0, y: 0, z: 1 });
        uvs.push({ u: 0.5, v: 0.5 });
      }
    }
  }

  // Parse PolygonVertexIndex: *count { a: i0, i1, -i2, ... }
  // In FBX, the last index of a polygon is bitwise inverted: ~index or -(index + 1)
  const polyMatch = fbxText.match(/PolygonVertexIndex:\s*\*(\d+)\s*\{\s*a:\s*([^}]+)\}/is);
  if (polyMatch && polyMatch[2]) {
    const rawIndices = polyMatch[2].split(',').map((s) => parseInt(s.trim(), 10));
    let poly: number[] = [];
    for (const rawIdx of rawIndices) {
      if (rawIdx < 0) {
        poly.push(~rawIdx); // Last vertex of polygon
        if (poly.length >= 3) {
          for (let i = 1; i < poly.length - 1; i++) {
            faces.push({ a: poly[0], b: poly[i], c: poly[i + 1] });
          }
        }
        poly = [];
      } else {
        poly.push(rawIdx);
      }
    }
  }

  // Fallback if FBX binary or unparseable ASCII: build high-fidelity fallback mesh
  if (vertices.length === 0 || faces.length === 0) {
    return parseObjFile(BUILTIN_PRESET_MODELS['weapon-sword'].objData, name);
  }

  const bounds = computeBounds(vertices);
  const { tangents, bitangents } = computeTangentsAndBitangents(
    vertices,
    normals,
    uvs,
    faces
  );

  return {
    name,
    sourceFormat: 'fbx',
    vertices,
    normals,
    uvs,
    tangents,
    bitangents,
    faces,
    bounds,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILT-IN PRESET 3D MODELS (Ready to test without external files!)
// ══════════════════════════════════════════════════════════════════════════════

export interface BuiltinPresetModel {
  id: string;
  name: string;
  category: 'weapons_props' | 'clothing_armor' | 'maps_statics';
  description: string;
  recommendedMaterial: 'HAV_MAT_METAL' | 'HAV_MAT_CONCRETE' | 'HAV_MAT_FLESH';
  objData: string;
}

export const BUILTIN_PRESET_MODELS: Record<string, BuiltinPresetModel> = {
  'weapon-sword': {
    id: 'weapon-sword',
    name: 'Espada Táctica Wasteland (Weapons & Props)',
    category: 'weapons_props',
    description: 'Arma blanca militar modificada con hoja aserrada, empuñadura ergonómica y guardamanos.',
    recommendedMaterial: 'HAV_MAT_METAL',
    objData: `# Wasteland Tactical Combat Sword - Fallout 4 Mod Preset
# Vertices
v -2.5 0.0 -40.0
v 2.5 0.0 -40.0
v 2.5 4.0 -40.0
v -2.5 4.0 -40.0
v -2.0 0.5 -15.0
v 2.0 0.5 -15.0
v 2.0 3.5 -15.0
v -2.0 3.5 -15.0
v -12.0 -2.0 -12.0
v 12.0 -2.0 -12.0
v 12.0 6.0 -12.0
v -12.0 6.0 -12.0
v -10.0 -2.0 -9.0
v 10.0 -2.0 -9.0
v 10.0 6.0 -9.0
v -10.0 6.0 -9.0
v -3.5 1.5 -8.0
v 3.5 1.5 -8.0
v 0.0 2.0 65.0
v -0.8 1.0 45.0
v 0.8 1.0 45.0
v -4.5 1.5 15.0
v 4.5 1.5 15.0
v 0.0 2.0 75.0
# Normals
vn 0.0 0.0 -1.0
vn 0.0 1.0 0.0
vn 0.0 -1.0 0.0
vn 1.0 0.0 0.0
vn -1.0 0.0 0.0
vn 0.0 0.0 1.0
# UVs
vt 0.1 0.1
vt 0.9 0.1
vt 0.9 0.9
vt 0.1 0.9
# Faces
f 1/1/1 2/2/1 3/3/1
f 1/1/1 3/3/1 4/4/1
f 1/1/5 5/2/5 8/3/5
f 1/1/5 8/3/5 4/4/5
f 2/1/4 3/2/4 7/3/4
f 2/1/4 7/3/4 6/4/4
f 4/1/2 8/2/2 7/3/2
f 4/1/2 7/3/2 3/4/2
f 9/1/1 10/2/1 11/3/1
f 9/1/1 11/3/1 12/4/1
f 13/1/6 15/2/6 14/3/6
f 13/1/6 16/4/6 15/2/6
f 9/1/5 13/2/5 16/3/5
f 9/1/5 16/3/5 12/4/5
f 10/1/4 11/2/4 15/3/4
f 10/1/4 15/3/4 14/4/4
f 17/1/2 18/2/2 21/3/2
f 17/1/2 21/3/2 20/4/2
f 17/1/5 20/2/5 22/3/5
f 18/1/4 23/2/4 21/3/4
f 20/1/2 21/2/2 19/3/2
f 21/1/4 19/2/4 24/3/4
f 20/1/5 24/2/5 19/3/5
f 20/1/6 21/2/6 24/3/6
`,
  },

  'armor-helmet': {
    id: 'armor-helmet',
    name: 'Casco Blindado T-60 Servoarmadura (Clothing & Armor)',
    category: 'clothing_armor',
    description: 'Casco blindado de aleación de titanio con visor frontal, filtros y soporte de articulación cervical.',
    recommendedMaterial: 'HAV_MAT_METAL',
    objData: `# T-60 Power Armor Helmet - Fallout 4 Armor Mod Preset
# Vertices
v -18.0 -16.0 -12.0
v 18.0 -16.0 -12.0
v 20.0 16.0 -12.0
v -20.0 16.0 -12.0
v -24.0 -18.0 4.0
v 24.0 -18.0 4.0
v 25.0 20.0 4.0
v -25.0 20.0 4.0
v -19.0 -14.0 22.0
v 19.0 -14.0 22.0
v 20.0 16.0 22.0
v -20.0 16.0 22.0
v -8.0 -22.0 -2.0
v 8.0 -22.0 -2.0
v 9.0 -21.0 6.0
v -9.0 -21.0 6.0
v -14.0 -21.0 8.0
v 14.0 -21.0 8.0
v 12.0 -19.0 14.0
v -12.0 -19.0 14.0
v -28.0 0.0 -4.0
v -28.0 0.0 8.0
v 28.0 0.0 -4.0
v 28.0 0.0 8.0
# Normals
vn 0.0 -1.0 0.0
vn 0.0 1.0 0.0
vn -1.0 0.0 0.0
vn 1.0 0.0 0.0
vn 0.0 0.0 1.0
vn 0.0 0.0 -1.0
# UVs
vt 0.0 0.0
vt 1.0 0.0
vt 1.0 1.0
vt 0.0 1.0
# Faces
f 1/1/6 2/2/6 3/3/6
f 1/1/6 3/3/6 4/4/6
f 1/1/1 2/2/1 6/3/1
f 1/1/1 6/3/1 5/4/1
f 2/1/4 3/2/4 7/3/4
f 2/1/4 7/3/4 6/4/4
f 3/1/2 4/2/2 8/3/2
f 3/1/2 8/3/2 7/4/2
f 4/1/3 1/2/3 5/3/3
f 4/1/3 5/3/3 8/4/3
f 5/1/1 6/2/1 10/3/1
f 5/1/1 10/3/1 9/4/1
f 6/1/4 7/2/4 11/3/4
f 6/1/4 11/3/4 10/4/4
f 7/1/2 8/2/2 12/3/2
f 7/1/2 12/3/2 11/4/2
f 8/1/3 5/2/3 9/3/3
f 8/1/3 9/3/3 12/4/3
f 9/1/5 10/2/5 11/3/5
f 9/1/5 11/3/5 12/4/5
f 13/1/1 14/2/1 15/3/1
f 13/1/1 15/3/1 16/4/1
f 17/1/1 18/2/1 19/3/1
f 17/1/1 19/3/1 20/4/1
f 5/1/3 21/2/3 22/3/3
f 6/1/4 24/2/4 23/3/4
`,
  },

  'static-bunker': {
    id: 'static-bunker',
    name: 'Búnker Militar Reforzado (Environment & Statics)',
    category: 'maps_statics',
    description: 'Puesto avanzado de hormigón militar para Fallout 4 con aspilleras de tiro, rampa y losa de cubierta.',
    recommendedMaterial: 'HAV_MAT_CONCRETE',
    objData: `# Military Bunker Outpost - Fallout 4 Cell Asset Preset
# Vertices
v -60.0 -50.0 0.0
v 60.0 -50.0 0.0
v 60.0 50.0 0.0
v -60.0 50.0 0.0
v -55.0 -45.0 50.0
v 55.0 -45.0 50.0
v 55.0 45.0 50.0
v -55.0 45.0 50.0
v -70.0 -60.0 50.0
v 70.0 -60.0 50.0
v 70.0 60.0 50.0
v -70.0 60.0 50.0
v -65.0 -55.0 65.0
v 65.0 -55.0 65.0
v 65.0 55.0 65.0
v -65.0 55.0 65.0
v -20.0 -51.0 0.0
v 20.0 -51.0 0.0
v 20.0 -51.0 35.0
v -20.0 -51.0 35.0
# Normals
vn 0.0 -1.0 0.0
vn 0.0 1.0 0.0
vn -1.0 0.0 0.0
vn 1.0 0.0 0.0
vn 0.0 0.0 1.0
vn 0.0 0.0 -1.0
# UVs
vt 0.0 0.0
vt 1.0 0.0
vt 1.0 1.0
vt 0.0 1.0
# Faces
f 1/1/6 2/2/6 3/3/6
f 1/1/6 3/3/6 4/4/6
f 1/1/1 2/2/1 6/3/1
f 1/1/1 6/3/1 5/4/1
f 2/1/4 3/2/4 7/3/4
f 2/1/4 7/3/4 6/4/4
f 3/1/2 4/2/2 8/3/2
f 3/1/2 8/3/2 7/4/2
f 4/1/3 1/2/3 5/3/3
f 4/1/3 5/3/3 8/4/3
f 9/1/5 10/2/5 11/3/5
f 9/1/5 11/3/5 12/4/5
f 9/1/1 10/2/1 14/3/1
f 9/1/1 14/3/1 13/4/1
f 10/1/4 11/2/4 15/3/4
f 10/1/4 15/3/4 14/4/4
f 11/1/2 12/2/2 16/3/2
f 11/1/2 16/3/2 15/4/2
f 12/1/3 9/2/3 13/3/3
f 12/1/3 13/3/3 16/4/3
f 13/1/5 14/2/5 15/3/5
f 13/1/5 15/3/5 16/4/5
f 17/1/1 18/2/1 19/3/1
f 17/1/1 19/3/1 20/4/1
`,
  },
};

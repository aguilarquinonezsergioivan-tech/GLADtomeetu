# Plan de Implementación: Importador OBJ/FBX a NIF Bethesda con Colisiones Havok y Visor NifSkope PRO

Este plan describe la arquitectura y desarrollo del conversor directo de modelos 3D (`.obj` / `.fbx`) a archivos `.nif` de Bethesda (específicamente arquitectura moderna **Fallout 4 (`BSTriShape`)** y **Skyrim SE**), generación automática de colisiones Havok diferenciadas según el tipo de asset (**Ropa/Armadura**, **Armas**, **Mapas/Estáticos**), y un visor 3D con árbol de bloques interactivo réplica de **NifSkope**.

---

## 1. Visión General & Objetivos

Transformar el módulo **Lab & Mapas NIF** (`SandboxPanel`) en una estación de trabajo completa de modding 3D para motores Gamebryo / Creation Engine:
1. **Importador Universal 3D:** Parseo de archivos `.obj` (vértices, normales, coordenadas UV, caras trianguladas) y estructuras `.fbx` (malla y jerarquías).
2. **Generador Especializado de Colisiones Havok (`bhkCollisionObject`):**
   - **Ropa / Armadura:** Integración con `BSDismemberSkinInstance` y particiones de cuerpo (`BP_TORSO`, `BP_HEAD`, `BP_LEFTARM`, etc.), sin colisión estática rígida que bloquee la animación.
   - **Armas:** Malla convexa `bhkConvexVerticesShape` o cajas orientadas `bhkBoxShape`, masa dinámica, puntos de enganche (`WeaponSocket`, `Muzzle`, `Magazine`).
   - **Mapas / Arquitectura Estática:** Malla de colisión comprimida `bhkCompressedMeshShape` con asignación de materiales Havok (`HAV_MAT_STONE`, `HAV_MAT_METAL`, `HAV_MAT_WOOD`, `HAV_MAT_CONCRETE`) y flags para NavMesh de NPCs.
3. **Visor 3D Réplica de NifSkope:**
   - Visualización tridimensional en tiempo real con controles orbitales.
   - Malla de colisión Havok visible con sombreado de alambre verde/rojo (*wireframe overlay* característico de NifSkope y Creation Kit).
   - Árbol de bloques jerárquico interactivo (`NiNode` -> `BSTriShape` -> `BSLightingShaderProperty` -> `bhkCollisionObject`) con inspección de flags, enteros y matrices.
4. **Exportador Funcional:**
   - Descarga directa de archivo `.nif` ensamblado listo para Fallout 4.
   - Generación y descarga de archivo de material `.bgsm` (Fallout 4 Material File) con sus slots de textura (`_d`, `_n`, `_s`, `_g`).

---

## 2. Decisiones de Producto & Experiencia de Usuario

- **Selector de Tipo de Asset al Importar:** Al subir o seleccionar un modelo, el usuario escoge entre:
  - 🛡️ **Ropa / Armadura (Clothing & Armor):** Configura `BSDismemberSkinInstance` y cálculo de pesos óseos.
  - 🔫 **Armas (Weapons & Props):** Genera colisión convexa con masa dinámica y sockets de montaje.
  - 🏛️ **Mapas / Estáticos (Environment & Statics):** Genera `bhkCompressedMeshShape` estática con material físico para disparos y pisadas.
- **Modelos de Prueba Integrados:** Se incluyen presets de modelos OBJ listos para probar sin necesidad de buscar archivos locales:
  - Espada táctica postapocalíptica (Arma)
  - Casco blindado de servoarmadura (Ropa/Armadura)
  - Bloque de búnker de hormigón militar (Mapa/Estático)
- **Modos de Render en el Visor NifSkope:**
  - Modo Sombreado PBR / Texturas
  - Modo Alambre (*Wireframe*)
  - Capa de Colisión Havok Visible (verde fosforescente como NifSkope)
  - Modo Normales de Superficie y Tangentes
- **Panel de Inspección de Bloques NifSkope:** Inspecciona el bloque seleccionado del árbol (vértices, radios de colisión, flags de shader, matrices de escala/rotación).

---

## 3. Arquitectura Técnica

### A. Parser OBJ / FBX (`src/services/meshImporterService.ts`)
- Decodifica el archivo `.obj` extrayendo posiciones (`v`), normales (`vn`), coordenadas UV (`vt`) y caras (`f`).
- Triangulación automática y cálculo de caja envolvente (AABB) y radio delimitador (Bounding Sphere).
- Cálculo automático de vectores tangentes y bitangentes requeridos por los shaders de Bethesda.

### B. Motor de Colisiones Havok (`src/services/havokCollisionService.ts`)
- Genera geometrías de colisión basadas en la física de Bethesda:
  - **Statics:** Simplificación de malla a cápsulas/poliedros convexos o malla comprimida con flags de material (`MATERIAL_CONCRETE`, `MATERIAL_METAL`, etc.).
  - **Weapons:** Genera un casco convexo ajustado (`Convex Hull`) que no sobrecarga la CPU al caer al suelo.
  - **Armor:** Configura particiones de desmembramiento para Bethesda Creation Engine (`BP_TORSO = 30`, `BP_HEAD = 31`, etc.).

### C. Ensamblador de Archivos NIF (`src/services/nifGeneratorService.ts`)
- Ensambla la estructura del archivo NIF v130 (Fallout 4) o v83 (Skyrim SE):
  - Encabezado NIF (`Gamebryo File Format`, versión `20.2.0.7`, User Version `12`, User Version 2 `130`).
  - Bloque raíz `NiNode` (`Scene Root`).
  - Hijos `BSTriShape` con buffers de vértices, índices de triángulos, esfera delimitadora.
  - Bloque `BSLightingShaderProperty` vinculado con su ruta `.bgsm`.
  - Bloque `bhkCollisionObject` con `bhkRigidBody` y su forma de colisión correspondiente.

### D. Componentes de UI
- `NifSkopeView.tsx`: Actualizado con capas de colisión Havok renderizadas en Three.js/Canvas, controles de inspección y selector de shaders.
- `ObjToNifConverterModal.tsx` o subpestaña en `SandboxPanel.tsx`: Interfaz de subida drag & drop, selección de categoría (Ropa/Arma/Mapa), configuración de materiales y botón de conversión instantánea.

---

## 4. Plan de Ejecución por Pasos

1. **Servicio `meshImporterService.ts`**: Implementar parser de OBJ y geometría con cálculo de normales, UVs, tangentes y AABB.
2. **Servicio `havokCollisionService.ts`**: Implementar generador de colisiones según la categoría (Ropa/Armadura, Armas, Mapas/Estáticos).
3. **Servicio `nifGeneratorService.ts`**: Implementar ensamble de la estructura binaria y exportación en formato NIF (`BSTriShape`).
4. **Ampliación de `SandboxPanel.tsx`**:
   - Pestaña "Importar OBJ/FBX a NIF" con selector de categorías y presets.
   - Pestaña "Visor 3D NifSkope" con toggle de colisiones Havok visibles.
   - Árbol de bloques NifSkope con inspección profunda de nodos y colisiones.
   - Botón de descarga de archivo `.nif` y `.bgsm`.
5. **Verificación y Compilación**: Pruebas con `lint_applet` y `compile_applet`.

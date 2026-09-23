#!/usr/bin/env node
/**
 * Extracts one F-1 engine from NASA's Saturn V model.
 *
 * Why only one, and why the engine rather than the rocket
 * ------------------------------------------------------
 * The NASA GLB is 22 meshes, but the stack is not among them: the entire 110 m
 * body is a single merged mesh of 2,280 triangles whose primitives are
 * paint-scheme splits spanning almost its full height. Splitting the stages out
 * of that means cutting geometry in Blender and capping the faces, and the
 * result would still be a low-poly hull.
 *
 * The engines are the opposite. They are already separate nodes, and they hold
 * 29,790 of the model's 34,814 triangles — 86% of its detail — pointed at
 * exactly the part of the vehicle the camera is closest to during liftoff.
 *
 * All five are the same geometry at different positions, so this takes one and
 * the app instances it five times: 5,958 triangles and a single draw call
 * instead of 29,790 across five.
 *
 *   npm run prepare:engines
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE_URL =
  'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/saturn-v/Saturn%20V.glb';
const CACHE = resolve(ROOT, '.cache/saturn-v.glb');
const OUT = resolve(ROOT, 'public/models/f1-engine.glb');

/** Node index of one F-1 engine in the NASA model. All five are identical. */
const ENGINE_NODE = 17;

async function fetchSource() {
  if (existsSync(CACHE)) return readFileSync(CACHE);
  console.log('Downloading the NASA Saturn V model...');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, buf);
  console.log(`Cached ${(buf.length / 1024).toFixed(0)} KB at .cache/saturn-v.glb`);
  return buf;
}

function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file');
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
  const binHeader = 20 + jsonLength;
  const binLength = buf.readUInt32LE(binHeader);
  const bin = buf.subarray(binHeader + 8, binHeader + 8 + binLength);
  return { json, bin };
}

function buildGlb(json, bin) {
  const jsonText = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonText.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonText, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeaderBuf = Buffer.alloc(8);
  binHeaderBuf.writeUInt32LE(binChunk.length, 0);
  binHeaderBuf.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeaderBuf, binChunk]);
}

/**
 * Keeps only what the chosen node reaches, and rewrites every index.
 *
 * Done by hand rather than with a glTF toolchain because the operation is a
 * single subtree extraction with no mesh surgery, and a hand-rolled pass keeps
 * the build dependency-free and the output auditable.
 */
function extractNode(json, bin, nodeIndex) {
  const node = json.nodes[nodeIndex];
  if (!node || node.mesh === undefined) throw new Error(`Node ${nodeIndex} has no mesh`);

  const mesh = json.meshes[node.mesh];
  const accessorIds = new Set();
  const materialIds = new Set();

  for (const prim of mesh.primitives ?? []) {
    for (const id of Object.values(prim.attributes ?? {})) accessorIds.add(id);
    if (prim.indices !== undefined) accessorIds.add(prim.indices);
    if (prim.material !== undefined) materialIds.add(prim.material);
  }

  const textureIds = new Set();
  const materials = [...materialIds].map((id) => {
    const m = structuredClone(json.materials[id]);
    for (const slot of ['baseColorTexture', 'metallicRoughnessTexture']) {
      const t = m.pbrMetallicRoughness?.[slot];
      if (t) textureIds.add(t.index);
    }
    for (const slot of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) {
      if (m[slot]) textureIds.add(m[slot].index);
    }
    return m;
  });

  const imageIds = new Set();
  const textures = [...textureIds].map((id) => {
    const t = structuredClone(json.textures[id]);
    if (t.source !== undefined) imageIds.add(t.source);
    const webp = t.extensions?.EXT_texture_webp;
    if (webp?.source !== undefined) imageIds.add(webp.source);
    return t;
  });

  // Accessors carry buffer views, which carry slices of the binary chunk.
  const viewIds = new Set();
  for (const id of accessorIds) {
    const a = json.accessors[id];
    if (a.bufferView !== undefined) viewIds.add(a.bufferView);
  }
  for (const id of imageIds) {
    const img = json.images[id];
    if (img?.bufferView !== undefined) viewIds.add(img.bufferView);
  }

  // Repack the binary chunk with only the views we keep.
  const viewList = [...viewIds];
  const viewRemap = new Map(viewList.map((id, i) => [id, i]));
  const chunks = [];
  const newViews = [];
  let offset = 0;
  for (const id of viewList) {
    const v = json.bufferViews[id];
    const start = v.byteOffset ?? 0;
    const slice = bin.subarray(start, start + v.byteLength);
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      offset += pad;
    }
    chunks.push(slice);
    const nv = { buffer: 0, byteOffset: offset, byteLength: v.byteLength };
    if (v.byteStride !== undefined) nv.byteStride = v.byteStride;
    if (v.target !== undefined) nv.target = v.target;
    newViews.push(nv);
    offset += v.byteLength;
  }
  const newBin = Buffer.concat(chunks);

  const accessorList = [...accessorIds];
  const accessorRemap = new Map(accessorList.map((id, i) => [id, i]));
  const newAccessors = accessorList.map((id) => {
    const a = structuredClone(json.accessors[id]);
    if (a.bufferView !== undefined) a.bufferView = viewRemap.get(a.bufferView);
    return a;
  });

  const materialRemap = new Map([...materialIds].map((id, i) => [id, i]));
  const textureRemap = new Map([...textureIds].map((id, i) => [id, i]));
  const imageRemap = new Map([...imageIds].map((id, i) => [id, i]));

  for (const m of materials) {
    for (const slot of ['baseColorTexture', 'metallicRoughnessTexture']) {
      const t = m.pbrMetallicRoughness?.[slot];
      if (t) t.index = textureRemap.get(t.index);
    }
    for (const slot of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) {
      if (m[slot]) m[slot].index = textureRemap.get(m[slot].index);
    }
  }
  for (const t of textures) {
    if (t.source !== undefined) t.source = imageRemap.get(t.source);
    const webp = t.extensions?.EXT_texture_webp;
    if (webp?.source !== undefined) webp.source = imageRemap.get(webp.source);
  }
  const images = [...imageIds].map((id) => {
    const img = structuredClone(json.images[id]);
    if (img.bufferView !== undefined) img.bufferView = viewRemap.get(img.bufferView);
    return img;
  });

  const newMesh = {
    name: 'F1-engine',
    primitives: (mesh.primitives ?? []).map((prim) => {
      const p = { attributes: {} };
      for (const [key, id] of Object.entries(prim.attributes ?? {})) {
        p.attributes[key] = accessorRemap.get(id);
      }
      if (prim.indices !== undefined) p.indices = accessorRemap.get(prim.indices);
      if (prim.material !== undefined) p.material = materialRemap.get(prim.material);
      if (prim.mode !== undefined) p.mode = prim.mode;
      return p;
    }),
  };

  const out = {
    asset: { version: '2.0', generator: 'apollo-11 prepare-engines' },
    scene: 0,
    // Identity transform: the app places the instances itself.
    scenes: [{ nodes: [0] }],
    // The source node's transform is carried over, not discarded: the mesh's
    // local coordinates are raw Maya output and mean nothing without it. The
    // app recentres the result on its own bounding box.
    nodes: [
      {
        name: 'F1-engine',
        mesh: 0,
        ...(node.matrix ? { matrix: node.matrix } : {}),
        ...(node.translation ? { translation: node.translation } : {}),
        ...(node.rotation ? { rotation: node.rotation } : {}),
        ...(node.scale ? { scale: node.scale } : {}),
      },
    ],
    meshes: [newMesh],
    accessors: newAccessors,
    bufferViews: newViews,
    buffers: [{ byteLength: newBin.length }],
  };
  if (materials.length) out.materials = materials;
  if (textures.length) out.textures = textures;
  if (images.length) out.images = images;

  const extensions = (json.extensionsUsed ?? []).filter(
    (e) => e === 'EXT_texture_webp' || e === 'KHR_materials_specular',
  );
  if (extensions.length) out.extensionsUsed = extensions;

  return { json: out, bin: newBin };
}

const source = await fetchSource();
const { json, bin } = parseGlb(source);
const extracted = extractNode(json, bin, ENGINE_NODE);
const glb = buildGlb(extracted.json, extracted.bin);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, glb);

const triangles = extracted.json.meshes[0].primitives.reduce((n, p) => {
  const acc = extracted.json.accessors[p.indices];
  return n + (acc ? acc.count / 3 : 0);
}, 0);

console.log(`Wrote public/models/f1-engine.glb`);
console.log(`  ${(glb.length / 1024).toFixed(0)} KB, ${Math.round(triangles).toLocaleString()} triangles`);
console.log(`  source: ${SOURCE_URL}`);
console.log(`  NASA 3D Resources — public domain, credited on the About screen.`);

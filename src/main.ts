import './style.css';
import { parseShaderGraph } from './shaderGraph/parser';
import { GraphCanvas } from './graphCanvas/GraphCanvas';
import { Blackboard } from './ui/Blackboard';
import { Inspector } from './ui/Inspector';
import { Toolbar } from './ui/Toolbar';
import { PreviewController } from './preview/PreviewController';
import { ShaderBinding } from './preview/ShaderBinding';
import { GraphModel } from './shaderGraph/types';
import { getShaderPair } from './shaders/registry';

interface ShaderEntry {
  name: string;
  path: string;
  textures?: Record<string, string>;
  propertyOverrides?: Record<string, unknown>;
  defaultMesh?: string;
  defaultAutoRotate?: boolean;
}

const SHADER_MANIFEST: ShaderEntry[] = [
  {
    name: 'Probeta',
    path: 'Shaders/Probeta/Probeta.shadergraph',
    textures: {
      _DiffuseMap: 'Shaders/Probeta/DifusionMap.png',
      _MetallicMap: 'Shaders/Probeta/MetallicMap.png',
      _NormalMap: 'Shaders/Probeta/NormalMap.png',
      _RoughnessMap: 'Shaders/Probeta/RoughtnessMap.png',
    },
    defaultMesh: 'Plane',
    defaultAutoRotate: false,
  },
  {
    name: 'Lija',
    path: 'Shaders/Lija/Lija.shadergraph',
    defaultMesh: 'Plane',
    defaultAutoRotate: false,
    propertyOverrides: {
      _ColorDeLija: { r: 0.071, g: 0.071, b: 0.071, a: 1.0 },
    },
  },
  {
    name: 'WaterBottle',
    path: 'Shaders/WaterBottle/WaterBottle.shadergraph',
    propertyOverrides: {
      _MinMaxFillx100: { x: -100, y: 100, z: 0, w: 0 },
    },
    defaultMesh: 'Capsule',
  },
  {
    name: 'Skybox',
    path: 'Shaders/Skybox/SkyboxMovil.shadergraph',
    textures: { _StarsTexture: 'Shaders/Skybox/Stars.png' },
  },
  { name: 'SnapPreview', path: 'Shaders/SnapPreview/SnapPreview.shadergraph' },
];

let currentModel: GraphModel | null = null;
let graphCanvas: GraphCanvas;
let blackboard: Blackboard;
let inspector: Inspector;
let preview: PreviewController;
let shaderBinding: ShaderBinding;
let toolbar: Toolbar;

async function loadShader(index: number) {
  try {
    const entry = SHADER_MANIFEST[index];
    const resp = await fetch(entry.path);
    const text = await resp.text();
    currentModel = parseShaderGraph(text);

    // Apply property overrides from manifest (e.g. wider MinMaxFillx100 range)
    if (entry.propertyOverrides) {
      for (const prop of currentModel.properties) {
        if (prop.referenceName in entry.propertyOverrides) {
          prop.value = entry.propertyOverrides[prop.referenceName];
        }
      }
    }

    graphCanvas.setModel(currentModel, entry.textures);
    const autoTextures = entry.textures ? new Set(Object.keys(entry.textures)) : undefined;
    blackboard.setModel(currentModel, autoTextures);
    inspector.setModel(currentModel, entry.name);

    const pair = getShaderPair(entry.name);
    shaderBinding.bind(currentModel, pair, entry.textures);

    // Apply per-shader defaults for mesh and autorotate
    toolbar.applyDefaults(entry.defaultMesh, entry.defaultAutoRotate);
  } catch (e) {
    console.error('loadShader failed:', e);
  }
}

function init() {
  const toolbarEl = document.getElementById('toolbar')!;
  const canvasEl = document.getElementById('graph-canvas')!;
  const bbContent = document.getElementById('blackboard-content')!;
  const inspContent = document.getElementById('inspector-content')!;
  const previewContainer = document.getElementById('preview-container')!;

  preview = new PreviewController(previewContainer);
  shaderBinding = new ShaderBinding(preview);
  graphCanvas = new GraphCanvas(canvasEl);
  blackboard = new Blackboard(bbContent, (name, value) => {
    shaderBinding.updateUniform(name, value);
  });
  inspector = new Inspector(inspContent);

  toolbar = new Toolbar(toolbarEl, SHADER_MANIFEST.map(s => s.name), {
    onShaderChange: (idx) => loadShader(idx),
    onMeshChange: (mesh) => preview.setMesh(mesh),
    onAutoRotateToggle: (on) => preview.setAutoRotate(on),
  });

  toolbar.init();
  loadShader(0);
  preview.animate();
}

init();

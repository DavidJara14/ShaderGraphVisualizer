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

interface PropertyOverride {
  value?: unknown;
  floatType?: number;
  rangeValues?: { x: number; y: number };
}

interface ShaderEntry {
  name: string;
  path: string;
  textures?: Record<string, string>;
  propertyOverrides?: Record<string, unknown | PropertyOverride>;
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
      _TamanioDeLija: { value: 80, floatType: 1, rangeValues: { x: 80, y: 800 } },
    },
  },
  {
    name: 'WaterBottle',
    path: 'Shaders/WaterBottle/WaterBottle.shadergraph',
    propertyOverrides: {
      _MinMaxFillx100: { x: -100, y: 100, z: 0, w: 0 },
      _FillPercentage: { value: 45 },
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
          const ovr = entry.propertyOverrides[prop.referenceName];
          if (ovr && typeof ovr === 'object' && ('value' in ovr || 'floatType' in ovr || 'rangeValues' in ovr)) {
            const o = ovr as PropertyOverride;
            if (o.value !== undefined) prop.value = o.value;
            if (o.floatType !== undefined) prop.floatType = o.floatType;
            if (o.rangeValues !== undefined) prop.rangeValues = o.rangeValues;
          } else {
            prop.value = ovr;
          }
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

  // --- Resize handles ---
  setupResizeHandles();
}

function setupResizeHandles() {
  const rightPanels = document.getElementById('right-panels')!;
  const inspectorEl = document.getElementById('inspector')!;
  const previewEl = document.getElementById('preview')!;
  const hHandle = document.getElementById('right-resize-handle')!;
  const vHandle = document.getElementById('preview-resize-handle')!;

  // Horizontal resize: drag left edge of right-panels to change its width
  let draggingH = false;
  hHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    draggingH = true;
    hHandle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  // Vertical resize: drag divider between inspector and preview
  let draggingV = false;
  vHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    draggingV = true;
    vHandle.classList.add('active');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (draggingH) {
      const newWidth = window.innerWidth - e.clientX;
      rightPanels.style.width = Math.max(200, Math.min(800, newWidth)) + 'px';
    }
    if (draggingV) {
      const panelRect = rightPanels.getBoundingClientRect();
      const offsetY = e.clientY - panelRect.top;
      const inspHeight = Math.max(60, Math.min(offsetY, panelRect.height - 100));
      inspectorEl.style.height = inspHeight + 'px';
      inspectorEl.style.flexShrink = '0';
      previewEl.style.flex = '1';
    }
  });

  document.addEventListener('mouseup', () => {
    if (draggingH) {
      draggingH = false;
      hHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    if (draggingV) {
      draggingV = false;
      vHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

init();

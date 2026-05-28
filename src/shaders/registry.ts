import ProbetaVert from './Probeta.vert?raw';
import ProbetaFrag from './Probeta.frag?raw';
import LijaVert from './Lija.vert?raw';
import LijaFrag from './Lija.frag?raw';
import WaterBottleVert from './WaterBottle.vert?raw';
import WaterBottleFrag from './WaterBottle.frag?raw';
import SkyboxVert from './Skybox.vert?raw';
import SkyboxFrag from './Skybox.frag?raw';
import SnapPreviewVert from './SnapPreview.vert?raw';
import SnapPreviewFrag from './SnapPreview.frag?raw';

export interface ShaderPair {
  vertexShader: string;
  fragmentShader: string;
  defaultUniforms: Record<string, { type: string; value: unknown }>;
  isSkybox?: boolean;
  isLit?: boolean;
}

const registry: Record<string, ShaderPair> = {
  Probeta: {
    vertexShader: ProbetaVert,
    fragmentShader: ProbetaFrag,
    isLit: true,
    defaultUniforms: {
      _DiffuseMap: { type: 'sampler2D', value: null },
      _MetallicMap: { type: 'sampler2D', value: null },
      _NormalMap: { type: 'sampler2D', value: null },
      _RoughnessMap: { type: 'sampler2D', value: null },
      _AngleRotation: { type: 'float', value: 0.0 },
      _GranoLija: { type: 'float', value: 0.0 },
      _Reflexion: { type: 'float', value: 0.5 },
      _IsFirstSanding: { type: 'float', value: 1.0 },
      uEnvMap: { type: 'samplerCube', value: null },
    },
  },
  Lija: {
    vertexShader: LijaVert,
    fragmentShader: LijaFrag,
    defaultUniforms: {
      _ColorDeLija: { type: 'vec4', value: { x: 0.133, y: 0.133, z: 0.133, w: 1.0 } },
      _TamanioDeLija: { type: 'float', value: 80.0 },
      _MinMax: { type: 'vec2', value: { x: 0.0, y: 1000.0 } },
      _DensityMultiplyer: { type: 'float', value: 1.0 },
    },
  },
  WaterBottle: {
    vertexShader: WaterBottleVert,
    fragmentShader: WaterBottleFrag,
    defaultUniforms: {
      _ColorAgua: { type: 'vec4', value: { x: 0.0, y: 0.44, z: 0.44, w: 1.0 } },
      _ColorAguaSuperficie: { type: 'vec4', value: { x: 0.35, y: 0.99, z: 0.67, w: 1.0 } },
      _MinMaxFillx100: { type: 'vec2', value: { x: -100.0, y: 100.0 } },
      _FillPercentage: { type: 'float', value: 26.0 },
      _Multiply_Color: { type: 'vec4', value: { x: 0.47, y: 0.47, z: 0.47, w: 1.0 } },
    },
  },
  Skybox: {
    vertexShader: SkyboxVert,
    fragmentShader: SkyboxFrag,
    isSkybox: true,
    defaultUniforms: {
      _StarsTexture: { type: 'sampler2D', value: null },
      _StarIntensity: { type: 'float', value: 1.5 },
      _CloudDensity: { type: 'float', value: 0.6 },
      _CloudSpeed: { type: 'float', value: 1.0 },
      _HorizonBlend: { type: 'float', value: 0.3 },
      _SkyColorTop: { type: 'vec4', value: { x: 0.05, y: 0.05, z: 0.2, w: 1.0 } },
      _SkyColorBottom: { type: 'vec4', value: { x: 0.1, y: 0.15, z: 0.3, w: 1.0 } },
      _HorizonColor: { type: 'vec4', value: { x: 0.8, y: 0.5, z: 0.3, w: 1.0 } },
      _SunDirection: { type: 'vec3', value: { x: 0.3, y: 0.5, z: 0.8 } },
      _SunIntensity: { type: 'float', value: 2.0 },
      _SunSize: { type: 'float', value: 2.0 },
      uTime: { type: 'float', value: 0.0 },
    },
  },
  SnapPreview: {
    vertexShader: SnapPreviewVert,
    fragmentShader: SnapPreviewFrag,
    defaultUniforms: {
      uTime: { type: 'float', value: 0.0 },
    },
  },
};

export function getShaderPair(name: string): ShaderPair {
  return registry[name] ?? registry.SnapPreview;
}

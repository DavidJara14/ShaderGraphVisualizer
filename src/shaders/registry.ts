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
      _ColorDeLija: { type: 'vec4', value: { x: 0.071, y: 0.071, z: 0.071, w: 1.0 } },
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
      _FillPercentage: { type: 'float', value: 45.0 },
      _Multiply_Color: { type: 'vec4', value: { x: 0.47, y: 0.47, z: 0.47, w: 1.0 } },
    },
  },
  Skybox: {
    vertexShader: SkyboxVert,
    fragmentShader: SkyboxFrag,
    isSkybox: true,
    defaultUniforms: {
      _StarsTexture: { type: 'sampler2D', value: null },
      _StarsIntensity: { type: 'float', value: 1.5 },
      _StarsOffset: { type: 'vec2', value: { x: 1.0, y: 1.0 } },
      _Fadeout: { type: 'float', value: 1.5 },
      _RotationIntensity: { type: 'float', value: 0.02 },
      _GalaxyTimeMult: { type: 'float', value: 0.3 },
      _GalaxyColor: { type: 'vec4', value: { x: 0.37, y: 0.708, z: 0.985, w: 0.0 } },
      _GalaxyStarsMult: { type: 'float', value: 4.74 },
      _GalaxyStarsColor: { type: 'vec4', value: { x: 1.0, y: 1.0, z: 0.0, w: 0.0 } },
      _PlanetViewDirection: { type: 'vec3', value: { x: 0.0, y: 0.5, z: 0.5 } },
      _PlanetExponent: { type: 'float', value: 0.87 },
      _PlanetRadiusA: { type: 'float', value: 0.6 },
      _PlanetRadiusB: { type: 'float', value: 0.45 },
      _PlanetColorBase: { type: 'vec4', value: { x: 0.784, y: 0.929, z: 0.933, w: 1.0 } },
      _ColorBaseMultiplier: { type: 'float', value: 1.14 },
      _Fog1VelocityMult: { type: 'vec2', value: { x: 0.04, y: 0.01 } },
      _PlanetColor2: { type: 'vec4', value: { x: 0.73, y: 0.68, z: 0.85, w: 1.0 } },
      _ColorEffectMultiplier: { type: 'float', value: 2.51 },
      _Fog2VelocityMult: { type: 'vec2', value: { x: 0.055, y: 0.01 } },
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

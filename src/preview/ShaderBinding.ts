import * as THREE from 'three';
import { GraphModel, PropertyInfo, Color } from '../shaderGraph/types';
import { ShaderPair } from '../shaders/registry';
import type { PreviewController } from './PreviewController';

export class ShaderBinding {
  private preview: PreviewController;
  private material: THREE.ShaderMaterial | null = null;
  private textureLoader = new THREE.TextureLoader();

  constructor(preview: PreviewController) {
    this.preview = preview;
  }

  bind(model: GraphModel, pair: ShaderPair, texturePaths?: Record<string, string>) {
    const uniforms: Record<string, THREE.IUniform> = {};

    for (const [name, def] of Object.entries(pair.defaultUniforms)) {
      if (def.type === 'sampler2D' || def.type === 'samplerCube') {
        uniforms[name] = { value: null };
      } else if (def.type === 'vec4') {
        const v = def.value as { x: number; y: number; z: number; w: number };
        uniforms[name] = { value: new THREE.Vector4(v.x, v.y, v.z, v.w) };
      } else if (def.type === 'vec3') {
        const v = def.value as { x: number; y: number; z: number };
        uniforms[name] = { value: new THREE.Vector3(v.x, v.y, v.z) };
      } else if (def.type === 'vec2') {
        const v = def.value as { x: number; y: number };
        uniforms[name] = { value: new THREE.Vector2(v.x, v.y) };
      } else {
        uniforms[name] = { value: def.value };
      }
    }

    // Override with property values from the parsed model
    for (const prop of model.properties) {
      const name = prop.referenceName;
      if (!(name in uniforms)) continue;
      this.applyPropertyValue(uniforms, name, prop);
    }

    // Load textures
    if (texturePaths) {
      for (const [uniformName, path] of Object.entries(texturePaths)) {
        if (uniformName in uniforms) {
          const tex = this.textureLoader.load(path);
          // Only color textures (diffuse, stars) should use sRGB; data textures
          // (normal, metallic, roughness) must stay linear to avoid corruption
          const isColorTex = /diffus|color|stars|albedo/i.test(uniformName);
          tex.colorSpace = isColorTex ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          uniforms[uniformName] = { value: tex };
        }
      }
    }

    // Generate envmap for PBR
    if (pair.isLit && 'uEnvMap' in uniforms) {
      uniforms['uEnvMap'] = { value: this.preview.getEnvMap() };
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: pair.vertexShader,
      fragmentShader: pair.fragmentShader,
      uniforms,
      side: pair.isSkybox ? THREE.BackSide : THREE.DoubleSide,
      transparent: true,
    });

    this.preview.setMaterial(this.material, !!pair.isSkybox);
  }

  updateUniform(referenceName: string, value: unknown) {
    if (!this.material) return;
    const uniform = this.material.uniforms[referenceName];
    if (!uniform) return;

    if (value && typeof value === 'object' && 'r' in value) {
      const c = value as Color;
      uniform.value = new THREE.Vector4(c.r, c.g, c.b, c.a);
    } else if (value && typeof value === 'object' && 'x' in value) {
      const v = value as Record<string, number>;
      if ('w' in v) uniform.value = new THREE.Vector4(v.x, v.y, v.z, v.w);
      else if ('z' in v) uniform.value = new THREE.Vector3(v.x, v.y, v.z);
      else uniform.value = new THREE.Vector2(v.x, v.y);
    } else if (typeof value === 'string' && value.startsWith('blob:')) {
      const tex = this.textureLoader.load(value);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      uniform.value = tex;
    } else {
      uniform.value = value;
    }
  }

  getTimeUniform(): THREE.IUniform | null {
    return this.material?.uniforms['uTime'] ?? null;
  }

  private applyPropertyValue(uniforms: Record<string, THREE.IUniform>, name: string, prop: PropertyInfo) {
    const val = prop.value;
    if (val === null || val === undefined) return;

    if (prop.type === 'float' || prop.type === 'boolean') {
      uniforms[name] = { value: typeof val === 'boolean' ? (val ? 1.0 : 0.0) : val };
    } else if (prop.type === 'color') {
      const c = val as Color;
      uniforms[name] = { value: new THREE.Vector4(c.r, c.g, c.b, c.a) };
    } else if (prop.type === 'vector2') {
      const v = val as Record<string, number>;
      uniforms[name] = { value: new THREE.Vector2(v.x, v.y) };
    } else if (prop.type === 'vector3') {
      const v = val as Record<string, number>;
      uniforms[name] = { value: new THREE.Vector3(v.x, v.y, v.z) };
    } else if (prop.type === 'vector4') {
      const v = val as Record<string, number>;
      uniforms[name] = { value: new THREE.Vector4(v.x, v.y, v.z, v.w) };
    }
  }
}

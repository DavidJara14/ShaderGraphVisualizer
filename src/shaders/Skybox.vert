varying vec3 vWorldDir;
varying vec2 vUv;
varying vec3 vWorldPosNorm;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(worldPos.xyz);
  vWorldPosNorm = normalize(worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

attribute vec4 tangent;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying mat3 vTBN;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  // Compute TBN from mesh tangent if available, else derive from normal
  vec3 T = normalize(normalMatrix * tangent.xyz);
  vec3 N = vNormal;
  // Re-orthogonalize T with respect to N
  T = normalize(T - dot(T, N) * N);
  vec3 B = cross(N, T) * tangent.w;
  vTBN = mat3(T, B, N);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

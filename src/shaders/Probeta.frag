uniform sampler2D _DiffuseMap;
uniform sampler2D _MetallicMap;
uniform sampler2D _NormalMap;
uniform sampler2D _RoughnessMap;
uniform float _AngleRotation;
uniform float _GranoLija;
uniform float _Reflexion;
uniform float _IsFirstSanding;
uniform samplerCube uEnvMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying mat3 vTBN;

vec2 rotateUV(vec2 uv, float angle, vec2 center) {
  float rad = angle * 3.14159265 / 180.0;
  float c = cos(rad);
  float s = sin(rad);
  uv -= center;
  uv = mat2(c, -s, s, c) * uv;
  return uv + center;
}

void main() {
  // Base UVs for diffuse, metallic, roughness
  vec2 baseUv = vUv;
  vec4 diffuse = texture2D(_DiffuseMap, baseUv);
  float metallic = texture2D(_MetallicMap, baseUv).r;
  float roughness = texture2D(_RoughnessMap, baseUv).r;
  float smoothness = 1.0 - roughness;

  // GranoLija (grit size) controls normal map visibility:
  // 80 (coarse) = maximum sanding lines visible
  // 800 (fine) = completely smooth, no visible lines
  // Graph: GranoLija → Subtract(80) → Divide(720) → OneMinus
  float grainFactor = 1.0 - clamp((_GranoLija - 80.0) / 720.0, 0.0, 1.0);

  // Primary normal map: UV rotated by AngleRotation
  vec2 normalUv1 = rotateUV(baseUv, _AngleRotation, vec2(0.5));
  vec3 normalTex1 = texture2D(_NormalMap, normalUv1).rgb * 2.0 - 1.0;
  // Scale normal intensity by grain factor
  normalTex1.xy *= grainFactor * 1.5;

  // Second normal map sample: UV rotated 90° (perpendicular sanding direction)
  vec2 normalUv2 = rotateUV(baseUv, 90.0, vec2(0.5));
  vec3 normalTex2 = texture2D(_NormalMap, normalUv2).rgb * 2.0 - 1.0;
  normalTex2.xy *= grainFactor * 1.5;

  // IsFirstSanding controls whether we see cross-hatch or single direction:
  // true (1.0) = cross-hatch: blend both normal directions (first sanding pass)
  // false (0.0) = single direction: only the AngleRotation-rotated normal
  vec3 normalTex;
  if (_IsFirstSanding > 0.5) {
    // Cross-hatch: add both perpendicular normal maps
    normalTex = vec3(
      normalTex1.x + normalTex2.x,
      normalTex1.y + normalTex2.y,
      1.0
    );
  } else {
    // Single direction sanding
    normalTex = vec3(normalTex1.xy, 1.0);
  }

  vec3 N = normalize(vTBN * normalTex);
  vec3 V = normalize(vViewDir);

  // Three-point lighting for bright metallic visualization
  vec3 L1 = normalize(vec3(1.0, 1.0, 0.8));
  vec3 L2 = normalize(vec3(-0.7, 0.5, 1.0));
  vec3 L3 = normalize(vec3(-0.3, -0.6, -0.4));

  float NdotV = max(dot(N, V), 0.001);

  // PBR-like shading per light
  vec3 color = vec3(0.0);

  // Dielectric F0 and metallic F0
  vec3 F0 = mix(vec3(0.04), diffuse.rgb, metallic);

  for (int i = 0; i < 3; i++) {
    vec3 L = i == 0 ? L1 : (i == 1 ? L2 : L3);
    float intensity = i == 0 ? 4.0 : (i == 1 ? 2.0 : 1.0);
    vec3 H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float VdotH = max(dot(V, H), 0.0);

    // GGX distribution
    float a = roughness * roughness;
    float a2 = a * a;
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159265 * d * d + 0.0001);

    // Schlick fresnel
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);

    // Geometry (Smith GGX)
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float G1_V = NdotV / (NdotV * (1.0 - k) + k);
    float G1_L = NdotL / (NdotL * (1.0 - k) + k);
    float G = G1_V * G1_L;

    // Specular BRDF
    vec3 spec = (D * F * G) / (4.0 * NdotV * NdotL + 0.001);

    // Diffuse (energy-conserving)
    vec3 kD = (1.0 - F) * (1.0 - metallic);
    vec3 diff = kD * diffuse.rgb / 3.14159265;

    color += (diff + spec) * NdotL * intensity;
  }

  // Ambient / IBL
  vec3 ambient = diffuse.rgb * 0.25 + vec3(0.05);
  color += ambient;

  // Environment reflection
  vec3 R = reflect(-V, N);
  vec3 envColor = textureCube(uEnvMap, R).rgb;
  float envFresnel = pow(1.0 - NdotV, 5.0);
  float envStrength = mix(0.05, 0.6, metallic) * smoothness;
  color = mix(color, envColor * F0 * 2.0, envStrength * (envFresnel * 0.5 + 0.5));

  // SpecularOcclusion driven by Reflexion property
  color *= mix(1.0, 1.0 + _Reflexion * 0.5, metallic);

  // ACES-like tone mapping
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}

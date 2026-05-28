// Skybox shader matching Unity SkyboxMovil shadergraph
// Gas planet with flowing caustic patterns, star texture, subtle galaxy nebula

uniform sampler2D _StarsTexture;
uniform float _StarsIntensity;
uniform vec2 _StarsOffset;
uniform float _Fadeout;
uniform float _RotationIntensity;

// Galaxy
uniform float _GalaxyTimeMult;
uniform vec4 _GalaxyColor;
uniform float _GalaxyStarsMult;
uniform vec4 _GalaxyStarsColor;

// Planet
uniform vec3 _PlanetViewDirection;
uniform float _PlanetExponent;
uniform float _PlanetRadiusA;
uniform float _PlanetRadiusB;
uniform vec4 _PlanetColorBase;
uniform float _ColorBaseMultiplier;
uniform vec2 _Fog1VelocityMult;
uniform vec4 _PlanetColor2;
uniform float _ColorEffectMultiplier;
uniform vec2 _Fog2VelocityMult;

uniform float uTime;

varying vec3 vWorldDir;
varying vec2 vUv;
varying vec3 vWorldPosNorm;

// --- Hash and noise ---
vec2 voronoiHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float hash2d(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Pseudo-random gradient vector from grid point
vec2 gradientVec(vec2 p) {
  float h = hash2d(p) * 6.28318;
  return vec2(cos(h), sin(h));
}

// Proper Perlin-style gradient noise — no grid artifacts
float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic interpolation
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = dot(gradientVec(i), f);
  float b = dot(gradientVec(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(gradientVec(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(gradientVec(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.5;
}

// FBM with rotation between octaves to break grid artifacts
float fbm(vec2 uv, vec2 drift) {
  float value = 0.0;
  float amp = 0.5;
  // Rotation matrix to break grid alignment between octaves
  mat2 rot = mat2(0.866, 0.5, -0.5, 0.866); // ~30 degree rotation
  for (int i = 0; i < 5; i++) {
    value += amp * gradientNoise(uv + drift);
    uv = rot * uv * 2.0 + vec2(1.7, 9.2);
    drift *= 1.3;
    amp *= 0.5;
  }
  return value;
}

// Voronoi Cells output — for galaxy nebula
float voronoiCells(vec2 uv, float angleOffset, float cellDensity) {
  vec2 scaledUv = uv * cellDensity;
  vec2 g = floor(scaledUv);
  vec2 f = fract(scaledUv);
  float minDist = 8.0;
  vec2 closestCell = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 lattice = vec2(float(x), float(y));
      vec2 offset = voronoiHash(lattice + g);
      float theta = angleOffset * 6.28318;
      offset = vec2(
        cos(theta + offset.x * 6.28318) * 0.5 + 0.5,
        sin(theta + offset.y * 6.28318) * 0.5 + 0.5
      );
      vec2 diff = lattice + offset - f;
      float d = dot(diff, diff);
      if (d < minDist) {
        minDist = d;
        closestCell = lattice + g;
      }
    }
  }
  return fract(sin(dot(closestCell, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 dir = normalize(vWorldDir);
  vec3 posNorm = normalize(vWorldPosNorm);

  // === PLANET DISC MASK ===
  vec3 negPlanetDir = normalize(-_PlanetViewDirection);
  float viewDot = dot(dir, negPlanetDir);
  viewDot = clamp(viewDot, 0.0, 1.0);

  float rMin = min(_PlanetRadiusA, _PlanetRadiusB);
  float rMax = max(_PlanetRadiusA, _PlanetRadiusB);
  float inLow = 1.0 - rMax * rMax;
  float inHigh = 1.0 - rMin * rMin;
  float planetRaw = clamp((viewDot - inLow) / max(inHigh - inLow, 0.001), 0.0, 1.0);
  float planetMask = pow(planetRaw, _PlanetExponent);

  // === PLANET UV ===
  vec3 up = abs(negPlanetDir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, negPlanetDir));
  vec3 bitangent = cross(negPlanetDir, tangent);
  vec2 planetUv = vec2(dot(dir, tangent), dot(dir, bitangent)) * 2.0 + 0.5;

  // === PLANET GAS PATTERNS ===
  float timeVal = uTime;

  // Two FBM layers with different drift directions for flowing gas
  vec2 drift1 = timeVal * _Fog1VelocityMult;
  vec2 drift2 = timeVal * _Fog2VelocityMult;

  // Layer 1: main gas flow (scale 3 = medium detail)
  float gas1 = fbm(planetUv * 3.0, drift1);
  // Layer 2: secondary flow with different scale and direction
  float gas2 = fbm(planetUv * 3.5 + vec2(5.0, 3.0), drift2 * 1.3);
  // Layer 3: fine detail at higher frequency
  float gas3 = fbm(planetUv * 6.0 + vec2(10.0, 7.0), drift1 * 0.7 + drift2 * 0.5);

  // Combine gas layers into caustic-like interference pattern
  float causticPattern = gas1 * gas2;  // multiply creates interference veins
  float detailPattern = gas3;

  // --- Planet color composition ---
  vec3 baseColor = _PlanetColorBase.rgb;
  // Boost saturation for clearly cyan appearance
  float baseLum = dot(baseColor, vec3(0.299, 0.587, 0.114));
  vec3 saturatedBase = mix(vec3(baseLum), baseColor, 2.0) * _ColorBaseMultiplier;

  // Planet surface: base cyan modulated by gas patterns
  // causticPattern ranges ~0.05-0.25 (product of two 0-1 noise values)
  // Remap to useful brightness range
  float brightness1 = smoothstep(0.02, 0.25, causticPattern);
  float brightness2 = smoothstep(0.2, 0.8, detailPattern);

  // Main surface: bright cyan with gas band variations
  vec3 planetSurface = saturatedBase * (0.75 + 0.3 * brightness1);
  // Add subtle PlanetColor2 tint in brighter gas regions
  planetSurface += _PlanetColor2.rgb * brightness2 * 0.06;
  // Add fine detail variation
  planetSurface *= (0.94 + 0.06 * brightness2);

  // Apply planet mask with soft edge
  vec3 planetColor = planetSurface * planetMask;

  // === FADEOUT MASK ===
  float fadeVal = clamp(posNorm.z, 0.0, 1.0);
  float fadeMask = pow(fadeVal, _Fadeout);

  // === STARS ===
  vec2 starUv = vec2(
    atan(dir.x, dir.z) / 6.28318 + 0.5,
    asin(clamp(dir.y, -1.0, 1.0)) / 3.14159 + 0.5
  );
  starUv += _StarsOffset;

  vec4 starsSample = texture2D(_StarsTexture, starUv);
  vec3 mainStars = starsSample.rgb * _StarsIntensity;

  // === GALAXY (very subtle nebula) ===
  float galaxyVoronoi = voronoiCells(vec2(posNorm.y * 0.5, posNorm.x * 0.5), uTime * _GalaxyTimeMult * 0.05, 4.0);
  float galaxyMask = smoothstep(0.3, 0.7, galaxyVoronoi) * fadeMask;

  vec3 galaxyNebula = _GalaxyColor.rgb * galaxyMask * fadeMask * 0.05;

  vec4 galaxyStarSample = texture2D(_StarsTexture, starUv * 1.3 + vec2(0.5));
  vec3 galaxyStars = galaxyStarSample.rgb * _GalaxyStarsColor.rgb * _GalaxyStarsMult * fadeMask * 0.03;

  // === COMPOSITE ===
  vec3 color = vec3(0.0);

  // Sharpen planet opacity so stars don't bleed through
  float starMask = smoothstep(0.0, 0.1, planetMask);

  // Stars behind planet
  color += mainStars * (1.0 - starMask);

  // Galaxy (very subtle, behind planet)
  color += (galaxyNebula + galaxyStars) * (1.0 - starMask);

  // Planet
  color += planetColor;

  gl_FragColor = vec4(color, 1.0);
}

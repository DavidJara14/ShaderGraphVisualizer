uniform vec4 _ColorDeLija;
uniform float _TamanioDeLija;
uniform vec2 _MinMax;
uniform float _DensityMultiplyer;

varying vec2 vUv;

// Voronoi noise (matching Unity Shader Graph Voronoi node)
vec2 voronoiHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float voronoi(vec2 uv, float scale) {
  vec2 g = floor(uv * scale);
  vec2 f = fract(uv * scale);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = voronoiHash(g + neighbor);
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  return minDist;
}

float remap(float value, float fromMin, float fromMax, float toMin, float toMax) {
  return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
}

void main() {
  // Remap TamanioDeLija through MinMax range, scaled by DensityMultiplyer
  float density = remap(_TamanioDeLija, _MinMax.x, _MinMax.y,
                         _MinMax.x * _DensityMultiplyer,
                         _MinMax.y * _DensityMultiplyer);

  // Two voronoi layers at different densities (1x and 3x)
  float v1 = voronoi(vUv, density);
  float v2 = voronoi(vUv, density * 3.0);

  // Invert: bright grain particles on dark background
  // Graph: Voronoi → Multiply(0.98) → InvertColors
  float inv1 = 1.0 - 0.98 * v1;
  float inv2 = 1.0 - 0.98 * v2;

  // Each path follows the graph pattern:
  // add = ColorDeLija + inv
  // mul = ColorDeLija * inv
  // combined = mul * add + mul = mul * (add + 1)
  // = (Color * inv) * (Color + inv + 1)
  vec3 col = _ColorDeLija.rgb;

  vec3 path1 = col * inv1 * (col + vec3(inv1 + 1.0));
  vec3 path2 = col * inv2 * (col + vec3(inv2 + 1.0));

  // Final: sum both voronoi paths
  vec3 color = path1 + path2;

  gl_FragColor = vec4(color, 1.0);
}

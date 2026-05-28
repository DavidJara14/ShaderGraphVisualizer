uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float gradientNoise(vec2 uv, float scale) {
  vec2 p = uv * scale;
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return n;
}

void main() {
  // Animated tiling: Time → TilingAndOffset (Offset)
  vec2 tiledUv = vUv + vec2(uTime * 0.1, uTime * 0.05);

  // GradientNoise with Scale=2.35
  float noise = gradientNoise(tiledUv, 2.35);

  // InvertColors (Red channel only): scalar noise → vec3(1-noise, noise, noise)
  vec3 invertedNoise = vec3(1.0 - noise, noise, noise);

  // Fresnel Effect with Power=0.67
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 0.67);

  // Multiply1: Fresnel * InvertedNoise
  vec3 fresnelMix = invertedNoise * fresnel;

  // Color node: bright cyan (r=0.0226, g=1.0, b=0.9149)
  vec3 baseColor = vec3(0.0226, 1.0, 0.9149);

  // Multiply2: Color * fresnelMix → BaseColor
  vec3 color = baseColor * fresnelMix;

  // Alpha = raw noise (passed through redirects)
  float alpha = noise;

  gl_FragColor = vec4(color, alpha);
}

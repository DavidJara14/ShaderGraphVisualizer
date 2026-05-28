uniform sampler2D _StarsTexture;
uniform float _StarIntensity;
uniform float _CloudDensity;
uniform float _CloudSpeed;
uniform float _HorizonBlend;
uniform vec4 _SkyColorTop;
uniform vec4 _SkyColorBottom;
uniform vec4 _HorizonColor;
uniform vec3 _SunDirection;
uniform float _SunIntensity;
uniform float _SunSize;
uniform float uTime;

varying vec3 vWorldDir;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * gradientNoise(p, 1.0);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float upDot = dir.y;

  // Sky gradient
  float t = upDot * 0.5 + 0.5;
  vec3 skyColor = mix(_SkyColorBottom.rgb, _SkyColorTop.rgb, smoothstep(0.0, 0.7, t));

  // Horizon blend
  float horizonMask = 1.0 - smoothstep(0.0, _HorizonBlend, abs(upDot));
  skyColor = mix(skyColor, _HorizonColor.rgb, horizonMask * 0.6);

  // Stars (upper hemisphere)
  vec2 starUv = vec2(atan(dir.x, dir.z) / 6.28318 + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / 3.14159 + 0.5);
  vec4 stars = texture2D(_StarsTexture, starUv);
  float starMask = smoothstep(0.1, 0.5, upDot);
  skyColor += stars.rgb * _StarIntensity * starMask;

  // Clouds
  vec2 cloudUv = dir.xz / (abs(dir.y) + 0.5) * 0.3;
  cloudUv += uTime * _CloudSpeed * 0.01;
  float cloud1 = fbm(cloudUv * 3.0);
  float cloud2 = fbm(cloudUv * 5.0 + vec2(100.0));
  float clouds = smoothstep(0.4, 0.7, cloud1 * 0.6 + cloud2 * 0.4) * _CloudDensity;
  float cloudUpperMask = smoothstep(-0.1, 0.3, upDot);
  skyColor = mix(skyColor, vec3(0.9, 0.9, 0.95), clouds * cloudUpperMask * 0.5);

  // Sun
  vec3 sunDir = normalize(_SunDirection);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunDisc = smoothstep(1.0 - _SunSize * 0.01, 1.0, sunDot);
  float sunGlow = pow(sunDot, 8.0) * 0.3;
  skyColor += (sunDisc + sunGlow) * _SunIntensity * vec3(1.0, 0.95, 0.8);

  gl_FragColor = vec4(skyColor, 1.0);
}

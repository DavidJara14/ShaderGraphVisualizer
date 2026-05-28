uniform vec4 _ColorAgua;
uniform vec4 _ColorAguaSuperficie;
uniform vec2 _MinMaxFillx100;
uniform vec4 _Multiply_Color;
uniform float _FillPercentage;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
  // Fill level: remap FillPercentage (0-100) to MinMaxFillx100/100 range
  // Graph: FillPercentage → Remap(0..100 → MinMax/100) → Step
  float fillMin = _MinMaxFillx100.x / 100.0;
  float fillMax = _MinMaxFillx100.y / 100.0;
  float fillLevel = mix(fillMin, fillMax, _FillPercentage / 100.0);

  // Local Y position for height-based clipping
  // Graph: Position − Object.Position → Split.G → Step.Edge
  float localY = vLocalPos.y;

  // Step: 1 if fillLevel >= localY (pixel is below fill line), 0 if above
  float filled = step(localY, fillLevel);

  // Discard fragments above fill level — avoids transparency artifacts on top cap
  if (filled < 0.5) discard;

  // IsFrontFace selects color:
  // Front face (outside wall) = ColorAgua, Back face (inside) = ColorAguaSuperficie
  vec3 color;
  if (gl_FrontFacing) {
    color = _ColorAgua.rgb;
  } else {
    color = _ColorAguaSuperficie.rgb;
  }

  gl_FragColor = vec4(color, 1.0);
}

# ShaderGraph Visualizer

A static web app that parses Unity ShaderGraph files (`.shadergraph`) and renders them as interactive node graphs with a real-time 3D preview powered by Three.js.

## Features

- **Node Graph Canvas** - SVG-based rendering of shader nodes with pan, zoom, and drag. Edges rendered as smooth bezier curves. Vertex/Fragment context blocks drag as groups.
- **Real-time 3D Preview** - Three.js viewport with PBR and unlit shaders. Supports Sphere, Cube, Cylinder, Capsule, and Plane meshes with auto-rotate.
- **Blackboard** - Interactive property editors (sliders, color pickers, vector inputs, booleans) that update the preview in real time.
- **Inspector** - Displays shader metadata: pipeline type, node/edge counts, vertex and fragment block descriptors.
- **Texture Thumbnails** - Texture nodes display inline thumbnails with correct texture assignments traced via BFS from SampleTexture2D nodes.
- **Inline Default Values** - Unconnected input ports show their default values directly on the node.

## Included Shaders

| Shader | Description |
|--------|-------------|
| **Probeta** | PBR metallic surface with sanding lines controlled by GranoLija (grain size) and AngleRotation. Supports cross-hatch via IsFirstSanding. |
| **Lija** | Unlit sandpaper texture using dual-layer Voronoi noise at configurable density. |
| **WaterBottle** | Unlit water fill shader with FillPercentage controlling Y-axis clipping on a cylinder mesh. |
| **Skybox** | Animated sky with stars texture, gradient noise clouds, galaxy effects, and sun. |
| **SnapPreview** | Animated cyan fresnel effect with gradient noise distortion. |

## Tech Stack

- **TypeScript** + **Vite**
- **Three.js** for 3D rendering
- **SVG** for the node graph canvas
- Custom GLSL vertex/fragment shaders per shader entry

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

The static output goes to `dist/`.

## License

[MIT](LICENSE)

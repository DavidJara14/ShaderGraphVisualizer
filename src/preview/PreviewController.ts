import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMesh, createSkyboxMesh } from './MeshLibrary';

export class PreviewController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private currentMeshType = 'Sphere';
  private autoRotate = true;
  private clock = new THREE.Clock();
  private envMap: THREE.CubeTexture | null = null;
  private isSkyboxMode = false;
  private timeUniformRef: THREE.IUniform | null = null;
  private skyboxZoomHandler: ((e: WheelEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x1e1e1e);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 3);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    this.generateEnvMap();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(container);
  }

  private resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private generateEnvMap() {
    const size = 64;
    const cubeRt = new THREE.WebGLCubeRenderTarget(size);
    const cubeScene = new THREE.Scene();
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRt);

    // Simple gradient sky for envmap
    const skyGeo = new THREE.SphereGeometry(5, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float t = dir.y * 0.5 + 0.5;
          vec3 bottom = vec3(0.3, 0.25, 0.2);
          vec3 top = vec3(0.1, 0.15, 0.3);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }
      `,
    });
    cubeScene.add(new THREE.Mesh(skyGeo, skyMat));
    cubeCamera.update(this.renderer, cubeScene);
    this.envMap = cubeRt.texture;
    skyMat.dispose();
    skyGeo.dispose();
  }

  getEnvMap(): THREE.CubeTexture | null {
    return this.envMap;
  }

  setMaterial(material: THREE.ShaderMaterial, isSkybox: boolean) {
    this.isSkyboxMode = isSkybox;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }

    const geo = isSkybox ? createSkyboxMesh() : createMesh(this.currentMeshType);
    this.mesh = new THREE.Mesh(geo, material);
    this.scene.add(this.mesh);

    this.timeUniformRef = material.uniforms['uTime'] ?? null;

    if (isSkybox) {
      // Remove any existing skybox zoom handler
      if (this.skyboxZoomHandler) {
        this.renderer.domElement.removeEventListener('wheel', this.skyboxZoomHandler);
        this.skyboxZoomHandler = null;
      }
      // Place camera at center of skybox sphere, looking outward
      this.camera.position.set(0, 0, 0.001);
      this.camera.fov = 60;
      this.camera.near = 0.001;
      this.camera.updateProjectionMatrix();
      this.controls.target.set(0, 0, 0);
      this.controls.enableZoom = false;
      this.controls.enablePan = false;
      this.controls.minDistance = 0.001;
      this.controls.maxDistance = 0.002;
      this.controls.update();

      // FOV-based zoom for skybox (scroll wheel changes field of view)
      this.skyboxZoomHandler = (e: WheelEvent) => {
        e.preventDefault();
        this.camera.fov = Math.max(10, Math.min(140, this.camera.fov + e.deltaY * 0.05));
        this.camera.updateProjectionMatrix();
      };
      this.renderer.domElement.addEventListener('wheel', this.skyboxZoomHandler);
    } else {
      // Remove skybox zoom handler if present
      if (this.skyboxZoomHandler) {
        this.renderer.domElement.removeEventListener('wheel', this.skyboxZoomHandler);
        this.skyboxZoomHandler = null;
      }
      // Restore normal preview camera
      this.camera.position.set(0, 0, 3);
      this.camera.fov = 45;
      this.camera.near = 0.1;
      this.camera.updateProjectionMatrix();
      this.controls.target.set(0, 0, 0);
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.minDistance = 0;
      this.controls.maxDistance = Infinity;
      this.controls.update();
    }
  }

  setMesh(type: string) {
    this.currentMeshType = type;
    if (!this.mesh || this.isSkyboxMode) return;
    const oldMat = this.mesh.material;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    const geo = createMesh(type);
    this.mesh = new THREE.Mesh(geo, oldMat as THREE.ShaderMaterial);
    this.scene.add(this.mesh);
  }

  setAutoRotate(on: boolean) {
    this.autoRotate = on;
  }

  animate() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = this.clock.getElapsedTime();

      if (this.timeUniformRef) {
        this.timeUniformRef.value = dt;
      }

      if (this.autoRotate && this.mesh && !this.isSkyboxMode) {
        this.mesh.rotation.y += 0.005;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

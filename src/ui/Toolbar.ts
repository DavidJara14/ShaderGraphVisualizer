export interface ToolbarCallbacks {
  onShaderChange: (index: number) => void;
  onMeshChange: (mesh: string) => void;
  onAutoRotateToggle: (on: boolean) => void;
}

const MESHES = ['Sphere', 'Cube', 'Plane', 'Capsule', 'Cylinder'];

export class Toolbar {
  private container: HTMLElement;
  private shaderNames: string[];
  private callbacks: ToolbarCallbacks;
  private autoRotate = true;

  constructor(container: HTMLElement, shaderNames: string[], callbacks: ToolbarCallbacks) {
    this.container = container;
    this.shaderNames = shaderNames;
    this.callbacks = callbacks;
  }

  init() {
    // Shader selector
    const shaderLabel = document.createElement('label');
    shaderLabel.textContent = 'Shader';
    const shaderSelect = document.createElement('select');
    for (let i = 0; i < this.shaderNames.length; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = this.shaderNames[i];
      shaderSelect.appendChild(opt);
    }
    shaderSelect.addEventListener('change', () => {
      this.callbacks.onShaderChange(parseInt(shaderSelect.value));
    });

    // Mesh selector
    const meshLabel = document.createElement('label');
    meshLabel.textContent = 'Mesh';
    const meshSelect = document.createElement('select');
    for (const m of MESHES) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      meshSelect.appendChild(opt);
    }
    meshSelect.addEventListener('change', () => {
      this.callbacks.onMeshChange(meshSelect.value);
    });

    // Auto-rotate toggle
    const rotateBtn = document.createElement('button');
    rotateBtn.textContent = 'Auto-Rotate';
    rotateBtn.className = 'active';
    rotateBtn.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      rotateBtn.classList.toggle('active', this.autoRotate);
      this.callbacks.onAutoRotateToggle(this.autoRotate);
    });

    this.container.append(shaderLabel, shaderSelect, meshLabel, meshSelect, rotateBtn);
  }
}

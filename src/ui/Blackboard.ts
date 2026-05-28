import { GraphModel, PropertyInfo, Color } from '../shaderGraph/types';

type ChangeCallback = (referenceName: string, value: unknown) => void;

export class Blackboard {
  private container: HTMLElement;
  private onChange: ChangeCallback;
  private autoLoadedTextures: Set<string> = new Set();

  constructor(container: HTMLElement, onChange: ChangeCallback) {
    this.container = container;
    this.onChange = onChange;
  }

  setModel(model: GraphModel, autoLoadedTextures?: Set<string>) {
    this.container.innerHTML = '';
    this.autoLoadedTextures = autoLoadedTextures ?? new Set();
    for (const prop of model.properties) {
      if (prop.hidden) continue;
      // Skip texture properties that are auto-loaded from manifest
      if (prop.type === 'texture2d' && this.autoLoadedTextures.has(prop.referenceName)) continue;
      const el = this.createEditor(prop);
      if (el) this.container.appendChild(el);
    }
    if (model.properties.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #999; padding: 16px; text-align: center; font-style: italic;';
      empty.textContent = 'No properties';
      this.container.appendChild(empty);
    }
  }

  private createEditor(prop: PropertyInfo): HTMLElement | null {
    const group = document.createElement('div');
    group.className = 'prop-group';

    const label = document.createElement('label');
    label.textContent = prop.name;
    group.appendChild(label);

    switch (prop.type) {
      case 'float':
        this.createFloatEditor(group, prop);
        break;
      case 'color':
        this.createColorEditor(group, prop);
        break;
      case 'vector2':
        this.createVectorEditor(group, prop, 2);
        break;
      case 'vector3':
        this.createVectorEditor(group, prop, 3);
        break;
      case 'vector4':
        this.createVectorEditor(group, prop, 4);
        break;
      case 'boolean':
        this.createBooleanEditor(group, prop);
        break;
      case 'texture2d':
        this.createTextureEditor(group, prop);
        break;
      default:
        this.createRawEditor(group, prop);
        break;
    }

    return group;
  }

  private createFloatEditor(group: HTMLElement, prop: PropertyInfo) {
    const val = typeof prop.value === 'number' ? prop.value : 0;
    const hasRange = prop.floatType === 1 && prop.rangeValues;
    const min = hasRange ? prop.rangeValues!.x : -100;
    const max = hasRange ? prop.rangeValues!.y : 100;

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';

    if (hasRange) {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String((max - min) / 200);
      slider.value = String(val);
      slider.style.flex = '1';

      const numDisplay = document.createElement('span');
      numDisplay.className = 'prop-value';
      numDisplay.textContent = val.toFixed(1);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        numDisplay.textContent = v.toFixed(1);
        this.onChange(prop.referenceName, v);
      });

      row.appendChild(slider);
      row.appendChild(numDisplay);
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(val);
      input.step = '0.1';
      input.addEventListener('input', () => {
        this.onChange(prop.referenceName, parseFloat(input.value) || 0);
      });
      row.appendChild(input);
    }

    group.appendChild(row);
  }

  private createColorEditor(group: HTMLElement, prop: PropertyInfo) {
    const c = prop.value as Color | undefined;
    const r = Math.round((c?.r ?? 1) * 255);
    const g = Math.round((c?.g ?? 1) * 255);
    const b = Math.round((c?.b ?? 1) * 255);
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = hex;

    const hexLabel = document.createElement('span');
    hexLabel.className = 'prop-value';
    hexLabel.textContent = hex;

    input.addEventListener('input', () => {
      hexLabel.textContent = input.value;
      const rv = parseInt(input.value.slice(1, 3), 16) / 255;
      const gv = parseInt(input.value.slice(3, 5), 16) / 255;
      const bv = parseInt(input.value.slice(5, 7), 16) / 255;
      this.onChange(prop.referenceName, { r: rv, g: gv, b: bv, a: c?.a ?? 1 });
    });

    row.appendChild(input);
    row.appendChild(hexLabel);
    group.appendChild(row);
  }

  private createVectorEditor(group: HTMLElement, prop: PropertyInfo, components: number) {
    const labels = ['X', 'Y', 'Z', 'W'];
    const val = prop.value as Record<string, number> | undefined ?? {};
    const keys = ['x', 'y', 'z', 'w'].slice(0, components);

    const row = document.createElement('div');
    row.className = 'vec-inputs';

    const values = keys.map(k => val[k] ?? 0);

    keys.forEach((k, i) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;flex:1;min-width:0;';

      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:9px;color:#777;';
      lbl.textContent = labels[i];

      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(values[i]);
      input.step = '0.1';
      input.addEventListener('input', () => {
        values[i] = parseFloat(input.value) || 0;
        const obj: Record<string, number> = {};
        keys.forEach((kk, j) => obj[kk] = values[j]);
        this.onChange(prop.referenceName, obj);
      });

      wrapper.appendChild(lbl);
      wrapper.appendChild(input);
      row.appendChild(wrapper);
    });

    group.appendChild(row);
  }

  private createBooleanEditor(group: HTMLElement, prop: PropertyInfo) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!prop.value;
    input.addEventListener('change', () => {
      this.onChange(prop.referenceName, input.checked ? 1.0 : 0.0);
    });

    const lbl = document.createElement('span');
    lbl.className = 'prop-value';
    lbl.textContent = input.checked ? 'True' : 'False';
    input.addEventListener('change', () => {
      lbl.textContent = input.checked ? 'True' : 'False';
    });

    row.appendChild(input);
    row.appendChild(lbl);
    group.appendChild(row);
  }

  private createTextureEditor(group: HTMLElement, prop: PropertyInfo) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.cssText = 'font-size:11px;width:100%;';

    const preview = document.createElement('img');
    preview.className = 'texture-preview';
    preview.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = 'block';
      this.onChange(prop.referenceName, url);
    });

    group.appendChild(input);
    group.appendChild(preview);
  }

  private createRawEditor(group: HTMLElement, prop: PropertyInfo) {
    const textarea = document.createElement('textarea');
    textarea.value = JSON.stringify(prop.value, null, 2);
    textarea.style.cssText = 'width:100%;height:60px;background:var(--bg-dark);color:var(--text);border:1px solid var(--border);font-size:10px;font-family:monospace;resize:vertical;';
    textarea.addEventListener('change', () => {
      try {
        this.onChange(prop.referenceName, JSON.parse(textarea.value));
      } catch { /* ignore */ }
    });
    group.appendChild(textarea);
  }
}

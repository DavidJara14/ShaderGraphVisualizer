import { NodeInfo, SlotInfo } from '../shaderGraph/types';

const TYPE_COLORS: Record<string, string> = {
  PropertyNode: '#2e7d32',
  BlockNode: '#4a90e2',
  SampleTexture2DNode: '#8e24aa',
  Texture2DAssetNode: '#8e24aa',
  ColorNode: '#e65100',
  TimeNode: '#00838f',
  VoronoiNode: '#6a1b9a',
  GradientNoiseNode: '#6a1b9a',
  SimpleNoiseNode: '#6a1b9a',
  MultiplyNode: '#1565c0',
  AddNode: '#1565c0',
  SubtractNode: '#1565c0',
  DivideNode: '#1565c0',
  LerpNode: '#1565c0',
  SplitNode: '#ad1457',
  CombineNode: '#ad1457',
  NormalizeNode: '#1565c0',
  DotProductNode: '#1565c0',
  FresnelNode: '#00695c',
  SaturateNode: '#1565c0',
  RemapNode: '#1565c0',
  OneMinusNode: '#1565c0',
  StepNode: '#1565c0',
  SmoothstepNode: '#1565c0',
  PowerNode: '#1565c0',
  AbsoluteNode: '#1565c0',
  TilingAndOffsetNode: '#795548',
  RotateNode: '#795548',
  UVNode: '#795548',
  PositionNode: '#00838f',
  NormalVectorNode: '#00838f',
  ViewDirectionNode: '#00838f',
  BranchNode: '#bf360c',
  RedirectNodeData: '#555',
};

const HEADER_H = 24;
const PORT_R = 5;
const PORT_GAP = 20;
const MIN_W = 150;
const SIDE_PAD = 12;

export function getNodeColor(typeName: string): string {
  return TYPE_COLORS[typeName] ?? '#555';
}

export interface PortPosition {
  nodeId: string;
  slotId: number;
  x: number;
  y: number;
}

/**
 * Format a slot's value for inline display on unconnected ports.
 * Uses the slot's valueType to determine how many components to show.
 */
function formatDefaultValue(slot: SlotInfo): string | null {
  if (slot.slotType === 1) return null; // outputs don't show defaults
  const val = slot.defaultValue;
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    return formatNum(val);
  }
  if (typeof val === 'object') {
    const v = val as Record<string, number>;

    // Matrix types (e00, e01, ...) — skip display
    if ('e00' in v) return null;

    // Determine how many components to show based on the slot's valueType
    const vt = slot.valueType;
    const isScalar = vt.includes('Vector1');

    if ('x' in v) {
      if (isScalar) {
        return formatNum(v.x);
      }
      if (vt.includes('Vector2') || vt.includes('UV')) {
        return `${formatNum(v.x)} ${formatNum(v.y)}`;
      }
      if (vt.includes('Vector3') || vt.includes('Normal')) {
        return `${formatNum(v.x)} ${formatNum(v.y)} ${formatNum(v.z)}`;
      }
      // For Dynamic/DynamicValue/DynamicVector/Vector4 slots:
      // Apply heuristic — if y/z/w are padding (same filler value), show just x as scalar
      if ('w' in v && v.y === v.z && v.z === v.w && (v.y === 0 || v.y === 1 || v.y === 2)) {
        return formatNum(v.x);
      }
      // Otherwise show all components present
      if ('w' in v) return `${formatNum(v.x)} ${formatNum(v.y)} ${formatNum(v.z)} ${formatNum(v.w)}`;
      if ('z' in v) return `${formatNum(v.x)} ${formatNum(v.y)} ${formatNum(v.z)}`;
      if ('y' in v) return `${formatNum(v.x)} ${formatNum(v.y)}`;
      return formatNum(v.x);
    }
    if ('r' in v) {
      return `rgba`;
    }
  }
  return null;
}

/** Format a number for inline display — use integer if whole, else 1 decimal */
function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export function createNodeSVG(
  node: NodeInfo,
  connectedInputSlots: Set<string>,
  texturePath?: string | null,
): { group: SVGGElement; ports: PortPosition[] } {
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g') as SVGGElement;
  g.classList.add('sg-node');
  g.setAttribute('data-node-id', node.id);

  const inputs = node.slots.filter(s => s.slotType === 0);
  const outputs = node.slots.filter(s => s.slotType === 1);
  const maxPorts = Math.max(inputs.length, outputs.length, 1);

  const showThumbnail = !!texturePath;
  const thumbH = showThumbnail ? 80 : 0;

  const w = Math.max(node.position.width || MIN_W, MIN_W);
  const portsH = maxPorts * PORT_GAP + 8;
  const h = HEADER_H + portsH + thumbH;

  // Body
  const body = document.createElementNS(ns, 'rect');
  body.classList.add('node-body');
  body.setAttribute('width', String(w));
  body.setAttribute('height', String(h));
  g.appendChild(body);

  // Header
  const header = document.createElementNS(ns, 'rect');
  header.classList.add('node-header');
  header.setAttribute('width', String(w));
  header.setAttribute('height', String(HEADER_H));
  header.setAttribute('fill', getNodeColor(node.typeName));
  g.appendChild(header);

  // Title
  const displayName = node.isBlock
    ? (node.serializedDescriptor?.split('.').pop() ?? node.name)
    : node.typeName.replace('Node', '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const title = document.createElementNS(ns, 'text');
  title.classList.add('node-title');
  title.setAttribute('x', String(SIDE_PAD));
  title.setAttribute('y', '16');
  title.textContent = displayName.length > 22 ? displayName.slice(0, 20) + '…' : displayName;
  g.appendChild(title);

  const ports: PortPosition[] = [];

  // Input ports
  inputs.forEach((slot, i) => {
    const cy = HEADER_H + 14 + i * PORT_GAP;
    const circle = document.createElementNS(ns, 'circle');
    circle.classList.add('port', 'port-input');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', String(cy));
    g.appendChild(circle);

    // Port label with type annotation
    const typeShort = getTypeShort(slot.valueType);
    const labelText = `${slot.displayName}${typeShort ? `(${typeShort})` : ''}`;
    const label = document.createElementNS(ns, 'text');
    label.classList.add('port-label');
    label.setAttribute('x', String(PORT_R + 5));
    label.setAttribute('y', String(cy + 4));
    label.textContent = labelText;
    g.appendChild(label);

    // Show inline default value if this port is NOT connected
    const portKey = `${node.id}:${slot.slotId}`;
    if (!connectedInputSlots.has(portKey)) {
      const defVal = formatDefaultValue(slot);
      if (defVal !== null) {
        const valText = document.createElementNS(ns, 'text');
        valText.classList.add('port-default-value');
        valText.setAttribute('x', String(PORT_R + 5));
        valText.setAttribute('y', String(cy + 14));
        valText.textContent = defVal;
        g.appendChild(valText);
      }
    }

    ports.push({ nodeId: node.id, slotId: slot.slotId, x: 0, y: cy });
  });

  // Output ports
  outputs.forEach((slot, i) => {
    const cy = HEADER_H + 14 + i * PORT_GAP;
    const circle = document.createElementNS(ns, 'circle');
    circle.classList.add('port', 'port-output');
    circle.setAttribute('cx', String(w));
    circle.setAttribute('cy', String(cy));
    g.appendChild(circle);

    const typeShort = getTypeShort(slot.valueType);
    const labelText = `${slot.displayName}${typeShort ? `(${typeShort})` : ''}`;
    const label = document.createElementNS(ns, 'text');
    label.classList.add('port-label');
    label.setAttribute('x', String(w - PORT_R - 5));
    label.setAttribute('y', String(cy + 4));
    label.setAttribute('text-anchor', 'end');
    label.textContent = labelText;
    g.appendChild(label);

    ports.push({ nodeId: node.id, slotId: slot.slotId, x: w, y: cy });
  });

  // Texture thumbnail
  if (showThumbnail && texturePath) {
    const thumbY = HEADER_H + portsH;
    const thumbW = w - 20;
    const thumbX = 10;

    const img = document.createElementNS(ns, 'image');
    img.setAttribute('href', texturePath);
    img.setAttribute('x', String(thumbX));
    img.setAttribute('y', String(thumbY));
    img.setAttribute('width', String(thumbW));
    img.setAttribute('height', String(thumbH));
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    // Clip to rounded rect
    const clipId = `clip-${node.id}`;
    const clipPath = document.createElementNS(ns, 'clipPath');
    clipPath.id = clipId;
    const clipRect = document.createElementNS(ns, 'rect');
    clipRect.setAttribute('x', String(thumbX));
    clipRect.setAttribute('y', String(thumbY));
    clipRect.setAttribute('width', String(thumbW));
    clipRect.setAttribute('height', String(thumbH));
    clipRect.setAttribute('rx', '3');
    clipPath.appendChild(clipRect);
    g.appendChild(clipPath);
    img.setAttribute('clip-path', `url(#${clipId})`);
    g.appendChild(img);
  }

  return { group: g, ports };
}

function getTypeShort(valueType: string): string {
  if (valueType.includes('Vector4') || valueType.includes('DynamicValue')) return '4';
  if (valueType.includes('Vector3') || valueType.includes('Normal')) return '3';
  if (valueType.includes('Vector2') || valueType.includes('UV')) return '2';
  if (valueType.includes('Vector1') || (valueType.includes('Dynamic') && !valueType.includes('Value'))) return '1';
  if (valueType.includes('Texture2D')) return 'T2';
  if (valueType.includes('Boolean')) return 'B';
  if (valueType.includes('SamplerState')) return 'SS';
  if (valueType.includes('Color')) return '4';
  return '';
}

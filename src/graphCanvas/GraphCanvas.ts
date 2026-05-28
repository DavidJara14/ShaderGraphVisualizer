import { GraphModel, EdgeInfo, NodeInfo } from '../shaderGraph/types';
import { createNodeSVG, PortPosition } from './NodeElement';
import { createWirePath, updateWirePath } from './WireRenderer';

const ns = 'http://www.w3.org/2000/svg';

interface NodeState {
  node: NodeInfo;
  group: SVGGElement;
  ports: PortPosition[];
  x: number;
  y: number;
}

export class GraphCanvas {
  private container: HTMLElement;
  private svg!: SVGSVGElement;
  private contentGroup!: SVGGElement;
  private wireGroup!: SVGGElement;
  private nodeGroup!: SVGGElement;
  private contextGroup!: SVGGElement;

  private nodeStates: Map<string, NodeState> = new Map();
  private wires: { path: SVGPathElement; edge: EdgeInfo }[] = [];
  private contextBlockMap: Map<string, string> = new Map(); // blockId → 'Vertex'|'Fragment'
  private contextElements: Map<string, { rect: SVGRectElement; label: SVGTextElement; x: number; y: number }> = new Map();

  private viewX = 0;
  private viewY = 0;
  private zoom = 1;

  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;

  private dragNode: NodeState | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragGroup: { nodes: NodeState[]; contextKey: string } | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createSVG();
    this.bindEvents();
  }

  private createSVG() {
    this.svg = document.createElementNS(ns, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');

    this.contentGroup = document.createElementNS(ns, 'g');
    this.contextGroup = document.createElementNS(ns, 'g');
    this.wireGroup = document.createElementNS(ns, 'g');
    this.nodeGroup = document.createElementNS(ns, 'g');

    this.contentGroup.appendChild(this.contextGroup);
    this.contentGroup.appendChild(this.wireGroup);
    this.contentGroup.appendChild(this.nodeGroup);
    this.svg.appendChild(this.contentGroup);
    this.container.appendChild(this.svg);
  }

  private bindEvents() {
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const oldZoom = this.zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.05, Math.min(5, this.zoom * delta));

      this.viewX = mx - (mx - this.viewX) * (this.zoom / oldZoom);
      this.viewY = my - (my - this.viewY) * (this.zoom / oldZoom);
      this.applyTransform();
    });

    this.svg.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.isPanning = true;
        this.panStartX = e.clientX - this.viewX;
        this.panStartY = e.clientY - this.viewY;
        this.container.classList.add('panning');
      }
      if (e.button === 0) {
        // Check if clicking on a context box first
        const ctxEl = (e.target as Element).closest('.sg-context-box');
        if (ctxEl) {
          const ctxKey = ctxEl.getAttribute('data-context');
          if (ctxKey) {
            e.preventDefault();
            const groupNodes: NodeState[] = [];
            for (const [blockId, ctx] of this.contextBlockMap) {
              if (ctx === ctxKey) {
                const st = this.nodeStates.get(blockId);
                if (st) groupNodes.push(st);
              }
            }
            if (groupNodes.length > 0) {
              const pt = this.svgPoint(e.clientX, e.clientY);
              this.dragNode = groupNodes[0]; // anchor
              this.dragOffsetX = pt.x - groupNodes[0].x;
              this.dragOffsetY = pt.y - groupNodes[0].y;
              this.dragGroup = { nodes: groupNodes, contextKey: ctxKey };
            }
          }
        } else {
          const nodeEl = (e.target as Element).closest('.sg-node');
          if (nodeEl) {
            const nodeId = nodeEl.getAttribute('data-node-id');
            if (nodeId) {
              const state = this.nodeStates.get(nodeId);
              if (state) {
                e.preventDefault();
                const contextKey = this.contextBlockMap.get(nodeId);
                if (contextKey) {
                  // Dragging a block node → drag entire context group
                  const groupNodes: NodeState[] = [];
                  for (const [blockId, ctx] of this.contextBlockMap) {
                    if (ctx === contextKey) {
                      const st = this.nodeStates.get(blockId);
                      if (st) groupNodes.push(st);
                    }
                  }
                  const pt = this.svgPoint(e.clientX, e.clientY);
                  this.dragNode = state;
                  this.dragOffsetX = pt.x - state.x;
                  this.dragOffsetY = pt.y - state.y;
                  this.dragGroup = { nodes: groupNodes, contextKey };
                } else {
                  // Normal single-node drag
                  const pt = this.svgPoint(e.clientX, e.clientY);
                  this.dragNode = state;
                  this.dragOffsetX = pt.x - state.x;
                  this.dragOffsetY = pt.y - state.y;
                  this.dragGroup = null;
                }
              }
            }
          }
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.viewX = e.clientX - this.panStartX;
        this.viewY = e.clientY - this.panStartY;
        this.applyTransform();
      }
      if (this.dragNode) {
        const pt = this.svgPoint(e.clientX, e.clientY);
        const newX = pt.x - this.dragOffsetX;
        const newY = pt.y - this.dragOffsetY;
        const dx = newX - this.dragNode.x;
        const dy = newY - this.dragNode.y;

        if (this.dragGroup) {
          // Move all nodes in the context group
          for (const ns of this.dragGroup.nodes) {
            ns.x += dx;
            ns.y += dy;
            ns.group.setAttribute('transform', `translate(${ns.x}, ${ns.y})`);
          }
          // Move the context box
          const ctxEl = this.contextElements.get(this.dragGroup.contextKey);
          if (ctxEl) {
            ctxEl.x += dx;
            ctxEl.y += dy;
            ctxEl.rect.setAttribute('x', String(ctxEl.x));
            ctxEl.rect.setAttribute('y', String(ctxEl.y));
            ctxEl.label.setAttribute('x', String(ctxEl.x + 10));
            ctxEl.label.setAttribute('y', String(ctxEl.y - 8));
          }
        } else {
          this.dragNode.x = newX;
          this.dragNode.y = newY;
          this.dragNode.group.setAttribute('transform', `translate(${this.dragNode.x}, ${this.dragNode.y})`);
        }
        this.updateWires();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) {
        this.isPanning = false;
        this.container.classList.remove('panning');
      }
      if (e.button === 0) {
        this.dragNode = null;
        this.dragGroup = null;
      }
    });
  }

  private svgPoint(cx: number, cy: number): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: (cx - rect.left - this.viewX) / this.zoom,
      y: (cy - rect.top - this.viewY) / this.zoom,
    };
  }

  private applyTransform() {
    this.contentGroup.setAttribute(
      'transform',
      `translate(${this.viewX}, ${this.viewY}) scale(${this.zoom})`
    );
  }

  setModel(model: GraphModel, texturePaths?: Record<string, string>) {
    this.nodeStates.clear();
    this.wires = [];
    this.contextBlockMap.clear();
    this.contextElements.clear();
    this.nodeGroup.innerHTML = '';
    this.wireGroup.innerHTML = '';
    this.contextGroup.innerHTML = '';

    // Build set of connected input slots (nodeId:slotId) so nodes can hide defaults for connected ports
    const connectedInputSlots = new Set<string>();
    for (const edge of model.edges) {
      connectedInputSlots.add(`${edge.inputNodeId}:${edge.inputSlotId}`);
    }

    // Build texture node map: nodeId → texture file path
    // Traces edges from SampleTexture2D/Texture2DAsset nodes downstream to BlockNodes
    // to determine which texture each node represents
    const textureNodeMap = this.buildTextureNodeMap(model, texturePaths);

    // Build context-to-block mapping for group dragging
    for (const blockId of model.vertexContext.blockIds) {
      this.contextBlockMap.set(blockId, 'Vertex');
    }
    for (const blockId of model.fragmentContext.blockIds) {
      this.contextBlockMap.set(blockId, 'Fragment');
    }

    // Render context boxes
    this.renderContext('Vertex', model.vertexContext, model);
    this.renderContext('Fragment', model.fragmentContext, model);

    // Render nodes
    for (const node of model.nodes) {
      if (node.isBlock && node.position.width === 0) {
        // Block nodes with zero size are placed inside context boxes
        // Give them reasonable positions relative to their context
        const inVertex = model.vertexContext.blockIds.includes(node.id);
        const ctx = inVertex ? model.vertexContext : model.fragmentContext;
        const blockIndex = (inVertex ? model.vertexContext : model.fragmentContext)
          .blockIds.indexOf(node.id);
        node.position = {
          x: ctx.position.x + 10,
          y: ctx.position.y + 30 + blockIndex * 50,
          width: 180,
          height: 40,
        };
      }

      const texPath = textureNodeMap.get(node.id) ?? null;
      const { group, ports } = createNodeSVG(node, connectedInputSlots, texPath);
      const x = node.position.x;
      const y = node.position.y;
      group.setAttribute('transform', `translate(${x}, ${y})`);
      this.nodeGroup.appendChild(group);
      this.nodeStates.set(node.id, { node, group, ports, x, y });
    }

    // Render wires
    for (const edge of model.edges) {
      const fromState = this.nodeStates.get(edge.outputNodeId);
      const toState = this.nodeStates.get(edge.inputNodeId);
      if (!fromState || !toState) continue;

      const fromPort = fromState.ports.find(p => p.slotId === edge.outputSlotId);
      const toPort = toState.ports.find(p => p.slotId === edge.inputSlotId);
      if (!fromPort || !toPort) continue;

      const from = { x: fromState.x + fromPort.x, y: fromState.y + fromPort.y };
      const to = { x: toState.x + toPort.x, y: toState.y + toPort.y };
      const path = createWirePath(from, to);
      this.wireGroup.appendChild(path);
      this.wires.push({ path, edge });
    }

    // Center view
    this.fitToView();
  }

  private renderContext(label: string, ctx: { position: { x: number; y: number }; blockIds: string[] }, _model: GraphModel) {
    if (ctx.blockIds.length === 0) return;

    const x = ctx.position.x - 10;
    const y = ctx.position.y - 30;
    const w = 220;
    const h = ctx.blockIds.length * 50 + 60;

    const rect = document.createElementNS(ns, 'rect');
    rect.classList.add('sg-context-box');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('data-context', label);
    this.contextGroup.appendChild(rect);

    const text = document.createElementNS(ns, 'text');
    text.classList.add('sg-context-label');
    text.setAttribute('x', String(x + 10));
    text.setAttribute('y', String(y - 8));
    text.textContent = label;
    this.contextGroup.appendChild(text);

    this.contextElements.set(label, { rect, label: text, x, y });
  }

  /**
   * Build a map of nodeId → texture file path for SampleTexture2D and Texture2DAsset nodes.
   * Uses BFS from each texture-related node to find which BlockNode it feeds into,
   * then maps the block descriptor (e.g. "BaseColor") to the texture uniform name
   * and resolves the file path from the shader manifest's texturePaths.
   */
  private buildTextureNodeMap(model: GraphModel, texturePaths?: Record<string, string>): Map<string, string> {
    const result = new Map<string, string>();
    if (!texturePaths) return result;

    // Block descriptor suffix → uniform name mapping
    const blockToUniform: Record<string, string[]> = {
      'BaseColor': ['_DiffuseMap', '_DifusionMap', '_Diffuse', '_Albedo', '_MainTex'],
      'Metallic': ['_MetallicMap', '_Metallic'],
      'NormalTS': ['_NormalMap', '_Normal', '_BumpMap'],
      'Smoothness': ['_RoughnessMap', '_Roughness', '_SmoothnessMap'],
      'Occlusion': ['_OcclusionMap', '_AO'],
      'Emission': ['_EmissionMap', '_Emission'],
    };

    // Build adjacency list (output node → input node edges)
    const adj = new Map<string, { to: string }[]>();
    for (const edge of model.edges) {
      if (!adj.has(edge.outputNodeId)) adj.set(edge.outputNodeId, []);
      adj.get(edge.outputNodeId)!.push({ to: edge.inputNodeId });
    }

    // Also build reverse adjacency for Texture2DAsset → SampleTexture2D tracing
    const reverseAdj = new Map<string, string[]>(); // inputNode → outputNodes
    for (const edge of model.edges) {
      if (!reverseAdj.has(edge.inputNodeId)) reverseAdj.set(edge.inputNodeId, []);
      reverseAdj.get(edge.inputNodeId)!.push(edge.outputNodeId);
    }

    // For each SampleTexture2DNode, BFS downstream to find reachable BlockNodes
    const sampleNodes = model.nodes.filter(n => n.typeName === 'SampleTexture2DNode');

    for (const sampleNode of sampleNodes) {
      const visited = new Set<string>();
      const queue = [sampleNode.id];
      let foundBlock: string | null = null;

      while (queue.length > 0 && !foundBlock) {
        const cur = queue.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);

        const curNode = model.nodesById.get(cur);
        if (curNode?.isBlock && curNode.serializedDescriptor) {
          // Extract the last part: "SurfaceDescription.BaseColor" → "BaseColor"
          foundBlock = curNode.serializedDescriptor.split('.').pop() ?? null;
          break;
        }
        for (const edge of (adj.get(cur) || [])) {
          queue.push(edge.to);
        }
      }

      if (foundBlock) {
        // Find matching uniform name from block descriptor
        const candidates = blockToUniform[foundBlock] ?? [];
        for (const uniformName of candidates) {
          if (uniformName in texturePaths) {
            result.set(sampleNode.id, texturePaths[uniformName]);
            break;
          }
        }
      }
    }

    // For Texture2DAssetNodes: find which SampleTexture2D it feeds via edges,
    // and use the same texture path
    const assetNodes = model.nodes.filter(n => n.typeName === 'Texture2DAssetNode');
    for (const assetNode of assetNodes) {
      const downstream = adj.get(assetNode.id) || [];
      for (const { to } of downstream) {
        const texPath = result.get(to);
        if (texPath) {
          result.set(assetNode.id, texPath);
          break;
        }
      }
    }

    return result;
  }

  private updateWires() {
    for (const { path, edge } of this.wires) {
      const fromState = this.nodeStates.get(edge.outputNodeId);
      const toState = this.nodeStates.get(edge.inputNodeId);
      if (!fromState || !toState) continue;

      const fromPort = fromState.ports.find(p => p.slotId === edge.outputSlotId);
      const toPort = toState.ports.find(p => p.slotId === edge.inputSlotId);
      if (!fromPort || !toPort) continue;

      const from = { x: fromState.x + fromPort.x, y: fromState.y + fromPort.y };
      const to = { x: toState.x + toPort.x, y: toState.y + toPort.y };
      updateWirePath(path, from, to);
    }
  }

  private fitToView() {
    if (this.nodeStates.size === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const state of this.nodeStates.values()) {
      minX = Math.min(minX, state.x);
      minY = Math.min(minY, state.y);
      maxX = Math.max(maxX, state.x + (state.node.position.width || 200));
      maxY = Math.max(maxY, state.y + (state.node.position.height || 100));
    }

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const rect = this.container.getBoundingClientRect();
    const padFraction = 0.9;

    this.zoom = Math.min(
      (rect.width * padFraction) / graphW,
      (rect.height * padFraction) / graphH,
      1
    );

    this.viewX = (rect.width - graphW * this.zoom) / 2 - minX * this.zoom;
    this.viewY = (rect.height - graphH * this.zoom) / 2 - minY * this.zoom;
    this.applyTransform();
  }
}

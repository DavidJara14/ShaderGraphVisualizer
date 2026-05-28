import { GraphModel } from '../shaderGraph/types';

export class Inspector {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setModel(model: GraphModel, shaderName: string) {
    const pipeline = model.subTargetType.includes('Lit') && !model.subTargetType.includes('Unlit')
      ? 'Built-in Lit (PBR)'
      : 'Built-in Unlit';

    const vertexBlocks = model.vertexContext.blockIds
      .map(id => model.nodesById.get(id))
      .filter(Boolean)
      .map(n => n!.serializedDescriptor?.split('.').pop() ?? n!.name);

    const fragmentBlocks = model.fragmentContext.blockIds
      .map(id => model.nodesById.get(id))
      .filter(Boolean)
      .map(n => n!.serializedDescriptor?.split('.').pop() ?? n!.name);

    this.container.innerHTML = `
      <div class="meta-row"><span class="meta-label">Shader</span><span class="meta-value">${shaderName}</span></div>
      <div class="meta-row"><span class="meta-label">Pipeline</span><span class="meta-value">${pipeline}</span></div>
      <div class="meta-row"><span class="meta-label">Nodes</span><span class="meta-value">${model.nodes.length}</span></div>
      <div class="meta-row"><span class="meta-label">Edges</span><span class="meta-value">${model.edges.length}</span></div>
      <div class="meta-row"><span class="meta-label">Properties</span><span class="meta-value">${model.properties.length}</span></div>
      <div class="meta-row"><span class="meta-label">Vertex</span><span class="meta-value">${vertexBlocks.join(', ') || '—'}</span></div>
      <div class="meta-row"><span class="meta-label">Fragment</span><span class="meta-value">${fragmentBlocks.join(', ') || '—'}</span></div>
    `;
  }
}

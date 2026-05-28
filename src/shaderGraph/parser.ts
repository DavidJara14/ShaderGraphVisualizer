import {
  GraphModel, NodeInfo, SlotInfo, EdgeInfo, PropertyInfo, ContextInfo,
  PropertyType, Vec2,
} from './types';

type RawRecord = Record<string, any>;

function splitRecords(text: string): RawRecord[] {
  const records: RawRecord[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          records.push(JSON.parse(text.substring(start, i + 1)));
        } catch { /* skip malformed */ }
        start = -1;
      }
    }
  }
  return records;
}

function inferPropertyType(typeName: string): PropertyType {
  if (typeName.includes('Vector1') || typeName.includes('Float')) return 'float';
  if (typeName.includes('Color')) return 'color';
  if (typeName.includes('Vector2')) return 'vector2';
  if (typeName.includes('Vector3')) return 'vector3';
  if (typeName.includes('Vector4')) return 'vector4';
  if (typeName.includes('Texture2D')) return 'texture2d';
  if (typeName.includes('Boolean')) return 'boolean';
  return 'unknown';
}

function parseSlot(rec: RawRecord): SlotInfo {
  return {
    id: rec.m_ObjectId,
    slotId: rec.m_Id ?? 0,
    displayName: rec.m_DisplayName ?? '',
    slotType: rec.m_SlotType ?? 0,
    valueType: (rec.m_Type as string).replace('UnityEditor.ShaderGraph.', ''),
    defaultValue: rec.m_Value ?? rec.m_DefaultValue ?? null,
  };
}

function parseProperty(rec: RawRecord): PropertyInfo {
  const typeName = rec.m_Type as string;
  const ptype = inferPropertyType(typeName);

  let refName = rec.m_OverrideReferenceName || rec.m_DefaultReferenceName || `_${rec.m_Name}`;

  return {
    id: rec.m_ObjectId,
    name: rec.m_Name ?? 'Unknown',
    referenceName: refName,
    type: ptype,
    value: rec.m_Value,
    floatType: rec.m_FloatType,
    rangeValues: rec.m_RangeValues as Vec2 | undefined,
    colorMode: rec.m_ColorMode,
    hidden: rec.m_Hidden ?? false,
    raw: rec,
  };
}

function parseNode(rec: RawRecord, slotMap: Map<string, SlotInfo>): NodeInfo {
  const pos = rec.m_DrawState?.m_Position ?? { x: 0, y: 0, width: 200, height: 100 };
  const typeName = (rec.m_Type as string).replace('UnityEditor.ShaderGraph.', '');
  const slotRefs: { m_Id: string }[] = rec.m_Slots ?? [];
  const slots = slotRefs.map(s => slotMap.get(s.m_Id)).filter(Boolean) as SlotInfo[];

  return {
    id: rec.m_ObjectId,
    name: rec.m_Name ?? typeName,
    typeName,
    position: {
      x: pos.x ?? 0,
      y: pos.y ?? 0,
      width: pos.width ?? 200,
      height: pos.height ?? 100,
    },
    slots,
    isBlock: typeName === 'BlockNode',
    serializedDescriptor: rec.m_SerializedDescriptor,
    propertyRef: rec.m_Property?.m_Id,
    extra: rec,
  };
}

export function parseShaderGraph(text: string): GraphModel {
  const allRecords = splitRecords(text);
  const byId = new Map<string, RawRecord>();
  for (const rec of allRecords) {
    if (rec.m_ObjectId) byId.set(rec.m_ObjectId, rec);
  }

  const graphData = allRecords.find(r => r.m_Type === 'UnityEditor.ShaderGraph.GraphData');
  if (!graphData) throw new Error('No GraphData record found');

  // Build slot map first
  const slotMap = new Map<string, SlotInfo>();
  for (const rec of allRecords) {
    const t = rec.m_Type as string;
    if (t && t.includes('MaterialSlot') || t?.includes('Slot')) {
      if (rec.m_ObjectId && rec.m_DisplayName !== undefined) {
        slotMap.set(rec.m_ObjectId, parseSlot(rec));
      }
    }
  }

  // Properties
  const properties: PropertyInfo[] = [];
  const propIds = (graphData.m_Properties ?? []).map((p: any) => p.m_Id);
  for (const pid of propIds) {
    const rec = byId.get(pid);
    if (rec) properties.push(parseProperty(rec));
  }

  // Nodes
  const nodeIds = (graphData.m_Nodes ?? []).map((n: any) => n.m_Id);
  const nodes: NodeInfo[] = [];
  for (const nid of nodeIds) {
    const rec = byId.get(nid);
    if (rec) nodes.push(parseNode(rec, slotMap));
  }
  const nodesById = new Map<string, NodeInfo>();
  for (const n of nodes) nodesById.set(n.id, n);

  // Edges
  const edges: EdgeInfo[] = (graphData.m_Edges ?? []).map((e: any) => ({
    outputNodeId: e.m_OutputSlot.m_Node.m_Id,
    outputSlotId: e.m_OutputSlot.m_SlotId,
    inputNodeId: e.m_InputSlot.m_Node.m_Id,
    inputSlotId: e.m_InputSlot.m_SlotId,
  }));

  // Contexts
  const parseContext = (ctx: any): ContextInfo => ({
    position: { x: ctx?.m_Position?.x ?? 0, y: ctx?.m_Position?.y ?? 0 },
    blockIds: (ctx?.m_Blocks ?? []).map((b: any) => b.m_Id),
  });

  // Targets
  let activeTargetType = '';
  let subTargetType = '';
  const targetIds = (graphData.m_ActiveTargets ?? []).map((t: any) => t.m_Id);
  for (const tid of targetIds) {
    const rec = byId.get(tid);
    if (rec) {
      activeTargetType = rec.m_Type ?? '';
      const activeSubId = rec.m_ActiveSubTarget?.m_Id;
      if (activeSubId) {
        const sub = byId.get(activeSubId);
        if (sub) subTargetType = sub.m_Type ?? '';
      }
    }
  }

  return {
    nodes,
    nodesById,
    edges,
    properties,
    vertexContext: parseContext(graphData.m_VertexContext),
    fragmentContext: parseContext(graphData.m_FragmentContext),
    activeTargetType,
    subTargetType,
    precision: graphData.m_GraphPrecision ?? 0,
    path: graphData.m_Path ?? '',
    raw: graphData,
  };
}

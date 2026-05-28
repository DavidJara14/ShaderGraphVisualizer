export interface Vec2 { x: number; y: number; }
export interface Vec3 { x: number; y: number; z: number; }
export interface Vec4 { x: number; y: number; z: number; w: number; }
export interface Color { r: number; g: number; b: number; a: number; }

export interface SlotInfo {
  id: string;
  slotId: number;
  displayName: string;
  slotType: 0 | 1; // 0=input, 1=output
  valueType: string;
  defaultValue: unknown;
}

export interface NodeInfo {
  id: string;
  name: string;
  typeName: string;
  position: { x: number; y: number; width: number; height: number };
  slots: SlotInfo[];
  isBlock: boolean;
  serializedDescriptor?: string;
  propertyRef?: string;
  extra: Record<string, unknown>;
}

export interface EdgeInfo {
  outputNodeId: string;
  outputSlotId: number;
  inputNodeId: string;
  inputSlotId: number;
}

export type PropertyType = 'float' | 'color' | 'vector2' | 'vector3' | 'vector4' | 'texture2d' | 'boolean' | 'unknown';

export interface PropertyInfo {
  id: string;
  name: string;
  referenceName: string;
  type: PropertyType;
  value: unknown;
  floatType?: number; // 0=default, 1=slider/range
  rangeValues?: Vec2;
  colorMode?: number;
  hidden: boolean;
  raw: Record<string, unknown>;
}

export interface ContextInfo {
  position: Vec2;
  blockIds: string[];
}

export interface GraphModel {
  nodes: NodeInfo[];
  nodesById: Map<string, NodeInfo>;
  edges: EdgeInfo[];
  properties: PropertyInfo[];
  vertexContext: ContextInfo;
  fragmentContext: ContextInfo;
  activeTargetType: string;
  subTargetType: string;
  precision: number;
  path: string;
  raw: Record<string, unknown>;
}

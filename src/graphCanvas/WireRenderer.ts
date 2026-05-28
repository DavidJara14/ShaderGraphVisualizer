import { PortPosition } from './NodeElement';

const ns = 'http://www.w3.org/2000/svg';

export function createWirePath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): SVGPathElement {
  const dx = Math.abs(to.x - from.x) * 0.5;
  const d = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;

  const path = document.createElementNS(ns, 'path');
  path.classList.add('sg-wire');
  path.setAttribute('d', d);
  return path;
}

export function updateWirePath(
  path: SVGPathElement,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  const dx = Math.abs(to.x - from.x) * 0.5;
  const d = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  path.setAttribute('d', d);
}

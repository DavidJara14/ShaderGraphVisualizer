import * as THREE from 'three';

export function createMesh(type: string): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  switch (type) {
    case 'Cube': geo = new THREE.BoxGeometry(1, 1, 1, 16, 16, 16); break;
    case 'Plane': geo = new THREE.PlaneGeometry(1.5, 1.5, 32, 32); break;
    case 'Capsule': geo = new THREE.CapsuleGeometry(0.4, 0.8, 16, 32); break;
    case 'Cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 2.0, 32, 16); break;
    case 'Sphere':
    default: geo = new THREE.SphereGeometry(0.7, 64, 64); break;
  }
  geo.computeTangents();
  return geo;
}

export function createSkyboxMesh(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(10, 64, 64);
}

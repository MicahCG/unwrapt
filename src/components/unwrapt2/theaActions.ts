import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type TheaActivity = 'idle' | 'calendar' | 'clipboard' | 'chat';

/** Calendar decoration only. Never replace the approved character's body or add arms. */
export function createTheaActions(_model: THREE.Object3D, scene: THREE.Scene) {
  const calendar = new THREE.Group();
  scene.add(calendar);
  const cream = new THREE.MeshStandardMaterial({ color: '#fff5df', roughness: 0.65 });
  const rust = new THREE.MeshStandardMaterial({ color: '#b95f43', roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c3a366', metalness: 0.65, roughness: 0.28 });
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    calendar.add(mesh);
    return mesh;
  };
  part(new RoundedBoxGeometry(0.4, 0.43, 0.045, 2, 0.009), cream);
  part(new RoundedBoxGeometry(0.4, 0.1, 0.05, 2, 0.01), rust, 0, 0.165, 0.01);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      part(new THREE.SphereGeometry(0.018, 12, 8), row === 1 && col === 1 ? rust : gold,
        (col - 1) * 0.1, 0.06 - row * 0.085, 0.033).scale.z = 0.3;
    }
  }
  for (const x of [-0.12, 0.12]) {
    part(new THREE.TorusGeometry(0.033, 0.009, 8, 16), gold, x, 0.205, 0.025);
  }
  let elapsed = 0;
  calendar.visible = false;
  return {
    setActivity(activity: TheaActivity) { calendar.visible = activity === 'calendar'; elapsed = 0; },
    update(delta: number) {
      if (!calendar.visible) return;
      elapsed += delta;
      calendar.position.set(0.85, 1.5 + Math.sin(elapsed * 1.5) * 0.035, 0.15);
      calendar.rotation.set(-0.05, -0.15, Math.sin(elapsed) * 0.06);
    },
    dispose() {
      calendar.removeFromParent();
      calendar.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      cream.dispose(); rust.dispose(); gold.dispose();
    },
  };
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type TheaActivity = 'idle' | 'calendar' | 'clipboard' | 'chat';
const ease = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };

/** Contextual props and articulated sleeves in the character's normalized coordinate space. */
export function createTheaActions(model: THREE.Object3D, scene: THREE.Scene) {
  const props = new THREE.Group();
  scene.add(props);
  const cream = new THREE.MeshStandardMaterial({ color: '#fff5df', roughness: 0.65 });
  const rust = new THREE.MeshStandardMaterial({ color: '#b95f43', roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c3a366', metalness: 0.65, roughness: 0.28 });
  const ink = new THREE.MeshStandardMaterial({ color: '#484138', roughness: 0.8 });
  const paper = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.9 });
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const part = new THREE.Mesh(geometry, material); part.position.set(x, y, z); parent.add(part); return part;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2), material, parent, x, y, z);
  const calendar = new THREE.Group(); props.add(calendar);
  box(0.4, 0.43, 0.045, cream, calendar);
  box(0.4, 0.1, 0.05, rust, calendar, 0, 0.165, 0.01);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    mesh(new THREE.SphereGeometry(0.018, 12, 8), row === 1 && col === 1 ? rust : gold, calendar, (col - 1) * 0.1, 0.06 - row * 0.085, 0.033).scale.z = 0.3;
  }
  for (const x of [-0.12, 0.12]) mesh(new THREE.TorusGeometry(0.033, 0.009, 8, 16), gold, calendar, x, 0.205, 0.025);

  const clipboard = new THREE.Group(); props.add(clipboard);
  box(0.49, 0.55, 0.035, rust, clipboard);
  box(0.43, 0.46, 0.012, paper, clipboard, 0, -0.015, 0.027);
  box(0.17, 0.07, 0.025, gold, clipboard, 0, 0.245, 0.045);
  const marks: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) marks.push(box(0.23, 0.012, 0.005, ink, clipboard, 0.025, 0.13 - i * 0.09, 0.038));
  const pen = new THREE.Group(); props.add(pen);
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12), gold, pen);
  mesh(new THREE.ConeGeometry(0.014, 0.055, 12), ink, pen, 0, -0.136).rotation.z = Math.PI;

  const coffee = new THREE.Group(); props.add(coffee);
  mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.17, 28, 1, true), cream, coffee, 0, 0.085);
  mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.009, 28), new THREE.MeshStandardMaterial({ color: '#492a1b', roughness: 0.8 }), coffee, 0, 0.162);
  mesh(new THREE.TorusGeometry(0.1, 0.009, 8, 28), cream, coffee, 0, 0.17).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.059, 0.014, 8, 20), cream, coffee, 0.112, 0.085).scale.x = 0.8;
  const wine = new THREE.Group(); props.add(wine);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#e5d7c4', transparent: true, opacity: 0.38, roughness: 0.12, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15, 12), glass, wine, 0, 0.09);
  mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.008, 24), glass, wine);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0.008, 0.15), new THREE.Vector2(0.07, 0.17), new THREE.Vector2(0.085, 0.22), new THREE.Vector2(0.07, 0.3)], 28), glass, wine);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0.159), new THREE.Vector2(0.062, 0.18), new THREE.Vector2(0.077, 0.23), new THREE.Vector2(0, 0.23)], 28), new THREE.MeshStandardMaterial({ color: '#6e213a', roughness: 0.2 }), wine);

  // Independent articulated sleeves avoid stretching the source's fused folded arms.
  const body = new THREE.Group(); props.add(body);
  const knit = new THREE.MeshStandardMaterial({ color: '#d4cbb9', roughness: 0.94 });
  const fabricCanvas = document.createElement('canvas'); fabricCanvas.width = fabricCanvas.height = 64;
  const fabricContext = fabricCanvas.getContext('2d');
  if (fabricContext) {
    fabricContext.fillStyle = '#888'; fabricContext.fillRect(0, 0, 64, 64);
    fabricContext.strokeStyle = '#bbb'; fabricContext.lineWidth = 3;
    for (let y = -8; y < 72; y += 16) for (let x = 0; x < 64; x += 16) {
      fabricContext.beginPath(); fabricContext.moveTo(x, y); fabricContext.quadraticCurveTo(x + 8, y + 4, x + 8, y + 14); fabricContext.quadraticCurveTo(x + 8, y + 4, x + 16, y); fabricContext.stroke();
    }
    const fabric = new THREE.CanvasTexture(fabricCanvas); fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping; fabric.repeat.set(2, 4); knit.bumpMap = fabric; knit.bumpScale = 0.018;
  }
  const skin = new THREE.MeshStandardMaterial({ color: '#b97b53', roughness: 0.57 });
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.21, 0, 0), new THREE.Vector3(0.26, 0.08, 0), new THREE.Vector3(0.265, 0.38, 0),
    new THREE.Vector3(0.25, 0.61, 0), new THREE.Vector3(0.19, 0.74, 0), new THREE.Vector3(0.125, 0.82, 0), new THREE.Vector3(0.125, 0.87, 0),
  ]);
  const torso = mesh(new THREE.LatheGeometry(profile.getPoints(48).map(p => new THREE.Vector2(p.x, p.y)), 48), knit, body); torso.scale.z = 0.73;
  const collar = mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.12, 40), knit, body, 0, 0.81); collar.scale.z = 0.88;
  for (let i = 0; i < 36; i++) {
    const angle = i / 36 * Math.PI * 2;
    mesh(new THREE.CapsuleGeometry(0.003, 0.1, 4, 6), knit, body, Math.cos(angle) * 0.157, 0.81, Math.sin(angle) * 0.137);
  }
  for (let i = 0; i < 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    const rib = mesh(new THREE.CapsuleGeometry(0.005, 0.055, 4, 6), cream, body, Math.cos(angle) * 0.225, 0.04, Math.sin(angle) * 0.164);
    rib.scale.y = 1;
  }
  for (let j = 0; j < 3; j++) {
    const points = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return new THREE.Vector3((t - 0.5) * (0.27 + j * 0.025), 0.75 - Math.sin(t * Math.PI) * (0.14 + j * 0.07), 0.17 + Math.sin(t * Math.PI) * 0.045); });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.004, 6, false), gold, body);
  }
  const makeArm = () => {
    const arm = new THREE.Group(); body.add(arm);
    const rings = 22, sides = 16;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((rings + 1) * (sides + 1) * 3);
    const uvs = new Float32Array((rings + 1) * (sides + 1) * 2);
    const indices: number[] = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= sides; j++) {
      const n = i * (sides + 1) + j;
      uvs[n * 2] = j / sides; uvs[n * 2 + 1] = i / rings;
      if (i < rings && j < sides) { const k = n + sides + 1; indices.push(n, n + 1, k, n + 1, k + 1, k); }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    const shoulderCap = mesh(new THREE.SphereGeometry(0.105, 20, 14), knit, arm);
    const sleeve = mesh(geometry, knit, arm); sleeve.frustumCulled = false;
    const cuff = mesh(new THREE.CylinderGeometry(0.069, 0.078, 0.09, 24), knit, arm);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      mesh(new THREE.CapsuleGeometry(0.003, 0.074, 4, 6), knit, cuff, Math.cos(angle) * 0.073, 0, Math.sin(angle) * 0.073);
    }
    const hand = new THREE.Group(); arm.add(hand);
    mesh(new THREE.SphereGeometry(0.057, 20, 14), skin, hand).scale.set(0.78, 1, 0.55);
    for (let i = 0; i < 4; i++) {
      const finger = mesh(new THREE.CapsuleGeometry(0.011, 0.045 - Math.abs(i - 1.5) * 0.006, 6, 10), skin, hand, (i - 1.5) * 0.023, 0.045, 0.012);
      finger.rotation.x = -0.75;
    }
    mesh(new THREE.CapsuleGeometry(0.015, 0.028, 6, 10), skin, hand, -0.047, 0.005, 0.013).rotation.z = -0.65;
    const up = new THREE.Vector3(0, 1, 0);
    return { pose(shoulder: THREE.Vector3, elbow: THREE.Vector3, wrist: THREE.Vector3, roll = 0) {
      shoulderCap.position.copy(shoulder);
      const curve = new THREE.QuadraticBezierCurve3(shoulder, elbow.clone().multiplyScalar(2).sub(shoulder.clone().add(wrist).multiplyScalar(0.5)), wrist);
      const frames = curve.computeFrenetFrames(rings, false);
      for (let i = 0; i <= rings; i++) {
        const t = i / rings, center = curve.getPoint(t);
        const radius = 0.105 - t * 0.035 + Math.sin(t * Math.PI) * 0.009;
        for (let j = 0; j <= sides; j++) {
          const angle = j / sides * Math.PI * 2;
          const fold = 1 + 0.025 * Math.sin(t * 52) * Math.sin(t * Math.PI);
          const a = Math.cos(angle) * radius * fold, b = Math.sin(angle) * radius * fold;
          const normal = frames.normals[i], binormal = frames.binormals[i];
          const n = (i * (sides + 1) + j) * 3;
          positions[n] = center.x + normal.x * a + binormal.x * b;
          positions[n + 1] = center.y + normal.y * a + binormal.y * b;
          positions[n + 2] = center.z + normal.z * a + binormal.z * b;
        }
      }
      geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals();
      const direction = curve.getTangent(1).normalize();
      cuff.position.copy(wrist).addScaledVector(direction, -0.015); cuff.quaternion.setFromUnitVectors(up, direction);
      hand.position.copy(wrist).add(wrist.clone().sub(elbow).normalize().multiplyScalar(0.065)); hand.rotation.set(-0.1, 0, roll);
    } };
  };
  const leftArm = makeArm(), rightArm = makeArm();
  const head = model.getObjectByName('Head');
  const folded = model.getObjectByName('FoldedBody');
  let activity: TheaActivity = 'idle', elapsed = 0;
  const rotate = (bone: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) => {
    if (!bone || !bone.parent) return;
    const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const delta = parentRotation.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle)).multiply(parentRotation);
    bone.quaternion.premultiply(delta);
    bone.updateMatrixWorld(true);
  };
  const zAxis = new THREE.Vector3(0, 0, 1), xAxis = new THREE.Vector3(1, 0, 0);
  return {
    setActivity(next: TheaActivity) { if (activity !== next) { activity = next; elapsed = 0; } },
    update(delta: number) {
      elapsed += delta;
      body.visible = activity !== 'idle';
      if (folded) folded.visible = !body.visible;
      calendar.visible = activity === 'calendar'; clipboard.visible = pen.visible = activity === 'clipboard'; coffee.visible = wine.visible = false;
      if (activity === 'calendar') {
        calendar.position.set(0.85, 1.5 + Math.sin(elapsed * 1.5) * 0.035, 0.15);
        calendar.rotation.set(-0.05, -0.15, Math.sin(elapsed) * 0.06);
        rotate(head, zAxis, -0.07);
        const thinking = 0.02 * Math.sin(elapsed * 1.3);
        rightArm.pose(new THREE.Vector3(0.2, 0.65, 0.04), new THREE.Vector3(0.35, 0.46, 0.16), new THREE.Vector3(0.12, 0.99 + thinking, 0.36), -0.35);
        leftArm.pose(new THREE.Vector3(-0.2, 0.65, 0.04), new THREE.Vector3(-0.3, 0.3, 0.16), new THREE.Vector3(0.12, 0.32, 0.32), -0.6);
      } else if (activity === 'clipboard') {
        rotate(head, xAxis, 0.14);
        clipboard.position.set(0.07, 0.4, 0.39); clipboard.rotation.set(-0.08, 0, -0.04);
        const row = Math.min(3, Math.floor(elapsed % 7 / 1.2));
        const stroke = (elapsed % 1.2) / 1.2;
        const wrist = new THREE.Vector3(0.01 + stroke * 0.17, 0.64 - row * 0.07 + Math.sin(elapsed * 18) * 0.005, 0.46);
        leftArm.pose(new THREE.Vector3(-0.2, 0.65, 0.04), new THREE.Vector3(-0.3, 0.37, 0.18), wrist, -0.3);
        rightArm.pose(new THREE.Vector3(0.2, 0.65, 0.04), new THREE.Vector3(0.34, 0.3, 0.12), new THREE.Vector3(0.3, 0.38, 0.44), -0.2);
        pen.position.copy(wrist).add(new THREE.Vector3(0.015, 0.025, 0.025)); pen.rotation.set(0.02, 0, -0.45);
        marks.forEach((mark, i) => { mark.scale.x = ease((elapsed % 7) / 1.2 - i); });
      } else if (activity === 'chat') {
        const t = elapsed % 16, phase = t % 8;
        const reveal = ease(phase / 1.1) * (1 - ease((phase - 6.7) / 1.1));
        const sip = ease((phase - 2.1) / 1.1) * (1 - ease((phase - 4.1) / 1.1));
        const isWine = t >= 8;
        const drink = isWine ? wine : coffee; drink.visible = reveal > 0.01;
        // Reach around her side, bring the drink forward, then lift it to her lips.
        const wrist = new THREE.Vector3(0.46 - reveal * 0.22 - sip * 0.21, 0.36 + sip * (isWine ? 0.47 : 0.6), -0.16 + reveal * 0.53);
        rightArm.pose(new THREE.Vector3(0.2, 0.65, 0.04), new THREE.Vector3(0.34, 0.37 + sip * 0.06, 0.16), wrist, -sip * 0.3);
        leftArm.pose(new THREE.Vector3(-0.2, 0.65, 0.04), new THREE.Vector3(-0.32, 0.25, 0.12), new THREE.Vector3(-0.12, 0.23, 0.3), 0.3);
        drink.scale.setScalar(1);
        drink.position.copy(wrist).add(new THREE.Vector3(-0.055, -0.045, 0.02));
        drink.rotation.z = sip * 0.15;
        rotate(head, xAxis, sip * 0.08);
      }
    },
    dispose() {
      props.removeFromParent();
      knit.bumpMap?.dispose();
      const materials = new Set<THREE.Material>();
      props.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      });
      materials.forEach(material => material.dispose());
    },
  };
}

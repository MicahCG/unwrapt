import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** The Spline greeting's motion, using a compressed GLB and the existing Three runtime. */
export function mountThea(canvas: HTMLCanvasElement, ready: () => void, failed: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xa8a0a0, 2.3));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.7);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(3, 2, 2);
  scene.add(fill);
  const greeting = new THREE.Group();
  scene.add(greeting);
  let disposed = false, visible = true, frame = 0, elapsed = 0, last = 0;
  let model: THREE.Object3D | undefined;
  const disposeModel = (root: THREE.Object3D) => {
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, 1, Math.max(4.2, 2.1 / camera.aspect));
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  };
  const tick = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || !visible) { last = now; return; }
    if (now - last < 1000 / 30) return;
    elapsed += Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = elapsed;
    const idle = Math.max(0, Math.min(1, (t - 1.1) / 1.1));
    greeting.position.y = Math.exp(-2.5 * t) * Math.sin(7 * t) * 0.09;
    greeting.rotation.set(
      -Math.sin(Math.min(t, 2.4) / 2.4 * Math.PI) * 0.025,
      Math.sin(t * 0.65) * 0.022 * idle,
      Math.sin(t * 0.8) * 0.004 * idle,
    );
    greeting.scale.y = 1 + Math.sin(t * 1.5) * 0.002 * idle;
    renderer.render(scene, camera);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  observer.observe(canvas);
  const resizer = new ResizeObserver(resize);
  resizer.observe(canvas);
  const lost = (event: Event) => { event.preventDefault(); failed(); };
  canvas.addEventListener('webglcontextlost', lost);
  const timeout = window.setTimeout(failed, 15000);
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('/models/thea-greeting-v2.glb', gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    window.clearTimeout(timeout);
    model = gltf.scene;
    let texturesReady = true;
    model.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && !object.material.map) texturesReady = false;
    });
    if (!texturesReady) { failed(); return; }
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2 / size.y;
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    greeting.add(model);
    resize();
    renderer.render(scene, camera);
    ready();
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }, undefined, failed);
  return () => {
    disposed = true;
    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizer.disconnect();
    canvas.removeEventListener('webglcontextlost', lost);
    if (model) disposeModel(model);
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type TheaGesture = 'Greeting' | 'Present' | 'Listen';

// Share the downloaded bytes across onboarding steps, but give every mounted
// character its own skeleton, textures and renderer lifecycle.
let modelBytes: Promise<ArrayBuffer> | undefined;
function loadModel() {
  if (!modelBytes) {
    modelBytes = fetch('/models/thea-upper-body-v4.glb').then(response => {
      if (!response.ok) throw new Error('Thea model unavailable');
      return response.arrayBuffer();
    }).catch(error => { modelBytes = undefined; throw error; });
  }
  return modelBytes;
}

/** Plays independent skeletal gestures authored for the approved Thea model. */
export function mountThea(canvas: HTMLCanvasElement, ready: () => void, failed: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xa8a0a0, 2.3));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(3, 2, 2);
  scene.add(fill);
  const greeting = new THREE.Group();
  scene.add(greeting);
  let disposed = false, visible = true, frame = 0, last = 0;
  let mixer: THREE.AnimationMixer | undefined;
  let action: THREE.AnimationAction | undefined;
  let clips: THREE.AnimationClip[] = [];
  let gesture: TheaGesture = 'Greeting';
  const setGesture = (next: TheaGesture) => {
    gesture = next;
    if (!mixer) return;
    const clip = THREE.AnimationClip.findByName(clips, 'Sass');
    if (!clip) { failed(); return; }
    const nextAction = mixer.clipAction(clip);
    nextAction.setEffectiveTimeScale(next === 'Listen' ? 0.55 : next === 'Present' ? 0.8 : 1);
    if (nextAction === action) return;
    nextAction.reset().setEffectiveWeight(1).play();
    if (action) action.crossFadeTo(nextAction, 0.35, false);
    action = nextAction;
  };
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
    camera.position.set(0, 1, Math.max(4.25, 2.9 / camera.aspect));
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  };
  const tick = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || !visible) { last = now; return; }
    if (now - last < 1000 / 30) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    mixer?.update(delta);
    renderer.render(scene, camera);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  observer.observe(canvas);
  const resizer = new ResizeObserver(resize);
  resizer.observe(canvas);
  const lost = (event: Event) => { event.preventDefault(); failed(); };
  canvas.addEventListener('webglcontextlost', lost);
  const timeout = window.setTimeout(failed, 15000);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loadModel().then(bytes => {
    if (disposed) return undefined;
    return loader.parseAsync(bytes, '/models/');
  }).then(gltf => {
    if (!gltf) return;
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
    clips = gltf.animations;
    mixer = new THREE.AnimationMixer(model);
    if (!THREE.AnimationClip.findByName(clips, 'Sass')) {
      failed(); return;
    }
    setGesture(gesture);
    resize();
    renderer.render(scene, camera);
    ready();
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }).catch(() => { if (!disposed) failed(); });
  return { setGesture, dispose: () => {
    disposed = true;
    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizer.disconnect();
    canvas.removeEventListener('webglcontextlost', lost);
    mixer?.stopAllAction();
    if (model) { mixer?.uncacheRoot(model); disposeModel(model); }
    renderer.dispose();
    renderer.forceContextLoss();
  } };
}

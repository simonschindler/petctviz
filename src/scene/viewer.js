import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { computeOpacity } from "../core/logic.js";

function patchMaterial(clipPlanes) {
  const material = new THREE.MeshLambertMaterial({
    transparent: true,
    clippingPlanes: clipPlanes,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float aOpacity;\nvarying float vOpacity;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvOpacity = aOpacity;",
    );
    shader.fragmentShader = `varying float vOpacity;\n${shader.fragmentShader}`.replace(
      "#include <dithering_fragment>",
      "#include <dithering_fragment>\ngl_FragColor.a *= vOpacity;",
    );
  };
  return material;
}

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.localClippingEnabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0d12);

    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 100000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(1, -1, 1);
    this.scene.add(light);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.clipPlanes = {
      x: new THREE.Plane(new THREE.Vector3(-1, 0, 0), Infinity),
      y: new THREE.Plane(new THREE.Vector3(0, -1, 0), Infinity),
      z: new THREE.Plane(new THREE.Vector3(0, 0, -1), Infinity),
    };
    this.planeList = Object.values(this.clipPlanes);

    this.organMeshes = new Map();
    this.subject = null;
    this.edge = [1, 1, 1];
    this.colorFn = () => [1, 1, 1];
    this.threshold = 0;
    this.fadeWidth = 0;
    this.raycaster = new THREE.Raycaster();

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();
    this._render = this._render.bind(this);
    this._render();
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _render() {
    this._raf = requestAnimationFrame(this._render);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    for (const record of this.organMeshes.values()) {
      this.group.remove(record.mesh);
      record.mesh.geometry.dispose();
      record.mesh.material.dispose();
    }
    this.organMeshes.clear();
  }

  setSubject(subject, edge) {
    this.clear();
    this.subject = subject;
    this.edge = edge;
    for (const [organId, indices] of subject.byOrgan) {
      const geometry = new THREE.BoxGeometry(edge[0], edge[1], edge[2]);
      const material = patchMaterial(this.planeList);
      const mesh = new THREE.InstancedMesh(geometry, material, indices.length);
      const matrix = new THREE.Matrix4();
      indices.forEach((patchIndex, instance) => {
        const offset = patchIndex * 3;
        matrix.makeTranslation(
          subject.positions[offset],
          subject.positions[offset + 1],
          subject.positions[offset + 2],
        );
        mesh.setMatrixAt(instance, matrix);
      });
      const opacity = new Float32Array(indices.length);
      geometry.setAttribute("aOpacity", new THREE.InstancedBufferAttribute(opacity, 1));
      mesh.instanceMatrix.needsUpdate = true;
      this.organMeshes.set(organId, { mesh, indices, opacity });
      this.group.add(mesh);
    }
    this._applyColors();
    this._applyOpacity();
    this._frame();
  }

  _frame() {
    const { min, max } = this.subject.bounds;
    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1);
    this.controls.target.set(center[0], center[1], center[2]);
    this.camera.position.set(center[0] + size, center[1] - size, center[2] + size * 0.8);
    this.camera.near = size / 100;
    this.camera.far = size * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  _applyColors() {
    if (!this.subject) return;
    const color = new THREE.Color();
    for (const record of this.organMeshes.values()) {
      record.indices.forEach((patchIndex, instance) => {
        const rgb = this.colorFn(this.subject.suvMean[patchIndex]);
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        record.mesh.setColorAt(instance, color);
      });
      if (record.mesh.instanceColor) record.mesh.instanceColor.needsUpdate = true;
    }
  }

  _applyOpacity() {
    if (!this.subject) return;
    for (const record of this.organMeshes.values()) {
      record.indices.forEach((patchIndex, instance) => {
        record.opacity[instance] = computeOpacity(
          this.subject.suvMean[patchIndex],
          this.threshold,
          this.fadeWidth,
        );
      });
      record.mesh.geometry.getAttribute("aOpacity").needsUpdate = true;
    }
  }

  setColorFn(fn) {
    this.colorFn = fn;
    this._applyColors();
  }

  setThreshold(threshold, fadeWidth) {
    this.threshold = threshold;
    this.fadeWidth = fadeWidth;
    this._applyOpacity();
  }

  setOrganVisible(organId, visible) {
    const record = this.organMeshes.get(organId);
    if (record) record.mesh.visible = visible;
  }

  setClip(axis, value) {
    const plane = this.clipPlanes[axis];
    if (plane) plane.constant = value;
  }

  resetClip() {
    for (const plane of this.planeList) plane.constant = Infinity;
  }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const visible = [...this.organMeshes.values()]
      .filter((record) => record.mesh.visible)
      .map((record) => record.mesh);
    const hits = this.raycaster.intersectObjects(visible, false);
    if (hits.length === 0) return null;
    const hit = hits[0];
    for (const record of this.organMeshes.values()) {
      if (record.mesh === hit.object) return record.indices[hit.instanceId];
    }
    return null;
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
    cancelAnimationFrame(this._raf);
    this.clear();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

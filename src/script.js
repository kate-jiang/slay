/* -------------------------------------------------------------------------- */
/* Imports                                                                     */
/* -------------------------------------------------------------------------- */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

/* post-processing */
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { HueSaturationShader } from "three/examples/jsm/shaders/HueSaturationShader.js";

/* -------------------------------------------------------------------------- */
/* Canvas & Scene                                                             */
/* -------------------------------------------------------------------------- */
const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
let donuts = [];
let dusts = [];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function isInsideCube(x, y, z) {
  const l = 0.25;
  return (
    x >= -l * 6 && x <= l * 6 && y >= -l * 2 && y <= l * 2 && z >= -l && z <= l
  );
}

function randomPos() {
  const r = 6;
  let x, y, z;
  do {
    x = rand(-r, r);
    y = rand(-r, r);
    z = rand(-r, r);
  } while (isInsideCube(x, y, z));
  return new THREE.Vector3(x, y, z);
}

/* -------------------------------------------------------------------------- */
/* Font & Geometry                                                            */
/* -------------------------------------------------------------------------- */
const fontLoader = new FontLoader();
fontLoader.load("fonts/helvetiker_regular.typeface.json", (font) => {
  /* text */
  const textGeo = new TextGeometry("kate", {
    font,
    size: 0.5,
    height: 0.2,
    curveSegments: 64,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelOffset: 0,
    bevelSegments: 2,
  });
  textGeo.computeBoundingBox();
  textGeo.translate(
    -(textGeo.boundingBox.max.x - 0.02) * 0.5,
    -(textGeo.boundingBox.max.y - 0.02) * 0.5,
    -(textGeo.boundingBox.max.z - 0.03) * 0.5,
  );

  const normalMat = new THREE.MeshNormalMaterial();
  const textMesh = new THREE.Mesh(textGeo, normalMat);
  scene.add(textMesh);

  /* floating stuff */
  const torus = new THREE.TorusGeometry(0.3, 0.2, 20, 45);
  const knot = new THREE.TorusKnotGeometry(0.2, 0.05, 64, 16);
  const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const geos = [torus, knot, cubeGeo];

  /* dust */
  for (let i = 0; i < 4000; i++) {
    const dust = new THREE.Mesh(cubeGeo, normalMat);
    dust.position.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
    dust.rotation.set(
      rand(-Math.PI, Math.PI),
      rand(-Math.PI, Math.PI),
      rand(-Math.PI, Math.PI),
    );
    const s = Math.random() * 0.019;
    dust.scale.set(s, s, s);
    dusts.push(dust);
    scene.add(dust);
  }

  /* donuts / knots / cubes */
  for (let i = 0; i < 500; i++) {
    const mesh = new THREE.Mesh(geos[i % 3], normalMat);
    mesh.position.copy(randomPos());
    mesh.rotation.set(
      rand(-Math.PI, Math.PI),
      rand(-Math.PI, Math.PI),
      rand(-Math.PI, Math.PI),
    );
    const s = Math.random() * 0.5;
    mesh.scale.set(s, s, s);
    donuts.push(mesh);
    scene.add(mesh);
  }
});

/* -------------------------------------------------------------------------- */
/* Camera & Controls                                                          */
/* -------------------------------------------------------------------------- */
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.set(1, -1, 2);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;

/* -------------------------------------------------------------------------- */
/* Renderer + Post-processing                                                 */
/* -------------------------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* post stack */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

/* hue → +0.55 ≈ magenta / pink, sat → keep same (0 = unchanged) */
const hueSatPass = new ShaderPass(HueSaturationShader);
hueSatPass.uniforms.hue.value = 0.55; // 0-1, wrap-around
hueSatPass.uniforms.saturation.value = 0.0; // could bump to 0.1-0.3 if you want more pop
composer.addPass(hueSatPass);

/* -------------------------------------------------------------------------- */
/* Resize                                                                     */
/* -------------------------------------------------------------------------- */
function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  composer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener("resize", onResize);
window.addEventListener("deviceorientation", onResize);

/* -------------------------------------------------------------------------- */
/* Animation                                                                  */
/* -------------------------------------------------------------------------- */
function tick() {
  /* spin the shapes */
  for (const d of donuts) {
    d.rotation.x += 0.005;
    d.rotation.y += 0.005;
    d.rotation.z += 0.005;
  }

  controls.update();
  controls.target.set(0, 0, 0);

  composer.render(); // << render via post stack
  window.requestAnimationFrame(tick);
}
tick();

/* Copyright (C) Itseez3D, Inc. - All Rights Reserved
 * You may not use this file except in compliance with an authorized license
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * UNLESS REQUIRED BY APPLICABLE LAW OR AGREED BY ITSEEZ3D, INC. IN WRITING, SOFTWARE DISTRIBUTED UNDER THE LICENSE IS DISTRIBUTED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED
 * See the License for the specific language governing permissions and limitations under the License.
 * Written by Itseez3D, Inc. <support@itseez3D.com>, April 2024
 */

import * as THREE from 'three';
import * as PP from 'postprocessing';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

function createRenderer(canvas, config) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height);

  renderer.toneMappingExposure = config.toneMappingExposure;

  return renderer;
}

function createCamera(renderer, pos, lookAt) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 10);

  camera.position.set(pos.x, pos.y, pos.z);
  camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return camera;
}

function configureScene(scene, config)
{
  scene.background = new THREE.Color(config.backgroundColor);

  if (config.environmentURL !== null) {
    const rgbeLoader = new RGBELoader().load(config.environmentUrl, (texture, textureData) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentRotation.y = config.environmentYRotation * (Math.PI / 180);
    });
  }
  else{
    scene.environment = null;
  }
}

function createScene(config) {
  const scene = new THREE.Scene();
  configureScene(scene, config);
  return scene;
}

function createEffectComposer(scene, config)
{
  const composer = new PP.EffectComposer(scene.renderer, { multisampling: 4 });
  const renderPass = new PP.RenderPass(scene, scene.camera);
  composer.addPass( renderPass );

  if (config.postprocessing) {
    composer.addPass(new PP.EffectPass(scene.camera, new PP.ToneMappingEffect({ mode: PP.ToneMappingMode.ACES_FILMIC })));
    composer.addPass(new PP.EffectPass(scene.camera, new PP.HueSaturationEffect({ saturation: 0.05})));
    composer.addPass(new PP.EffectPass(scene.camera, new PP.BrightnessContrastEffect({ contrast: 0.1})));

    Promise.all([
      loadShader('../src/shaders/vertexShader.glsl'),
      loadShader('../src/shaders/fragmentLiftGammaGainCorrectionShader.glsl')
    ]).then(([vertexShader, fragmentShader]) => {
      const shaderMaterial = new THREE.ShaderMaterial({
        defines: { LABEL: "value" },
        uniforms: {
          tDiffuse: new THREE.Uniform(null),
          lift: { value: new THREE.Vector3(1.05, 1.05, 1.08) },
          gamma: { value: new THREE.Vector3(0.73, 0.73, 0.73) },
          gain: { value: new THREE.Vector3(0.9, 0.9, 0.9) },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
      });

      composer.addPass(new PP.ShaderPass(shaderMaterial, "tDiffuse"));
    });
  }

  return composer;
}

function addLightSources(scene) {
  const light = new THREE.AmbientLight( 0xFFFFFF, 0.5 ); 
  scene.add( light );

  const frontLight = new THREE.DirectionalLight(0xFFF7E8, 1);
  frontLight.position.set(0, 0.5, 0.866);
  frontLight.castShadow = true;
  scene.add(frontLight);
}

function removeLightSources(scene){
  scene.children.forEach((child) => {
    if (child instanceof THREE.Light) {
      scene.remove(child);
    }
  });
}

function loadShader(url) {
  return fetch(url).then(response => response.text());
}

export function prepareScene(canvas, config) {
  const renderer = createRenderer(canvas, config.renderer);
  const scene = createScene(config.scene);
  const camera = createCamera(renderer, config.camera.pos, config.camera.lookAt);

  scene.renderer = renderer;
  scene.camera = camera;

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(config.camera.lookAt.x, config.camera.lookAt.y, 0);
  orbitControls.update();

  scene.composer = createEffectComposer(scene, camera, config);

  const animate = (timestamp) => {

    requestAnimationFrame(animate);
    orbitControls.update();
    scene.composer.render();
  }

  animate();

  return scene;
}

export function configureLighting(scene, config) {
  removeLightSources(scene); 
  if (config.lights)
    addLightSources(scene);

  scene.traverse((child) => {
    if (child.isMesh) {
      if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
        child.material.envMapIntensity = config.environmentLightIntensity;
        child.material.needsUpdate = true;
      }
    }
  });
}

export function updateRenderingConfigration(scene, config)
{
  configureScene(scene, config.scene);
  configureLighting(scene, config.scene);

  scene.composer = createEffectComposer(scene, config);
  
  scene.renderer.toneMappingExposure = config.renderer.toneMappingExposure;
}
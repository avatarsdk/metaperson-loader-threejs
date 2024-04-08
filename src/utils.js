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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

function createRenderer(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height);

  return renderer;
}

function createCamera(renderer, pos, lookAt) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 10);

  camera.position.set(pos.x, pos.y, pos.z);
  camera.lookAt(lookAt.x, lookAt, lookAt.z);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return camera;
}

function createScene(config) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  if (config.environmentURL!==null) {
    const rgbeLoader = new RGBELoader()
      .load(config.environmentUrl, (texture, textureData) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
     });
  }

  return scene
}

export function prepareScene(canvas, config) {
  const renderer = createRenderer(canvas);
  const scene    = createScene(config.scene);
  const camera   = createCamera(renderer, config.camera.pos, config.camera.lookAt);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(config.camera.lookAt.x, config.camera.lookAt.y, 0);
  orbitControls.update();

  const animate = (timestamp) => {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }

  animate();

  return scene;
}

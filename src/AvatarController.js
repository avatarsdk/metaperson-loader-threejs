/* Copyright (C) Itseez3D, Inc. - All Rights Reserved
 * You may not use this file except in compliance with an authorized license
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * UNLESS REQUIRED BY APPLICABLE LAW OR AGREED BY ITSEEZ3D, INC. IN WRITING, SOFTWARE DISTRIBUTED UNDER THE LICENSE IS DISTRIBUTED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED
 * See the License for the specific language governing permissions and limitations under the License.
 * Written by Itseez3D, Inc. <support@itseez3D.com>, April 2024
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class AvatarController {

  constructor() {
    this.clearModel();
    this.busy = false;
  
    const defaultHaircutRenderPasses = 1;
    this.haircutRenderPasses = defaultHaircutRenderPasses;
  
    this.shortThreshold = 40;
    this.longThreshold = 100;
  
    this.prevTimestamp = 0;
    this.sumFastFrames = 0;
    this.sumLongFrames = 0;
  
    const animate = timestamp => {
      requestAnimationFrame(animate);
  
      const delta = timestamp - this.prevTimestamp;
      this.prevTimestamp = timestamp;
  
      this.updateDeltaSums(delta);
  
      this.checkAndUpdateHaircutRenderPasses();
    };
  
    animate();
  }
  
  updateDeltaSums(delta) {
    if (delta < this.shortThreshold) {
      this.sumFastFrames += delta;
      this.sumLongFrames = 0;
    }
  
    if (delta > this.longThreshold) {
      this.sumLongFrames += delta;
      this.sumFastFrames = 0;
    }
  }
  
  checkAndUpdateHaircutRenderPasses() {
    if (this.sumFastFrames >= 1000) {
      const maxHaircutRenderPasses = 3;
      if (this.haircutRenderPasses < maxHaircutRenderPasses) 
        this.setHaircutRenderPasses(this.haircutRenderPasses + 1);
      this.sumFastFrames = 0;
    }
  
    if (this.sumLongFrames >= 1000) {
      const minHaircutRenderPasses = 1;
      if (this.haircutRenderPasses > minHaircutRenderPasses) 
        this.setHaircutRenderPasses(this.haircutRenderPasses - 1);
      this.sumLongFrames = 0;
    }
  }

  clearModel() {
    const hairMeshes = ['haircut', 'haircut2a', 'haircut2b', 'haircut3a', 'haircut3b', 'haircut3c'];

    hairMeshes.forEach(meshName => {
      const mesh = this[meshName];
      if (mesh && mesh.material) {
        Object.values(mesh.material).forEach(material => {
          if (material && material.isTexture) {
            material.dispose();
          }
        });
        mesh.material.dispose();
        mesh.skeleton.dispose();
        this[meshName] = undefined;
      }
    });

    if (this.model && this.model.children) {
      Object.values(this.model.children).forEach(child => {
        if (child.type === "SkinnedMesh" && child.material) {
          Object.values(child.material).forEach(material => {
            if (material && material.isTexture) {
              material.dispose();
            }
          });
          child.material.dispose();
          child.skeleton.dispose();
        }
      });
    }

    this.model = null;
  }
  
  async loadModel(url, callback) {
    try {
      this.busy = true;
  
      const gltfLoader = new GLTFLoader();
      const gltf = await gltfLoader.loadAsync(url);
  
      this.clearModel();
  
      this.model = gltf.scene.getObjectByName("AvatarRoot");
  
      this.haircut = this.model.children.find((element) => element.name === "haircut");
      if (this.haircut !== undefined) {
        this.prepareHaircut();
      }
  
      this.busy = false;
  
      callback(this);
    } catch (error) {
      console.error("Error loading model:", error);
      this.busy = false;
    }
  }

  prepareHaircut() {
    this.prepareHaircutFor2Passes();
    this.prepareHaircutFor3Passes();
  }
  
  prepareHaircutFor2Passes() {
    const material2a = this.createHaircutMaterial();
    material2a.side = THREE.DoubleSide;
    material2a.opacity = 0.8;
    material2a.blending = THREE.NormalBlending;
    material2a.depthFunc = THREE.LessDepth;
    material2a.depthTest = true;
    material2a.depthWrite = false;
    material2a.roughness = 0.6;
    material2a.blendDst = THREE.OneMinusDstColorFactor;
  
    const material2b = this.createHaircutMaterial();
    material2b.side = THREE.FrontSide;
    material2b.opacity = 0.8;
    material2b.blending = THREE.NormalBlending;
    material2b.depthTest = true;
    material2b.alphaTest = 0.65;
  
    this.haircut2a = this.createHaircutClone("haircut2a", material2a);
    this.haircut2b = this.createHaircutClone("haircut2b", material2b);
  }
  
  prepareHaircutFor3Passes() {
    const material3a = this.createHaircutMaterial();
    material3a.side = THREE.BackSide;
    material3a.depthWrite = false;
  
    const material3b = this.createHaircutMaterial();
    material3b.side = THREE.FrontSide;
    material3b.depthWrite = false;
  
    const material3c = this.createHaircutMaterial();
    material3c.side = THREE.FrontSide;
    material3c.depthWrite = true;
    material3c.alphaToCoverage = true;
  
    this.haircut3a = this.createHaircutClone("haircut3a", material3a);
    this.haircut3b = this.createHaircutClone("haircut3b", material3b);
    this.haircut3c = this.createHaircutClone("haircut3c", material3c);
  }

  createHaircutMaterial() {
    const material = this.haircut.material.clone();
    material.transparent = true;
    material.needsUpdate = true;
    return material;
  }
  
  createHaircutClone(name, material) {
    const clone = this.haircut.clone();
    clone.name = name;
    clone.material = material;
    return clone;
  }

  addToScene(scene) {
    const group = new THREE.Group();
    group.name = "AvatarGroup";
  
    group.add(this.model);
    const haircuts = [this.haircut, this.haircut2a, this.haircut2b, this.haircut3a, this.haircut3b, this.haircut3c];
    for (const haircut of haircuts) {
      if (haircut) {
        group.add(haircut);
      }
    }
  
    this.setHaircutRenderPasses(3);
  
    scene.clear();
    scene.add(group);
  }

  setHaircutRenderPasses(passes) {
    this.haircutRenderPasses = passes;
  
    if (this.haircut === undefined) return;
  
    this.haircut.visible = passes === 1;
    this.haircut2a.visible = this.haircut2b.visible = passes === 2;
    this.haircut3a.visible = this.haircut3b.visible = this.haircut3c.visible = passes === 3;
  }
}

"use client";

import { useEffect, useRef } from "react";
import type { EditorElement } from "@/lib/editor/types";

export function ThreeDObjectSurface({element}:{element:EditorElement}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    let disposed=false,renderer:{dispose:()=>void;forceContextLoss:()=>void}|null=null,disposeResources=()=>{};
    void import("three").then((THREE)=>{
      if(disposed)return;
      const settings=element.threeD,width=Math.max(2,Math.round(element.width)),height=Math.max(2,Math.round(element.height)),aspect=width/height,requestedExportScale=Number(canvas.closest<HTMLElement>("[data-creatormake-export-scale]")?.dataset.creatormakeExportScale),dpr=Math.min(Number.isFinite(requestedExportScale)&&requestedExportScale>0?requestedExportScale:window.devicePixelRatio||1,4),contextOptions={alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance" as const},context=(canvas.getContext("webgl2",contextOptions)??canvas.getContext("webgl",contextOptions)) as WebGL2RenderingContext|WebGLRenderingContext|null;
      if(!context){canvas.dataset.renderError="webgl-unavailable";return;}
      const webgl=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});
      renderer=webgl;webgl.setPixelRatio(dpr);webgl.setSize(width,height,false);webgl.setClearColor(0x000000,0);webgl.shadowMap.enabled=true;webgl.shadowMap.type=THREE.PCFSoftShadowMap;webgl.outputColorSpace=THREE.SRGBColorSpace;webgl.toneMapping=THREE.ACESFilmicToneMapping;webgl.toneMappingExposure=1.08;
      const scene=new THREE.Scene();
      const camera=settings.cameraProjection==="orthographic"?new THREE.OrthographicCamera(-aspect*2,aspect*2,2,-2,.1,100):new THREE.PerspectiveCamera(settings.cameraFov,aspect,.1,100);
      camera.position.set(0,.15,Math.max(2.2,settings.cameraZ));camera.lookAt(0,0,0);
      scene.add(new THREE.AmbientLight(0xffffff,settings.ambientIntensity));
      const key=new THREE.DirectionalLight(0xffffff,settings.lightIntensity);key.position.set(3,4,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
      const rim=new THREE.PointLight(settings.emissiveColor,Math.max(.25,settings.lightIntensity*.55),12);rim.position.set(-3,1.5,2);scene.add(rim);
      const depth=Math.max(.08,settings.depth/80),bevel=Math.max(0,settings.bevel/80);
      let geometry:import("three").BufferGeometry;
      if(settings.primitive==="sphere")geometry=new THREE.SphereGeometry(1.12,48,32);
      else if(settings.primitive==="cylinder")geometry=new THREE.CylinderGeometry(.95,.95,1.8,48,1,false);
      else if(settings.primitive==="cone")geometry=new THREE.ConeGeometry(1.05,1.9,48);
      else if(settings.primitive==="torus")geometry=new THREE.TorusGeometry(.82,.32,24,64);
      else if(settings.primitive==="capsule")geometry=new THREE.CapsuleGeometry(.68,1.05,12,32);
      else if(settings.primitive==="pyramid")geometry=new THREE.ConeGeometry(1.15,1.9,4);
      else if(settings.primitive==="extruded-shape"){
        const shape=new THREE.Shape();shape.moveTo(-1.35,-.75);shape.lineTo(1.35,-.75);shape.lineTo(1.35,.75);shape.lineTo(-1.35,.75);shape.closePath();
        geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:settings.bevelSegments,curveSegments:24});geometry.center();
      }else geometry=new THREE.BoxGeometry(2.35,1.55,depth+0.48,8,8,8);
      const materialSettings={color:new THREE.Color(settings.color),metalness:settings.material==="chrome"?.95:settings.material==="metal"?.72:settings.metalness,roughness:settings.material==="chrome"?.08:settings.material==="glass"?.12:settings.material==="matte"?.88:settings.roughness,transparent:settings.transparent||settings.material==="glass",opacity:settings.material==="glass"?Math.min(.48,settings.opacity/100):settings.opacity/100,emissive:new THREE.Color(settings.emissiveColor),emissiveIntensity:["emissive","neon"].includes(settings.material)?Math.max(.6,settings.emissiveIntensity):settings.emissiveIntensity};
      const material=settings.material==="glass"?new THREE.MeshPhysicalMaterial({...materialSettings,transmission:.88,thickness:.8,ior:1.42,clearcoat:1}):new THREE.MeshStandardMaterial(materialSettings);
      const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.rotation.set(THREE.MathUtils.degToRad(settings.rotationX),THREE.MathUtils.degToRad(settings.rotationY),THREE.MathUtils.degToRad(settings.rotationZ));mesh.position.z=settings.positionZ/100;mesh.scale.setScalar(Math.max(.1,settings.scale));scene.add(mesh);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.ShadowMaterial({color:0x000000,opacity:.24}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.18;floor.receiveShadow=true;scene.add(floor);
      webgl.render(scene,camera);
      canvas.dataset.renderReady="true";
      disposeResources=()=>{geometry.dispose();material.dispose();floor.geometry.dispose();(floor.material as import("three").Material).dispose();};
    }).catch(()=>{canvas.dataset.renderError="renderer-failed";});
    return()=>{disposed=true;disposeResources();if(renderer){renderer.dispose();renderer.forceContextLoss();}};
  },[element.width,element.height,element.threeD]);
  return <span className="element-surface three-d-element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id}><canvas ref={canvasRef} aria-label={`${element.name} 3D preview`}/><span className="three-d-fallback" aria-hidden="true"/><span className="three-d-badge">GPU 3D · {element.threeD.primitive.replace("-"," ")}</span></span>;
}

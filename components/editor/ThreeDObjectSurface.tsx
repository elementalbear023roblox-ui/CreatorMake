"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorElement, ThreeDSettings } from "@/lib/editor/types";
import { generateImplicitSurface, generateParametricCurve, generateParametricSurface, generatePolarContour } from "@/lib/editor/mathematical-geometry";
import { normalizeThreeDSettings, projectedBoundsFromPoints, rawProjectedBoundsFromPoints, threeDGeometryKey } from "@/lib/editor/three-d";

type THREE=typeof import("three");
type RenderStatus="ready"|"lost"|"error";
type Runtime={update:(element:EditorElement)=>void;dispose:()=>void};
let rendererSequence=0;
const geometryTemplates=new Map<string,import("three").BufferGeometry>();

function roundedRectangle(THREE:THREE,width:number,height:number,radius:number){
  const shape=new THREE.Shape(),x=-width/2,y=-height/2,r=Math.min(radius,width/2,height/2);
  shape.moveTo(x+r,y);shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y,x+width,y+r);shape.lineTo(x+width,y+height-r);shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);shape.lineTo(x+r,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape;
}

function mathBufferGeometry(THREE:THREE,settings:ThreeDSettings){
  const generated=settings.geometryMode==="IMPLICIT_SURFACE"?generateImplicitSurface(settings.math):generateParametricSurface(settings.math),geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(generated.positions,3));geometry.setIndex(generated.indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

function buildGeometry(THREE:THREE,settings:ThreeDSettings){
  const quality=settings.previewQuality==="PERFORMANCE"?.55:settings.previewQuality==="HIGH"?1.5:1,segments=Math.max(3,Math.min(128,Math.round(settings.segments*quality))),depth=Math.max(.04,settings.depth/80),bevel=Math.max(0,settings.bevel/80);
  if(settings.geometryMode==="PARAMETRIC_SURFACE"||settings.geometryMode==="IMPLICIT_SURFACE")return mathBufferGeometry(THREE,settings);
  if(settings.geometryMode==="PARAMETRIC_CURVE"){
    const points=generateParametricCurve(settings.math).map(({x,y,z})=>new THREE.Vector3(x,y,z)),curve=new THREE.CatmullRomCurve3(points,settings.math.closed,"centripetal");
    return new THREE.TubeGeometry(curve,Math.max(12,Math.round(settings.math.resolutionU*3)),settings.math.curveRadius,settings.math.radialSegments,settings.math.closed);
  }
  if(settings.geometryMode==="POLAR_SHAPE"){
    const points=generatePolarContour(settings.math),shape=new THREE.Shape();points.forEach((point,index)=>index?shape.lineTo(point.x,point.y):shape.moveTo(point.x,point.y));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:settings.bevelSegments,curveSegments:Math.max(8,segments)});geometry.center();return geometry;
  }
  if(settings.primitive==="sphere")return new THREE.SphereGeometry(1.08,segments,Math.max(8,Math.round(segments*.68)));
  if(settings.primitive==="cylinder")return new THREE.CylinderGeometry(.95,.95,1.8,segments,1,false);
  if(settings.primitive==="cone")return new THREE.ConeGeometry(1.05,1.9,segments);
  if(settings.primitive==="torus")return new THREE.TorusGeometry(.82,.32,Math.max(8,Math.round(segments*.45)),segments);
  if(settings.primitive==="capsule")return new THREE.CapsuleGeometry(.68,1.05,Math.max(4,Math.round(segments*.25)),segments);
  if(settings.primitive==="pyramid")return new THREE.ConeGeometry(1.15,1.9,4);
  if(settings.primitive==="plane")return new THREE.BoxGeometry(2.55,1.62,Math.max(.025,depth*.08),1,1,1);
  if(settings.primitive==="rounded-box"||settings.primitive==="extruded-shape"){
    const shape=roundedRectangle(THREE,2.7,1.5,settings.primitive==="rounded-box"?Math.max(.04,settings.cornerRadius):Math.max(.02,settings.cornerRadius*.45)),geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:settings.bevelSegments,curveSegments:Math.max(8,segments)});geometry.center();return geometry;
  }
  return new THREE.BoxGeometry(2.35,1.55,depth+.48,1,1,1);
}

function createGeometry(THREE:THREE,settings:ThreeDSettings,key:string){
  const cached=geometryTemplates.get(key);if(cached)return cached.clone();
  const geometry=buildGeometry(THREE,settings);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometryTemplates.set(key,geometry.clone());
  if(geometryTemplates.size>16){const oldest=geometryTemplates.keys().next().value as string|undefined;if(oldest){geometryTemplates.get(oldest)?.dispose();geometryTemplates.delete(oldest);}}
  return geometry;
}

function createRuntime(THREE:THREE,canvas:HTMLCanvasElement,surface:HTMLSpanElement,bounds:HTMLSpanElement,onStatus:(status:RenderStatus,message?:string)=>void):Runtime|null{
  const options={alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:"high-performance" as const},context=(canvas.getContext("webgl2",options)??canvas.getContext("webgl",options)) as WebGL2RenderingContext|WebGLRenderingContext|null;
  if(!context){canvas.dataset.renderError="webgl-unavailable";onStatus("error","WebGL is unavailable in this browser.");return null;}
  const renderer=new THREE.WebGLRenderer({canvas,context,...options});rendererSequence+=1;canvas.dataset.rendererInstance=String(rendererSequence);renderer.setClearAlpha(0);renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new THREE.Scene();scene.background=null;const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2.35,1.55,.9),new THREE.MeshStandardMaterial()) as import("three").Mesh<import("three").BufferGeometry,import("three").Material>,floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.ShadowMaterial({color:0x000000,opacity:.24})),ambient=new THREE.AmbientLight(0xffffff,.72),key=new THREE.DirectionalLight(0xffffff,1.8),rim=new THREE.PointLight(0x8d76ff,.7,12);
  root.add(mesh);scene.add(root,ambient,key,rim,floor);key.position.set(3,4,5);key.shadow.mapSize.set(1024,1024);rim.position.set(-3,1.5,2);floor.rotation.x=-Math.PI/2;floor.position.y=-1.18;mesh.castShadow=mesh.receiveShadow=floor.receiveShadow=true;
  let camera:import("three").PerspectiveCamera|import("three").OrthographicCamera=new THREE.PerspectiveCamera(35,1,.05,100),geometryKey="",materialKind="",logicalWidth=1,logicalHeight=1,renderWidth=1,renderHeight=1,pixelRatio=0,frame=0,disposed=false,lastElement:EditorElement|null=null,lastSettings:ThreeDSettings|null=null;
  const applySize=(width:number,height:number,dpr:number)=>{renderWidth=Math.max(2,Math.round(width));renderHeight=Math.max(2,Math.round(height));if(renderWidth!==Number(canvas.dataset.cssWidth)||renderHeight!==Number(canvas.dataset.cssHeight)||dpr!==pixelRatio){pixelRatio=dpr;renderer.setPixelRatio(dpr);renderer.setSize(renderWidth,renderHeight,false);canvas.dataset.cssWidth=String(renderWidth);canvas.dataset.cssHeight=String(renderHeight);}canvas.style.width=`${renderWidth}px`;canvas.style.height=`${renderHeight}px`;canvas.style.left=`${(logicalWidth-renderWidth)/2}px`;canvas.style.top=`${(logicalHeight-renderHeight)/2}px`;};
  const updateProjection=(settings:ThreeDSettings)=>{const aspect=renderWidth/renderHeight;if(camera instanceof THREE.PerspectiveCamera){camera.aspect=aspect;camera.fov=settings.cameraFov;}else{camera.left=-aspect*2;camera.right=aspect*2;camera.top=2;camera.bottom=-2;}camera.updateProjectionMatrix();};
  const projectedPoints=()=>{root.updateMatrixWorld(true);mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,points:import("three").Vector3[]=[];if(box)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const projected=new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);if(Number.isFinite(projected.x)&&Number.isFinite(projected.y))points.push(projected);}return points;};
  const frameCamera=(settings:ThreeDSettings)=>{root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),sphere=box.getBoundingSphere(new THREE.Sphere()),target=sphere.center.clone(),yaw=THREE.MathUtils.degToRad(settings.cameraYaw),pitch=THREE.MathUtils.degToRad(settings.cameraPitch);let distance=settings.cameraZ;
    if(settings.fitMode==="FIT_OBJECT"){
      const padding=1+settings.viewportPadding/Math.max(1,Math.min(logicalWidth,logicalHeight))*2;if(camera instanceof THREE.PerspectiveCamera){const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect),half=Math.max(.04,Math.min(vertical,horizontal)/2);distance=Math.max(distance,sphere.radius*padding/Math.sin(half));}
      else{const size=box.getSize(new THREE.Vector3()),halfHeight=Math.max(size.y/2,size.x/(2*Math.max(.05,camera.right/camera.top)))*padding;camera.top=Math.max(.01,halfHeight);camera.bottom=-camera.top;camera.right=camera.top*(renderWidth/renderHeight);camera.left=-camera.right;camera.updateProjectionMatrix();}
    }
    camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateMatrixWorld(true);
  };
  const resize=(element:EditorElement,settings:ThreeDSettings)=>{logicalWidth=Math.max(2,Math.round(element.width));logicalHeight=Math.max(2,Math.round(element.height));const exportScale=Number(canvas.closest<HTMLElement>("[data-creatormake-export-scale]")?.dataset.creatormakeExportScale),qualityDpr=settings.previewQuality==="PERFORMANCE"?1:settings.previewQuality==="HIGH"?3:2,dpr=Math.min(Number.isFinite(exportScale)&&exportScale>0?exportScale:Math.min(window.devicePixelRatio||1,qualityDpr),4);surface.dataset.fitMode=settings.fitMode;applySize(logicalWidth,logicalHeight,dpr);updateProjection(settings);frameCamera(settings);
    if(settings.fitMode==="EXPAND_BOUNDS"){
      const raw=rawProjectedBoundsFromPoints(projectedPoints(),logicalWidth,logicalHeight),padding=settings.viewportPadding,nextWidth=Math.min(4096,Math.max(logicalWidth,Math.ceil(raw.width+padding*2))),nextHeight=Math.min(4096,Math.max(logicalHeight,Math.ceil(raw.height+padding*2)));
      if(nextWidth!==renderWidth||nextHeight!==renderHeight){applySize(nextWidth,nextHeight,dpr);updateProjection(settings);frameCamera(settings);}
    }
  };
  const render=()=>{if(disposed||context.isContextLost()||!lastSettings)return;renderer.clear(true,true,true);renderer.render(scene,camera);const projected=projectedBoundsFromPoints(projectedPoints(),renderWidth,renderHeight);bounds.style.left=`${projected.left+(logicalWidth-renderWidth)/2}px`;bounds.style.top=`${projected.top+(logicalHeight-renderHeight)/2}px`;bounds.style.width=`${projected.width}px`;bounds.style.height=`${projected.height}px`;canvas.dataset.renderReady="true";delete canvas.dataset.renderError;onStatus("ready",canvas.dataset.geometryError);};
  const scheduleRender=()=>{delete canvas.dataset.renderReady;if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=0;render();});};
  const update=(element:EditorElement)=>{if(disposed)return;lastElement=element;const settings=normalizeThreeDSettings(element.threeD);lastSettings=settings;const nextGeometryKey=threeDGeometryKey(settings);if(nextGeometryKey!==geometryKey)try{const next=createGeometry(THREE,settings,nextGeometryKey),previous=mesh.geometry;mesh.geometry=next;previous.dispose();geometryKey=nextGeometryKey;delete canvas.dataset.geometryError;}catch(error){canvas.dataset.geometryError=error instanceof Error?error.message:"The mathematical geometry is invalid.";}
    const physical=["glass","transparent","holographic","iridescent"].includes(settings.material),nextMaterialKind=physical?"physical":settings.material==="toon"?"toon":"standard";if(nextMaterialKind!==materialKind){const previous=mesh.material as import("three").Material;mesh.material=nextMaterialKind==="physical"?new THREE.MeshPhysicalMaterial({transmission:settings.material==="glass"?.88:0,thickness:.8,ior:1.42,clearcoat:1}):nextMaterialKind==="toon"?new THREE.MeshToonMaterial():new THREE.MeshStandardMaterial();previous.dispose();materialKind=nextMaterialKind;}
    const material=mesh.material as import("three").MeshStandardMaterial;material.color.set(settings.color);if("metalness" in material)material.metalness=settings.material==="chrome"?.95:settings.material==="metal"||settings.material==="brushed-metal"?.72:settings.material==="holographic"||settings.material==="iridescent"?.42:settings.metalness;if("roughness" in material)material.roughness=settings.material==="chrome"?.08:settings.material==="glass"?.12:settings.material==="matte"?.88:settings.material==="brushed-metal"?.3:settings.material==="retro-plastic"?.52:settings.roughness;material.transparent=settings.transparent||["glass","transparent","holographic","iridescent"].includes(settings.material);material.opacity=settings.material==="glass"?Math.min(.48,settings.opacity/100):settings.material==="transparent"?Math.min(.72,settings.opacity/100):settings.opacity/100;if("emissive" in material){material.emissive.set(settings.emissiveColor);material.emissiveIntensity=["emissive","neon","holographic"].includes(settings.material)?Math.max(.6,settings.emissiveIntensity):settings.emissiveIntensity;}material.side=THREE.DoubleSide;material.needsUpdate=true;
    root.position.set(settings.pivotX,settings.pivotY,settings.pivotZ+settings.positionZ/100);mesh.position.set(-settings.pivotX,-settings.pivotY,-settings.pivotZ);root.quaternion.setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(settings.rotationX),THREE.MathUtils.degToRad(settings.rotationY),THREE.MathUtils.degToRad(settings.rotationZ),settings.transformSpace==="local"?"XYZ":"ZYX"));root.scale.set(settings.scale*settings.scaleX,settings.scale*settings.scaleY,settings.scale*settings.scaleZ);
    ambient.intensity=settings.ambientIntensity;key.color.set(settings.lightColor);key.intensity=settings.lightIntensity;rim.color.set(settings.emissiveColor);rim.intensity=Math.max(.15,settings.lightIntensity*.45);renderer.shadowMap.enabled=settings.shadows;mesh.castShadow=mesh.receiveShadow=floor.receiveShadow=settings.shadows;
    if((settings.cameraProjection==="perspective")!==(camera instanceof THREE.PerspectiveCamera)){scene.remove(camera);camera=settings.cameraProjection==="perspective"?new THREE.PerspectiveCamera(settings.cameraFov,renderWidth/renderHeight,.05,100):new THREE.OrthographicCamera(-2,2,2,-2,.05,100);scene.add(camera);}resize(element,settings);scheduleRender();
  };
  const lost=(event:Event)=>{event.preventDefault();delete canvas.dataset.renderReady;canvas.dataset.renderError="context-lost";onStatus("lost");},restored=()=>{delete canvas.dataset.renderError;if(lastElement)update(lastElement);};canvas.addEventListener("webglcontextlost",lost);canvas.addEventListener("webglcontextrestored",restored);
  return{update,dispose:()=>{disposed=true;if(frame)cancelAnimationFrame(frame);canvas.removeEventListener("webglcontextlost",lost);canvas.removeEventListener("webglcontextrestored",restored);mesh.geometry.dispose();(mesh.material as import("three").Material).dispose();floor.geometry.dispose();(floor.material as import("three").Material).dispose();renderer.dispose();}};
}

export function ThreeDObjectSurface({element}:{element:EditorElement}){
  const canvasRef=useRef<HTMLCanvasElement>(null),surfaceRef=useRef<HTMLSpanElement>(null),boundsRef=useRef<HTMLSpanElement>(null),runtimeRef=useRef<Runtime|null>(null),latestRef=useRef(element),[status,setStatus]=useState<"loading"|RenderStatus>("loading"),[message,setMessage]=useState("");
  useEffect(()=>{latestRef.current=element;runtimeRef.current?.update(element);},[element]);
  useEffect(()=>{const canvas=canvasRef.current,bounds=boundsRef.current,surface=surfaceRef.current;if(!canvas||!bounds||!surface)return;let cancelled=false,observer:ResizeObserver|null=null;void import("three").then((THREE)=>{if(cancelled)return;const runtime=createRuntime(THREE,canvas,surface,bounds,(next,message="")=>{setStatus(next);setMessage(message);});runtimeRef.current=runtime;if(runtime){runtime.update(latestRef.current);observer=new ResizeObserver(()=>runtime.update(latestRef.current));observer.observe(surface);}}).catch(()=>{canvas.dataset.renderError="renderer-failed";setStatus("error");setMessage("The 3D renderer could not start.");});return()=>{cancelled=true;observer?.disconnect();runtimeRef.current?.dispose();runtimeRef.current=null;};},[element.id]);
  return <span ref={surfaceRef} className="element-surface three-d-element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id} data-render-status={status} data-render-message={message?"true":"false"}><canvas ref={canvasRef} aria-label={`${element.name} transparent 3D preview`}/><span ref={boundsRef} className="three-d-projected-bounds" aria-hidden="true"/><span className="three-d-render-message" role="status">{status==="lost"?"GPU context lost · restoring…":status==="error"?message||"3D preview unavailable · object data is safe":message}</span><span className="three-d-badge">3D · {element.threeD.geometryMode==="PRIMITIVE"?element.threeD.primitive.replace("-"," "):element.threeD.geometryMode.replaceAll("_"," ").toLowerCase()}</span></span>;
}

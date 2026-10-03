import type { RobloxManifest, RobloxManifestNode, RobloxSyncOperation } from "./types";

const stableJson=(value:unknown)=>JSON.stringify(value,Object.keys(value as object).sort());

function changedPropertyNames(previous:RobloxManifestNode,next:RobloxManifestNode){
  const names=new Set([...Object.keys(previous.properties),...Object.keys(next.properties)]);
  const changed=[...names].filter((name)=>JSON.stringify(previous.properties[name])!==JSON.stringify(next.properties[name]));
  if(JSON.stringify(previous.decorators)!==JSON.stringify(next.decorators))changed.push("decorators");
  if(JSON.stringify(previous.attributes??{})!==JSON.stringify(next.attributes??{}))changed.push("attributes");
  if(previous.className!==next.className)changed.push("className");
  return changed;
}

export function diffRobloxManifests(previous:RobloxManifest|null,next:RobloxManifest):RobloxSyncOperation[]{
  if(!previous)return next.nodes.map((node)=>({type:"create",sourceId:node.sourceId}));
  const before=new Map(previous.nodes.map((node,index)=>[node.sourceId,{node,index}]));
  const after=new Map(next.nodes.map((node,index)=>[node.sourceId,{node,index}]));
  const operations:RobloxSyncOperation[]=[];
  previous.nodes.forEach((node)=>{if(!after.has(node.sourceId))operations.push({type:"delete",sourceId:node.sourceId});});
  next.nodes.forEach((node,index)=>{
    const prior=before.get(node.sourceId);
    if(!prior){operations.push({type:"create",sourceId:node.sourceId});return;}
    if(prior.node.name!==node.name)operations.push({type:"rename",sourceId:node.sourceId,name:node.name});
    if(prior.node.parentSourceId!==node.parentSourceId)operations.push({type:"reparent",sourceId:node.sourceId,parentSourceId:node.parentSourceId});
    if(prior.index!==index)operations.push({type:"reorder",sourceId:node.sourceId,index});
    const properties=changedPropertyNames(prior.node,node);if(properties.length)operations.push({type:"update",sourceId:node.sourceId,properties});
  });
  return operations;
}

export function manifestFingerprint(manifest:RobloxManifest){return stableJson({screenGuiName:manifest.screenGuiName,nodes:manifest.nodes});}

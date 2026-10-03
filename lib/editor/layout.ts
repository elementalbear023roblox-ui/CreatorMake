import type { EditorElement, EditorProject } from "./types";

const clamp=(value:number,min:number|null,max:number|null)=>Math.max(min??-Infinity,Math.min(max??Infinity,value));
const textWidth=(element:EditorElement)=>Math.max(12,element.text.length*element.fontSize*.58+element.layoutPadding.left+element.layoutPadding.right+element.padding*2);
const textHeight=(element:EditorElement)=>Math.max(12,element.fontSize*element.lineHeight+element.layoutPadding.top+element.layoutPadding.bottom+element.padding*2);
const mainSize=(element:EditorElement,horizontal:boolean)=>horizontal?element.width:element.height;
const crossSize=(element:EditorElement,horizontal:boolean)=>horizontal?element.height:element.width;
const mainSizing=(element:EditorElement,horizontal:boolean)=>horizontal?element.sizingX:element.sizingY;
const crossSizing=(element:EditorElement,horizontal:boolean)=>horizontal?element.sizingY:element.sizingX;

function setMainSize(element:EditorElement,horizontal:boolean,value:number){if(horizontal)element.width=clamp(value,element.minWidth,element.maxWidth);else element.height=clamp(value,element.minHeight,element.maxHeight);}
function setCrossSize(element:EditorElement,horizontal:boolean,value:number){if(horizontal)element.height=clamp(value,element.minHeight,element.maxHeight);else element.width=clamp(value,element.minWidth,element.maxWidth);}
function resolveHug(element:EditorElement){if(element.type!=="text"&&element.type!=="button")return;if(element.sizingX==="hug"||element.textBoxMode==="auto-width")element.width=clamp(textWidth(element),element.minWidth,element.maxWidth);if(element.sizingY==="hug"||element.textBoxMode==="auto-height")element.height=clamp(textHeight(element),element.minHeight,element.maxHeight);}
function childrenOf(project:EditorProject,parentId:string){return project.elements.filter((element)=>element.parentId===parentId&&!element.hidden);}
function translateDescendants(project:EditorProject,parentId:string,dx:number,dy:number){if(!dx&&!dy)return;const direct=project.elements.filter((element)=>element.parentId===parentId);direct.forEach((child)=>{child.x+=dx;child.y+=dy;translateDescendants(project,child.id,dx,dy);});}

function createLines(children:EditorElement[],horizontal:boolean,availableMain:number,gap:number,wrap:boolean){
  if(!wrap||!children.length)return [children];const lines:EditorElement[][]=[];let line:EditorElement[]=[],used=0;
  children.forEach((child)=>{const size=mainSize(child,horizontal),next=used+(line.length?gap:0)+size;if(line.length&&next>availableMain){lines.push(line);line=[];used=0;}line.push(child);used+=(line.length>1?gap:0)+size;});if(line.length)lines.push(line);return lines;
}

function placeLine(parent:EditorElement,line:EditorElement[],horizontal:boolean,mainStart:number,crossStart:number,availableMain:number,lineCross:number,gap:number,visited:Set<string>,project:EditorProject){
  const fill=line.filter((child)=>mainSizing(child,horizontal)==="fill"),fixed=line.filter((child)=>!fill.includes(child)).reduce((sum,child)=>sum+mainSize(child,horizontal),0),fillSize=Math.max(0,(availableMain-fixed-gap*Math.max(0,line.length-1))/Math.max(1,fill.length));
  fill.forEach((child)=>setMainSize(child,horizontal,fillSize));
  const occupied=line.reduce((sum,child)=>sum+mainSize(child,horizontal),0),total=occupied+gap*Math.max(0,line.length-1);let cursor=mainStart;if(parent.primaryAlign==="center")cursor+=(availableMain-total)/2;if(parent.primaryAlign==="end")cursor+=availableMain-total;const spaced=parent.primaryAlign==="space-between"&&line.length>1?(availableMain-occupied)/(line.length-1):gap;
  line.forEach((child)=>{if(parent.crossAlign==="stretch"||crossSizing(child,horizontal)==="fill")setCrossSize(child,horizontal,lineCross);let cross=crossStart;const resolved=crossSize(child,horizontal);if(parent.crossAlign==="center")cross+=(lineCross-resolved)/2;if(parent.crossAlign==="end")cross+=lineCross-resolved;const oldX=child.x,oldY=child.y;if(horizontal){child.x=cursor;child.y=cross;}else{child.x=cross;child.y=cursor;}translateDescendants(project,child.id,child.x-oldX,child.y-oldY);cursor+=mainSize(child,horizontal)+spaced;layoutFrame(project,child,visited);});
}

function layoutFrame(project:EditorProject,parent:EditorElement,visited:Set<string>){
  if(visited.has(parent.id))return;visited.add(parent.id);const children=childrenOf(project,parent.id);children.forEach(resolveHug);
  if(parent.layoutMode==="none"){children.forEach((child)=>layoutFrame(project,child,visited));return;}
  const pad=parent.layoutPadding,innerWidth=Math.max(0,parent.width-pad.left-pad.right),innerHeight=Math.max(0,parent.height-pad.top-pad.bottom);
  if(parent.layoutMode==="grid"){
    const columns=Math.max(1,Math.round(parent.gridColumns)),colGap=parent.columnGap,rowGap=parent.rowGap,cellWidth=Math.max(0,(innerWidth-colGap*(columns-1))/columns);let rowTop=parent.y+pad.top;
    for(let start=0;start<children.length;start+=columns){const row=children.slice(start,start+columns),rowHeight=Math.max(0,...row.map((child)=>child.height));row.forEach((child,index)=>{if(child.sizingX==="fill")child.width=clamp(cellWidth,child.minWidth,child.maxWidth);if(child.sizingY==="fill")child.height=clamp(rowHeight,child.minHeight,child.maxHeight);const oldX=child.x,oldY=child.y;child.x=parent.x+pad.left+index*(cellWidth+colGap)+(child.sizingX==="fill"?0:(cellWidth-child.width)/2);child.y=rowTop;translateDescendants(project,child.id,child.x-oldX,child.y-oldY);layoutFrame(project,child,visited);});rowTop+=rowHeight+rowGap;}
  }else{
    const horizontal=parent.layoutMode==="horizontal",availableMain=horizontal?innerWidth:innerHeight,availableCross=horizontal?innerHeight:innerWidth,lines=createLines(children,horizontal,availableMain,parent.gap,parent.layoutWrap),crossGap=horizontal?parent.rowGap:parent.columnGap;
    const lineCrosses=lines.map((line)=>parent.layoutWrap?Math.max(0,...line.map((child)=>crossSize(child,horizontal))):availableCross);let crossCursor=horizontal?parent.y+pad.top:parent.x+pad.left;
    lines.forEach((line,index)=>{placeLine(parent,line,horizontal,horizontal?parent.x+pad.left:parent.y+pad.top,crossCursor,availableMain,lineCrosses[index],parent.gap,visited,project);crossCursor+=lineCrosses[index]+(index<lines.length-1?crossGap:0);});
  }
  if(parent.sizingX==="hug"&&children.length){const right=Math.max(...children.map((child)=>child.x+child.width));parent.width=clamp(right-parent.x+pad.right,parent.minWidth,parent.maxWidth);}
  if(parent.sizingY==="hug"&&children.length){const bottom=Math.max(...children.map((child)=>child.y+child.height));parent.height=clamp(bottom-parent.y+pad.bottom,parent.minHeight,parent.maxHeight);}
}

export function applyAutoLayout(project:EditorProject){
  // Two deterministic passes let nested hug-content frames settle before their
  // parent consumes the measured size, while the second pass repositions all
  // descendants after any ancestor moved.
  for(let pass=0;pass<2;pass++){const visited=new Set<string>();project.elements.filter((element)=>!element.parentId).forEach((element)=>layoutFrame(project,element,visited));project.elements.forEach((element)=>{resolveHug(element);if(!visited.has(element.id))layoutFrame(project,element,visited);});}
}

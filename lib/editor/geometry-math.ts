export const GEOMETRY_EPSILON=1e-6;

export function normalizeDesignValue(value:number){
  if(!Number.isFinite(value))return 0;
  const normalized=Math.round(value/GEOMETRY_EPSILON)*GEOMETRY_EPSILON;
  return Object.is(normalized,-0)?0:normalized;
}

export type LogicalRect={left:number;top:number;right:number;bottom:number;width:number;height:number;cx:number;cy:number};

export function logicalRect(item:{x:number;y:number;width:number;height:number}):LogicalRect{
  const left=normalizeDesignValue(item.x),top=normalizeDesignValue(item.y),width=normalizeDesignValue(item.width),height=normalizeDesignValue(item.height),right=normalizeDesignValue(left+width),bottom=normalizeDesignValue(top+height);
  return{left,top,right,bottom,width,height,cx:normalizeDesignValue((left+right)/2),cy:normalizeDesignValue((top+bottom)/2)};
}

export function logicalBounds(items:Array<{x:number;y:number;width:number;height:number}>):LogicalRect|null{
  if(!items.length)return null;
  const rects=items.map(logicalRect),left=Math.min(...rects.map((item)=>item.left)),top=Math.min(...rects.map((item)=>item.top)),right=Math.max(...rects.map((item)=>item.right)),bottom=Math.max(...rects.map((item)=>item.bottom));
  return{left,top,right,bottom,width:normalizeDesignValue(right-left),height:normalizeDesignValue(bottom-top),cx:normalizeDesignValue((left+right)/2),cy:normalizeDesignValue((top+bottom)/2)};
}

export const gapBetween=(first:{x:number;width:number},second:{x:number})=>normalizeDesignValue(second.x-(first.x+first.width));
export const verticalGapBetween=(first:{y:number;height:number},second:{y:number})=>normalizeDesignValue(second.y-(first.y+first.height));

export function distributedPositions(sizes:number[],start:number,gap:number){
  const positions:number[]=[];
  for(let index=0;index<sizes.length;index++)positions.push(normalizeDesignValue(start+sizes.slice(0,index).reduce((sum,size)=>sum+size,0)+gap*index));
  return positions;
}

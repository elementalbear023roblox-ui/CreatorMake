export type ColorKeyOptions={color:string;tolerance:number;softness:number};

export function colorKeyRgb(color:string):[number,number,number]{
  const match=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  return match?[Number.parseInt(match[1],16),Number.parseInt(match[2],16),Number.parseInt(match[3],16)]:[255,0,255];
}

export function colorKeyAlpha(red:number,green:number,blue:number,alpha:number,options:ColorKeyOptions){
  if(alpha<=0)return 0;
  const [keyRed,keyGreen,keyBlue]=colorKeyRgb(options.color),distance=Math.hypot(red-keyRed,green-keyGreen,blue-keyBlue),maximum=Math.sqrt(3*255*255),threshold=Math.max(0,Math.min(100,options.tolerance))/100*maximum,feather=Math.max(0,Math.min(100,options.softness))/100*maximum;
  if(distance<=threshold)return 0;
  if(feather>0&&distance<threshold+feather)return Math.round(alpha*(distance-threshold)/feather);
  return alpha;
}

export function applyColorKeyPixels(pixels:Uint8ClampedArray,options:ColorKeyOptions){
  for(let offset=0;offset<pixels.length;offset+=4)pixels[offset+3]=colorKeyAlpha(pixels[offset],pixels[offset+1],pixels[offset+2],pixels[offset+3],options);
  return pixels;
}

import type { EditorElement, RetroMetadata } from "../editor/types.ts";

/**
 * Windows 98 Classic reference tokens at 96 DPI.
 * Geometry follows dialog-template units: 1 horizontal DLU is 1/4 of the
 * dialog font average character width; 1 vertical DLU is 1/8 of its height.
 * The pixel conversion below is the measured target used by CreatorMake's
 * MS Sans Serif 8 pt reference mode, not a claim about every localized build.
 */
export const WINDOWS98_CLASSIC={
  referenceDpi:96,
  font:{id:"ms-sans-serif-8",family:"MS Sans Serif",fallback:"Microsoft Sans Serif, Arial, sans-serif",pointSize:8,pixelSize:11,lineHeight:1.18},
  colors:{
    desktop:"#008080",buttonFace:"#c0c0c0",buttonHighlight:"#ffffff",buttonLight:"#dfdfdf",buttonShadow:"#808080",buttonDarkShadow:"#000000",
    activeTitle:"#000080",inactiveTitle:"#808080",titleText:"#ffffff",window:"#ffffff",windowText:"#000000",highlight:"#000080",highlightText:"#ffffff",
  },
  metrics:{outerFrame:3,titleBar:18,titlePaddingX:3,captionButton:16,captionGap:2,menuHeight:19,statusHeight:20,dialogMarginX:12,dialogMarginY:11,icon:32,buttonWidth:75,buttonHeight:23,buttonGap:6,fieldHeight:21,focusInset:3},
  dlu:{x:1.5,y:1.625,buttonWidth:50,buttonHeight:14,margin:7,relatedGap:4,minimumGap:3,textLine:8},
} as const;

export const WIN98_FONT_STACK='"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif';

export const win98Font=(weight=400):Partial<EditorElement>=>({
  fontId:WINDOWS98_CLASSIC.font.id,fontFamily:WINDOWS98_CLASSIC.font.family,fontSize:WINDOWS98_CLASSIC.font.pixelSize,fontSizeDesign:WINDOWS98_CLASSIC.font.pixelSize,
  responsiveMinTextSize:WINDOWS98_CLASSIC.font.pixelSize,responsiveMaxTextSize:WINDOWS98_CLASSIC.font.pixelSize,fontWeight:weight,lineHeight:WINDOWS98_CLASSIC.font.lineHeight,
  letterSpacing:0,wordSpacing:0,textColor:WINDOWS98_CLASSIC.colors.windowText,textStrokeWidth:0,textShadows:[],textSizingMode:"fixed",autoFit:false,
  textRobloxExportMode:"PIXEL_ACCURATE",
});

export const win98Surface=(_primitive:NonNullable<RetroMetadata["borderPrimitive"]>,fill:string=WINDOWS98_CLASSIC.colors.buttonFace):Partial<EditorElement>=>({
  fill,borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:{tl:0,tr:0,br:0,bl:0},cornerTypes:{tl:"square",tr:"square",br:"square",bl:"square"},shadow:"none",
});

export const win98Constraints=(horizontal:EditorElement["constraints"]["horizontal"],vertical:EditorElement["constraints"]["vertical"]):Pick<EditorElement,"constraints">=>({constraints:{horizontal,vertical}});

export function preferredMessageBoxSize(message:string,buttonCount:number){
  const words=message.trim().split(/\s+/),longest=Math.max(0,...words.map((word)=>word.length)),estimated=Math.max(245,Math.min(360,Math.ceil(Math.sqrt(Math.max(1,message.length))*28+longest*3)));
  const actions=Math.max(1,buttonCount)*WINDOWS98_CLASSIC.metrics.buttonWidth+Math.max(0,buttonCount-1)*WINDOWS98_CLASSIC.metrics.buttonGap;
  const clientWidth=Math.max(estimated+WINDOWS98_CLASSIC.metrics.icon+WINDOWS98_CLASSIC.metrics.dialogMarginX*3,actions+WINDOWS98_CLASSIC.metrics.dialogMarginX*2);
  const lines=Math.max(1,Math.ceil(message.length/Math.max(30,Math.floor(estimated/6.1))));
  const messageHeight=Math.max(WINDOWS98_CLASSIC.metrics.icon,lines*14);
  const clientHeight=WINDOWS98_CLASSIC.metrics.dialogMarginY+messageHeight+12+WINDOWS98_CLASSIC.metrics.buttonHeight+WINDOWS98_CLASSIC.metrics.dialogMarginY;
  return{width:Math.round(clientWidth+WINDOWS98_CLASSIC.metrics.outerFrame*2),height:Math.round(WINDOWS98_CLASSIC.metrics.outerFrame*2+WINDOWS98_CLASSIC.metrics.titleBar+clientHeight),messageWidth:estimated,messageHeight};
}

export function withRetro(base:RetroMetadata,patch:Partial<RetroMetadata>):RetroMetadata{return{...base,...patch};}

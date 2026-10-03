export type RobloxFontCompatibility = {
  level: "native" | "close" | "unsupported";
  label: "ROBLOX NATIVE" | "CLOSE ROBLOX MATCH" | "CUSTOM / NOT DIRECTLY SUPPORTED";
  family?: string;
  enumName?: string;
  matchName?: string;
};

const nativeFamilies:Record<string,{family:string;enumName:string}>={
  "Roboto":{family:"rbxasset://fonts/families/Roboto.json",enumName:"Roboto"},
  "Roboto Condensed":{family:"rbxasset://fonts/families/RobotoCondensed.json",enumName:"RobotoCondensed"},
  "Roboto Mono":{family:"rbxasset://fonts/families/RobotoMono.json",enumName:"RobotoMono"},
  "Nunito":{family:"rbxasset://fonts/families/Nunito.json",enumName:"Nunito"},
  "Ubuntu":{family:"rbxasset://fonts/families/Ubuntu.json",enumName:"Ubuntu"},
  "Merriweather":{family:"rbxasset://fonts/families/Merriweather.json",enumName:"Merriweather"},
  "Oswald":{family:"rbxasset://fonts/families/Oswald.json",enumName:"Oswald"},
  "Luckiest Guy":{family:"rbxasset://fonts/families/LuckiestGuy.json",enumName:"LuckiestGuy"},
  "Michroma":{family:"rbxasset://fonts/families/Michroma.json",enumName:"Michroma"},
  "Patrick Hand":{family:"rbxasset://fonts/families/PatrickHand.json",enumName:"PatrickHand"},
  "Permanent Marker":{family:"rbxasset://fonts/families/PermanentMarker.json",enumName:"PermanentMarker"},
  "Kalam":{family:"rbxasset://fonts/families/Kalam.json",enumName:"Kalam"},
  "Special Elite":{family:"rbxasset://fonts/families/SpecialElite.json",enumName:"SpecialElite"},
};

const closeMatches:Record<string,{enumName:string;matchName:string}>={
  "Inter":{enumName:"Gotham",matchName:"Gotham"},"Open Sans":{enumName:"SourceSans",matchName:"Source Sans"},"Lato":{enumName:"Gotham",matchName:"Gotham"},"Montserrat":{enumName:"Gotham",matchName:"Gotham"},"Poppins":{enumName:"Gotham",matchName:"Gotham"},"Manrope":{enumName:"Gotham",matchName:"Gotham"},"DM Sans":{enumName:"Gotham",matchName:"Gotham"},"Outfit":{enumName:"Gotham",matchName:"Gotham"},"Figtree":{enumName:"Gotham",matchName:"Gotham"},"Source Sans 3":{enumName:"SourceSans",matchName:"Source Sans"},
  "IBM Plex Mono":{enumName:"Code",matchName:"Code"},"Noto Sans Mono":{enumName:"Code",matchName:"Code"},"Source Code Pro":{enumName:"Code",matchName:"Code"},"Space Mono":{enumName:"Code",matchName:"Code"},"JetBrains Mono":{enumName:"Code",matchName:"Code"},"Fira Code":{enumName:"Code",matchName:"Code"},"Inconsolata":{enumName:"Code",matchName:"Code"},"VT323":{enumName:"Code",matchName:"Code"},"Share Tech Mono":{enumName:"Code",matchName:"Code"},"Press Start 2P":{enumName:"Arcade",matchName:"Arcade"},"Pixelify Sans":{enumName:"Arcade",matchName:"Arcade"},"Silkscreen":{enumName:"Arcade",matchName:"Arcade"},
  "Fredoka":{enumName:"Cartoon",matchName:"Cartoon"},"Baloo 2":{enumName:"Cartoon",matchName:"Cartoon"},"Lilita One":{enumName:"Cartoon",matchName:"Cartoon"},"Titan One":{enumName:"Cartoon",matchName:"Cartoon"},"Comic Neue":{enumName:"Cartoon",matchName:"Cartoon"},"Orbitron":{enumName:"SciFi",matchName:"SciFi"},"Oxanium":{enumName:"SciFi",matchName:"SciFi"},"Audiowide":{enumName:"SciFi",matchName:"SciFi"},"Rajdhani":{enumName:"SciFi",matchName:"SciFi"},"Bungee":{enumName:"GothamBlack",matchName:"Gotham Black"},
};

export function getRobloxFontCompatibility(family:string):RobloxFontCompatibility{
  const native=nativeFamilies[family]; if(native)return {level:"native",label:"ROBLOX NATIVE",family:native.family,enumName:native.enumName};
  const close=closeMatches[family]; if(close)return {level:"close",label:"CLOSE ROBLOX MATCH",enumName:close.enumName,matchName:close.matchName};
  return {level:"unsupported",label:"CUSTOM / NOT DIRECTLY SUPPORTED"};
}

export function robloxFontLua(family:string,weight:number,style:"normal"|"italic"){
  const compatibility=getRobloxFontCompatibility(family);
  const robloxWeight=weight>=800?"Heavy":weight>=700?"Bold":weight>=600?"SemiBold":weight>=500?"Medium":weight<=300?"Light":"Regular";
  const robloxStyle=style==="italic"?"Italic":"Normal";
  if(compatibility.family)return `Font.new(${JSON.stringify(compatibility.family)}, Enum.FontWeight.${robloxWeight}, Enum.FontStyle.${robloxStyle})`;
  return `Font.fromEnum(Enum.Font.${compatibility.enumName??"Gotham"})`;
}

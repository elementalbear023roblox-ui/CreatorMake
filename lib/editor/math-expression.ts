export type MathVariables=Record<string,number>;

type Token={kind:"number"|"identifier"|"operator"|"left"|"right"|"comma";value:string};
type RpnToken={kind:"number"|"variable"|"operator"|"function";value:string;arity?:number};

const FUNCTIONS:Record<string,{min:number;max:number;run:(...values:number[])=>number}>={
  sin:{min:1,max:1,run:Math.sin},cos:{min:1,max:1,run:Math.cos},tan:{min:1,max:1,run:Math.tan},
  asin:{min:1,max:1,run:Math.asin},acos:{min:1,max:1,run:Math.acos},atan:{min:1,max:1,run:Math.atan},
  sqrt:{min:1,max:1,run:Math.sqrt},abs:{min:1,max:1,run:Math.abs},floor:{min:1,max:1,run:Math.floor},
  ceil:{min:1,max:1,run:Math.ceil},round:{min:1,max:1,run:Math.round},exp:{min:1,max:1,run:Math.exp},
  log:{min:1,max:1,run:Math.log},sign:{min:1,max:1,run:Math.sign},min:{min:2,max:8,run:Math.min},
  max:{min:2,max:8,run:Math.max},clamp:{min:3,max:3,run:(value,min,max)=>Math.min(max,Math.max(min,value))},
};
const CONSTANTS:Record<string,number>={pi:Math.PI,e:Math.E};
const PRECEDENCE:Record<string,number>={"u+":5,"u-":5,"^":4,"*":3,"/":3,"%":3,"+":2,"-":2};
const RIGHT_ASSOCIATIVE=new Set(["^","u+","u-"]);

function tokenize(source:string):Token[]{
  const tokens:Token[]=[];let index=0;
  while(index<source.length){
    const char=source[index];
    if(/\s/.test(char)){index++;continue;}
    if(/[\d.]/.test(char)){
      const match=source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if(!match)throw new Error(`Invalid number near position ${index+1}.`);
      tokens.push({kind:"number",value:match[0]});index+=match[0].length;continue;
    }
    if(/[a-z_]/i.test(char)){
      const match=source.slice(index).match(/^[a-z_][a-z0-9_]*/i)!;
      tokens.push({kind:"identifier",value:match[0].toLowerCase()});index+=match[0].length;continue;
    }
    if("+-*/%^".includes(char)){tokens.push({kind:"operator",value:char});index++;continue;}
    if(char==="("){tokens.push({kind:"left",value:char});index++;continue;}
    if(char===")"){tokens.push({kind:"right",value:char});index++;continue;}
    if(char===","){tokens.push({kind:"comma",value:char});index++;continue;}
    throw new Error(`Unsupported character “${char}” at position ${index+1}.`);
  }
  return tokens;
}

export type CompiledMathExpression={source:string;variables:string[];evaluate:(variables?:MathVariables)=>number};

export function compileMathExpression(source:string,allowedVariables:string[]=[]):CompiledMathExpression{
  const trimmed=source.trim();if(!trimmed)throw new Error("Enter a mathematical expression.");
  const tokens=tokenize(trimmed),output:RpnToken[]=[],operators:Array<Token&{arity?:number}>=[],allowed=new Set(allowedVariables.map((item)=>item.toLowerCase())),used=new Set<string>();let previous:Token|undefined;
  for(let index=0;index<tokens.length;index++){
    const token=tokens[index],next=tokens[index+1];
    if(token.kind==="number"){output.push({kind:"number",value:token.value});}
    else if(token.kind==="identifier"){
      if(next?.kind==="left"){
        if(!FUNCTIONS[token.value])throw new Error(`Unsupported function “${token.value}”.`);
        operators.push({...token,arity:1});
      }else if(token.value in CONSTANTS)output.push({kind:"number",value:String(CONSTANTS[token.value])});
      else{
        if(!allowed.has(token.value))throw new Error(`Variable “${token.value}” is not available here.`);
        used.add(token.value);output.push({kind:"variable",value:token.value});
      }
    }else if(token.kind==="comma"){
      while(operators.length&&operators.at(-1)?.kind!=="left")output.push(operators.pop() as RpnToken);
      if(!operators.length)throw new Error("A comma must be inside a function call.");
      for(let cursor=operators.length-2;cursor>=0;cursor--)if(operators[cursor].kind==="identifier"){operators[cursor].arity=(operators[cursor].arity??1)+1;break;}
    }else if(token.kind==="operator"){
      const unary=!previous||previous.kind==="operator"||previous.kind==="left"||previous.kind==="comma",value=unary&&(token.value==="+"||token.value==="-")?`u${token.value}`:token.value;
      while(operators.length&&operators.at(-1)?.kind==="operator"){
        const top=operators.at(-1)!.value,higher=PRECEDENCE[top]>PRECEDENCE[value],equalLeft=PRECEDENCE[top]===PRECEDENCE[value]&&!RIGHT_ASSOCIATIVE.has(value);if(!higher&&!equalLeft)break;
        output.push({kind:"operator",value:operators.pop()!.value});
      }
      operators.push({kind:"operator",value});
    }else if(token.kind==="left")operators.push(token);
    else if(token.kind==="right"){
      while(operators.length&&operators.at(-1)?.kind!=="left"){
        const popped=operators.pop()!;output.push({kind:popped.kind==="identifier"?"function":"operator",value:popped.value,arity:popped.arity});
      }
      if(!operators.length)throw new Error("Unmatched closing parenthesis.");
      operators.pop();
      if(operators.at(-1)?.kind==="identifier"){const fn=operators.pop()!;output.push({kind:"function",value:fn.value,arity:fn.arity??1});}
    }
    previous=token;
  }
  while(operators.length){const token=operators.pop()!;if(token.kind==="left"||token.kind==="right")throw new Error("Unmatched opening parenthesis.");output.push({kind:token.kind==="identifier"?"function":"operator",value:token.value,arity:token.arity});}
  const evaluate=(variables:MathVariables={})=>{
    const stack:number[]=[];
    for(const token of output){
      if(token.kind==="number")stack.push(Number(token.value));
      else if(token.kind==="variable"){const value=variables[token.value];if(!Number.isFinite(value))throw new Error(`Variable “${token.value}” is missing or invalid.`);stack.push(value);}
      else if(token.kind==="operator"){
        if(token.value==="u+"||token.value==="u-"){if(!stack.length)throw new Error("Incomplete unary expression.");const value=stack.pop()!;stack.push(token.value==="u-"?-value:value);continue;}
        if(stack.length<2)throw new Error("Incomplete mathematical expression.");const right=stack.pop()!,left=stack.pop()!;
        stack.push(token.value==="+"?left+right:token.value==="-"?left-right:token.value==="*"?left*right:token.value==="/"?left/right:token.value==="%"?left%right:left**right);
      }else{
        const fn=FUNCTIONS[token.value],arity=token.arity??1;if(!fn||arity<fn.min||arity>fn.max||stack.length<arity)throw new Error(`Invalid arguments for ${token.value}().`);const values=stack.splice(stack.length-arity,arity);stack.push(fn.run(...values));
      }
    }
    if(stack.length!==1)throw new Error("Incomplete mathematical expression.");const result=stack[0];if(!Number.isFinite(result))throw new Error("The equation produced an infinite or undefined result.");return result;
  };
  return{source:trimmed,variables:[...used],evaluate};
}

export function validateMathExpression(source:string,allowedVariables:string[],sample:MathVariables={}){
  try{const expression=compileMathExpression(source,allowedVariables);expression.evaluate(sample);return{valid:true,error:null,expression};}
  catch(error){return{valid:false,error:error instanceof Error?error.message:"Invalid expression.",expression:null};}
}

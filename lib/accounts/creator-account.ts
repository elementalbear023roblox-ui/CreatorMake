const ACCOUNTS_KEY="creatormake:accounts:v1";
const SESSION_KEY="creatormake:account-session:v1";
const PBKDF2_ITERATIONS=210_000;
const EMAIL_PATTERN=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreatorMakeProfile={id:string;displayName:string;email:string;createdAt:number;provider:"creatormake"};
export type CreatorMakeCredentialRecord={profile:CreatorMakeProfile;salt:string;passwordHash:string;iterations:number};
export type CreatorMakeAccountInput={displayName:string;email:string;password:string};
export type CreatorMakeAccountKey={format:"creatormake-account-key";formatVersion:1;exportedAt:string;account:CreatorMakeCredentialRecord};

const localStorageSafe=()=>typeof window!=="undefined"?window.localStorage:null;
const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const bytesToBase64=(bytes:Uint8Array)=>{let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);};
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),(character)=>character.charCodeAt(0));

export function validateCreatorMakeAccountInput(input:CreatorMakeAccountInput){
  const displayName=input.displayName.trim(),email=normalizeEmail(input.email);
  if(displayName.length<2)throw new Error("Enter a display name with at least 2 characters.");
  if(displayName.length>60)throw new Error("Display names must be 60 characters or fewer.");
  if(!EMAIL_PATTERN.test(email))throw new Error("Enter a valid email address.");
  if(input.password.length<8)throw new Error("Use at least 8 characters for your password.");
  if(input.password.length>128)throw new Error("Passwords must be 128 characters or fewer.");
  return{displayName,email,password:input.password};
}

async function derivePasswordHash(password:string,salt:Uint8Array,iterations=PBKDF2_ITERATIONS){
  const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const saltBuffer=new ArrayBuffer(salt.byteLength);new Uint8Array(saltBuffer).set(salt);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:saltBuffer,iterations},material,256);
  return new Uint8Array(bits);
}

export async function createCreatorMakeCredentialRecord(input:CreatorMakeAccountInput,existing:CreatorMakeCredentialRecord[]=[]){
  const value=validateCreatorMakeAccountInput(input);
  if(existing.some((record)=>record.profile.email===value.email))throw new Error("A CreatorMake account with this email already exists on this device.");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const passwordHash=await derivePasswordHash(value.password,salt);
  const profile:CreatorMakeProfile={id:`cm_${crypto.randomUUID()}`,displayName:value.displayName,email:value.email,createdAt:Date.now(),provider:"creatormake"};
  return{profile,salt:bytesToBase64(salt),passwordHash:bytesToBase64(passwordHash),iterations:PBKDF2_ITERATIONS} satisfies CreatorMakeCredentialRecord;
}

export async function verifyCreatorMakePassword(record:CreatorMakeCredentialRecord,password:string){
  const expected=base64ToBytes(record.passwordHash),actual=await derivePasswordHash(password,base64ToBytes(record.salt),record.iterations);
  if(expected.length!==actual.length)return false;
  let difference=0;for(let index=0;index<expected.length;index++)difference|=expected[index]^actual[index];
  return difference===0;
}

function validatedCredentialRecord(value:unknown){
  const record=value as Partial<CreatorMakeCredentialRecord>|null,profile=record?.profile as Partial<CreatorMakeProfile>|undefined;
  if(!record||!profile||profile.provider!=="creatormake"||typeof profile.id!=="string"||!profile.id.startsWith("cm_")||typeof profile.displayName!=="string"||profile.displayName.trim().length<2||profile.displayName.length>60||typeof profile.email!=="string"||normalizeEmail(profile.email)!==profile.email||!EMAIL_PATTERN.test(profile.email)||!Number.isFinite(profile.createdAt)||typeof record.salt!=="string"||typeof record.passwordHash!=="string"||!Number.isInteger(record.iterations)||Number(record.iterations)<100_000||Number(record.iterations)>1_000_000)throw new Error("This is not a valid CreatorMake account key.");
  try{const salt=base64ToBytes(record.salt),hash=base64ToBytes(record.passwordHash);if(salt.length<16||salt.length>64||hash.length!==32)throw new Error();}catch{throw new Error("This CreatorMake account key is damaged or incomplete.");}
  return structuredClone(record) as CreatorMakeCredentialRecord;
}

export function createCreatorMakeAccountKey(record:CreatorMakeCredentialRecord):CreatorMakeAccountKey{return{format:"creatormake-account-key",formatVersion:1,exportedAt:new Date().toISOString(),account:validatedCredentialRecord(record)};}

export function parseCreatorMakeAccountKey(value:unknown){
  let parsed=value;try{if(typeof value==="string")parsed=JSON.parse(value);}catch{throw new Error("CreatorMake could not read this account key file.");}
  const key=parsed as Partial<CreatorMakeAccountKey>|null;if(!key||key.format!=="creatormake-account-key"||key.formatVersion!==1)throw new Error("Choose a CreatorMake account key file.");
  return validatedCredentialRecord(key.account);
}

const readAccounts=()=>{try{const raw=localStorageSafe()?.getItem(ACCOUNTS_KEY);if(!raw)return[];const records=JSON.parse(raw) as CreatorMakeCredentialRecord[];return Array.isArray(records)?records.filter((record)=>record?.profile?.provider==="creatormake"&&record.salt&&record.passwordHash):[];}catch{return[];}};
const writeAccounts=(records:CreatorMakeCredentialRecord[])=>localStorageSafe()?.setItem(ACCOUNTS_KEY,JSON.stringify(records));
const writeSession=(profile:CreatorMakeProfile)=>localStorageSafe()?.setItem(SESSION_KEY,JSON.stringify(profile));

export function loadCreatorMakeSession():CreatorMakeProfile|null{
  try{const raw=localStorageSafe()?.getItem(SESSION_KEY);if(!raw)return null;const profile=JSON.parse(raw) as CreatorMakeProfile;return profile?.id&&profile.email&&profile.provider==="creatormake"?profile:null;}catch{return null;}
}

export async function createCreatorMakeAccount(input:CreatorMakeAccountInput){
  const records=readAccounts(),record=await createCreatorMakeCredentialRecord(input,records);writeAccounts([...records,record]);writeSession(record.profile);return record.profile;
}

export async function signInCreatorMakeAccount(email:string,password:string){
  const normalized=normalizeEmail(email),record=readAccounts().find((candidate)=>candidate.profile.email===normalized);
  if(!record||!await verifyCreatorMakePassword(record,password))throw new Error("The email or password is incorrect on this device.");
  writeSession(record.profile);return record.profile;
}

export function exportCreatorMakeAccountKey(profileId:string){const record=readAccounts().find((candidate)=>candidate.profile.id===profileId);if(!record)throw new Error("This CreatorMake account is not available on this device.");return createCreatorMakeAccountKey(record);}

export function importCreatorMakeAccountKey(value:unknown){const incoming=parseCreatorMakeAccountKey(value),records=readAccounts(),same=records.find((record)=>record.profile.email===incoming.profile.email);if(same){if(same.profile.id===incoming.profile.id&&same.passwordHash===incoming.passwordHash)return same.profile;throw new Error("A different CreatorMake account already uses this email on this device.");}writeAccounts([...records,incoming]);return incoming.profile;}

export function signOutCreatorMakeAccount(){localStorageSafe()?.removeItem(SESSION_KEY);}

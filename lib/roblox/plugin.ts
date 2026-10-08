import {
  CREATORMAKE_APP_VERSION,
  CREATORMAKE_BRIDGE_ORIGIN,
  CREATORMAKE_BRIDGE_VERSION,
  CREATORMAKE_PLUGIN_VERSION,
  CREATORMAKE_PROTOCOL_VERSION,
} from "../creatormake-version.js";

const safeOrigin=(origin:string)=>{const url=new URL(origin);if(url.protocol!=="https:"&&!(["localhost","127.0.0.1"].includes(url.hostname)&&url.protocol==="http:"))throw new Error("CreatorMake Studio plugin downloads require HTTPS or localhost.");return url.origin;};
const creatorMakeBridgePort=new URL(CREATORMAKE_BRIDGE_ORIGIN).port;

export function createRobloxPluginSource(origin:string){const downloadOrigin=safeOrigin(origin);return `-- CreatorMake Studio Plugin
-- Downloaded from ${downloadOrigin}. Studio preview is local and never receives Roblox publishing credentials.
local HttpService = game:GetService("HttpService")
local AssetService = game:GetService("AssetService")
local EncodingService = game:GetService("EncodingService")
local StarterGui = game:GetService("StarterGui")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local LOCAL_ORIGIN = ${JSON.stringify(CREATORMAKE_BRIDGE_ORIGIN)}
local CREATORMAKE_APP_VERSION = ${JSON.stringify(CREATORMAKE_APP_VERSION)}
local EXPECTED_BRIDGE_VERSION = ${JSON.stringify(CREATORMAKE_BRIDGE_VERSION)}
local PLUGIN_VERSION = ${CREATORMAKE_PLUGIN_VERSION}
local SUPPORTED_PROTOCOL_VERSION = ${CREATORMAKE_PROTOCOL_VERSION}
local INSTANCE_ID = HttpService:GenerateGUID(false)
local toolbar = plugin:CreateToolbar("CreatorMake")
-- Keep the icon empty until CreatorMake has a valid published Roblox ContentId.
local openButton = toolbar:CreateButton("CreatorMake", "Connect to the local CreatorMake editor", "")
local widgetInfo = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 370, 520, 320, 420)
local widget = plugin:CreateDockWidgetPluginGui("CreatorMakeStudioSync", widgetInfo)
widget.Title = "CREATORMAKE"
openButton.Click:Connect(function() widget.Enabled = not widget.Enabled end)

local function make(className, properties, parent)
  local instance = Instance.new(className)
  for key, value in pairs(properties or {}) do instance[key] = value end
  instance.Parent = parent
  return instance
end

local root = make("Frame", {Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(17,19,28),BorderSizePixel=0}, widget)
make("UIPadding", {PaddingTop=UDim.new(0,14),PaddingRight=UDim.new(0,14),PaddingBottom=UDim.new(0,14),PaddingLeft=UDim.new(0,14)}, root)
make("UIListLayout", {Padding=UDim.new(0,9),SortOrder=Enum.SortOrder.LayoutOrder}, root)
local function label(text, size, color)
  return make("TextLabel", {Size=UDim2.new(1,0,0,size or 24),BackgroundTransparency=1,Font=Enum.Font.Gotham,Text=text,TextColor3=color or Color3.fromRGB(222,226,239),TextSize=13,TextXAlignment=Enum.TextXAlignment.Left,TextWrapped=true}, root)
end
local title = label("CREATORMAKE · STUDIO SYNC v"..tostring(PLUGIN_VERSION), 34, Color3.fromRGB(135,112,255)); title.Font=Enum.Font.GothamBold; title.TextSize=18
local statusLabel = label("CreatorMake: Disconnected", 26, Color3.fromRGB(255,105,120))
local endpointLabel = label("Web "..CREATORMAKE_APP_VERSION.." · Bridge "..EXPECTED_BRIDGE_VERSION.." · Protocol "..tostring(SUPPORTED_PROTOCOL_VERSION).." · Port ${creatorMakeBridgePort}", 28, Color3.fromRGB(154,160,180))
local guiLabel = label("Current Project: —", 22)
local deployLabel = label("Deploy Target: StarterGui — Current Project", 24, Color3.fromRGB(76,222,143))
local function button(text)
  local item=make("TextButton", {Size=UDim2.new(1,0,0,36),BackgroundColor3=Color3.fromRGB(104,79,242),TextColor3=Color3.fromRGB(255,255,255),Text=text,Font=Enum.Font.GothamBold,TextSize=13,BorderSizePixel=0,AutoButtonColor=true}, root)
  make("UICorner", {CornerRadius=UDim.new(0,6)}, item); return item
end
local connectButton=button("RETRY CONNECTION")
local basicImportButton=button("TEST BASIC FRAME IMPORT")
local previewButton=button("PREVIEW CURRENT CREATORMAKE PROJECT")
local installButton=button("IMPORT CURRENT CREATORMAKE PROJECT")
local disconnectButton=button("DISCONNECT")
local detailLabel=label("Preview uses a temporary PlayerGui copy. Permanent sync updates only the CreatorMake-managed StarterGui source used for every player.", 90, Color3.fromRGB(154,160,180))

local connected = false
local busy = false
local autoSyncEnabled = true
local previewProjectName = nil
local previewScreenGui = nil
local previewImages = {}
local previewByHash = {}
local viewportCameraConnection = nil
local viewportWorkspaceConnection = nil

local function pluginPayload(status)
  return {instanceId=INSTANCE_ID,appVersion=CREATORMAKE_APP_VERSION,pluginVersion=PLUGIN_VERSION,protocolVersion=SUPPORTED_PROTOCOL_VERSION,status=status or (busy and "busy" or "idle"),placeId=game.PlaceId}
end

local function showStatus(text, color)
  statusLabel.Text = text
  statusLabel.TextColor3 = color
end

local lastConnectionProblem=""
local function showConnectionFailure(problem)
  local message=tostring(problem)
  if string.find(message,"PLUGIN_UPDATE_REQUIRED",1,true) then showStatus("CreatorMake: Plugin Update Required",Color3.fromRGB(255,194,92))
  elseif string.find(message,"CREATORMAKE_UPDATE_REQUIRED",1,true) then showStatus("CreatorMake: CreatorMake Update Required",Color3.fromRGB(255,194,92))
  elseif string.find(message,"BRIDGE_UPDATE_REQUIRED",1,true) then showStatus("CreatorMake: Bridge Update Required",Color3.fromRGB(255,194,92))
  elseif string.find(message,"HTTP_PERMISSION_REQUIRED",1,true) then showStatus("CreatorMake: HTTP Permission Required",Color3.fromRGB(255,194,92))
  elseif string.find(message,"SERVER_NOT_RUNNING",1,true) then showStatus("CreatorMake: Server Not Running",Color3.fromRGB(255,105,120))
  else showStatus("CreatorMake: Connection Error",Color3.fromRGB(255,105,120)) end
  detailLabel.Text=message
  if message~=lastConnectionProblem then warn("CreatorMake connection failed: "..message);lastConnectionProblem=message end
end

local function request(method, path, body)
  local options = {Url=LOCAL_ORIGIN..path, Method=method, Headers={['Accept']='application/json'}}
  if body~=nil then options.Headers['Content-Type']='application/json';options.Body=HttpService:JSONEncode(body) end
  local requestOk, response = pcall(function() return HttpService:RequestAsync(options) end)
  if not requestOk then
    local raw=tostring(response)
    if string.find(string.lower(raw),"http requests are not enabled",1,true) or string.find(string.lower(raw),"not allowed to access",1,true) or string.find(string.lower(raw),"permission",1,true) then
      error("HTTP_PERMISSION_REQUIRED: Roblox Studio is blocking CreatorMake's local connection. Enable HTTP Requests in Experience Settings > Security and allow the CreatorMake plugin to access 127.0.0.1. Studio reported: "..raw)
    end
    if string.find(raw,"ConnectFail",1,true) then error("SERVER_NOT_RUNNING_OR_BLOCKED: Studio could not reach "..LOCAL_ORIGIN..". CreatorMake may be closed, the bridge port may be unavailable, or local HTTP access may be blocked. Studio reported: "..raw) end
    error("LOCAL_HTTP_ERROR: Could not reach "..LOCAL_ORIGIN..path..". Studio reported: "..raw)
  end
  if not response.Success then error("CreatorMake Studio Sync returned HTTP "..tostring(response.StatusCode).." for "..path..". "..tostring(response.StatusMessage or response.Body)) end
  local decodeOk, decoded = pcall(function() return HttpService:JSONDecode(response.Body) end)
  if not decodeOk then error("CreatorMake Studio Sync returned invalid JSON for "..path..".") end
  return decoded
end

local function validAssetId(value)
  return type(value)=="string" and string.match(value,"^rbxassetid://%d+$")~=nil
end

local function validateHealth(health)
  if type(health)~="table" then error("HEALTH_INVALID_JSON: /health did not decode to an object.") end
  if health.status~="ok" or health.app~="CreatorMake" or health.service~="CreatorMake Studio Sync" then error("SERVICE_IDENTITY_MISMATCH: Expected CreatorMake Studio Sync at "..LOCAL_ORIGIN..".") end
  if health.bridgeVersion~=EXPECTED_BRIDGE_VERSION then error("BRIDGE_UPDATE_REQUIRED: Plugin expects bridge "..EXPECTED_BRIDGE_VERSION..", received "..tostring(health.bridgeVersion)..".") end
  if type(health.protocolVersion)~="number" then error("PROTOCOL_MISSING: /health did not advertise protocolVersion.") end
  if type(health.pluginVersionRequired)=="number" and health.pluginVersionRequired>PLUGIN_VERSION then error("PLUGIN_UPDATE_REQUIRED: Plugin build "..tostring(PLUGIN_VERSION)..", server requires "..tostring(health.pluginVersionRequired)..".") end
  if health.protocolVersion>SUPPORTED_PROTOCOL_VERSION then error("PLUGIN_UPDATE_REQUIRED: Plugin protocol "..tostring(SUPPORTED_PROTOCOL_VERSION)..", server protocol "..tostring(health.protocolVersion)..".") end
  if health.protocolVersion<SUPPORTED_PROTOCOL_VERSION then error("CREATORMAKE_UPDATE_REQUIRED: Plugin protocol "..tostring(SUPPORTED_PROTOCOL_VERSION)..", server protocol "..tostring(health.protocolVersion)..".") end
  return health
end

local function validateManifest(manifest)
  if type(manifest)~="table" then error("MANIFEST_INVALID_JSON: /manifest did not decode to an object.") end
  if manifest.kind=="preset-library" then error("CreatorMake sync error: received preset library instead of project manifest.") end
  if manifest.kind~="project" or manifest.messageType~="PROJECT_MANIFEST" then error("MANIFEST_KIND_INVALID: Studio imports only the current CreatorMake PROJECT_MANIFEST.") end
  if manifest.protocolVersion~=SUPPORTED_PROTOCOL_VERSION then error("MANIFEST_PROTOCOL_MISMATCH: plugin="..tostring(SUPPORTED_PROTOCOL_VERSION)..", manifest="..tostring(manifest.protocolVersion)..".") end
  if manifest.schema~="creatormake.roblox-manifest" then error("MANIFEST_SCHEMA_INVALID: schema="..tostring(manifest.schema)..".") end
  if manifest.schemaVersion~=1 and manifest.schemaVersion~=2 then error("MANIFEST_SCHEMA_VERSION_INVALID: schemaVersion="..tostring(manifest.schemaVersion)..".") end
  if type(manifest.projectId)~="string" or manifest.projectId=="" or type(manifest.projectName)~="string" or manifest.projectName=="" then error("MANIFEST_PROJECT_INVALID: projectId and projectName are required.") end
  if type(manifest.screenGuiName)~="string" or manifest.screenGuiName=="" then error("MANIFEST_PROJECT_INVALID: screenGuiName is missing.") end
  if type(manifest.nodes)~="table" then error("MANIFEST_INSTANCES_MISSING: nodes must be an array.") end
  if type(manifest.projectObjectIds)~="table" then error("MANIFEST_PROJECT_OBJECTS_MISSING: projectObjectIds must be an array.") end
  local projectObjects={}
  for _,sourceId in ipairs(manifest.projectObjectIds) do if type(sourceId)=="string" and sourceId~="" then projectObjects[sourceId]=true end end
  for _,node in ipairs(manifest.nodes) do
    if node.sourceId~="__creatormake_viewport" then
      local attributes=type(node.attributes)=="table" and node.attributes or {}
      local owner=attributes.CreatorMakeSourceElementId or attributes.CreatorMakeLayoutSourceId or attributes.CreatorMakeSourceId or attributes.CreatorMakeLogicalParentId or node.sourceId
      owner=string.match(tostring(owner),"^(.-)::") or tostring(owner)
      if not projectObjects[owner] then error("CreatorMake sync error: received object "..tostring(node.sourceId).." outside current project "..manifest.projectId..". Preset libraries cannot be imported.") end
    end
  end
  if (manifest.visualMode=="PIXEL_ACCURATE" or manifest.visualMode=="ADAPTIVE") and type(manifest.assets)~="table" then error("MANIFEST_ASSETS_MISSING: Rendered visual mode requires asset records.") end
  if type(manifest.importDiagnostics)~="table" then error("MANIFEST_DIAGNOSTICS_MISSING: server did not include import validation details.") end
  if manifest.importDiagnostics.schemaVersion~="valid" or manifest.importDiagnostics.project~="valid" or manifest.importDiagnostics.instances~="valid" or manifest.importDiagnostics.assets~="valid" then error("MANIFEST_REJECTED: "..HttpService:JSONEncode(manifest.importDiagnostics)) end
  local textRoots={}
  for _,node in ipairs(manifest.nodes) do
    local attributes=type(node.attributes)=="table" and node.attributes or {}
    local elementType=attributes.CreatorMakeElementType
    local sourceElementId=attributes.CreatorMakeLayoutSourceId or attributes.CreatorMakeSourceElementId or attributes.CreatorMakeSourceId or node.sourceId
    if (elementType=="text" or elementType=="button") and tostring(sourceElementId)==tostring(node.sourceId) then table.insert(textRoots,node) end
  end
  if #textRoots>0 and manifest.textExportArchitecture~=3 then error("TEXT_EXPORT_ARCHITECTURE_OUTDATED: Refresh CreatorMake and stage the project again.") end
  for _,node in ipairs(manifest.nodes) do
    local role=type(node.attributes)=="table" and node.attributes.CreatorMakeRole or nil
    local visualPart=type(node.attributes)=="table" and node.attributes.CreatorMakeVisualPart or nil
    if role=="PixelText" or (visualPart=="text" and node.className=="ImageLabel" and role~="TransformedText") then error("LEGACY_PIXEL_TEXT_REJECTED: text images are accepted only for explicit shear/perspective TransformedText nodes.") end
  end
  for _,rootNode in ipairs(textRoots) do
    local rootAttributes=type(rootNode.attributes)=="table" and rootNode.attributes or {}
    local textBaked=rootAttributes.CreatorMakeTextBaked==true or rootAttributes.CreatorMakeCaptionBaked==true
    local expectsNativeText=rootAttributes.CreatorMakeHasNativeText==true
    local standaloneNative=(rootNode.className=="TextLabel" or rootNode.className=="TextBox") and type(rootNode.properties)=="table" and type(rootNode.properties.Text)=="string"
    local nativeChild=false
    local exactChild=false
    local combinedVisual=false
    for _,candidate in ipairs(manifest.nodes) do
      if candidate.parentSourceId==rootNode.sourceId then
        local role=type(candidate.attributes)=="table" and candidate.attributes.CreatorMakeRole or nil
        local visualPart=type(candidate.attributes)=="table" and candidate.attributes.CreatorMakeVisualPart or nil
        if role=="Visual" or visualPart=="full" then combinedVisual=true end
        if (candidate.className=="TextLabel" or candidate.className=="TextBox") and type(candidate.properties)=="table" and type(candidate.properties.Text)=="string" then nativeChild=true end
        if candidate.className=="ImageLabel" and role=="TransformedText" and candidate.attributes.CreatorMakeRequiresExactTextRaster==true and type(candidate.attributes.CreatorMakeEditableText)=="string" then exactChild=true end
      end
    end
    if not textBaked and combinedVisual then error("LEGACY_TEXT_RASTER_REJECTED: "..tostring(rootNode.name).." still contains a combined _Visual without declaring baked text.") end
    if expectsNativeText and not standaloneNative and not nativeChild then error("TEXT_INSTANCE_MISSING: "..tostring(rootNode.name).." resolved to native text but contains no TextLabel or TextBox.") end
    if not textBaked and not standaloneNative and not nativeChild and not exactChild then error("TEXT_INSTANCE_MISSING: "..tostring(rootNode.name).." must contain native editable text, an explicit TransformedText ImageLabel, or declare baked text.") end
  end
  local manifestNodesById={}
  for _,node in ipairs(manifest.nodes) do manifestNodesById[node.sourceId]=node end
  for _,node in ipairs(manifest.nodes) do
    if node.className=="TextLabel" or node.className=="TextButton" or node.className=="TextBox" then
      local attributes=type(node.attributes)=="table" and node.attributes or {}
      local properties=type(node.properties)=="table" and node.properties or {}
      local mode=attributes.CreatorMakeTextScaleMode
      local constraintCount=0
      for _,decorator in ipairs(node.decorators or {}) do if decorator.className=="UITextSizeConstraint" then constraintCount+=1 end end
      local globalScaleCount=0
      local objectScaleCount=0
      local cursor=node
      local scaleGuard=0
      while cursor and scaleGuard<=#manifest.nodes do
        scaleGuard+=1
        for _,decorator in ipairs(cursor.decorators or {}) do
          if decorator.className=="UIScale" and decorator.name=="CreatorMakeGlobalScale" then globalScaleCount+=1 end
          if decorator.className=="UIScale" and decorator.name=="CreatorMakeObjectScale" then objectScaleCount+=1 end
        end
        cursor=cursor.parentSourceId and manifestNodesById[cursor.parentSourceId] or nil
      end
      if mode=="FIXED_DESIGN_SIZE" or mode=="FIT_GEOMETRY" or mode=="RESPONSIVE_CONSTRAINED" then
        if (manifest.visualMode=="PIXEL_ACCURATE" or manifest.visualMode=="ADAPTIVE") and globalScaleCount~=1 then error("TEXT_ROOT_SCALE_INVALID: "..tostring(node.name).." must inherit exactly one CreatorMakeGlobalScale; received "..tostring(globalScaleCount)..".") end
        if objectScaleCount>1 then error("TEXT_OBJECT_SCALE_INVALID: "..tostring(node.name).." inherits duplicate CreatorMakeObjectScale objects.") end
      end
      if mode=="FIXED_DESIGN_SIZE" or mode=="FIT_GEOMETRY" then
        if properties.TextScaled~=false then error("TEXT_SCALE_INVALID: "..tostring(node.name).." design/fit text must use TextScaled=false.") end
        local expectedSize=mode=="FIT_GEOMETRY" and attributes.CreatorMakeCalculatedFitTextSize or attributes.CreatorMakeTextSize
        if type(expectedSize)~="number" or type(properties.TextSize)~="number" or math.abs(expectedSize-properties.TextSize)>.001 then error("TEXT_SIZE_INVALID: "..tostring(node.name).." must keep the exact CreatorMake calculated TextSize.") end
        if constraintCount~=0 then error("TEXT_CONSTRAINT_INVALID: "..tostring(node.name).." design/fit text must not use UITextSizeConstraint.") end
      elseif mode=="RESPONSIVE_CONSTRAINED" then
        if properties.TextScaled~=true or constraintCount~=1 then error("TEXT_CONSTRAINT_INVALID: "..tostring(node.name).." responsive text requires TextScaled=true and one UITextSizeConstraint.") end
      end
      local captionOrientation=attributes.CreatorMakeResolvedCaptionOrientation
      if captionOrientation~=nil and attributes.CreatorMakeCaptionLayoutSpace=="LOCAL_CHILD" then
        if captionOrientation~="horizontal" and captionOrientation~="follow-shape" and captionOrientation~="custom" then error("CAPTION_ORIENTATION_INVALID: "..tostring(node.name).." has unsupported orientation "..tostring(captionOrientation)..".") end
        if type(attributes.CreatorMakeCaptionCenterX)~="number" or type(attributes.CreatorMakeCaptionCenterY)~="number" or type(attributes.CreatorMakeCaptionWidth)~="number" or type(attributes.CreatorMakeCaptionHeight)~="number" or type(attributes.CreatorMakeCaptionSafeWidth)~="number" or type(attributes.CreatorMakeCaptionSafeHeight)~="number" or type(attributes.CreatorMakeGeometryCenterlineAngle)~="number" or type(attributes.CreatorMakeCaptionAngle)~="number" then error("CAPTION_LAYOUT_MISSING: "..tostring(node.name).." is missing canonical caption geometry, safe region, or geometry centerline.") end
        if type(properties.Position)~="table" or properties.Position.kind~="UDim2" or type(properties.Size)~="table" or properties.Size.kind~="UDim2" or type(properties.AnchorPoint)~="table" or properties.AnchorPoint.kind~="Vector2" or type(properties.Rotation)~="number" then error("CAPTION_LAYOUT_INVALID: "..tostring(node.name).." must export Position, Size, AnchorPoint, and Rotation from the canonical caption layout.") end
        local safeWidth=tonumber(attributes.CreatorMakeCaptionSafeWidth) or 0
        local safeHeight=tonumber(attributes.CreatorMakeCaptionSafeHeight) or 0
        local minimumWidth=tonumber(attributes.CreatorMakeCaptionMinimumWidth) or 20
        local minimumHeight=tonumber(attributes.CreatorMakeCaptionMinimumHeight) or 20
        local measuredWidth=tonumber(attributes.CreatorMakeMeasuredTextWidth) or 0
        local measuredHeight=tonumber(attributes.CreatorMakeMeasuredTextHeight) or 0
        local glyphSafeX=tonumber(attributes.CreatorMakeGlyphSafeX) or 0
        local glyphSafeY=tonumber(attributes.CreatorMakeGlyphSafeY) or 0
        local declaredOverflow=attributes.CreatorMakeTextOverflow==true
        if (safeWidth<minimumWidth or safeHeight<minimumHeight) and not declaredOverflow then error("CAPTION_SAFE_REGION_COLLAPSED: "..tostring(node.name).." exported "..tostring(safeWidth).."x"..tostring(safeHeight).." but requires at least "..tostring(minimumWidth).."x"..tostring(minimumHeight)..".") end
        if (safeWidth+.001<measuredWidth+glyphSafeX*2 or safeHeight+.001<measuredHeight+glyphSafeY*2) and not declaredOverflow then error("CAPTION_GLYPH_BOUNDS_INVALID: "..tostring(node.name).." does not fit its measured glyphs plus native safety margin.") end
        if (tonumber(properties.Size.xOffset) or 0)<=0 or (tonumber(properties.Size.yOffset) or 0)<=0 then error("CAPTION_TEXTLABEL_COLLAPSED: "..tostring(node.name).." exported a zero-sized native TextLabel.") end
        if math.abs(properties.AnchorPoint.x-.5)>.001 or math.abs(properties.AnchorPoint.y-.5)>.001 then error("CAPTION_ANCHOR_INVALID: "..tostring(node.name).." must use a centered anchor.") end
        local centerError=math.sqrt((properties.Position.xOffset-attributes.CreatorMakeCaptionCenterX)^2+(properties.Position.yOffset-attributes.CreatorMakeCaptionCenterY)^2)
        local angleError=math.abs(((properties.Rotation-attributes.CreatorMakeFinalTextLabelRotationApplied+180)%360)-180)
        local axisLost=captionOrientation=="follow-shape" and math.abs(attributes.CreatorMakeFinalTextLabelRotationApplied)>.001 and math.abs(properties.Rotation or 0)<=.001
        local captionResult="PASS"
        if axisLost or angleError>3 or centerError>4 then captionResult="ERROR"
        elseif angleError>1 or centerError>1 then captionResult="WARNING"
        elseif angleError>.25 then captionResult="PASS_WITH_TOLERANCE" end
        attributes.CreatorMakeCaptionValidationResult=captionResult
        attributes.CreatorMakeCaptionAngleError=angleError
        attributes.CreatorMakeCaptionCenterError=centerError
        if captionResult=="WARNING" or captionResult=="ERROR" then warn("[CreatorMake Caption] "..captionResult.." Object="..tostring(node.name).." Angle error="..string.format("%.4f",angleError).." Center error="..string.format("%.4f",centerError)..". Import will continue.") end
      end
    end
  end
  for index,asset in ipairs(manifest.assets or {}) do
    if type(asset.sourceId)~="string" or type(asset.visualHash)~="string" then error("MANIFEST_ASSET_INVALID: assets["..tostring(index).."] requires sourceId and visualHash.") end
    if not validAssetId(asset.robloxAssetId) and type(asset.localPath)~="string" then error("MANIFEST_ASSET_NOT_STAGED: assets["..tostring(index).."] has no staged PNG or permanent Roblox ID.") end
  end
  return manifest
end

local function decodeValue(value)
  if type(value)~="table" or not value.kind then return value end
  if value.kind=="Color3" then return Color3.fromRGB(value.r,value.g,value.b) end
  if value.kind=="Vector2" then return Vector2.new(value.x,value.y) end
  if value.kind=="UDim" then return UDim.new(value.scale,value.offset) end
  if value.kind=="UDim2" then return UDim2.new(value.xScale,value.xOffset,value.yScale,value.yOffset) end
  if value.kind=="Rect" then return Rect.new(value.minX,value.minY,value.maxX,value.maxY) end
  if value.kind=="Enum" then return Enum[value.enumType][value.item] end
  if value.kind=="ColorSequence" then local points={};for _,point in ipairs(value.keypoints) do table.insert(points,ColorSequenceKeypoint.new(point.time,Color3.fromRGB(point.color.r,point.color.g,point.color.b))) end;return ColorSequence.new(points) end
  if value.kind=="NumberSequence" then local points={};for _,point in ipairs(value.keypoints) do table.insert(points,NumberSequenceKeypoint.new(point.time,point.value)) end;return NumberSequence.new(points) end
  if value.kind=="Font" then if value.family then return Font.new(value.family,Enum.FontWeight[value.weight],Enum.FontStyle[value.style]) end;return Font.fromEnum(Enum.Font[value.enumName]) end
  return nil
end

local function setProperties(instance, properties)
  for key,value in pairs(properties or {}) do
    local ok,problem=pcall(function() instance[key]=decodeValue(value) end)
    if not ok then warn("CreatorMake skipped "..instance.Name.."."..key..": "..tostring(problem)) end
  end
end

local function downloadPixelBuffer(asset, assetIndex, assetCount)
  local pixels=nil
  local offset=0
  local width=nil
  local height=nil
  local totalBytes=nil
  repeat
    detailLabel.Text="Receiving changed visual "..tostring(assetIndex).."/"..tostring(assetCount)..": "..tostring(asset.elementName or asset.sourceId).."…"
    local path="/asset-pixels?sourceId="..HttpService:UrlEncode(asset.sourceId).."&visualHash="..HttpService:UrlEncode(asset.visualHash).."&offset="..tostring(offset)
    local chunk=request("GET",path)
    if chunk.sourceId~=asset.sourceId or chunk.visualHash~=asset.visualHash or chunk.offset~=offset then error("CreatorMake returned an unexpected pixel chunk.") end
    if type(chunk.width)~="number" or type(chunk.height)~="number" or type(chunk.totalBytes)~="number" or type(chunk.dataBase64)~="string" then error("CreatorMake returned invalid pixel data.") end
    if not pixels then
      width=chunk.width;height=chunk.height;totalBytes=chunk.totalBytes
      if chunk.pixelFormat~="RGBA8" or chunk.rgbaEncoding~="RGBA8_STRAIGHT_ALPHA" or chunk.channels~=4 or type(chunk.alpha)~="table" or chunk.alpha.preserved~=true or type(chunk.alpha.opaquePixels)~="number" or type(chunk.alpha.transparentPixels)~="number" or type(chunk.alpha.partialPixels)~="number" then error("CreatorMake pixel data is not verified straight-alpha RGBA8 with preserved alpha.") end
      if type(chunk.verification)=="table" and chunk.verification.sampleMatch~=true then error("CreatorMake PNG pixels changed before Studio transport. Maximum channel difference: "..tostring(chunk.verification.maxChannelDifference)..".") end
      if width<1 or height<1 or width>1024 or height>1024 or totalBytes~=width*height*4 then error("Rendered image dimensions exceed Roblox's 1024×1024 EditableImage limit.") end
      if chunk.alpha.opaquePixels+chunk.alpha.transparentPixels+chunk.alpha.partialPixels~=width*height then error("CreatorMake returned invalid alpha-channel metadata.") end
      pixels=buffer.create(totalBytes)
    elseif width~=chunk.width or height~=chunk.height or totalBytes~=chunk.totalBytes then error("Rendered image metadata changed while it was downloading.") end
    local decodeOk,decoded=pcall(function() return EncodingService:Base64Decode(buffer.fromstring(chunk.dataBase64)) end)
    if not decodeOk then error("Studio could not decode CreatorMake pixel data: "..tostring(decoded)) end
    local decodedLength=buffer.len(decoded)
    if decodedLength<1 or offset+decodedLength>totalBytes then error("CreatorMake returned an invalid pixel chunk length.") end
    buffer.copy(pixels,offset,decoded,0,decodedLength)
    offset+=decodedLength
  until offset>=totalBytes
  return pixels,width,height
end

local function releasePreviewSource(sourceId)
  local record=previewImages[sourceId]
  if not record then return end
  previewImages[sourceId]=nil
  local shared=record.shared
  shared.refs-=1
  if shared.refs<=0 then
    previewByHash[record.visualHash]=nil
    pcall(function() shared.image:Destroy() end)
  end
end

local function releaseAllPreviewImages()
  local sourceIds={}
  for sourceId in pairs(previewImages) do table.insert(sourceIds,sourceId) end
  for _,sourceId in ipairs(sourceIds) do releasePreviewSource(sourceId) end
  previewProjectName=nil
end

local function acquirePreview(asset, assetIndex, assetCount)
  local current=previewImages[asset.sourceId]
  if current and current.visualHash==asset.visualHash then return current.shared.content,false end
  if current then releasePreviewSource(asset.sourceId) end
  local shared=previewByHash[asset.visualHash]
  if shared then
    shared.refs+=1
    previewImages[asset.sourceId]={visualHash=asset.visualHash,shared=shared}
    return shared.content,false
  end
  if type(asset.localPath)~="string" then error("Rendered PNG is not staged for "..tostring(asset.elementName or asset.sourceId)..". Sync from CreatorMake again.") end
  local pixels,width,height=downloadPixelBuffer(asset,assetIndex,assetCount)
  local image=AssetService:CreateEditableImage({Size=Vector2.new(width,height)})
  if not image then error("Studio could not allocate an EditableImage for "..tostring(asset.elementName or asset.sourceId)..".") end
  local writeOk,problem=pcall(function() image:WritePixelsBuffer(Vector2.zero,Vector2.new(width,height),pixels) end)
  if not writeOk then image:Destroy();error("Studio could not write CreatorMake RGBA pixels: "..tostring(problem)) end
  local content=Content.fromObject(image)
  shared={image=image,content=content,refs=1}
  previewByHash[asset.visualHash]=shared
  previewImages[asset.sourceId]={visualHash=asset.visualHash,shared=shared}
  return content,true
end

local function preparePreviewContent(manifest, jobId)
  if manifest.visualMode~="PIXEL_ACCURATE" and manifest.visualMode~="ADAPTIVE" then releaseAllPreviewImages();return {},0,0 end
  if previewProjectName and previewProjectName~=manifest.screenGuiName then releaseAllPreviewImages() end
  previewProjectName=manifest.screenGuiName
  local contentBySource={}
  local activeSources={}
  local created=0
  local reused=0
  for index,asset in ipairs(manifest.assets or {}) do
    if jobId then request("POST","/sync/progress",{messageType="PROJECT_SYNC_PROGRESS",jobId=jobId,instanceId=INSTANCE_ID,message="Preparing Studio preview "..tostring(index).."/"..tostring(#manifest.assets)..": "..tostring(asset.elementName or asset.sourceId),result={created=created,reused=reused,nodes=0}}) end
    local content,wasCreated=acquirePreview(asset,index,#manifest.assets)
    contentBySource[asset.sourceId]=content;activeSources[asset.sourceId]=true
    if wasCreated then created+=1 else reused+=1 end
  end
  local stale={}
  for sourceId in pairs(previewImages) do if not activeSources[sourceId] then table.insert(stale,sourceId) end end
  for _,sourceId in ipairs(stale) do releasePreviewSource(sourceId) end
  return contentBySource,created,reused
end

local function releaseViewportScale()
  if viewportCameraConnection then viewportCameraConnection:Disconnect();viewportCameraConnection=nil end
  if viewportWorkspaceConnection then viewportWorkspaceConnection:Disconnect();viewportWorkspaceConnection=nil end
end

local function configureViewportScale(manifest, instances)
  releaseViewportScale()
  if manifest.visualMode~="PIXEL_ACCURATE" and manifest.visualMode~="ADAPTIVE" then return end
  local viewport=nil
  for _,node in ipairs(manifest.nodes or {}) do
    if type(node.attributes)=="table" and node.attributes.CreatorMakeRole=="Viewport" then viewport=instances[node.sourceId];break end
  end
  if not viewport then error("MANIFEST_VIEWPORT_MISSING: Pixel Accurate import requires CreatorMakeViewport.") end
  local scaleObject=viewport:FindFirstChild("CreatorMakeGlobalScale")
  if not scaleObject or not scaleObject:IsA("UIScale") then error("MANIFEST_VIEWPORT_SCALE_MISSING: CreatorMakeViewport requires exactly one UIScale.") end
  local referenceWidth=manifest.referenceResolution.width
  local referenceHeight=manifest.referenceResolution.height
  if type(referenceWidth)~="number" or type(referenceHeight)~="number" or referenceWidth<=0 or referenceHeight<=0 then error("MANIFEST_REFERENCE_INVALID: referenceResolution must be positive.") end
  local function updateScale()
    local camera=workspace.CurrentCamera
    if not camera then return end
    local viewportSize=camera.ViewportSize
    scaleObject.Scale=math.min(viewportSize.X/referenceWidth,viewportSize.Y/referenceHeight)
    viewport:SetAttribute("CreatorMakeCurrentScale",scaleObject.Scale)
    viewport:SetAttribute("CreatorMakeViewportWidth",viewportSize.X)
    viewport:SetAttribute("CreatorMakeViewportHeight",viewportSize.Y)
  end
  local function bindCamera()
    if viewportCameraConnection then viewportCameraConnection:Disconnect();viewportCameraConnection=nil end
    local camera=workspace.CurrentCamera
    if camera then viewportCameraConnection=camera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale) end
    updateScale()
  end
  viewportWorkspaceConnection=workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(bindCamera)
  bindCamera()
end

local function printTextScaleDiagnostics(manifest, instances)
  task.defer(function()
    RunService.Heartbeat:Wait()
    for _,node in ipairs(manifest.nodes or {}) do
      if node.className=="TextLabel" or node.className=="TextButton" or node.className=="TextBox" then
        local instance=instances[node.sourceId]
        if instance and (instance:IsA("TextLabel") or instance:IsA("TextButton") or instance:IsA("TextBox")) then
          local scaleItems={}
          local scaleProduct=1
          local cursor=instance
          while cursor do
            for _,child in ipairs(cursor:GetChildren()) do
              if child:IsA("UIScale") then table.insert(scaleItems,cursor.Name.."/"..child.Name.."="..tostring(child.Scale));scaleProduct*=child.Scale end
            end
            cursor=cursor.Parent
            if cursor and cursor:IsA("ScreenGui") then break end
          end
          local constraintCount=0
          for _,child in ipairs(instance:GetChildren()) do if child:IsA("UITextSizeConstraint") then constraintCount+=1 end end
          local attributes=type(node.attributes)=="table" and node.attributes or {}
          local viewport=workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.zero
          local parentSize=instance.Parent and instance.Parent:IsA("GuiObject") and instance.Parent.AbsoluteSize or Vector2.zero
          print(string.format("[CreatorMake Text Bounds] Object=%s Font=%s TextSize=%s MeasuredGlyphs=%sx%s LogicalBounds=%sx%s VisualBounds=%sx%s SafeRegion=%sx%s RequiredMinimum=%sx%s GlyphMargin=%sx%s FinalTextLabel.Size=%sx%s CaptionAngle=%s FinalRotation=%s Fallback=%s/%s Overflow=%s",tostring(node.name),tostring(attributes.CreatorMakeFontFamily),tostring(instance.TextSize),tostring(attributes.CreatorMakeMeasuredTextWidth),tostring(attributes.CreatorMakeMeasuredTextHeight),tostring(attributes.CreatorMakeBackgroundLogicalWidth),tostring(attributes.CreatorMakeBackgroundLogicalHeight),tostring(attributes.CreatorMakeTextBoundsWidth),tostring(attributes.CreatorMakeTextBoundsHeight),tostring(attributes.CreatorMakeCaptionSafeWidth),tostring(attributes.CreatorMakeCaptionSafeHeight),tostring(attributes.CreatorMakeCaptionMinimumWidth),tostring(attributes.CreatorMakeCaptionMinimumHeight),tostring(attributes.CreatorMakeGlyphSafeX),tostring(attributes.CreatorMakeGlyphSafeY),tostring(instance.Size.X.Offset),tostring(instance.Size.Y.Offset),tostring(attributes.CreatorMakeCaptionAngle),tostring(instance.Rotation),tostring(attributes.CreatorMakeCaptionUsedFallback),tostring(attributes.CreatorMakeCaptionFallbackReason),tostring(attributes.CreatorMakeTextOverflow)))
          print("TEXT EXPORT DEBUG\\nName: "..instance.Name.."\\nSizing mode: "..tostring(attributes.CreatorMakeTextScaleMode).."\\nDesign TextSize: "..tostring(attributes.CreatorMakeTextSize).."\\nCalculated fit TextSize: "..tostring(attributes.CreatorMakeCalculatedFitTextSize).."\\nExported Roblox TextSize: "..tostring(instance.TextSize).."\\nSafe region: "..tostring(attributes.CreatorMakeCaptionSafeWidth).."x"..tostring(attributes.CreatorMakeCaptionSafeHeight).."\\nMeasured text: "..tostring(attributes.CreatorMakeMeasuredTextWidth).."x"..tostring(attributes.CreatorMakeMeasuredTextHeight).."\\nSafe width ratio: "..tostring(attributes.CreatorMakeTextWidthRatio).."\\nSafe height ratio: "..tostring(attributes.CreatorMakeTextHeightRatio).."\\nShared caption group: "..tostring(attributes.CreatorMakeSharedCaptionGroup).."\\nMetric source: "..tostring(attributes.CreatorMakeTextMetricSource).." / "..tostring(attributes.CreatorMakeTextMetricFamily).."\\nEditor zoom: ignored by export\\nReference viewport: "..tostring(manifest.referenceResolution.width).."x"..tostring(manifest.referenceResolution.height).."\\nRoblox viewport: "..tostring(viewport.X).."x"..tostring(viewport.Y).."\\nRoot/Object UIScale chain: "..table.concat(scaleItems,", ").."\\nCombined inherited scale: "..tostring(scaleProduct).."\\nTextScaled: "..tostring(instance.TextScaled).."\\nUITextSizeConstraint count: "..tostring(constraintCount).."\\nCreatorMake text box: "..tostring(attributes.CreatorMakeTextBoundsWidth).."x"..tostring(attributes.CreatorMakeTextBoundsHeight).."\\nRoblox text box: "..tostring(instance.AbsoluteSize.X).."x"..tostring(instance.AbsoluteSize.Y).."\\nCreatorMake parent: "..tostring(attributes.CreatorMakeBackgroundLogicalWidth).."x"..tostring(attributes.CreatorMakeBackgroundLogicalHeight).."\\nRoblox parent: "..tostring(parentSize.X).."x"..tostring(parentSize.Y).."\\nFontFace: "..tostring(instance.FontFace.Family).."\\nFont weight: "..tostring(instance.FontFace.Weight))
        end
      end
    end
  end)
end

local function manifestProjectId(manifest)
  return tostring(manifest.projectId or manifest.screenGuiName)
end

local function previewParent()
  local player=Players.LocalPlayer
  if not player then player=Players:GetPlayers()[1] end
  if player then
    local playerGui=player:FindFirstChildOfClass("PlayerGui")
    if playerGui then return playerGui,false end
  end
  return StarterGui,true
end

local function findManagedScreenGui(parent, manifest, deployTarget)
  local projectId=manifestProjectId(manifest)
  for _,item in ipairs(parent:GetChildren()) do
    if item:IsA("ScreenGui") and item:GetAttribute("CreatorMakeManaged")==true and item:GetAttribute("CreatorMakeProjectId")==projectId and item:GetAttribute("CreatorMakeDeployTarget")==deployTarget then return item end
  end
  -- Upgrade one legacy CreatorMake preview only when its name and old ownership marker match.
  if parent==StarterGui and deployTarget=="StarterGui" then
    for _,item in ipairs(parent:GetChildren()) do
      if item:IsA("ScreenGui") and item.Name==manifest.screenGuiName and item:GetAttribute("CreatorMakeLocal")==true then return item end
    end
  end
  return nil
end

local function destroyPreviewScreenGui()
  if previewScreenGui and previewScreenGui.Parent then previewScreenGui:Destroy() end
  previewScreenGui=nil
end

local function applyManifest(manifest, deployTarget)
  manifest=validateManifest(manifest)
  for index,node in ipairs(manifest.nodes) do
    if type(node)~="table" then error("MANIFEST_INSTANCE_INVALID: nodes["..tostring(index).."] is not an object.") end
    if type(node.sourceId)~="string" or node.sourceId=="" then error("MANIFEST_INSTANCE_ID_MISSING: nodes["..tostring(index).."].sourceId is missing.") end
    if type(node.className)~="string" or node.className=="" then error("MANIFEST_INSTANCE_CLASS_MISSING: nodes["..tostring(index).."].className is missing.") end
    if type(node.properties)~="table" then error("MANIFEST_INSTANCE_PROPERTIES_MISSING: nodes["..tostring(index).."].properties is missing.") end
  end
  deployTarget=deployTarget or "PlayerGuiPreview"
  if deployTarget=="StarterGui" and RunService:IsRunning() then error("Studio is currently running. Changes made only to PlayerGui during a test session are temporary. Stop the test before syncing CreatorMake permanently to StarterGui.") end
  local parent,previewFallback=StarterGui,false
  if deployTarget=="PlayerGuiPreview" then parent,previewFallback=previewParent() end
  local screenGui=findManagedScreenGui(parent,manifest,deployTarget)
  if not screenGui then screenGui=Instance.new("ScreenGui");screenGui.Parent=parent end
  local settings=manifest.screenGuiSettings or {}
  screenGui.Name=deployTarget=="PlayerGuiPreview" and previewFallback and (manifest.screenGuiName.."_Preview") or manifest.screenGuiName
  screenGui.Enabled=settings.enabled~=false
  screenGui.DisplayOrder=tonumber(settings.displayOrder) or 0
  screenGui.ResetOnSpawn=settings.resetOnSpawn==true
  screenGui.IgnoreGuiInset=settings.ignoreGuiInset==true or ((manifest.visualMode=="PIXEL_ACCURATE" or manifest.visualMode=="ADAPTIVE") and settings.ignoreGuiInset~=false)
  screenGui.ZIndexBehavior=settings.zIndexBehavior=="Sibling" and Enum.ZIndexBehavior.Sibling or Enum.ZIndexBehavior.Global
  screenGui.Archivable=deployTarget=="StarterGui"
  screenGui:SetAttribute("CreatorMakeManaged",true);screenGui:SetAttribute("CreatorMakeProjectId",manifestProjectId(manifest));screenGui:SetAttribute("CreatorMakeDeployTarget",deployTarget);screenGui:SetAttribute("CreatorMakeVisualMode",manifest.visualMode or "NATIVE");screenGui:SetAttribute("CreatorMakeLocal",nil)
  if deployTarget=="PlayerGuiPreview" then previewScreenGui=screenGui end
  local existing={}
  for _,item in ipairs(screenGui:GetDescendants()) do local id=item:GetAttribute("CreatorMakeId");if id and item:GetAttribute("CreatorMakeManaged")==true and item:GetAttribute("CreatorMakeProjectId")==manifestProjectId(manifest) then existing[id]=item end end
  local retained={}
  for _,node in ipairs(manifest.nodes) do
    local instance=existing[node.sourceId]
    -- Replacing a parent class destroys its descendants. Never reuse one of
    -- those destroyed (Parent-locked) references later in the same import.
    if instance and instance.Parent==nil then existing[node.sourceId]=nil;instance=nil end
    if instance and instance.ClassName~=node.className then instance:Destroy();instance=nil end
    if not instance then instance=Instance.new(node.className) end
    retained[node.sourceId]=true;instance.Name=node.name;instance:SetAttribute("CreatorMakeId",node.sourceId);instance:SetAttribute("CreatorMakeManaged",true);instance:SetAttribute("CreatorMakeProjectId",manifestProjectId(manifest))
    for key,value in pairs(node.attributes or {}) do instance:SetAttribute(key,value) end
    setProperties(instance,node.properties)
    local parent=node.parentSourceId and existing[node.parentSourceId] or nil
    instance.Parent=parent or screenGui;existing[node.sourceId]=instance
    local decoratorKeys={}
    for _,decorator in ipairs(node.decorators or {}) do
      local key=decorator.className..":"..decorator.name;decoratorKeys[key]=true
      local child=nil
      for _,candidate in ipairs(instance:GetChildren()) do if candidate:GetAttribute("CreatorMakeDecorator")==key then child=candidate;break end end
      if child and child.ClassName~=decorator.className then child:Destroy();child=nil end
      if not child then child=Instance.new(decorator.className);child:SetAttribute("CreatorMakeDecorator",key) end
      child:SetAttribute("CreatorMakeManaged",true);child:SetAttribute("CreatorMakeProjectId",manifestProjectId(manifest))
      child.Name=decorator.name;setProperties(child,decorator.properties);child.Parent=instance
    end
    for _,candidate in ipairs(instance:GetChildren()) do local key=candidate:GetAttribute("CreatorMakeDecorator");if key and not decoratorKeys[key] then candidate:Destroy() end end
  end
  for id,instance in pairs(existing) do if not retained[id] then instance:Destroy() end end
  configureViewportScale(manifest,existing)
  printTextScaleDiagnostics(manifest,existing)
  return screenGui,existing
end

local function verifyTextArchitecture(manifest, instances)
  local items={}
  local passed=true
  for _,node in ipairs(manifest.nodes or {}) do
    local attributes=type(node.attributes)=="table" and node.attributes or {}
    local elementType=attributes.CreatorMakeElementType
    local sourceElementId=attributes.CreatorMakeLayoutSourceId or attributes.CreatorMakeSourceElementId or attributes.CreatorMakeSourceId or node.sourceId
    if (elementType=="text" or elementType=="button") and tostring(sourceElementId)==tostring(node.sourceId) then
      local root=instances[node.sourceId]
      local architecture=attributes.CreatorMakeVisualArchitecture or "NATIVE"
      local textBaked=attributes.CreatorMakeTextBaked==true or attributes.CreatorMakeCaptionBaked==true
      local expectsNativeText=attributes.CreatorMakeHasNativeText==true
      local background=nil
      local nativeText=nil
      local transformedText=nil
      local combinedVisual=false
      if root and (root:IsA("TextLabel") or root:IsA("TextButton") or root:IsA("TextBox")) then nativeText=root end
      for _,candidate in ipairs(manifest.nodes or {}) do
        if candidate.parentSourceId==node.sourceId then
          local role=type(candidate.attributes)=="table" and candidate.attributes.CreatorMakeRole or nil
          local visualPart=type(candidate.attributes)=="table" and candidate.attributes.CreatorMakeVisualPart or nil
          local instance=instances[candidate.sourceId]
          if role=="Background" then background=instance end
          if role=="EditableText" or role=="EditableTextBox" or role=="ButtonText" then nativeText=instance end
          if role=="TransformedText" then transformedText=instance end
          if role=="Visual" or visualPart=="full" then combinedVisual=true end
        end
      end
      local nativeOk=nativeText~=nil and (nativeText:IsA("TextLabel") or nativeText:IsA("TextButton") or nativeText:IsA("TextBox"))
      local exactOk=transformedText~=nil and transformedText:IsA("ImageLabel") and transformedText:GetAttribute("CreatorMakeRequiresExactTextRaster")==true and type(transformedText:GetAttribute("CreatorMakeEditableText"))=="string"
      local splitCaption=nativeOk and nativeText~=root
      local expectedAngle=nativeOk and tonumber(nativeText:GetAttribute(splitCaption and "CreatorMakeFinalTextLabelRotationApplied" or "CreatorMakeStandaloneTextRotationApplied")) or 0
      local geometryAngle=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakePixelVisualRotation")) or 0
      local geometryCenterlineAngle=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeGeometryCenterlineAngle")) or 0
      local inheritedRotation=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeRotationInheritedByRobloxParent")) or 0
      local localRotation=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeTextLocalRotation")) or 0
      local safeWidth=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeCaptionSafeWidth")) or 0
      local safeHeight=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeCaptionSafeHeight")) or 0
      local minimumWidth=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeCaptionMinimumWidth")) or 0
      local minimumHeight=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeCaptionMinimumHeight")) or 0
      local measuredWidth=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeMeasuredTextWidth")) or 0
      local measuredHeight=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeMeasuredTextHeight")) or 0
      local glyphSafeX=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeGlyphSafeX")) or 0
      local glyphSafeY=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeGlyphSafeY")) or 0
      local declaredOverflow=nativeOk and nativeText:GetAttribute("CreatorMakeTextOverflow")==true
      local designTextSize=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeTextSize")) or 0
      local calculatedTextSize=nativeOk and tonumber(nativeText:GetAttribute("CreatorMakeCalculatedFitTextSize")) or designTextSize
      local exportedTextSize=nativeOk and nativeText.TextSize or 0
      local expectedCenterX=splitCaption and tonumber(nativeText:GetAttribute("CreatorMakeCaptionCenterX")) or 0
      local expectedCenterY=splitCaption and tonumber(nativeText:GetAttribute("CreatorMakeCaptionCenterY")) or 0
      local actualAngle=nativeOk and nativeText.Rotation or 0
      local actualCenterX=splitCaption and (nativeText.Position.X.Offset+(0.5-nativeText.AnchorPoint.X)*nativeText.Size.X.Offset) or 0
      local actualCenterY=splitCaption and (nativeText.Position.Y.Offset+(0.5-nativeText.AnchorPoint.Y)*nativeText.Size.Y.Offset) or 0
      local angleDelta=((actualAngle-expectedAngle+180)%360)-180
      local angleError=math.abs(angleDelta)
      local centerError=splitCaption and math.sqrt((actualCenterX-expectedCenterX)^2+(actualCenterY-expectedCenterY)^2) or 0
      local followShape=nativeOk and nativeText:GetAttribute("CreatorMakeResolvedCaptionOrientation")=="follow-shape"
      local safeRegionOk=not nativeOk or declaredOverflow or (safeWidth>=minimumWidth and safeHeight>=minimumHeight and safeWidth+.001>=measuredWidth+glyphSafeX*2 and safeHeight+.001>=measuredHeight+glyphSafeY*2)
      local textLabelSizeOk=not nativeOk or nativeText.Size.X.Offset>0 and nativeText.Size.Y.Offset>0
      local captionApplicable=not textBaked and (nativeOk or expectsNativeText)
      local axisLost=captionApplicable and followShape and math.abs(expectedAngle)>.001 and math.abs(actualAngle)<=.001
      local captionResult="NOT_APPLICABLE"
      if captionApplicable then
        if not nativeOk or not safeRegionOk or not textLabelSizeOk or axisLost or angleError>3 or centerError>4 then captionResult="ERROR"
        elseif angleError>1 or centerError>1 then captionResult="WARNING"
        elseif angleError>.25 then captionResult="PASS_WITH_TOLERANCE"
        else captionResult="PASS" end
      end
      local captionOk=captionResult=="NOT_APPLICABLE" or captionResult=="PASS" or captionResult=="PASS_WITH_TOLERANCE" or captionResult=="WARNING"
      if nativeOk then print(string.format("[CreatorMake Caption] Object=%s Export As=%s Architecture=%s textBaked=%s hasNativeText=%s Result=%s Geometry centerline angle=%.4f Pixel geometry angle=%.4f Parent inherited rotation=%.4f Local text rotation=%.4f Final TextLabel.Rotation=%.4f Safe region=%.3fx%.3f Design/Calculated/Exported TextSize=%.3f/%.3f/%.3f Center=(%.3f, %.3f) TextLabel center=(%.3f, %.3f) Angle error=%.4f Center error=%.4f",tostring(node.name),tostring(attributes.CreatorMakeExportMode or "AUTO"),tostring(architecture),tostring(textBaked),tostring(nativeOk),captionResult,geometryCenterlineAngle,geometryAngle,inheritedRotation,localRotation,actualAngle,safeWidth,safeHeight,designTextSize,calculatedTextSize,exportedTextSize,expectedCenterX,expectedCenterY,actualCenterX,actualCenterY,angleError,centerError)) else print("[CreatorMake Caption] Object="..tostring(node.name).." Export As="..tostring(attributes.CreatorMakeExportMode or "AUTO").." Architecture="..tostring(architecture).." textBaked="..tostring(textBaked).." hasNativeText=false Result="..captionResult) end
      local structureOk=root~=nil and (textBaked or nativeOk or exactOk) and (not expectsNativeText or nativeOk)
      local itemPassed=structureOk and captionOk
      passed=passed and itemPassed
      table.insert(items,{sourceId=node.sourceId,name=node.name,exportAs=attributes.CreatorMakeExportMode or "AUTO",resolvedArchitecture=architecture,textBaked=textBaked,hasNativeText=nativeOk,captionValidation=captionApplicable and "NATIVE" or "NOT_APPLICABLE",validationResult=captionResult,rootClass=root and root.ClassName or nil,backgroundClass=background and background.ClassName or nil,textClass=nativeText and nativeText.ClassName or transformedText and transformedText.ClassName or nil,textValue=nativeText and nativeText.Text or transformedText and transformedText:GetAttribute("CreatorMakeEditableText") or nil,textRotation=actualAngle,geometryAngle=geometryAngle,geometryCenterlineAngle=geometryCenterlineAngle,parentInheritedRotation=inheritedRotation,localTextRotation=localRotation,safeRegion={width=safeWidth,height=safeHeight,minimumWidth=minimumWidth,minimumHeight=minimumHeight,glyphSafeX=glyphSafeX,glyphSafeY=glyphSafeY,declaredOverflow=declaredOverflow,valid=safeRegionOk},textSize={design=designTextSize,calculated=calculatedTextSize,exported=exportedTextSize},captionCenter={x=expectedCenterX,y=expectedCenterY},textCenter={x=actualCenterX,y=actualCenterY},angleError=angleError,centerError=centerError,textLabelSizeValid=textLabelSizeOk,transformedTextClass=transformedText and transformedText.ClassName or nil,combinedVisual=combinedVisual,glyphsSeparated=not combinedVisual,nativeEditable=nativeOk,exactAppearance=exactOk,captionTransformValid=captionOk,passed=itemPassed})
    end
  end
  return {version=manifest.textExportArchitecture,passed=passed,count=#items,items=items}
end

local function assignPreviewContent(manifest, instances, contentBySource)
  local assigned=0
  for _,node in ipairs(manifest.nodes or {}) do
    if node.className=="ImageLabel" or node.className=="ImageButton" then
      local attributes=node.attributes or {}
      local content=contentBySource[attributes.CreatorMakeSourceId]
      local instance=instances[node.sourceId]
      if content and instance then
        instance.ImageContent=content
        instance.ImageColor3=Color3.new(1,1,1);instance.ImageTransparency=0;instance.ScaleType=Enum.ScaleType.Stretch
        if instance:IsA("ImageButton") then instance.Active=true;instance.AutoButtonColor=false end
        assigned+=1
      end
    end
  end
  return assigned
end

local function connectLocal()
  if busy then return false end
  busy=true;connected=false;showStatus("CreatorMake: Connecting…",Color3.fromRGB(255,194,92));detailLabel.Text="Testing "..LOCAL_ORIGIN.."/health…"
  local ok,health=pcall(function() return validateHealth(request("GET","/health")) end)
  if not ok then busy=false;showConnectionFailure(health);return false end
  local heartbeatOk,heartbeat=pcall(function() return request("POST","/plugin/heartbeat",pluginPayload("connected")) end)
  busy=false
  if not heartbeatOk or heartbeat.accepted~=true then
    local serverProtocol=type(heartbeat)=="table" and heartbeat.protocolVersion or "unknown"
    if type(heartbeat)=="table" and heartbeat.connectionState=="CREATORMAKE_UPDATE_REQUIRED" then
      showConnectionFailure("CREATORMAKE_UPDATE_REQUIRED: Server protocol "..tostring(serverProtocol).." is older than plugin protocol "..tostring(SUPPORTED_PROTOCOL_VERSION)..".")
    else
      showConnectionFailure("PLUGIN_UPDATE_REQUIRED: Plugin v"..tostring(PLUGIN_VERSION).." / protocol "..tostring(SUPPORTED_PROTOCOL_VERSION).." was rejected by server protocol "..tostring(serverProtocol)..".")
    end
    return false
  end
  autoSyncEnabled=true;connected=true;lastConnectionProblem=""
  showStatus("CreatorMake: Connected",Color3.fromRGB(76,222,143))
  detailLabel.Text=(health.manifestReady and "Connected · manifest ready" or "Connected · no manifest staged").." · Web "..CREATORMAKE_APP_VERSION.." · Bridge "..tostring(health.bridgeVersion).." · Plugin "..tostring(PLUGIN_VERSION).." · Protocol "..tostring(SUPPORTED_PROTOCOL_VERSION).."."
  return true
end

connectButton.Activated:Connect(connectLocal)
basicImportButton.Activated:Connect(function()
  if busy then return end
  if not connected and not connectLocal() then return end
  busy=true
  local ok,result=pcall(function()
    local manifest=validateManifest(request("GET","/basic-test"))
    local gui=applyManifest(manifest,"PlayerGuiPreview")
    return {manifest=manifest,gui=gui}
  end)
  busy=false
  if not ok then showStatus("CreatorMake: Connected",Color3.fromRGB(76,222,143));detailLabel.Text="BASIC IMPORT FAILED — "..tostring(result);warn(detailLabel.Text);return end
  guiLabel.Text="ScreenGui: "..result.gui.Name;detailLabel.Text="BASIC IMPORT PASSED — /basic-test valid. Created ScreenGui + Frame without image transfer or publishing."
end)

local function runImport(jobId, jobMode)
  if busy then return end
  if not connected and not connectLocal() then return end
  busy=true;detailLabel.Text="Fetching CURRENT PROJECT MANIFEST…"
  local ok,result=pcall(function()
    local manifest=validateManifest(request("GET",jobId and ("/project/current/manifest?jobId="..HttpService:UrlEncode(jobId)) or "/project/current/manifest"))
    local starterGuiImport=jobMode=="apply-published" or jobMode=="install-starter-gui"
    local publishedAssets=starterGuiImport
    if starterGuiImport then for _,asset in ipairs(manifest.assets or {}) do if not validAssetId(asset.robloxAssetId) then publishedAssets=false;break end end end
    local localAssetImport=starterGuiImport and not publishedAssets
    local contentBySource,created,reused={},0,0
    if starterGuiImport then destroyPreviewScreenGui() end
    if publishedAssets then releaseAllPreviewImages() else contentBySource,created,reused=preparePreviewContent(manifest,jobId) end
    detailLabel.Text=starterGuiImport and (localAssetImport and ("Importing project "..manifest.projectName.." and local RGBA visuals into StarterGui…") or ("Installing project "..manifest.projectName.." into StarterGui with published assets…")) or ("Building PlayerGui preview for project "..manifest.projectName.."…")
    local gui,instances=applyManifest(manifest,starterGuiImport and "StarterGui" or "PlayerGuiPreview")
    local assigned=publishedAssets and 0 or assignPreviewContent(manifest,instances,contentBySource)
    if gui and starterGuiImport then gui:SetAttribute("CreatorMakeLocal",localAssetImport and true or nil);gui:SetAttribute("CreatorMakeMultiPlayerReady",publishedAssets) end
    return {gui=gui,projectId=manifest.projectId,projectName=manifest.projectName,manifestVersion=manifest.manifestVersion,count=#manifest.nodes,created=created,reused=reused,assigned=assigned,permanent=starterGuiImport,localAssetImport=localAssetImport,multiPlayerReady=starterGuiImport and publishedAssets,textArchitecture=verifyTextArchitecture(manifest,instances)}
  end)
  busy=false
  if not ok then
    local problem=tostring(result)
    if jobId then pcall(function() request("POST","/sync/result",{messageType="PROJECT_SYNC_RESULT",jobId=jobId,instanceId=INSTANCE_ID,status="failed",message="Studio sync failed.",error=problem}) end) end
    showStatus("CreatorMake: Connected",Color3.fromRGB(76,222,143));detailLabel.Text="Studio sync stopped: "..problem;warn("CreatorMake Studio sync failed: "..problem);return
  end
  local doneMessage=result.permanent and (result.localAssetImport and ("STARTERGUI IMPORT READY — project "..result.projectName.." installed "..tostring(result.count).." managed GUI objects with "..tostring(result.assigned).." local RGBA image surface(s).") or ("STARTERGUI READY — project "..result.projectName.." installed "..tostring(result.count).." managed GUI objects with published assets.")) or ("PREVIEW READY — project "..result.projectName.."; "..tostring(result.created).." changed visual(s), "..tostring(result.reused).." cached visual(s), "..tostring(result.assigned).." image surface(s), "..tostring(result.count).." GUI objects.")
  if jobId then
    local reported,reportError=pcall(function() return request("POST","/sync/result",{messageType="PROJECT_SYNC_RESULT",jobId=jobId,instanceId=INSTANCE_ID,status="completed",message=doneMessage,result={projectId=result.projectId,projectName=result.projectName,manifestVersion=result.manifestVersion,created=result.created,reused=result.reused,nodes=result.count,screenGuiName=result.gui and result.gui.Name or nil,previewImages=result.assigned,permanent=result.permanent,localAssetImport=result.localAssetImport,deployTarget=result.permanent and "StarterGui" or "PlayerGuiPreview",multiPlayerReady=result.multiPlayerReady,textArchitecture=result.textArchitecture}}) end)
    if not reported then warn("CreatorMake synced the GUI but could not report completion: "..tostring(reportError)) end
  end
  showStatus("CreatorMake: Connected",Color3.fromRGB(76,222,143));guiLabel.Text="Current Project: "..result.projectName;deployLabel.Text=result.permanent and "Deploy Target: StarterGui — Current Project" or "Deploy Target: Current PlayerGui — Preview Only";detailLabel.Text=doneMessage
end

previewButton.Activated:Connect(function() runImport(nil,"preview") end)
installButton.Activated:Connect(function() runImport(nil,"install-starter-gui") end)
disconnectButton.Activated:Connect(function()
  autoSyncEnabled=false;connected=false;releaseViewportScale();destroyPreviewScreenGui();releaseAllPreviewImages();showStatus("CreatorMake: Disconnected",Color3.fromRGB(255,105,120));guiLabel.Text="ScreenGui: —";detailLabel.Text="Polling stopped and the temporary PlayerGui preview was removed. The managed StarterGui source was not changed."
end)

pcall(function() plugin.Unloading:Connect(function() releaseViewportScale();destroyPreviewScreenGui();releaseAllPreviewImages() end) end)

-- A queued web sync is claimed by exactly one Studio process. The manual button remains a fallback.
task.spawn(function()
  while true do
    task.wait(2)
    if autoSyncEnabled and not busy then
      local healthOk,health=pcall(function() return validateHealth(request("GET","/health")) end)
      if healthOk then
        local heartbeatOk,heartbeat=pcall(function() return request("POST","/plugin/heartbeat",pluginPayload("idle")) end)
        if heartbeatOk and heartbeat.accepted==true then
          connected=true;showStatus("CreatorMake: Connected",Color3.fromRGB(76,222,143))
          local claimOk,claim=pcall(function() return request("POST","/sync/claim",pluginPayload("claiming")) end)
          if claimOk and claim.status=="claimed" and claim.jobId then detailLabel.Text="PROJECT_SYNC_REQUEST received. Importing current project…";runImport(claim.jobId,claim.mode) end
        else
          connected=false
          if heartbeatOk and type(heartbeat)=="table" and heartbeat.connectionState=="CREATORMAKE_UPDATE_REQUIRED" then showConnectionFailure("CREATORMAKE_UPDATE_REQUIRED: Server protocol "..tostring(heartbeat.protocolVersion).." is older than plugin protocol "..tostring(SUPPORTED_PROTOCOL_VERSION)..".")
          else showConnectionFailure("PLUGIN_UPDATE_REQUIRED: Plugin protocol "..tostring(SUPPORTED_PROTOCOL_VERSION).." was rejected by server protocol "..tostring(type(heartbeat)=="table" and heartbeat.protocolVersion or "unknown")..".") end
        end
      else connected=false;showConnectionFailure(health) end
    end
  end
end)
`}

export function createRobloxPluginModel(origin:string){const source=createRobloxPluginSource(origin).replace(/]]>/g,"]]]]><![CDATA[>");return `<?xml version="1.0" encoding="utf-8"?>\n<roblox version="4"><External>null</External><External>nil</External><Item class="Script" referent="RBX0"><Properties><string name="Name">CreatorMake Studio Sync</string><ProtectedString name="Source"><![CDATA[${source}]]></ProtectedString></Properties></Item><SharedStrings/></roblox>`;}
export function creatorMakePluginFilename(origin:string){safeOrigin(origin);return "CreatorMake-Studio-Local.rbxmx";}

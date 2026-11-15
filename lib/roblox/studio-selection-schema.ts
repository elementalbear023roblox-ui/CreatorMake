export const STUDIO_SELECTION_FORMAT = "creatormake-studio-selection";

const layoutProperties = "Position Size AnchorPoint Rotation Visible ZIndex LayoutOrder AutomaticSize SizeConstraint ClipsDescendants BackgroundColor3 BackgroundTransparency BorderSizePixel BorderColor3 Active Interactable Selectable";
const textProperties = "Text TextColor3 TextTransparency TextStrokeColor3 TextStrokeTransparency TextSize TextScaled TextWrapped TextTruncate TextXAlignment TextYAlignment FontFace LineHeight RichText";
const imageProperties = "Image ImageColor3 ImageTransparency ImageRectOffset ImageRectSize ScaleType SliceCenter SliceScale TileSize ResampleMode";

const classProperties = {
  ScreenGui: "Enabled DisplayOrder IgnoreGuiInset ResetOnSpawn ZIndexBehavior ScreenInsets ClipToDeviceSafeArea",
  Frame: "",
  CanvasGroup: "GroupColor3 GroupTransparency",
  ScrollingFrame: "CanvasSize CanvasPosition AutomaticCanvasSize ScrollingDirection ScrollingEnabled ScrollBarThickness ScrollBarImageColor3 ScrollBarImageTransparency VerticalScrollBarInset HorizontalScrollBarInset VerticalScrollBarPosition ElasticBehavior",
  TextLabel: textProperties,
  TextButton: `${textProperties} AutoButtonColor Modal Selected`,
  TextBox: `${textProperties} PlaceholderText PlaceholderColor3 TextEditable ClearTextOnFocus MultiLine`,
  ImageLabel: imageProperties,
  ImageButton: `${imageProperties} AutoButtonColor HoverImage PressedImage Modal Selected`,
  ViewportFrame: "Ambient LightColor LightDirection ImageColor3 ImageTransparency",
  VideoFrame: "Video Looped Volume",
};

export const STUDIO_SELECTION_GUI_PROPERTIES = Object.fromEntries(
  Object.entries(classProperties).map(([className, keys]) => [
    className, (className === "ScreenGui" ? keys : `${layoutProperties} ${keys}`).trim().split(/\s+/),
  ]),
) as Record<keyof typeof classProperties, string[]>;

const decoratorProperties = {
  UIAspectRatioConstraint: "AspectRatio AspectType DominantAxis",
  UICorner: "CornerRadius",
  UIDragDetector: "Enabled DragStyle DragRelativity ResponseStyle DragUDim2 DragRotation MinDragTranslation MaxDragTranslation MinDragRotation MaxDragRotation",
  UIFlexItem: "FlexMode GrowRatio ShrinkRatio ItemLineAlignment",
  UIGradient: "Color Transparency Offset Rotation Enabled",
  UIGridLayout: "CellPadding CellSize FillDirection FillDirectionMaxCells HorizontalAlignment SortOrder StartCorner VerticalAlignment",
  UIListLayout: "FillDirection HorizontalAlignment HorizontalFlex ItemLineAlignment SortOrder VerticalAlignment VerticalFlex Padding Wraps",
  UIPadding: "PaddingLeft PaddingRight PaddingTop PaddingBottom",
  UIPageLayout: "Animated Circular EasingDirection EasingStyle FillDirection GamepadInputEnabled MouseWheelInputEnabled Padding SortOrder TouchInputEnabled TweenTime",
  UIScale: "Scale",
  UISizeConstraint: "MinSize MaxSize",
  UIStroke: "ApplyStrokeMode Color Enabled LineJoinMode Thickness Transparency",
  UITableLayout: "FillEmptySpaceColumns FillEmptySpaceRows MajorAxis Padding SortOrder",
  UITextSizeConstraint: "MinTextSize MaxTextSize",
};

export const STUDIO_SELECTION_DECORATOR_PROPERTIES = Object.fromEntries(
  Object.entries(decoratorProperties).map(([className, keys]) => [className, keys.split(" ")]),
) as Record<keyof typeof decoratorProperties, string[]>;

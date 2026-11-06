# CreatorMake Windows 98 Accuracy Audit

Updated: 2026-11-05

## Scope and honesty

The **Windows 98 Classic** family targets the proportions and rendering rules of the Windows 95/98 shell at a 96-DPI reference scale. It is kept separate from CreatorMake's intentionally exaggerated Early Web, CD-ROM, Arcade, Game Show, and Horror families.

This is a careful original reconstruction, not a distribution of Microsoft artwork or font files. CreatorMake does not claim pixel identity with every Windows 98 build, display driver, locale, color scheme, or installed font set.

## References

- Microsoft, [Fonts — Win32 apps](https://learn.microsoft.com/windows/win32/uxguide/vis-fonts): the 8-point `MS Shell Dlg` mapping for Windows 95/98 is MS Sans Serif.
- Microsoft, [About Dialog Boxes](https://learn.microsoft.com/windows/win32/dlgbox/about-dialog-boxes): dialog-template units and font-relative measurement.
- Microsoft, [GetDialogBaseUnits](https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getdialogbaseunits): horizontal DLU = one quarter of average character width; vertical DLU = one eighth of character height.
- Microsoft, [Layout Specifications: Win32](https://learn.microsoft.com/previous-versions/windows/desktop/bb226818%28v%3Dvs.85%29): command button 50 × 14 DLUs and text lines 8 vertical DLUs.
- Microsoft, [Standard Icons](https://learn.microsoft.com/windows/win32/uxguide/vis-std-icons): 32 × 32 content-area icon footprint.
- Microsoft, [Microsoft Sans Serif](https://learn.microsoft.com/typography/font-list/microsoft-sans-serif): later TrueType face is metrically compatible with the MS Sans bitmap font; redistribution remains licensed.
- Historical screenshot collections used for visual inspection: [GUIdebook Windows 98 reference PDF](https://notryan.com/pdf/win98.pdf) and [Windows 98 Explained](https://www.worldradiohistory.com/UK/Bernards-And-Babani/Babani/Babani-456-Windows-98-Explained.pdf).

The modern Microsoft layout guide was used only where it documents stable dialog-unit mechanics. Segoe UI pixel conversions from that guide were **not** copied into the Windows 98 preset.

## Internal 96-DPI specification

| Role | CreatorMake reference value | Basis |
| --- | ---: | --- |
| Dialog/body font | MS Sans Serif, 8 pt; 11 px editor reference | Pre-Windows-2000 `MS Shell Dlg` mapping |
| Title font | MS Sans Serif, 8 pt bold | Historical system caption treatment |
| Content icon | 32 × 32 px | Microsoft standard content icon guidance and screenshot measurement |
| Command button | 75 × 23 px | 50 × 14 DLU mapped to the selected 96-DPI reference metrics |
| Related button gap | 6 px | 4 horizontal DLU reference |
| Dialog margin | 11–12 px | 7 DLU reference, rounded to whole pixels |
| Classic title bar | 18 px | Measured screenshot target for default classic metrics |
| Caption button | 16 × 16 px | Measured screenshot target inside the 18 px caption |
| Menu row | 19 px | Measured screenshot target |
| Status row | 20 px | Measured screenshot target |
| Standard message icon-to-copy gap | 12 px | Whole-pixel DLU-derived spacing |

## System color roles

| Role | Default |
| --- | --- |
| Button Face | `#C0C0C0` |
| Button Highlight | `#FFFFFF` |
| Button Light | `#DFDFDF` |
| Button Shadow | `#808080` |
| Button Dark Shadow | `#000000` |
| Active Title | `#000080` |
| Window | `#FFFFFF` |
| Window Text | `#000000` |
| Selection | `#000080` / `#FFFFFF` |

Raised and sunken controls use two deliberate one-pixel edge layers. They are rendered as explicit top/left and bottom/right borders, not blurred shadows or browser `outset` color guesses.

## Corrected CreatorMake System Message

### Before

- 484 × 288 px fixed window.
- Tahoma at 13–14 px.
- 66 × 58 px warning triangle.
- 92 × 34 px buttons with 12 px gaps.
- 28 px title bar.
- Large arbitrary vertical offsets and unused client area.
- Gradient/box-shadow-style bevel approximation.

### After

- Preferred size is computed from message length, 32 px icon, 75 × 23 px actions, whole-pixel margins, and font metrics. The supplied message resolves to a compact system-dialog footprint.
- MS Sans Serif 8 pt system-font request with a clearly documented fallback stack.
- Original 32 × 32 warning recreation; no proprietary icon is bundled.
- Three 75 × 23 px action buttons in a measured bottom action row.
- 18 px title bar with 16 px caption button.
- Root, title, message, icon, and actions remain separately editable.
- Parent-relative constraints keep the title, client content, and action row attached when the dialog is resized.
- First action uses a dotted default-focus rectangle.

## Verified component families

- Compact warning, error, information, and question dialogs.
- Standard application window anatomy.
- File Explorer window: title, menu, toolbar, address bar, split client, scrollbar, and status bar.
- Properties/settings window: tabs, group box, combo field, checkbox, preview, and aligned action row.
- Open File dialog: location field, file list, name/type fields, toolbar controls, and 75 × 23 px actions.
- Installation wizard: navigation banner, instructions, separator, and Back/Next/Cancel row.
- Help viewer: menu, toolbar, contents tree, topic client, and bottom status row.
- Buttons, checkbox, radio button, toolbar button.
- Default, standard, pressed, disabled, scroll-arrow, spin, and caption-button states.
- Text, password, multiline, numeric, combo, list, and trackbar inputs.
- Menu, dropdown menu, tab control, tree view, toolbar, scrollbar, status bar, and progress bar.
- Group box and recessed panel.
- Original warning, error, information, question, folder, file, computer, disk, settings, search, printer, network, and display icon recreations.

The verified Windows family now contains more than 50 insertion-ready entries. Structural assets use declared roles: menu and toolbar rows attach below window chrome, status rows attach to the bottom edge, scrollbars attach to the right edge, and action controls anchor to the lower-right. Complete windows and dialogs remain top-level unless the user explicitly reparents them.

## Font status

- **Exact when available:** locally installed `MS Sans Serif`; CreatorMake does not copy or redistribute it.
- **Metric-compatible Microsoft fallback when locally installed:** `Microsoft Sans Serif` (Microsoft documents its metric compatibility with the bitmap face).
- **Approximate final fallback:** Arial/sans-serif. This is labeled as an approximation in the properties panel.
- Historically constrained text is exported as pixel-accurate imagery when a native Roblox font would be noticeably different; editable source text stays in the CreatorMake project.

## Remaining known differences

- Browser font rasterization cannot reproduce every historical GDI hinting decision on every OS and device-pixel ratio.
- Original Microsoft system icons are not bundled; CreatorMake uses original geometric/pixel recreations.
- Localized Windows 98 builds can have different text metrics and therefore different DLU-to-pixel results.
- Some less common common-control states and shell animations remain outside the verified set.
- A real Roblox Studio session is still required to visually inspect published bitmap-font assets after cloud upload.

These differences are intentionally disclosed; the historical preset is not labeled pixel-perfect when the exact local bitmap font or original operating-system renderer is unavailable.

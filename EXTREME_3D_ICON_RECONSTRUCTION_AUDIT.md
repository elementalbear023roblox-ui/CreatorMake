# CreatorMake Extreme 3D Icon Reconstruction Audit

## Scope and evidence

This pass replaces the active procedural builders for all 23 requested retro icons. The original builders remain in `ThreeDObjectSurface.tsx` only as a compatibility fallback; the active renderer resolves these icons through `lib/editor/extreme-retro-icons.ts` first.

Primary visual evidence came from the 19 reference screenshots supplied on 2026-11-07. They cover the warning sign, flying Windows flag, coin pile, athletic shoe, buzzer, prize wheel, ticket, trophy, curtains, slot machine, marquee, VHS, CD, envelope, globe, starburst, mystery box, hourglass, and antique key. The branded sneaker photo was used only to study general 1990s running-shoe construction. No Nike mark or proprietary product artwork was copied.

Supplemental references inspected during implementation included:

- JIS C 5581:1987 VHS dimensional drawings for cassette proportions, reel placement, lower door, and guide geometry.
- Real 100 mm arcade push-button product photographs and dimension diagrams for the dome, retaining ring, and shallow housing.
- Royal Mint and product photography of stacked coins for thickness, reeded edges, and irregular stack rhythm.
- Antique tripod globe listings for the meridian, horizon ring, center support, and three-leg stand.
- Wooden hourglass product photography for the continuous waisted vessel, four posts, plate rims, seals, and sand volumes.
- Antique skeleton-key photography for the open bow, collars, shaft, shoulder, and stepped bit.
- Search comparisons for casino dice, 1990s IDE hard drives, real jigsaw pieces, trophy cups, theater drapery, mechanical slot machines, Broadway marquees, CDs, envelopes, and prize wheels.

The reconstruction is an original procedural collection. It does not bundle Microsoft, Nike, Willy Wonka, or other proprietary image assets.

## Validation status

- **Implemented:** all 23 active builders.
- **Programmatically tested:** all 23 for finite vertices, non-empty 3D bounds, normals, unique named parts, material-role coverage, and object-specific mesh-count floors.
- **Visually inspected:** all 23 at the default three-quarter view in the actual CreatorMake Icon Studio.
- **Reference-compared:** all 23 against the supplied references and/or supplemental real-object imagery.
- **Multi-angle validation:** front, rear, left, right, top, and three-quarter camera presets are exercised in the browser QA pass.
- **Perfect photographic equivalence:** not claimed. These are editable procedural icons with a cohesive 1990s CGI style, not scans or flattened photographs.

## Per-icon review

| Icon | Main modeled components and corrections | Material/render correction | Visual status | Known limitation |
| --- | --- | --- | --- | --- |
| Warning sign | True triangular frame with an inner opening, recessed field, aligned stem and dot, and a separate inner highlight | Glossy yellow plastic, dark dimensional frame, deliberate bevel | Reference-compared and visually inspected | Original homage, not a copied Windows bitmap |
| Windows 98 flag | Four individually curved panes, dark mullions, edge waves, pane highlights, and a trailing field of colored pixels | Independent red/green/blue/yellow roles with dark extrusion | Corrected after visual QA; visually inspected | Historical silhouette is approximated without copying logo artwork |
| Classic dice | One shared rounded-cube construction with 21 face pips; opposite faces total seven | Ivory body with recessed-looking dark pips | Corrected after visual QA; visually inspected | Pips are separate inset discs rather than boolean cavities |
| Coin pile | Four stacks, three scattered coins, minted top crests, rims, and 12 reeded edge bars per stacked coin | Brushed gold with darker edges and bright minted accents | Reference-compared and visually inspected | Embossed crest is original and intentionally generic |
| Inverted dice | Uses the exact classic-dice geometry and pip map | Black/dark body and light pips only | Geometry-equivalence tested and visually inspected | Same cavity limitation as classic dice |
| Retro shoe | Curved outsole, midsole, layered upper, heel counter, toe overlay, original quarter panel, tongue, ten eyelets, five raised laces, tread, and heel cushion | Neutral 1990s runner palette with rubber-specific roughness | Reference-compared and visually inspected | Original unbranded design; fabric weave is suggested by material response rather than a texture map |
| Big red buzzer | Weighted base, chrome housing, retaining ring, upper hemisphere actuator, highlight shell, and anti-slip foot | Clear-coated red dome with metal/plastic separation | Reference-compared and visually inspected | Microswitch internals are omitted at icon scale |
| Prize wheel | Eight exact 45° wedges, 16 pegs, rim, dividers, hub, pointer, twin supports, and foot | Four alternating color roles with luminous pegs | Corrected after visual QA; visually inspected | Text labels are omitted to preserve small-size readability |
| Golden ticket | Thin serrated foil body, embossed inset border, twin rosettes, and raised two-line lettering | Gold foil response separated from ordinary paper | Corrected after visual QA; visually inspected | Decorative engraving is geometric rather than texture-based |
| Winner's cup | Lathed open bowl, visible interior, rolled lip, two connected tube handles, mounts, stem, tiered pedestal, and base ring | Polished gold with bright handle highlights | Reference-compared and visually inspected | Interior wall thickness is visually implied rather than boolean-shell modeled |
| Stage curtains | Dark opening, rod, 12 hanging folds, draped upper valance, scallops, tiebacks, and tassels | High-roughness velvet response with gold accents | Reference-compared and visually inspected | Cloth remains procedural curves rather than a physics simulation |
| Slot machine | Rounded cabinet, lit crown, three real reel bodies and windows, dividers, symbols, controls, payout tray, lever, and feet | Glossy painted cabinet, metal trim, paper reel faces | Corrected after visual QA; visually inspected | Reel artwork uses original pixel glyphs, not casino trademarks |
| Marquee sign | Deep trapezoidal canopy, raised face, 30 evenly distributed perimeter bulbs, nine underside lamps, letter rail, and text | Warm emissive bulbs and separated trim/canopy materials | Corrected after visual QA; visually inspected | Individual bulb bloom is intentionally controlled to retain detail |
| VHS tape | Standard shell proportions, ribbed top rail, two reel assemblies, spokes, hubs, windows, label, lower door, seam, screws, and guide grooves | Black plastic, translucent windows, paper label | JIS-informed, reference-compared, visually inspected | Tape path is implied; no animated tape ribbon |
| Hard drive | Cast IDE chassis, stamped top plate, spindle and housing ring, actuator cover, label, four screws, IDE pins, and Molex block | Industrial metal with matte label and connector materials | Reference-compared and visually inspected | Closed-drive top anatomy is emphasized; internal platter is not exposed |
| CD | Thin annular disc with a real center opening, hub, edge, six data tracks, and eight spectral bands | Iridescent physical material with subtle rainbow roles | Reference-compared and visually inspected | Rainbow bands are procedural highlights, not environment-dependent diffraction |
| Email envelope | Thin body, symmetrical rear flap, left/right folds, and lower closing fold | Neutral paper palette with low clearcoat | Corrected after visual QA; visually inspected | No stamp or proprietary mail glyph |
| Spinning globe | Globe sphere, three raised continent groups, brass meridian, four map longitudes, five latitudes, wood horizon ring, support, and tripod legs | Glossy globe, aged-gold rings, dark wood stand | Reference-compared and visually inspected | Continents are deliberately simplified for icon-scale readability |
| 3D starburst | Balanced 16-point face, offset back burst, raised center, and center outline | Candy-plastic face with distinct sidewalls | Reference-compared and visually inspected | No raster halftone texture |
| Mystery box | Beveled cube, separate lid, lid seam, eight trim rails/rivets, inset panel, and raised gold question mark | Purple plastic with gold hardware | Reference-compared and visually inspected | Question mark is a crisp pixel glyph by design |
| Puzzle piece | Smooth jigsaw silhouette with opposing tabs/sockets, uniform extrusion, rounded transitions, and molded inset | Glossy molded plastic | Reference-compared and visually inspected | Uses a representative piece rather than a specific commercial puzzle cut |
| Hourglass | Continuous lathed glass vessel, two plates and rims, four posts with collars, seals, two sand volumes, and falling stream | Transparent glass sorting plus wood/gold frame and opaque sand | Reference-compared and visually inspected | Sand stream is static, not simulated |
| Golden key | True oval bow opening, inset bow bevel, two flourishes, gold tube shaft, collars, shoulder, stepped bit, and three notches | Brushed gold with a continuous gold shaft | Corrected after visual QA; visually inspected | Bit is a believable generic ward, not keyed to a real lock |

## Remaining collection-level limitations

1. The renderer uses procedural studio lighting rather than an HDR environment map, so metal and glass reflections are deliberately controlled instead of photorealistic.
2. Small labels use CreatorMake's pixel alphabet to remain crisp and legally original.
3. Several flat products use layered extrusion instead of destructive boolean subtraction; this keeps editing and export stable but can make cavities shallower than a manufacturing model.
4. Transparent glass and VHS windows use conservative depth-write rules to prevent sorting artifacts in browser WebGL.
5. Roblox export remains rasterized per icon because Roblox cannot preserve the editable Three.js mesh hierarchy. The CreatorMake source stays fully editable.

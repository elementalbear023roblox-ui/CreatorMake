import type { RetroIconKind, ThreeDSettings } from "./types.ts";
import { pixelGlyph, pixelGlyphContours } from "./pixel-alphabet.ts";

type THREE = typeof import("three");
type Role = "front" | "face" | "side" | "accent" | "detail" | "screen" | "light";

export const EXTREME_RETRO_ICON_KINDS: RetroIconKind[] = [
  "warning-sign", "windows-flag", "dice", "coin-pile", "inverted-dice", "shoe",
  "red-buzzer", "prize-wheel", "golden-ticket", "winners-cup", "stage-curtains",
  "slot-machine", "marquee-sign", "vhs-tape", "hard-drive", "compact-disc",
  "email-envelope", "spinning-globe", "starburst", "mystery-box", "puzzle-piece",
  "hourglass", "golden-key",
];

export const EXTREME_ICON_MINIMUM_MESHES: Partial<Record<RetroIconKind, number>> = {
  "warning-sign": 5, "windows-flag": 22, dice: 22, "inverted-dice": 22,
  "coin-pile": 70, shoe: 30, "red-buzzer": 6, "prize-wheel": 30,
  "golden-ticket": 6, "winners-cup": 12, "stage-curtains": 22,
  "slot-machine": 24, "marquee-sign": 32, "vhs-tape": 30, "hard-drive": 24,
  "compact-disc": 15, "email-envelope": 5, "spinning-globe": 22,
  starburst: 4, "mystery-box": 13, "puzzle-piece": 2, hourglass: 16, "golden-key": 13,
};

function roundedRectangle(THREE: THREE, width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export function buildExtremeRetroIcon(THREE: THREE, settings: ThreeDSettings) {
  if (!EXTREME_RETRO_ICON_KINDS.includes(settings.iconKind)) return null;
  const group = new THREE.Group();
  group.name = `Reconstructed ${settings.iconKind}`;
  const depth = Math.max(.12, settings.depth / 80);
  const bevel = Math.max(.012, settings.bevel / 80);
  const segments = settings.iconStyle === "pixelated-cgi" ? 16 : Math.max(28, settings.segments);
  const dummy = () => new THREE.MeshStandardMaterial();
  const part = (name: string, geometry: import("three").BufferGeometry, roles: Role | Role[]) => {
    geometry.computeBoundingBox();
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const requested = Array.isArray(roles) ? roles : [roles];
    const slots = Math.max(1, ...geometry.groups.map((entry) => (entry.materialIndex ?? 0) + 1));
    const roleList = requested.length === 1 ? Array.from({ length: slots }, () => requested[0]) : requested;
    while (roleList.length < slots) roleList.push(roleList.at(-1) ?? "front");
    const materials = roleList.map(dummy);
    const mesh = new THREE.Mesh(geometry, materials.length === 1 ? materials[0] : materials);
    mesh.name = name;
    mesh.userData.iconMaterialRoles = roleList;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const extrude = (shape: import("three").Shape | import("three").Shape[], d = depth, b = bevel) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b,
      bevelSegments: settings.iconStyle === "pixelated-cgi" ? 1 : Math.max(2, settings.bevelSegments),
      curveSegments: settings.iconStyle === "pixelated-cgi" ? 3 : Math.max(10, segments),
    });
    geometry.center();
    geometry.computeVertexNormals();
    return geometry;
  };
  const polygon = (points: Array<[number, number]>) => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    return shape;
  };
  const box = (name: string, w: number, h: number, d: number, role: Role, x = 0, y = 0, z = 0, radius = .07) => {
    const edge: Role = role === "front" || role === "face" ? "side" : role === "accent" ? "detail" : role;
    const mesh = part(name, extrude(roundedRectangle(THREE, w, h, Math.min(w, h) * radius), d, Math.min(bevel * .55, w * .06, h * .06, d * .2)), [role, edge]);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const cylinder = (name: string, radiusTop: number, radiusBottom: number, height: number, role: Role, x = 0, y = 0, z = 0, axis: "x" | "y" | "z" = "z") => {
    const edge: Role = role === "front" || role === "face" ? "side" : role === "accent" ? "detail" : role;
    const mesh = part(name, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 2, false), [edge, role, role]);
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    else if (axis === "x") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    return mesh;
  };
  const sphere = (name: string, radius: number, role: Role, x = 0, y = 0, z = 0) => {
    const mesh = part(name, new THREE.SphereGeometry(radius, segments, Math.max(12, Math.round(segments * .7))), role);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const torus = (name: string, radius: number, tubeRadius: number, role: Role, x = 0, y = 0, z = 0, arc = Math.PI * 2) => {
    const mesh = part(name, new THREE.TorusGeometry(radius, tubeRadius, settings.iconStyle === "pixelated-cgi" ? 8 : 18, segments, arc), role);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const ring = (name: string, outer: number, inner: number, d: number, role: Role) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return part(name, extrude(shape, d, Math.min(bevel * .35, d * .2)), [role, role === "front" ? "side" : role]);
  };
  const tube = (name: string, points: import("three").Vector3[], radius: number, role: Role, closed = false) => part(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, "centripetal"), Math.max(20, segments * 2), radius, settings.iconStyle === "pixelated-cgi" ? 8 : 14, closed), role);
  const lathe = (name: string, profile: Array<[number, number]>, role: Role, x = 0, y = 0, z = 0) => {
    const mesh = part(name, new THREE.LatheGeometry(profile.map(([px, py]) => new THREE.Vector2(px, py)), segments), role);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const star = (outer: number, inner: number, count: number) => {
    const shape = new THREE.Shape();
    for (let i = 0; i < count * 2; i++) {
      const angle = i / (count * 2) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 ? inner : outer;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      i ? shape.lineTo(x, y) : shape.moveTo(x, y);
    }
    shape.closePath();
    return shape;
  };
  const pixelText = (text: string, role: Role, x: number, y: number, z: number, size = .075, d = .055) => {
    const glyphs = [...text].map((character) => ({ character, width: character === " " ? 3 : Math.max(1, ...pixelGlyph(character).rows.map((row) => row.length)) }));
    const total = glyphs.reduce((sum, item) => sum + item.width + 1, -1) * size;
    let cursor = x - total / 2;
    for (const [glyphIndex, item] of glyphs.entries()) {
      if (item.character !== " ") {
        const shapes = pixelGlyphContours(item.character).map((contour) => {
          const shape = new THREE.Shape();
          [...contour.outer].reverse().forEach((point, index) => index ? shape.lineTo(point.x, -point.y) : shape.moveTo(point.x, -point.y));
          shape.closePath();
          for (const points of contour.holes) {
            const hole = new THREE.Path();
            [...points].reverse().forEach((point, index) => index ? hole.lineTo(point.x, -point.y) : hole.moveTo(point.x, -point.y));
            hole.closePath();
            shape.holes.push(hole);
          }
          return shape;
        });
        const mesh = part(`${text} glyph ${glyphIndex + 1} ${item.character}`, extrude(shapes, d, 0), role);
        mesh.scale.set(size, size, 1);
        mesh.position.set(cursor + item.width * size / 2, y, z);
      }
      cursor += (item.width + 1) * size;
    }
  };
  const screw = (name: string, x: number, y: number, z: number, role: Role = "detail") => {
    const head = cylinder(name, .055, .055, .035, role, x, y, z);
    box(`${name} slot`, .07, .014, .012, role === "detail" ? "side" : "detail", x, y, z + .025, .01);
    return head;
  };

  if (settings.iconKind === "warning-sign") {
    const outer = polygon([[0, 1.18], [-1.06, -.66], [1.06, -.66]]);
    const innerPath = new THREE.Path();
    [[0, .9], [.79, -.46], [-.79, -.46]].forEach(([x, y], index) => index ? innerPath.lineTo(x, y) : innerPath.moveTo(x, y));
    innerPath.closePath(); outer.holes.push(innerPath);
    const frame = part("beveled black safety frame", extrude(outer, depth, bevel), ["detail", "side"]); frame.position.y = -.03;
    const field = part("recessed yellow field", extrude(polygon([[0, .88], [-.79, -.48], [.79, -.48]]), depth * .28, bevel * .28), ["front", "side"]); field.position.set(0, -.03, depth * .43);
    const stem = box("aligned exclamation stem", .17, .78, .12, "detail", 0, .08, depth * .68, .18); stem.scale.y = 1.05;
    sphere("exclamation point", .115, "detail", 0, -.47, depth * .72);
    const innerHighlight = part("inner frame highlight", extrude(polygon([[0, .99], [-.89, -.55], [.89, -.55]]), .025, 0), "accent"); innerHighlight.position.set(-.025, .015, depth * .55); innerHighlight.scale.set(.97, .97, 1);
  } else if (settings.iconKind === "windows-flag") {
    const pane = (name: string, points: Array<[number, number]>, role: Role, z: number) => {
      const xs = points.map(([x]) => x), ys = points.map(([, y]) => y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const mesh = part(name, extrude(polygon(points.map(([x, y]) => [x - cx, y - cy])), depth * .42, bevel * .36), [role, "side"]); mesh.position.set(cx, cy, z); return mesh;
    };
    pane("red swept pane", [[-.7, .85], [.15, .98], [.03, .17], [-.8, .1]], "front", .02);
    pane("green swept pane", [[.25, .99], [1.12, .96], [.94, .14], [.14, .17]], "accent", .09);
    pane("blue swept pane", [[-.82, -.02], [.02, .04], [-.08, -.79], [-.91, -.62]], "detail", 0);
    pane("yellow swept pane", [[.12, .05], [.92, .02], [.72, -.88], [-.18, -.79]], "screen", .08);
    box("vertical dark mullion", .055, 1.72, .08, "side", .05, .04, .24, .01).rotation.z = -.07;
    box("horizontal dark mullion", 1.84, .055, .08, "side", .06, .06, .24, .01).rotation.z = -.03;
    for (const [index, x, y] of [[1, -.46, .58], [2, .56, .64], [3, -.5, -.34], [4, .48, -.36]] as const) {
      const shine = box(`pane highlight ${index}`, .42, .026, .018, "light", x, y, .34, .01); shine.rotation.z = -.04;
    }
    tube("top flag wave", [new THREE.Vector3(-.78, .88, .26), new THREE.Vector3(.12, 1.03, .31), new THREE.Vector3(1.08, .99, .24)], .025, "accent");
    tube("bottom flag wave", [new THREE.Vector3(-.9, -.67, .22), new THREE.Vector3(-.08, -.85, .29), new THREE.Vector3(.73, -.93, .22)], .025, "accent");
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4 - row; col++) {
      const x = -1.32 - col * .24 + row * .08, y = .48 - row * .38 + col * .04;
      box(`flying pixel ${row}-${col}`, .14 + col * .015, .13, .08, row % 3 === 0 ? "front" : row % 3 === 1 ? "detail" : "accent", x, y, -.03, .01).rotation.z = -.08;
    }
  } else if (settings.iconKind === "dice" || settings.iconKind === "inverted-dice") {
    const pipRole: Role = settings.iconKind === "inverted-dice" ? "accent" : "detail";
    box("precision rounded die", 1.72, 1.72, 1.72, "front", 0, 0, 0, .11);
    const layouts: Record<number, Array<[number, number]>> = { 1: [[0, 0]], 2: [[-.38, .38], [.38, -.38]], 3: [[-.38, .38], [0, 0], [.38, -.38]], 4: [[-.38, .38], [.38, .38], [-.38, -.38], [.38, -.38]], 5: [[-.38, .38], [.38, .38], [0, 0], [-.38, -.38], [.38, -.38]], 6: [[-.38, .42], [-.38, 0], [-.38, -.42], [.38, .42], [.38, 0], [.38, -.42]] };
    const pip = (name: string, a: number, b: number, axis: "x" | "y" | "z", sign: number) => {
      const dot = cylinder(name, .105, .105, .045, pipRole, 0, 0, 0, axis);
      if (axis === "z") dot.position.set(a, b, sign * .94); else if (axis === "x") dot.position.set(sign * .94, a, b); else dot.position.set(a, sign * .94, b);
    };
    const faces: Array<[number, "x" | "y" | "z", number]> = [[4, "z", 1], [1, "x", 1], [2, "y", 1], [3, "z", -1], [6, "x", -1], [5, "y", -1]];
    for (const [value, axis, sign] of faces) layouts[value].forEach(([a, b], index) => pip(`face ${value} pip ${index + 1}`, a, b, axis, sign));
  } else if (settings.iconKind === "coin-pile") {
    const stacks = [[-.72, 4], [-.26, 8], [.25, 6], [.7, 3]] as const;
    const coin = (name: string, x: number, y: number, z: number, top = false) => {
      cylinder(`${name} body`, .39, .39, .11, top ? "front" : "side", x, y, z, "y");
      for (let ridge = 0; ridge < 12; ridge++) {
        const a = ridge / 12 * Math.PI * 2;
        const bar = box(`${name} reed ${ridge + 1}`, .025, .105, .025, "detail", x + Math.cos(a) * .394, y, z + Math.sin(a) * .394, .01); bar.rotation.y = -a;
      }
      if (top) {
        const rim = torus(`${name} minted rim`, .31, .026, "accent", x, y + .061, z); rim.rotation.x = Math.PI / 2;
        const crest = part(`${name} embossed crest`, extrude(star(.15, .08, 8), .026, .005), "detail"); crest.position.set(x, y + .073, z); crest.rotation.x = -Math.PI / 2;
      }
    };
    for (const [x, count] of stacks) for (let i = 0; i < count; i++) coin(`stack ${x} coin ${i + 1}`, x, -.88 + i * .115, 0, i === count - 1);
    for (const [index, [x, y, z, rx]] of ([[-.98, -.82, .48, -.16], [.86, -.85, .42, .18], [.42, -.94, .72, -.3]] as const).entries()) {
      const loose = cylinder(`scattered coin ${index + 1}`, .39, .39, .11, "front", x, y, z, "y"); loose.rotation.x = rx; loose.rotation.z = rx * .7;
    }
  } else if (settings.iconKind === "shoe") {
    const sole = polygon([[-1.25, -.5], [-1.08, -.7], [.82, -.7], [1.2, -.54], [1.25, -.35], [.84, -.25], [-.72, -.28]]);
    part("curved rubber outsole", extrude(sole, depth * .9, bevel * .42), ["detail", "detail"]);
    const mid = part("layered foam midsole", extrude(polygon([[-1.18, -.35], [-1.03, -.55], [.86, -.55], [1.16, -.4], [.82, -.2], [-.78, -.19]]), depth * .78, bevel * .34), ["accent", "side"]); mid.position.z = .04;
    const upperShape = new THREE.Shape(); upperShape.moveTo(-1.02, -.22); upperShape.quadraticCurveTo(-.92, .18, -.7, .56); upperShape.quadraticCurveTo(-.45, .83, -.12, .56); upperShape.lineTo(.25, .1); upperShape.quadraticCurveTo(.83, .08, 1.08, -.27); upperShape.lineTo(.72, -.35); upperShape.lineTo(-.82, -.34); upperShape.closePath();
    const upper = part("stitched multi-panel upper", extrude(upperShape, depth * .62, bevel * .65), ["front", "side"]); upper.position.z = .08;
    const heelPanel = part("reinforced heel counter", extrude(polygon([[-1.03, -.2], [-.84, .34], [-.55, .48], [-.61, -.3]]), .09, .018), ["side", "detail"]); heelPanel.position.z = depth * .37;
    const toePanel = part("curved toe overlay", extrude(polygon([[.2, -.27], [.44, .05], [.92, -.02], [1.08, -.27], [.7, -.36]]), .08, .016), ["accent", "side"]); toePanel.position.z = depth * .39;
    const quarterPanel = part("original geometric quarter panel", extrude(polygon([[-.58, -.1], [-.38, .45], [.02, .34], [.35, -.03], [-.02, -.22]]), .075, .014), ["screen", "side"]); quarterPanel.position.z = depth * .4;
    const tongue = box("raised padded tongue", .46, .78, .16, "side", -.29, .35, depth * .31, .12); tongue.rotation.z = -.12;
    for (let i = 0; i < 5; i++) {
      const y = .32 - i * .105, x = -.42 + i * .055;
      for (const side of [-1, 1]) sphere(`eyelet ${i + 1}-${side}`, .045, "detail", x + side * .18, y, depth * .47);
      tube(`lace ${i + 1}`, [new THREE.Vector3(x - .18, y, depth * .5), new THREE.Vector3(x, y - .025, depth * .58), new THREE.Vector3(x + .18, y, depth * .5)], .026, "accent");
    }
    for (let i = 0; i < 9; i++) box(`outsole tread ${i + 1}`, .14, .055, .18, "side", -1.02 + i * .25, -.69 + (i % 2) * .025, -.05, .02);
    box("visible heel cushion", .35, .13, .18, "screen", -.83, -.42, depth * .47, .16);
  } else if (settings.iconKind === "red-buzzer") {
    cylinder("weighted game-show base", 1.12, 1.2, .4, "detail", 0, -.64, 0, "y");
    cylinder("chrome retaining housing", .98, 1.06, .24, "accent", 0, -.34, 0, "y");
    torus("black retaining ring", .83, .09, "side", 0, -.16, 0).rotation.x = Math.PI / 2;
    const dome = part("translucent red actuator dome", new THREE.SphereGeometry(.76, segments, Math.max(12, segments / 2), 0, Math.PI * 2, 0, Math.PI / 2), "front"); dome.position.y = -.12;
    const highlight = part("dome specular highlight", new THREE.SphereGeometry(.56, segments, 12, 0, Math.PI * .48, .12, Math.PI * .22), "light"); highlight.scale.set(.7, .46, .7); highlight.position.set(-.16, .26, .23);
    box("anti-slip foot", 1.8, .13, .8, "side", 0, -.91, -.02, .16);
  } else if (settings.iconKind === "prize-wheel") {
    cylinder("wheel body", 1.04, 1.04, .2, "side", 0, .25, 0, "z");
    const count = 8;
    for (let i = 0; i < count; i++) {
      const start = i / count * Math.PI * 2, end = (i + 1) / count * Math.PI * 2;
      const wedge = new THREE.Shape(); wedge.moveTo(0, 0); wedge.absarc(0, 0, .94, start, end, false); wedge.closePath();
      const wedgeGeometry = new THREE.ExtrudeGeometry(wedge, {depth: .055, bevelEnabled: false, curveSegments: Math.max(12, segments)}); wedgeGeometry.translate(0, 0, -.0275);
      const segment = part(`equal 45 degree segment ${i + 1}`, wedgeGeometry, i % 4 === 0 ? "front" : i % 4 === 1 ? "accent" : i % 4 === 2 ? "screen" : "detail"); segment.position.set(0, .25, .16);
      const middle = (start + end) / 2;
      const divider = box(`radial divider ${i + 1}`, .035, .89, .035, "detail", Math.cos(middle) * .42, .25 + Math.sin(middle) * .42, .19, .01); divider.rotation.z = middle - Math.PI / 2;
    }
    torus("polished wheel rim", 1.04, .095, "accent", 0, .25, .17);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; sphere(`rim peg ${i + 1}`, .065, "light", Math.cos(a) * 1.12, .25 + Math.sin(a) * 1.12, .23); }
    cylinder("wheel hub", .2, .2, .2, "accent", 0, .25, .25, "z");
    const pointer = part("top pointer", extrude(polygon([[0, -.2], [-.17, .15], [.17, .15]]), .14, .02), ["accent", "detail"]); pointer.position.set(0, 1.46, .08);
    for (const side of [-1, 1]) { const leg = box(`support leg ${side}`, .18, 1.3, .28, "side", side * .55, -.9, -.08, .08); leg.rotation.z = side * -.12; }
    box("stable support foot", 1.48, .16, .7, "detail", 0, -1.5, -.06, .12);
  } else if (settings.iconKind === "golden-ticket") {
    const points: Array<[number, number]> = [[-1.25, -.58]];
    for (let i = 0; i < 7; i++) points.push([-1.17 + (i % 2 ? -.09 : .05), -.42 + i * .14]);
    points.push([-1.25, .58], [1.25, .58]);
    for (let i = 0; i < 7; i++) points.push([1.17 + (i % 2 ? .09 : -.05), .42 - i * .14]);
    points.push([1.25, -.58]);
    const body = part("thin serrated foil ticket", extrude(polygon(points), depth * .23, bevel * .22), ["front", "side"]); body.rotation.z = -.025;
    const borderShape = roundedRectangle(THREE, 2.18, .92, .05), borderHole = new THREE.Path(); const holeRect = roundedRectangle(THREE, 1.98, .72, .04); borderHole.curves = holeRect.curves; borderShape.holes.push(borderHole);
    const border = part("embossed ornamental border", extrude(borderShape, .035, .006), "accent"); border.position.z = depth * .2; border.rotation.z = -.025;
    pixelText("GOLDEN", "detail", -.16, .15, depth * .24, .046, .026); pixelText("TICKET", "detail", -.16, -.17, depth * .24, .051, .026);
    for (const x of [-.92, .92]) { const seal = part(`embossed rosette ${x}`, extrude(star(.16, .1, 10), .035, .005), "detail"); seal.position.set(x, 0, depth * .235); }
  } else if (settings.iconKind === "winners-cup") {
    const bowl = lathe("hollow championship bowl", [[.42, -.05], [.58, .1], [.72, .38], [.8, .72], [.82, .82]], "front", 0, .2, 0);
    bowl.scale.z = .82;
    const inner = cylinder("dark visible cup interior", .7, .7, .055, "detail", 0, 1.03, 0, "y");
    torus("rolled cup lip", .82, .065, "accent", 0, 1.02, 0).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const handle = tube(`curved handle ${side}`, [new THREE.Vector3(side * .7, .83, .02), new THREE.Vector3(side * 1.08, .7, .04), new THREE.Vector3(side * 1.02, .25, .03), new THREE.Vector3(side * .55, .14, .02)], .085, "accent"); handle.scale.z = .8;
      sphere(`upper handle mount ${side}`, .095, "accent", side * .7, .82, .03); sphere(`lower handle mount ${side}`, .095, "accent", side * .54, .14, .03);
    }
    lathe("narrow trophy stem", [[.12, -.42], [.17, -.23], [.13, .18], [.22, .3]], "front", 0, -.45, 0);
    lathe("tiered trophy pedestal", [[.62, -.18], [.62, -.03], [.48, .05], [.42, .2]], "detail", 0, -.93, 0);
    torus("base highlight ring", .5, .045, "accent", 0, -.91, 0).rotation.x = Math.PI / 2;
  } else if (settings.iconKind === "stage-curtains") {
    box("deep stage opening", 2.5, 2.15, .18, "detail", 0, -.05, -.2, .02);
    cylinder("brass curtain rod", .055, .055, 2.72, "accent", 0, 1.13, .02, "x");
    for (const side of [-1, 1]) {
      const outerX = side * 1.08;
      for (let fold = 0; fold < 6; fold++) {
        const x = outerX - side * fold * .135;
        const lower = side * (.42 + fold * .035);
        tube(`velvet fold ${side}-${fold}`, [new THREE.Vector3(x, 1.04, .05 + fold % 2 * .08), new THREE.Vector3(x - side * .04, .28, .13), new THREE.Vector3(lower, -.96, .06)], .105, fold % 2 ? "side" : "front");
      }
      const tie = torus(`gold tieback ${side}`, .2, .045, "accent", side * .68, -.12, .28); tie.scale.x = .65;
      for (let tassel = 0; tassel < 3; tassel++) tube(`tieback tassel ${side}-${tassel}`, [new THREE.Vector3(side * .68, -.25, .28), new THREE.Vector3(side * (.62 + tassel * .05), -.5, .26)], .025, "accent");
    }
    for (let i = -5; i <= 5; i++) { const scallop = sphere(`valance scallop ${i + 6}`, .17, i % 2 ? "side" : "front", i * .22, .96, .17); scallop.scale.set(1.05, .55, .72); }
    for (let i = -6; i <= 6; i++) tube(`valance pleat ${i + 7}`, [new THREE.Vector3(i * .2, 1.15, .16), new THREE.Vector3(i * .19, .86, .23)], .045, i % 2 ? "side" : "front");
  } else if (settings.iconKind === "slot-machine") {
    const cabinet = part("rounded mechanical cabinet", extrude(roundedRectangle(THREE, 1.75, 2.35, .18), depth * 1.15, bevel), ["front", "side"]);
    const crown = box("raised jackpot crown", 1.45, .38, .18, "accent", 0, .9, depth * .7, .12); pixelText("JACKPOT", "detail", 0, .92, depth * .82, .039, .025);
    for (let i = -4; i <= 4; i++) sphere(`crown bulb ${i + 5}`, .04, "light", i * .15, 1.13, depth * .8);
    box("recessed reel window", 1.48, .76, .16, "detail", 0, .25, depth * .67, .08);
    for (let i = -1; i <= 1; i++) {
      cylinder(`mechanical reel ${i + 2}`, .28, .28, .38, "screen", i * .46, .25, depth * .34, "x");
      box(`reel face ${i + 2}`, .39, .56, .05, "screen", i * .46, .25, depth * .86, .04);
      pixelText(i === 0 ? "7" : i < 0 ? "B" : "$", i === 0 ? "front" : "detail", i * .46, .29, depth * .91, .085, .03);
    }
    box("chrome divider top", 1.45, .035, .04, "accent", 0, .63, depth * .91, .01); box("chrome divider bottom", 1.45, .035, .04, "accent", 0, -.13, depth * .91, .01);
    box("payout panel", 1.18, .28, .1, "detail", 0, -.63, depth * .74, .06); box("coin tray", .76, .13, .18, "side", 0, -.78, depth * .82, .04);
    for (const x of [-.45, .45]) cylinder(`control button ${x}`, .09, .09, .07, x < 0 ? "accent" : "front", x, -.37, depth * .83);
    const lever = cylinder("lever shaft", .055, .055, .86, "accent", 1.03, .16, .02, "y"); lever.rotation.z = -.18; sphere("lever handle", .15, "front", 1.12, .59, .02);
    for (const x of [-.58, .58]) cylinder(`cabinet foot ${x}`, .08, .08, .18, "detail", x, -1.27, 0, "y");
  } else if (settings.iconKind === "marquee-sign") {
    const canopy = part("deep Broadway canopy", extrude(polygon([[-1.25, -.65], [1.25, -.65], [1.1, .7], [-1.08, .7]]), depth * .86, bevel), ["side", "side"]);
    const face = part("illuminated marquee face", extrude(polygon([[-1.08, -.48], [1.08, -.48], [.98, .52], [-.94, .52]]), .09, .018), ["front", "detail"]); face.position.z = depth * .57;
    const bulbPoints: Array<[number, number]> = [];
    for (let i = 0; i < 11; i++) { const x = -.98 + i * .196; bulbPoints.push([x, .58], [x, -.56]); }
    for (let i = 0; i < 4; i++) { const y = -.3 + i * .2; bulbPoints.push([-1.13 + i * .005, y], [1.13 - i * .005, y]); }
    bulbPoints.forEach(([x, y], i) => sphere(`evenly spaced bulb ${i + 1}`, .055, "light", x, y, depth * .68));
    pixelText("SHOWTIME", "accent", 0, .12, depth * .7, .037, .035); box("changeable letter rail", 1.56, .035, .025, "detail", 0, -.18, depth * .7, .01);
    box("marquee underside", 2.2, .16, .9, "detail", 0, -.78, -.08, .02);
    for (let i = -4; i <= 4; i++) sphere(`underside lamp ${i + 5}`, .045, "light", i * .22, -.8, .3);
  } else if (settings.iconKind === "vhs-tape") {
    const body = part("standard proportion VHS shell", extrude(roundedRectangle(THREE, 2.56, 1.46, .07), depth * .5, bevel * .3), ["front", "side"]);
    box("upper ribbed rail", 2.34, .12, .05, "side", 0, .57, depth * .34, .01);
    for (let rib = 0; rib < 18; rib++) box(`rail rib ${rib + 1}`, .018, .1, .025, "detail", -.98 + rib * .115, .57, depth * .39, .005);
    for (const x of [-.7, .7]) {
      cylinder(`reel hub ${x}`, .29, .29, .09, "screen", x, .02, depth * .34);
      torus(`clear reel window ${x}`, .34, .055, "accent", x, .02, depth * .4);
      cylinder(`reel axle ${x}`, .11, .11, .1, "detail", x, .02, depth * .43);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const spoke = box(`reel spoke ${x}-${i}`, .04, .24, .025, "detail", x + Math.sin(a) * .12, .02 + Math.cos(a) * .12, depth * .48, .01); spoke.rotation.z = -a; }
    }
    box("center label panel", .76, .67, .045, "accent", 0, .05, depth * .4, .03); pixelText("VHS", "detail", 0, .11, depth * .46, .045, .025);
    const tapeDoor = part("lower tape door", extrude(polygon([[-.52, -.36], [.52, -.36], [.38, -.64], [-.38, -.64]]), .05, .008), ["side", "detail"]); tapeDoor.position.z = depth * .43;
    box("cassette seam", 2.34, .025, .025, "detail", 0, -.43, depth * .41, .005);
    for (const x of [-1.06, 1.06]) for (const y of [-.53, .53]) screw(`case screw ${x}-${y}`, x, y, depth * .43);
    for (let i = 0; i < 5; i++) box(`bottom guide groove ${i + 1}`, .22, .028, .025, "detail", -.52 + i * .26, -.6, depth * .48, .005);
  } else if (settings.iconKind === "hard-drive") {
    const chassis = part("1990s IDE cast chassis", extrude(roundedRectangle(THREE, 2.08, 1.72, .08), depth * .56, bevel * .25), ["side", "side"]);
    const topPlate = part("stamped metal top plate", extrude(roundedRectangle(THREE, 1.88, 1.5, .06), .075, .012), ["front", "detail"]); topPlate.position.z = depth * .37;
    cylinder("platter spindle emboss", .39, .39, .035, "accent", -.42, .17, depth * .44); torus("platter housing ring", .43, .025, "detail", -.42, .17, depth * .47);
    const armCover = box("actuator cover", .72, .19, .07, "detail", .32, .18, depth * .46, .1); armCover.rotation.z = .45; sphere("actuator pivot", .11, "accent", .62, .4, depth * .49);
    box("paper specification label", .72, .53, .035, "screen", .42, -.46, depth * .45, .03); pixelText("IDE", "detail", .42, -.4, depth * .49, .04, .02);
    for (const x of [-.86, .86]) for (const y of [-.67, .67]) screw(`mounting screw ${x}-${y}`, x, y, depth * .47);
    box("IDE connector block", 1.2, .16, .22, "detail", -.2, -.96, -.04, .02);
    for (let pin = 0; pin < 20; pin++) cylinder(`IDE pin ${pin + 1}`, .012, .012, .12, "accent", -.72 + (pin % 10) * .115, -.98 + Math.floor(pin / 10) * .06, .12, "z");
    box("Molex power connector", .42, .18, .26, "accent", .78, -.96, -.03, .03);
  } else if (settings.iconKind === "compact-disc") {
    const disc = ring("thin optical disc", 1.08, .17, .08, "front"); disc.rotation.z = -.04;
    torus("outer optical edge", 1.04, .018, "accent", 0, 0, .055); torus("transparent center hub", .21, .04, "detail", 0, 0, .075);
    for (const radius of [.35, .48, .61, .74, .87, .98]) torus(`concentric data track ${radius}`, radius, .007, "side", 0, 0, .087);
    for (let i = 0; i < 8; i++) { const angle = i / 8 * Math.PI * 2 + .18; const ray = box(`iridescent spectral band ${i + 1}`, .7, .018, .014, i % 3 === 0 ? "accent" : i % 3 === 1 ? "screen" : "detail", Math.cos(angle) * .53, Math.sin(angle) * .53, .105, .01); ray.rotation.z = angle; }
  } else if (settings.iconKind === "email-envelope") {
    const body = part("thin paper envelope", extrude(roundedRectangle(THREE, 2.35, 1.46, .035), depth * .18, bevel * .16), ["front", "side"]);
    const backFlap = part("symmetrical folded flap", extrude(polygon([[-1.1, .61], [0, -.18], [1.1, .61]]), .035, .005), ["front", "side"]); backFlap.position.z = depth * .15;
    const leftFold = part("left triangular fold", extrude(polygon([[-1.1, -.58], [-1.1, .48], [0, -.13], [0, -.58]]), .028, .004), ["front", "side"]); leftFold.position.z = depth * .18;
    const rightFold = part("right triangular fold", extrude(polygon([[1.1, -.58], [1.1, .48], [0, -.13], [0, -.58]]), .028, .004), ["front", "side"]); rightFold.position.z = depth * .185;
    const lowerFold = part("lower closing fold", extrude(polygon([[-1.1, -.58], [0, .15], [1.1, -.58]]), .03, .004), ["front", "side"]); lowerFold.position.z = depth * .2;
  } else if (settings.iconKind === "spinning-globe") {
    sphere("antique globe sphere", .78, "front", 0, .24, 0);
    const landShapes = [polygon([[-.5, .48], [-.33, .65], [-.1, .55], [-.18, .31], [-.04, .18], [-.27, .08], [-.46, .25]]), polygon([[.05, .5], [.22, .61], [.48, .47], [.39, .24], [.55, .08], [.34, -.05], [.2, .08], [.12, -.18], [-.02, .02]]), polygon([[-.12, -.1], [.08, -.14], [.16, -.38], [.03, -.62], [-.15, -.44]])];
    for (const [index, shape] of landShapes.entries()) { const land = part(`raised continent ${index + 1}`, extrude(shape, .035, .006), "screen"); land.position.set(0, .24, .73); land.scale.set(.8, .8, 1); }
    const meridian = torus("brass meridian", .82, .035, "accent", 0, .24, 0); meridian.rotation.y = Math.PI / 2; meridian.rotation.z = -.2;
    for (let i = 0; i < 4; i++) { const longitude = torus(`map longitude ${i + 1}`, .78, .008, "detail", 0, .24, .015); longitude.rotation.y = Math.PI / 2; longitude.rotation.z = i * Math.PI / 4; }
    const horizon = torus("wooden horizon ring", .93, .12, "side", 0, .1, 0); horizon.rotation.x = Math.PI / 2; horizon.scale.y = .88;
    cylinder("turned center support", .13, .2, .62, "side", 0, -.7, 0, "y");
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 2; const leg = tube(`tripod leg ${i + 1}`, [new THREE.Vector3(0, -.75, 0), new THREE.Vector3(Math.cos(a) * .48, -1.13, Math.sin(a) * .48), new THREE.Vector3(Math.cos(a) * .58, -1.35, Math.sin(a) * .58)], .08, "side"); leg.scale.z = .7; sphere(`turned foot ${i + 1}`, .11, "detail", Math.cos(a) * .58, -1.35, Math.sin(a) * .4); }
    for (const y of [-.14, .24, .62]) { const lat = torus(`latitude ring ${y}`, Math.sqrt(Math.max(.08, .78 * .78 - (y - .24) ** 2)), .008, "detail", 0, y, .02); lat.scale.y = .25; }
    for (const y of [.04, .44]) { const lat = torus(`minor latitude ring ${y}`, Math.sqrt(Math.max(.08, .78 * .78 - (y - .24) ** 2)), .006, "detail", 0, y, .015); lat.scale.y = .22; }
  } else if (settings.iconKind === "starburst") {
    const burst = part("balanced sixteen point burst", extrude(star(1.25, .62, 16), depth * .55, bevel * .4), ["front", "side"]); burst.rotation.z = -.04;
    const backBurst = part("offset dimensional back burst", extrude(star(1.08, .72, 16), depth * .22, bevel * .2), ["side", "detail"]); backBurst.position.set(.08, -.08, -depth * .35); backBurst.rotation.z = .06;
    cylinder("raised promotional center", .55, .55, .11, "accent", 0, 0, depth * .38); torus("center outline", .49, .035, "detail", 0, 0, depth * .47);
  } else if (settings.iconKind === "mystery-box") {
    box("beveled prize cube", 1.66, 1.66, 1.66, "front", 0, -.02, 0, .09);
    box("separate overhanging lid", 1.9, .24, 1.9, "accent", 0, .93, 0, .08);
    box("visible lid separation seam", 1.74, .055, 1.82, "detail", 0, .78, .01, .01);
    for (const x of [-.69, .69]) box(`vertical corner trim ${x}`, .16, 1.58, 1.74, "accent", x, -.06, .02, .04);
    for (const y of [-.68, .68]) box(`horizontal panel trim ${y}`, 1.58, .14, 1.74, "accent", 0, y, .02, .04);
    const panel = box("recessed front panel", 1.15, 1.08, .06, "side", 0, -.02, .87, .06); panel.position.z = .88;
    pixelText("?", "accent", 0, .13, .96, .19, .075);
    for (const x of [-.73, .73]) for (const y of [-.73, .73]) sphere(`corner rivet ${x}-${y}`, .055, "accent", x, y, .94);
  } else if (settings.iconKind === "puzzle-piece") {
    const puzzle = new THREE.Shape();
    puzzle.moveTo(-.82, -.82); puzzle.lineTo(-.22, -.82); puzzle.bezierCurveTo(-.22, -.5, .22, -.5, .22, -.82); puzzle.lineTo(.82, -.82); puzzle.lineTo(.82, -.22); puzzle.bezierCurveTo(1.18, -.22, 1.18, .22, .82, .22); puzzle.lineTo(.82, .82); puzzle.lineTo(.22, .82); puzzle.bezierCurveTo(.22, .48, -.22, .48, -.22, .82); puzzle.lineTo(-.82, .82); puzzle.lineTo(-.82, .22); puzzle.bezierCurveTo(-.5, .22, -.5, -.22, -.82, -.22); puzzle.closePath();
    const tile = part("accurate interlocking puzzle silhouette", extrude(puzzle, depth * .6, bevel * .55), ["front", "side"]); tile.rotation.z = -.045;
    const inset = part("subtle molded face inset", extrude(roundedRectangle(THREE, .68, .68, .16), .045, .012), "accent"); inset.position.z = depth * .39; inset.rotation.z = -.045;
  } else if (settings.iconKind === "hourglass") {
    for (const y of [-.94, .94]) { cylinder(`${y > 0 ? "top" : "bottom"} wooden plate`, .74, .82, .16, "side", 0, y, 0, "y"); const rim = torus(`${y > 0 ? "top" : "bottom"} plate rim`, .68, .035, "accent", 0, y + (y > 0 ? -.08 : .08), 0); rim.rotation.x = Math.PI / 2; }
    for (const x of [-.62, .62]) for (const z of [-.22, .22]) { const post = cylinder(`turned frame post ${x}-${z}`, .055, .075, 1.72, "detail", x, 0, z, "y"); post.scale.y = 1.02; sphere(`post collar top ${x}-${z}`, .085, "accent", x, .76, z); sphere(`post collar bottom ${x}-${z}`, .085, "accent", x, -.76, z); }
    const glass = lathe("continuous waisted glass vessel", [[.5, -.76], [.53, -.65], [.43, -.34], [.2, -.13], [.07, 0], [.2, .13], [.43, .34], [.53, .65], [.5, .76]], "front"); glass.scale.z = .82;
    const lowerSand = part("settled lower sand", new THREE.ConeGeometry(.37, .42, segments), "screen"); lowerSand.position.y = -.54;
    const upperSand = part("remaining upper sand", new THREE.ConeGeometry(.28, .28, segments), "screen"); upperSand.position.y = .59; upperSand.rotation.z = Math.PI;
    cylinder("falling sand stream", .025, .025, .48, "screen", 0, -.05, 0, "y");
    for (const y of [-.7, .7]) torus(`glass seal ${y}`, .45, .024, "accent", 0, y, 0).rotation.x = Math.PI / 2;
  } else if (settings.iconKind === "golden-key") {
    const bow = ring("oval key bow", .58, .36, .18, "front"); bow.scale.set(1, 1.22, 1); bow.position.set(-.83, .28, 0);
    const bowInset = ring("bow inner bevel", .38, .3, .08, "accent"); bowInset.scale.set(1, 1.22, 1); bowInset.position.set(-.83, .28, .13);
    for (const side of [-1, 1]) { const flourish = tube(`bow flourish ${side}`, [new THREE.Vector3(-.84, .67, .13), new THREE.Vector3(-.83 + side * .24, .52, .16), new THREE.Vector3(-.83 + side * .28, .28, .15)], .025, "detail"); flourish.scale.y = 1.08; }
    tube("solid key shaft", [new THREE.Vector3(-.53, .02, 0), new THREE.Vector3(.93, .02, 0)], .105, "front");
    for (const x of [-.38, -.26]) torus(`shaft collar ${x}`, .16, .04, "accent", x, .02, 0).rotation.y = Math.PI / 2;
    box("key shoulder", .28, .24, .26, "front", .96, .02, 0, .05);
    const toothShape = polygon([[-.18, .12], [.35, .12], [.35, -.28], [.16, -.28], [.16, -.08], [-.03, -.08], [-.03, -.36], [-.18, -.36]]);
    const teeth = part("precise stepped key bit", extrude(toothShape, .28, bevel * .28), ["front", "side"]); teeth.position.set(1.08, -.08, 0);
    for (let i = 0; i < 3; i++) box(`bit notch ${i + 1}`, .08, .12 + i * .04, .3, "detail", .97 + i * .17, -.28 + i * .03, .02, .01);
    sphere("aged metal highlight", .07, "accent", -.96, .63, .14);
  }

  group.userData.retroIcon = true;
  group.userData.reconstructionVersion = 2;
  group.userData.referenceDriven = true;
  return group;
}

// Rekviziti za pozadine: klupa, lampa, staza, leptiri, palma, suncobran, sneško, štala,
// vetrenjača, ringišpil (panorama), šator, zastavice, ribe, alge, korali, zamak.
// Mirni delovi idu u Batch (spajaju se), pokretni su posebni objekti sa pokretom (Tick).

import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { polyPath, taperedTube } from "../../engine/surface";
import { Batch, cloudGeometry, instanced, paint, put, rng, solid, THREE, vcMat, type Tick } from "./env";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const col = (hex: string) => new THREE.Color(hex);

/** Zaobljena kutija (zgrade, klupa, prozori) */
export function rbox(w: number, h: number, d: number, r = 0.04, seg = 2): THREE.BufferGeometry {
    return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.2, h / 2.2, d / 2.2));
}

/** Obična kutija (sitni delovi: prozori, letvice) — malo trouglova */
export function box(w: number, h: number, d: number): THREE.BufferGeometry {
    return new THREE.BoxGeometry(w, h, d);
}

/** Ravna traka po tlu (staza): tačke [x, z], širina; y malo iznad tla */
export function ribbon(points: [number, number][], width: number, y = 0.004): THREE.BufferGeometry {
    const path = polyPath(points.map(([x, z]) => V(x, y, z)));
    const n = 60;
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        path(t, a);
        path(Math.min(1, t + 0.01), b);
        if (t >= 1) path(t - 0.01, b).sub(a).negate().add(a);
        const dir = b.clone().sub(a).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        const w = width * (0.75 + 0.25 * Math.sin(t * 9)) * (1 - 0.35 * t);
        for (const s of [-1, 1]) {
            pos.push(a.x + side.x * w * 0.5 * s, y, a.z + side.z * w * 0.5 * s);
            nor.push(0, 1, 0);
            uv.push(s > 0 ? 1 : 0, t);
        }
        if (i < n) {
            const k = i * 2;
            idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    // Trouglovi moraju gledati gore
    const ia = g.getIndex()!;
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    p0.fromBufferAttribute(g.getAttribute("position"), ia.getX(0));
    p1.fromBufferAttribute(g.getAttribute("position"), ia.getX(1));
    p2.fromBufferAttribute(g.getAttribute("position"), ia.getX(2));
    const up = p1.sub(p0).cross(p2.sub(p0)).y;
    if (up < 0) {
        for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
        g.setIndex(idx);
    }
    return g;
}

/** Klupa u parku (drvene letvice, nogari) okrenuta ka kameri */
export function bench(batch: Batch, x: number, z: number, ry = 0, wood = "#C98B52", iron = "#4A5266") {
    const seat = (dx: number, y: number, dz: number, w: number, h: number, d: number, color: string, rx = 0) => {
        const g = rbox(w, h, d, 0.012);
        g.rotateX(rx);
        g.translate(dx, y, dz);
        g.rotateY(ry);
        batch.add(g.translate(x, 0, z), color);
    };
    for (let i = 0; i < 3; i++) seat(0, 0.42, -0.1 + i * 0.1, 1.3, 0.035, 0.08, wood);
    for (let i = 0; i < 2; i++) seat(0, 0.6 + i * 0.13, -0.2, 1.3, 0.08, 0.03, wood, -0.12);
    for (const sx of [-0.55, 0.55]) {
        seat(sx, 0.21, 0.04, 0.05, 0.42, 0.05, iron);
        seat(sx, 0.21, -0.18, 0.05, 0.42, 0.05, iron);
        seat(sx, 0.62, -0.215, 0.05, 0.42, 0.04, iron, -0.12);
        seat(sx, 0.5, -0.07, 0.05, 0.04, 0.3, iron);
    }
}

/** Ulična lampa sa toplim fenjerom (svetli bojom, bez pravog svetla) */
export function lamp(batch: Batch, x: number, z: number, h = 2.3, iron = "#3E4A63") {
    batch.add(put(new THREE.CylinderGeometry(0.035, 0.05, h, 10), x, h / 2, z), iron);
    batch.add(put(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 12), x, 0.04, z), iron);
    batch.add(put(new THREE.CylinderGeometry(0.1, 0.07, 0.24, 6), x, h + 0.12, z), "#FFE7A8", { glow: 0.85 });
    batch.add(put(new THREE.ConeGeometry(0.16, 0.12, 6), x, h + 0.3, z), iron);
    batch.add(put(new THREE.SphereGeometry(0.03, 8, 6), x, h + 0.38, z), iron);
}

/** Leptiri: krila (dva lista) mašu polako, let po mekoj petlji */
export function butterflies(parent: THREE.Object3D, list: { x: number; y: number; z: number; color: string }[]): Tick {
    const wingGeo = new THREE.CircleGeometry(0.06, 16).translate(0.055, 0, 0);
    wingGeo.scale(1, 0.8, 1);
    const all = list.map((b, i) => {
        const g = new THREE.Group();
        const mat = solid(b.color, { side: THREE.DoubleSide, rough: 0.7 });
        const left = new THREE.Mesh(wingGeo, mat);
        const right = new THREE.Mesh(wingGeo, mat);
        right.scale.x = -1;
        const lower = new THREE.Mesh(wingGeo, mat);
        lower.scale.set(0.7, 0.7, 1);
        lower.position.y = -0.03;
        left.add(lower);
        const lower2 = lower.clone();
        right.add(lower2);
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 3, 6), solid("#3A3546"));
        g.add(left, right, body);
        g.rotation.x = -Math.PI / 2.4;
        g.position.set(b.x, b.y, b.z);
        parent.add(g);
        return { g, left, right, b, i };
    });
    return (time) => {
        for (const { g, left, right, b, i } of all) {
            const flap = Math.sin(time * 5 + i * 1.7) * 0.9;
            left.rotation.y = -flap;
            right.rotation.y = flap;
            g.position.set(b.x + Math.sin(time * 0.35 + i) * 0.5, b.y + Math.sin(time * 0.8 + i * 2) * 0.12, b.z + Math.cos(time * 0.3 + i) * 0.3);
            g.rotation.z = Math.sin(time * 0.35 + i) * 0.6;
        }
    };
}

/** Palma: povijeno stablo sa prstenovima, lišće koje se njiše, kokosi */
export function palm(parent: THREE.Object3D, batch: Batch, x: number, z: number, s = 1): Tick {
    const pts = [V(x, 0, z), V(x + 0.12 * s, 1.0 * s, z - 0.05), V(x + 0.38 * s, 2.0 * s, z - 0.1), V(x + 0.7 * s, 2.75 * s, z - 0.12)];
    const path = polyPath(pts);
    batch.add(taperedTube(path, (t) => (0.13 - 0.05 * t) * s, 24, 10), (p) => col("#B98552").offsetHSL(0, 0, Math.sin(p.y * 22) * 0.04));
    for (let i = 1; i < 9; i++) {
        const p = path(i / 9, new THREE.Vector3());
        batch.add(put(new THREE.TorusGeometry((0.125 - 0.05 * (i / 9)) * s, 0.018 * s, 5, 14), p.x, p.y, p.z, { rx: Math.PI / 2 - 0.25 }), "#9A6A3E");
    }
    const top = path(1, new THREE.Vector3());
    for (let k = 0; k < 3; k++) batch.add(put(new THREE.SphereGeometry(0.09 * s, 12, 10), top.x + Math.cos(k * 2.1) * 0.1 * s, top.y - 0.08 * s, top.z + Math.sin(k * 2.1) * 0.1 * s), "#7A5230");
    const crown = new THREE.Group();
    crown.position.copy(top);
    parent.add(crown);
    const leafMat = vcMat({ rough: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const leafPath = polyPath([V(0, 0, 0), V(Math.cos(a) * 0.5 * s, 0.22 * s, Math.sin(a) * 0.5 * s), V(Math.cos(a) * 1.05 * s, -0.05 * s, Math.sin(a) * 1.05 * s), V(Math.cos(a) * 1.35 * s, -0.42 * s, Math.sin(a) * 1.35 * s)]);
        const g = taperedTube(leafPath, (t) => 0.16 * s * Math.sin(Math.PI * Math.min(1, 0.1 + t)) , 18, 8, new THREE.Vector3(0, 1, 0), 0.12);
        const leaf = new THREE.Mesh(paint(g, (p) => col("#4FAE5E").lerp(col("#7ED67A"), Math.min(1, Math.max(0, p.y / (0.3 * s) + 0.5)))), leafMat);
        crown.add(leaf);
    }
    return (time) => {
        crown.rotation.z = Math.sin(time * 0.6) * 0.04;
        crown.rotation.x = Math.sin(time * 0.45 + 1) * 0.03;
    };
}

/** Suncobran na pruge sa peškirom */
export function umbrella(batch: Batch, x: number, z: number, s = 1, a = "#F45B8D", b = "#FFFFFF") {
    batch.add(put(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 1.9 * s, 8), x, 0.95 * s, z, { rz: 0.12 }), "#E8E2D8");
    const canopy = new THREE.ConeGeometry(1.0 * s, 0.42 * s, 16, 1, true);
    put(canopy, x - 0.11 * s, 1.95 * s, z, { rz: 0.12 });
    batch.add(canopy, (p) => {
        const ang = Math.atan2(p.z - z, p.x - x);
        return col(Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 16) % 2 ? a : b);
    }, { side: THREE.DoubleSide, rough: 0.7 });
    batch.add(put(new THREE.SphereGeometry(0.05 * s, 10, 8), x - 0.135 * s, 2.17 * s, z), b);
    const towel = rbox(0.75 * s, 0.012, 1.35 * s, 0.006);
    batch.add(put(towel, x + 0.2 * s, 0.006, z + 0.35 * s, { ry: 0.25 }), (p) => col(Math.floor((p.z - z + 2) / (0.22 * s)) % 2 ? "#3DB8D8" : "#FFFFFF"));
}

/** Morska zvezda i školjka (mali ukrasi na pesku) */
export function starfish(batch: Batch, x: number, z: number, s = 1, color = "#FF8A3D") {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const r = (i % 2 ? 0.045 : 0.11) * s;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.015 * s, bevelEnabled: true, bevelThickness: 0.012 * s, bevelSize: 0.012 * s, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    batch.add(put(g, x, 0.012, z, { ry: x * 2 }), color, { rough: 0.7 });
}

export function shell(batch: Batch, x: number, z: number, s = 1, color = "#F7A8C8") {
    const g = new THREE.SphereGeometry(0.08 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    batch.add(put(g, x, 0, z, { s: [1, 0.55, 0.85], ry: x }), (p) => col(color).offsetHSL(0, 0, Math.sin(Math.atan2(p.z - z, p.x - x) * 9) * 0.06), { rough: 0.5 });
}

/** Sneško Belić (veseo): tri grudve, šargarepa, ugljevlje, šal, štap-ruke, kapa */
export function snowman(batch: Batch, x: number, z: number, s = 1) {
    const snow = "#FFFFFF";
    batch.add(put(new THREE.SphereGeometry(0.42 * s, 24, 18), x, 0.36 * s, z, { s: [1, 0.9, 1] }), snow, { rough: 0.95 });
    batch.add(put(new THREE.SphereGeometry(0.3 * s, 22, 16), x, 0.9 * s, z), snow, { rough: 0.95 });
    batch.add(put(new THREE.SphereGeometry(0.22 * s, 22, 16), x, 1.33 * s, z), snow, { rough: 0.95 });
    const front = (y: number, r: number, ang: number, up = 0) => {
        const p = V(Math.sin(ang) * r, y + up, Math.cos(ang) * r);
        return p.multiplyScalar(s).add(V(x, 0, z));
    };
    for (const sx of [-0.33, 0.33]) {
        const e = front(1.37, 0.2, sx);
        batch.add(put(new THREE.SphereGeometry(0.026 * s, 10, 8), e.x, e.y, e.z), "#2A2A33", { rough: 0.4 });
    }
    for (let i = 0; i < 5; i++) {
        const a = -0.5 + i * 0.25;
        const m = front(1.26 - Math.cos(a * 2) * 0.03, 0.205, a);
        batch.add(put(new THREE.SphereGeometry(0.014 * s, 8, 6), m.x, m.y, m.z), "#2A2A33");
    }
    const nose = new THREE.ConeGeometry(0.035 * s, 0.2 * s, 12).rotateX(Math.PI / 2);
    const np = front(1.32, 0.3, 0);
    batch.add(put(nose, np.x, np.y, np.z), "#FF8A3D");
    for (const y of [0.85, 1.0]) {
        const b = front(y, 0.29, 0);
        batch.add(put(new THREE.SphereGeometry(0.03 * s, 10, 8), b.x, b.y, b.z), "#2A2A33");
    }
    batch.add(put(new THREE.TorusGeometry(0.2 * s, 0.05 * s, 10, 28), x, 1.14 * s, z, { rx: Math.PI / 2 }), "#E5484D");
    batch.add(put(rbox(0.09 * s, 0.32 * s, 0.03 * s, 0.012), x + 0.12 * s, 0.98 * s, z + 0.22 * s, { rz: 0.15 }), "#E5484D");
    for (const sx of [-1, 1]) {
        const arm = polyPath([V(x + sx * 0.25 * s, 0.98 * s, z), V(x + sx * 0.5 * s, 1.12 * s, z + 0.02), V(x + sx * 0.68 * s, 1.28 * s, z)]);
        batch.add(taperedTube(arm, () => 0.016 * s, 10, 6), "#7A5230");
    }
    batch.add(put(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.03 * s, 20), x, 1.51 * s, z), "#3D86E0");
    batch.add(put(new THREE.CylinderGeometry(0.13 * s, 0.14 * s, 0.2 * s, 20), x, 1.62 * s, z), "#3D86E0");
    batch.add(put(new THREE.CylinderGeometry(0.142 * s, 0.142 * s, 0.04 * s, 20), x, 1.55 * s, z), "#FFD15C");
}

/** Crvena štala sa belim ivicama, vratima sa „X” i prozorom na tavanu */
export function barn(batch: Batch, x: number, z: number, s = 1, ry = 0) {
    const add = (g: THREE.BufferGeometry, color: string) => batch.add(g.rotateY(ry).translate(x, 0, z), color);
    const w = 2.2 * s;
    const h = 1.5 * s;
    const d = 1.8 * s;
    add(rbox(w, h, d, 0.03).translate(0, h / 2, 0), "#D94848");
    // Krov: prizma
    const roof = new THREE.Shape();
    roof.moveTo(-w / 2 - 0.12 * s, 0);
    roof.lineTo(0, 0.95 * s);
    roof.lineTo(w / 2 + 0.12 * s, 0);
    roof.lineTo(w / 2 + 0.05 * s, -0.04 * s);
    roof.lineTo(0, 0.85 * s);
    roof.lineTo(-w / 2 - 0.05 * s, -0.04 * s);
    const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: d + 0.24 * s, bevelEnabled: false });
    add(roofGeo.translate(0, h, -d / 2 - 0.12 * s), "#8A3A3A");
    const gable = new THREE.Shape();
    gable.moveTo(-w / 2, 0);
    gable.lineTo(0, 0.85 * s);
    gable.lineTo(w / 2, 0);
    const gableGeo = new THREE.ShapeGeometry(gable);
    add(gableGeo.clone().translate(0, h, d / 2 + 0.002), "#D94848");
    add(gableGeo.rotateY(Math.PI).translate(0, h, -d / 2 - 0.002), "#D94848");
    // Bele ivice i vrata
    const trim = "#FFFFFF";
    for (const sx of [-1, 1]) add(rbox(0.08 * s, h, 0.06 * s, 0.01).translate((sx * w) / 2, h / 2, d / 2 + 0.01), trim);
    add(rbox(w, 0.08 * s, 0.06 * s, 0.01).translate(0, h, d / 2 + 0.01), trim);
    add(rbox(0.9 * s, 1.0 * s, 0.05 * s, 0.01).translate(0, 0.5 * s, d / 2 + 0.02), "#B8323A");
    const frame = [[0, 1.0, 0.9, 0.07], [0, 0.03, 0.9, 0.07]] as const;
    for (const [cx, cy, fw, fh] of frame) add(rbox(fw * s, fh * s, 0.04 * s, 0.01).translate(cx, cy * s, d / 2 + 0.05), trim);
    for (const sx of [-0.45, 0.45]) add(rbox(0.07 * s, 1.0 * s, 0.04 * s, 0.01).translate(sx * s, 0.5 * s, d / 2 + 0.05), trim);
    for (const r of [0.83, -0.83]) add(rbox(0.07 * s, 1.25 * s, 0.03 * s, 0.01).rotateZ(r).translate(0, 0.5 * s, d / 2 + 0.06), trim);
    add(rbox(0.42 * s, 0.38 * s, 0.05 * s, 0.02).translate(0, h + 0.32 * s, d / 2 + 0.02), trim);
    add(rbox(0.32 * s, 0.28 * s, 0.05 * s, 0.02).translate(0, h + 0.32 * s, d / 2 + 0.035), "#FFE7A8");
}

/** Silos: valjak sa kupolom */
export function silo(batch: Batch, x: number, z: number, s = 1) {
    batch.add(put(new THREE.CylinderGeometry(0.45 * s, 0.48 * s, 2.4 * s, 20), x, 1.2 * s, z), (p) => col("#C7D0DD").offsetHSL(0, 0, Math.sin(p.y * 9) * 0.03));
    batch.add(put(new THREE.SphereGeometry(0.45 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, 2.4 * s, z), "#8C98AB");
}

/** Bala sena (valjak sa spiralom) */
export function hayBale(batch: Batch, x: number, y: number, z: number, s = 1, ry = 0) {
    const g = new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 0.55 * s, 20, 3);
    g.rotateZ(Math.PI / 2).rotateY(ry);
    batch.add(put(g, x, y + 0.32 * s, z), (p) => col("#F2C94C").offsetHSL(0, 0, Math.sin((p.x + p.z) * 40) * 0.04 + Math.sin(p.y * 30) * 0.03));
}

/** Vetrenjača: kula i krila koja se polako okreću */
export function windmill(parent: THREE.Object3D, batch: Batch, x: number, z: number, s = 1): Tick {
    batch.add(put(new THREE.CylinderGeometry(0.35 * s, 0.6 * s, 2.6 * s, 16), x, 1.3 * s, z), "#F6E7D2");
    batch.add(put(new THREE.ConeGeometry(0.5 * s, 0.6 * s, 16), x, 2.9 * s, z), "#B8323A");
    batch.add(put(rbox(0.32 * s, 0.5 * s, 0.05 * s, 0.03), x, 0.25 * s, z + 0.52 * s), "#9A6236");
    const hub = new THREE.Group();
    hub.position.set(x, 2.55 * s, z + 0.5 * s);
    parent.add(hub);
    const bladeMat = solid("#FFFFFF", { rough: 0.8, side: THREE.DoubleSide });
    hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 12, 10), solid("#B8323A")));
    for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.z = (i / 4) * Math.PI * 2;
        const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 1.25 * s, 0.03 * s).translate(0, 0.65 * s, 0), solid("#9A6236"));
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.28 * s, 0.95 * s).translate(0.16 * s, 0.75 * s, 0.01), bladeMat);
        arm.add(spar, sail);
        hub.add(arm);
    }
    return (time) => {
        hub.rotation.z = -time * 0.35;
    };
}

/** Panorama (ringišpil točak): dva obruča, žbice, kabine koje ostaju uspravne */
export function ferrisWheel(parent: THREE.Object3D, batch: Batch, x: number, z: number, s = 1): Tick {
    const R = 2.0 * s;
    const cy = R + 0.55 * s;
    for (const sx of [-1, 1]) {
        for (const dz of [-0.28, 0.28]) {
            const leg = polyPath([V(x + sx * 1.15 * s, 0, z + dz * s), V(x, cy, z + dz * 0.6 * s)]);
            batch.add(taperedTube(leg, () => 0.05 * s, 4, 8), "#F2F5FA");
        }
    }
    const wheel = new THREE.Group();
    wheel.position.set(x, cy, z);
    parent.add(wheel);
    const wb = new Batch();
    for (const dz of [-0.16, 0.16]) {
        wb.add(put(new THREE.TorusGeometry(R, 0.035 * s, 8, 72), 0, 0, dz * s), "#FFFFFF");
        wb.add(put(new THREE.TorusGeometry(R * 0.55, 0.025 * s, 6, 48), 0, 0, dz * s), "#F7A8C8");
    }
    const n = 8;
    for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        for (const dz of [-0.16, 0.16]) {
            const spoke = new THREE.CylinderGeometry(0.014 * s, 0.014 * s, R, 5).translate(0, R / 2, 0);
            spoke.rotateZ(a);
            wb.add(spoke.translate(0, 0, dz * s), "#FFFFFF");
        }
    }
    wb.add(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.5 * s, 14).rotateX(Math.PI / 2), "#FFD15C");
    // Male sijalice po obodu (svetle bojom)
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        wb.add(put(new THREE.SphereGeometry(0.04 * s, 8, 6), Math.cos(a) * R, Math.sin(a) * R, 0.2 * s), ["#FFE48A", "#FFB3C9", "#BFE6FF"][i % 3], { glow: 0.9 });
    }
    wb.into(wheel);
    const colors = ["#F45B8D", "#3D9BE9", "#FFD15C", "#3BB273", "#FF8A3D", "#8E77E6", "#5CC6E8", "#F78FB3"];
    const cabins: THREE.Group[] = [];
    for (let i = 0; i < n; i++) {
        const cabin = new THREE.Group();
        const cb = new Batch();
        cb.add(put(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.22 * s, 4), 0, -0.11 * s, 0), "#F2F5FA");
        cb.add(put(new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 0.24 * s, 14), 0, -0.34 * s, 0), colors[i]);
        cb.add(put(new THREE.ConeGeometry(0.2 * s, 0.1 * s, 14), 0, -0.17 * s, 0), "#FFFFFF");
        cb.add(put(new THREE.CylinderGeometry(0.205 * s, 0.205 * s, 0.03 * s, 14), 0, -0.44 * s, 0), "#FFFFFF");
        cb.into(cabin);
        parent.add(cabin);
        cabins.push(cabin);
    }
    const place = (rot: number) => {
        wheel.rotation.z = rot;
        cabins.forEach((cabin, i) => {
            const a = rot + (i / n) * Math.PI * 2;
            cabin.position.set(x + Math.cos(a) * R, cy + Math.sin(a) * R, z);
            cabin.rotation.z = Math.sin(rot * 3 + i) * 0.03;
        });
    };
    place(0.2);
    return (time) => place(0.2 + time * 0.08);
}

/** Šator na pruge sa zastavicom na vrhu */
export function tent(parent: THREE.Object3D, batch: Batch, x: number, z: number, s = 1, a = "#F45B8D", b = "#FFFFFF"): Tick {
    const stripes = (p: THREE.Vector3) => col(Math.floor(((Math.atan2(p.z - z, p.x - x) + Math.PI) / (Math.PI * 2)) * 14) % 2 ? a : b);
    batch.add(put(new THREE.CylinderGeometry(0.85 * s, 0.85 * s, 0.9 * s, 28, 1, true), x, 0.45 * s, z), stripes, { side: THREE.DoubleSide });
    batch.add(put(new THREE.ConeGeometry(1.05 * s, 0.85 * s, 28, 1), x, 1.32 * s, z), stripes);
    // Zubci na rubu krova
    for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const g = new THREE.SphereGeometry(0.11 * s, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        batch.add(put(g, x + Math.cos(ang) * 1.0 * s, 0.9 * s, z + Math.sin(ang) * 1.0 * s, { s: [1, 0.9, 0.6], ry: -ang + Math.PI / 2 }), i % 2 ? a : b);
    }
    // Ulaz (tamnija zavesa napred)
    batch.add(put(new THREE.PlaneGeometry(0.5 * s, 0.75 * s), x, 0.38 * s, z + 0.86 * s), "#6B3A55");
    batch.add(put(new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.4 * s, 5), x, 1.9 * s, z), "#8C98AB");
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.24 * s, 0.14 * s).translate(0.12 * s, 0, 0), solid("#FFD15C", { side: THREE.DoubleSide }));
    flag.position.set(x, 2.02 * s, z);
    parent.add(flag);
    return (time) => {
        flag.rotation.y = Math.sin(time * 1.4 + x) * 0.25;
    };
}

/** Zastavice na konopcu (lančanica između dva stuba) + male sijalice */
export function bunting(parent: THREE.Object3D, batch: Batch, x0: number, x1: number, z: number, y: number, sag = 0.35, lights = true): Tick {
    const colors = ["#F45B8D", "#FFD15C", "#3D9BE9", "#3BB273", "#FF8A3D", "#8E77E6"];
    const at = (t: number) => V(x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), z);
    for (const xx of [x0, x1]) batch.add(put(new THREE.CylinderGeometry(0.035, 0.045, y + 0.1, 8), xx, (y + 0.1) / 2, z), "#F2F5FA");
    const rope = polyPath(Array.from({ length: 11 }, (_, i) => at(i / 10)));
    batch.add(taperedTube(rope, () => 0.008, 30, 4), "#8C98AB");
    const n = Math.max(6, Math.round(Math.abs(x1 - x0) / 0.32));
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0, -0.2, 0], 3));
    tri.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const flags = instanced(paint(tri, "#FFFFFF"), vcMat({ side: THREE.DoubleSide, rough: 0.7 }), Array.from({ length: n }, (_, i) => ({ p: at((i + 0.5) / n), color: colors[i % colors.length] })));
    parent.add(flags);
    if (lights) {
        const bulbs = instanced(paint(new THREE.SphereGeometry(0.03, 8, 6), "#FFFFFF"), vcMat({ glow: 0.9 }), Array.from({ length: n + 1 }, (_, i) => ({ p: at(i / n).add(V(0, -0.02, 0.02)), color: ["#FFE48A", "#FFC9D9", "#CDEBFF"][i % 3] })));
        parent.add(bulbs);
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = V(1, 1, 1);
    return (time) => {
        for (let i = 0; i < n; i++) {
            q.setFromEuler(new THREE.Euler(Math.sin(time * 1.3 + i * 0.8) * 0.22, 0, 0));
            m.compose(at((i + 0.5) / n), q, one);
            flags.setMatrixAt(i, m);
        }
        flags.instanceMatrix.needsUpdate = true;
    };
}

/** Grozd balona sa koncima (lagano lebde) */
export function balloons(parent: THREE.Object3D, x: number, z: number, s = 1, colors = ["#F45B8D", "#3D9BE9", "#FFD15C", "#3BB273", "#8E77E6"]): Tick {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    const items = colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const top = V(Math.cos(a) * 0.22 * s, (1.7 + (i % 2) * 0.22) * s, Math.sin(a) * 0.12 * s);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 18, 14).scale(1, 1.18, 1), solid(c, { rough: 0.25 }));
        b.position.copy(top);
        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, 0.04 * s, 6), solid(c));
        knot.position.set(0, -0.21 * s, 0);
        b.add(knot);
        const string = new THREE.Mesh(taperedTube(polyPath([V(0, 0.05 * s, 0), top.clone().multiplyScalar(0.5).add(V(0.02, 0, 0)), top.clone().add(V(0, -0.22 * s, 0))]), () => 0.004 * s, 12, 4), solid("#E8E2D8"));
        group.add(b, string);
        return { b, top, i };
    });
    return (time) => {
        for (const { b, top, i } of items) {
            b.position.set(top.x + Math.sin(time * 0.6 + i) * 0.03, top.y + Math.sin(time * 0.8 + i * 1.3) * 0.04, top.z);
            b.rotation.z = Math.sin(time * 0.6 + i) * 0.08;
        }
    };
}

/** Riba (telo, rep, peraja, oko) — jedna grupa; pokret radi pozivalac */
export function fish(color: string, s = 1, stripe?: string): THREE.Group {
    const g = new THREE.Group();
    const b = new Batch();
    b.add(new THREE.SphereGeometry(0.16 * s, 18, 14).scale(1.3, 0.85, 0.55), (p) => {
        const c = col(color);
        if (stripe && Math.abs(Math.sin(p.x / s * 18)) > 0.82) return col(stripe);
        return c.offsetHSL(0, 0, p.y > 0 ? 0.04 : -0.02);
    }, { rough: 0.45 });
    const tail = new THREE.ConeGeometry(0.11 * s, 0.16 * s, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.3).translate(-0.27 * s, 0, 0);
    b.add(tail, color, { rough: 0.5 });
    b.add(new THREE.ConeGeometry(0.06 * s, 0.1 * s, 8).scale(1, 1, 0.3).translate(-0.02 * s, 0.15 * s, 0), color);
    for (const sz of [-1, 1]) {
        b.add(put(new THREE.SphereGeometry(0.035 * s, 12, 10), 0.13 * s, 0.03 * s, sz * 0.075 * s), "#FFFFFF", { rough: 0.2 });
        b.add(put(new THREE.SphereGeometry(0.02 * s, 10, 8), 0.145 * s, 0.03 * s, sz * 0.095 * s), "#2A2A33", { rough: 0.2 });
    }
    b.into(g);
    return g;
}

/** Alga: povijena traka od dna nagore, njiše se (okret oko korena) */
export function seaweed(parent: THREE.Object3D, x: number, z: number, h: number, color = "#3BB273"): Tick {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    parent.add(group);
    const segs = 3;
    const parts: THREE.Group[] = [];
    let holder: THREE.Object3D = group;
    for (let i = 0; i < segs; i++) {
        const part = new THREE.Group();
        part.position.y = i === 0 ? 0 : h / segs;
        const g = taperedTube(polyPath([V(0, 0, 0), V(0.03, h / segs / 2, 0), V(0, h / segs, 0)]), (t) => 0.045 * (1 - (i + t) / (segs + 0.4)) + 0.008, 8, 8, V(0, 0, 1), 0.35);
        part.add(new THREE.Mesh(paint(g, col(color).offsetHSL(0, 0, i * 0.05).getStyle()), vcMat({ rough: 0.7 })));
        holder.add(part);
        holder = part;
        parts.push(part);
    }
    return (time) => {
        parts.forEach((p, i) => {
            p.rotation.z = Math.sin(time * 0.7 + x * 1.7 + i * 0.6) * (0.08 + i * 0.05);
            p.rotation.x = Math.sin(time * 0.5 + z + i) * 0.05;
        });
    };
}

/** Korali: grančice (cevi) u boji, od jednog korena */
export function coral(batch: Batch, x: number, z: number, s = 1, color = "#F78FB3", seed = 1) {
    const r = rng(seed);
    const branch = (from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
        const to = from.clone().addScaledVector(dir, len);
        const mid = from.clone().lerp(to, 0.5).add(V((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.05));
        batch.add(taperedTube(polyPath([from, mid, to]), (t) => rad * (1 - t * 0.35), 8, 7), color, { rough: 0.6 });
        batch.add(put(new THREE.SphereGeometry(rad * 0.75, 8, 6), to.x, to.y, to.z), color, { rough: 0.6 });
        if (depth <= 0) return;
        for (let k = 0; k < 2; k++) {
            const nd = dir.clone().add(V((r() - 0.5) * 1.1, 0.25, (r() - 0.5) * 0.8)).normalize();
            branch(to, nd, len * 0.72, rad * 0.72, depth - 1);
        }
    };
    branch(V(x, 0, z), V(0, 1, 0), 0.35 * s, 0.05 * s, 2);
}

/** Moždani koral / sunđer: kvrgava polulopta */
export function brainCoral(batch: Batch, x: number, z: number, s = 1, color = "#FFB866") {
    const g = new THREE.SphereGeometry(0.3 * s, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = g.getAttribute("position");
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const k = 1 + 0.05 * Math.sin(p.x * 60) * Math.sin(p.z * 60);
        pos.setXYZ(i, p.x * k, p.y * k, p.z * k);
    }
    g.computeVertexNormals();
    batch.add(put(g, x, -0.02, z, { s: [1, 0.8, 1] }), (q) => col(color).offsetHSL(0, 0, Math.sin(q.x * 50 + q.z * 40) * 0.05), { rough: 0.7 });
}

/** Oblak-postelja (duga, nebo): veliki spljošteni oblaci na tlu */
export function cloudBank(batch: Batch, x: number, z: number, s = 1, color = "#FFFFFF") {
    const g = cloudGeometry(14);
    put(g, x, 0.1 * s, z, { s: [s * 1.4, s, s] });
    batch.add(g, color, { rough: 1, glow: 0.35 });
}

/** Kula zamka: valjak sa prozorima, kupasti krov i zubci */
export function tower(batch: Batch, x: number, z: number, h: number, r: number, wall = "#EBDCF7", roof = "#B9A2F2") {
    batch.add(put(new THREE.CylinderGeometry(r, r * 1.04, h, 24), x, h / 2, z), (p) => col(wall).offsetHSL(0, 0, Math.sin(p.y * 14) * 0.012));
    batch.add(put(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.14, 24), x, h + 0.07, z), wall);
    batch.add(put(new THREE.ConeGeometry(r * 1.25, r * 2.6, 24), x, h + 0.14 + r * 1.3, z), (p) => col(roof).offsetHSL(0, 0, (p.y - h) * 0.03));
    batch.add(put(new THREE.SphereGeometry(0.05, 8, 6), x, h + 0.14 + r * 2.6, z), "#FFD15C", { metal: 0.6, rough: 0.3 });
    for (const yy of [h * 0.45, h * 0.75]) {
        batch.add(put(rbox(r * 0.36, r * 0.56, 0.06, 0.05), x, yy, z + r * 0.98), "#7A6AB0");
        batch.add(put(new THREE.CylinderGeometry(r * 0.18, r * 0.18, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), x, yy + r * 0.28, z + r * 0.98), "#7A6AB0");
    }
}

/** Zastavica na stubu koja se vijori (okret oko stuba) */
export function pennant(parent: THREE.Object3D, x: number, y: number, z: number, color = "#F45B8D", s = 1): Tick {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.42 * s, 6).translate(0, 0.21 * s, 0), solid("#D5DCE6"));
    pole.position.set(x, y, z);
    parent.add(pole);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.42 * s, 0, 0.3 * s, 0.34 * s, 0, 0, 0.26 * s, 0], 3));
    g.computeVertexNormals();
    const flag = new THREE.Mesh(g, solid(color, { side: THREE.DoubleSide }));
    flag.position.set(x, y, z);
    parent.add(flag);
    return (time) => {
        flag.rotation.y = Math.sin(time * 1.2 + x * 2) * 0.35 - 0.3;
    };
}

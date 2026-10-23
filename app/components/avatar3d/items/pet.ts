// 3D ljubimci (mesto „pet”, podaci: pet.data.ts). Vlasnik: #2 (životinje).
// Mali drugari u istom stilu kao životinje: meko krzno (sheen), sjajne oči sa odsjajem koje
// trepću, ružičasti obrazi. Stoje na tlu pored lika (anchors.petSpot, petScale) i mirno se
// pomeraju: rep mrda, glava se naginje, ribica pliva i pušta mehuriće, ptice klimaju.
// Mere su za dete (≈ 1,2 m); petScale ih srazmerno menja. Svaki ljubimac ≤ 15k trouglova.

import * as THREE from "three";
import { registerItems, type ItemBuilder, type ItemContext } from "../contract";
import { furMaterial, hornyMaterial, noseMaterial, padMaterial, pearlMaterial, shineMaterial } from "../animals/materials";
import { solidColor } from "../animals/paint";
import { lensMaterial } from "../engine/materials";
import { buildSurface, polyPath, taperedTube } from "../engine/surface";

type Anim = (time: number, dt: number, live: boolean) => void;

interface Pet {
    root: THREE.Group;
    anims: Anim[];
    /** Oči (za treptanje: skalira se y) */
    eyes: THREE.Object3D[];
}

function pet(): Pet {
    return { root: new THREE.Group(), anims: [], eyes: [] };
}

/** Krzno jedne boje (materijal krzna koristi boje temena) */
function fur(hex: string): THREE.Material {
    return furMaterial({ sheen: hex });
}

function blob(rx: number, ry: number, rz: number, hex: string, seg = 22, material?: THREE.Material): THREE.Mesh {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
    g.scale(rx, ry, rz);
    solidColor(g, hex);
    return new THREE.Mesh(g, material ?? fur(hex));
}

function glossy(rx: number, ry: number, rz: number, hex: string, seg = 24): THREE.Mesh {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
    g.scale(rx, ry, rz);
    return new THREE.Mesh(g, hornyMaterial(hex));
}

/** Sjajno oko sa dva odsjaja (grupa: centar oka), gleda ka +z */
function eye(p: Pet, r: number, at: THREE.Vector3, parent: THREE.Object3D, color = "#1A1214"): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(at);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), noseMaterial(color));
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), shineMaterial());
    s1.position.set(-r * 0.32, r * 0.36, r * 0.82);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 8, 6), shineMaterial());
    s2.position.set(r * 0.3, -r * 0.3, r * 0.88);
    g.add(ball, s1, s2);
    parent.add(g);
    p.eyes.push(g);
    return g;
}

/** Ružičasti obrazi (mali providni diskovi na površini) */
function cheeks(parent: THREE.Object3D, x: number, y: number, z: number, r: number, yaw = 0.5) {
    for (const s of [1, -1]) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: "#FF8FA0", transparent: true, opacity: 0.45, depthWrite: false }));
        m.position.set(s * x, y, z);
        m.rotation.y = s * yaw;
        m.renderOrder = 2;
        parent.add(m);
    }
}

/** Cev (rep, noga, vrat) sa bojom krzna */
function tube(points: THREE.Vector3[], radius: (s: number) => number, hex: string, material?: THREE.Material, seg = 20, sides = 12): THREE.Mesh {
    const g = taperedTube(polyPath(points), radius, seg, sides);
    solidColor(g, hex);
    return new THREE.Mesh(g, material ?? fur(hex));
}

/** Uho: spljoštena kupa sa unutrašnjošću */
function ear(len: number, w: number, hex: string, inner: string, round = false): THREE.Group {
    const g = new THREE.Group();
    const shape = (k: number) => buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const t = v;
        const prof = round ? Math.sqrt(Math.max(0, 1 - Math.pow(t * 1.8 - 0.8, 2))) : Math.pow(1 - t, 0.9);
        return out.set(Math.sin(a) * w * prof * k, len * t * k, Math.cos(a) * w * 0.35 * prof * k);
    }, { nu: 20, nv: 10, closedU: true, inside: (_u, v, out) => out.set(0, len * v * k, 0) });
    const outer = shape(1);
    solidColor(outer, hex);
    g.add(new THREE.Mesh(outer, fur(hex)));
    const innerG = shape(0.72);
    innerG.translate(0, len * 0.06, w * 0.12);
    g.add(new THREE.Mesh(innerG, padMaterial(inner)));
    return g;
}

/** Treptanje svih očiju ljubimca (svakih 3–6 s) */
function blinker(p: Pet): Anim {
    let next = 1.5 + Math.random() * 3;
    let start = -1;
    return (time, _dt, live) => {
        if (!live) {
            for (const e of p.eyes) e.scale.y = 1;
            return;
        }
        if (start < 0 && time > next) start = time;
        let k = 1;
        if (start >= 0) {
            const q = (time - start) / 0.18;
            k = q < 0.5 ? 1 - q * 2 * 0.9 : 0.1 + (q - 0.5) * 2 * 0.9;
            if (q >= 1) {
                start = -1;
                next = time + 3 + Math.random() * 3;
                k = 1;
            }
        }
        for (const e of p.eyes) e.scale.y = Math.max(0.1, Math.min(1, k));
    };
}

/** Disanje: telo se jedva primetno širi */
function breathe(target: THREE.Object3D, speed = 2.2, amount = 0.015): Anim {
    const base = target.scale.clone();
    return (time, _dt, live) => {
        const k = live ? Math.sin(time * speed) * amount : 0;
        target.scale.set(base.x * (1 + k), base.y * (1 + k * 0.6), base.z * (1 + k));
    };
}

/** Njihanje oko ose (rep, glava): rotacija oko `axis` */
function sway(target: THREE.Object3D, axis: "x" | "y" | "z", speed: number, amount: number, offset = 0): Anim {
    const base = target.rotation[axis];
    return (time, _dt, live) => {
        target.rotation[axis] = base + (live ? Math.sin(time * speed + offset) * amount : 0);
    };
}

// ── Sisari koji sede (mače, kuče, zečić) ──────────────────────────────────────

interface SitterSpec {
    fur: string;
    light: string;
    inner: string;
    nose: string;
    ear: "pointy" | "floppy" | "tall";
    tail: "long" | "wag" | "pom";
    earHex?: string;
    whiskers?: boolean;
}

function sitter(s: SitterSpec): Pet {
    const p = pet();
    const body = new THREE.Group();
    p.root.add(body);
    // Telo koje sedi (kruška), svetao stomak, zadnje nožice sa strane, prednje šapice
    const trunk = blob(0.085, 0.095, 0.08, s.fur);
    trunk.position.set(0, 0.09, 0);
    body.add(trunk);
    const belly = blob(0.06, 0.07, 0.035, s.light);
    belly.position.set(0, 0.085, 0.055);
    body.add(belly);
    for (const side of [1, -1]) {
        const haunch = blob(0.05, 0.045, 0.065, s.fur);
        haunch.position.set(side * 0.065, 0.04, 0.005);
        body.add(haunch);
        const foot = blob(0.03, 0.02, 0.045, s.light);
        foot.position.set(side * 0.07, 0.018, 0.06);
        body.add(foot);
        const leg = tube([new THREE.Vector3(side * 0.035, 0.12, 0.05), new THREE.Vector3(side * 0.036, 0.06, 0.07), new THREE.Vector3(side * 0.035, 0.02, 0.075)], () => 0.02, s.fur);
        body.add(leg);
        const paw = blob(0.024, 0.017, 0.028, s.light);
        paw.position.set(side * 0.035, 0.016, 0.085);
        body.add(paw);
    }
    // Glava
    const head = new THREE.Group();
    head.position.set(0, 0.215, 0.02);
    body.add(head);
    const skull = blob(0.09, 0.08, 0.08, s.fur, 36);
    head.add(skull);
    const muzzle = blob(0.045, 0.032, 0.03, s.light);
    muzzle.position.set(0, -0.025, 0.065);
    head.add(muzzle);
    const nose = glossy(s.ear === "floppy" ? 0.016 : 0.01, s.ear === "floppy" ? 0.011 : 0.007, 0.008, s.nose, 16);
    nose.material = noseMaterial(s.nose);
    nose.position.set(0, -0.012, 0.094);
    head.add(nose);
    for (const side of [1, -1]) eye(p, 0.016, new THREE.Vector3(side * 0.036, 0.008, 0.07), head);
    cheeks(head, 0.058, -0.022, 0.06, 0.012);
    // Uši
    const earHex = s.earHex ?? s.fur;
    for (const side of [1, -1]) {
        let e: THREE.Group;
        if (s.ear === "pointy") {
            e = ear(0.06, 0.035, earHex, s.inner);
            e.position.set(side * 0.05, 0.055, -0.005);
            e.rotation.set(-0.1, side * -0.3, -side * 0.35);
        } else if (s.ear === "tall") {
            e = ear(0.11, 0.025, earHex, s.inner, true);
            e.position.set(side * 0.028, 0.07, -0.01);
            e.rotation.set(-0.15, side * -0.2, -side * 0.15);
        } else {
            e = ear(0.08, 0.032, earHex, s.inner, true);
            e.position.set(side * 0.075, 0.035, -0.005);
            e.rotation.set(0.15, side * 1.3, -side * 2.6);
        }
        head.add(e);
        p.anims.push(sway(e, "z", s.ear === "floppy" ? 1.6 : 0.9, s.ear === "floppy" ? 0.06 : 0.03, side));
    }
    if (s.whiskers) {
        for (const side of [1, -1]) {
            for (let i = 0; i < 2; i++) {
                const a = new THREE.Vector3(side * 0.035, -0.02 - i * 0.008, 0.088);
                const b = a.clone().add(new THREE.Vector3(side * 0.06, 0.004 - i * 0.008, -0.01));
                head.add(tube([a, a.clone().lerp(b, 0.5), b], (t) => 0.0012 * (1 - t * 0.6), "#FFFFFF", new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.6 }), 8, 5));
            }
        }
    }
    // Rep
    const tail = new THREE.Group();
    tail.position.set(0, 0.04, -0.07);
    body.add(tail);
    if (s.tail === "pom") {
        tail.add(blob(0.035, 0.033, 0.033, s.light));
    } else if (s.tail === "wag") {
        tail.add(tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.04, -0.04), new THREE.Vector3(0, 0.1, -0.05)], (t) => 0.016 * (1 - t * 0.5) + 0.004, s.fur));
    } else {
        tail.add(tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 0, -0.05), new THREE.Vector3(0.1, 0.08, -0.04), new THREE.Vector3(0.09, 0.16, -0.01)], (t) => 0.014 * (1 - t * 0.3) + 0.003, s.fur));
    }
    p.anims.push(breathe(trunk));
    p.anims.push(sway(tail, s.tail === "wag" ? "y" : "z", s.tail === "wag" ? 7 : 1.2, s.tail === "wag" ? 0.45 : 0.18));
    p.anims.push(sway(head, "z", 0.7, 0.06));
    p.anims.push(sway(head, "y", 0.45, 0.12, 1));
    return p;
}

// ── Ptice (pile, patkica, ptičica, papagaj, pingvin) ───────────────────────────

interface BirdSpec {
    body: string;
    belly: string;
    beak: string;
    feet: string;
    size: number;
    beakKind: "short" | "duck" | "hook";
    crest?: string;
    wing?: string;
    tail?: string;
    penguin?: boolean;
}

function bird(s: BirdSpec): Pet {
    const p = pet();
    const k = s.size;
    const body = new THREE.Group();
    p.root.add(body);
    const trunk = blob(0.06 * k, (s.penguin ? 0.085 : 0.055) * k, 0.058 * k, s.body, 32);
    trunk.position.y = (s.penguin ? 0.09 : 0.065) * k;
    body.add(trunk);
    const belly = blob(0.045 * k, (s.penguin ? 0.07 : 0.042) * k, 0.03 * k, s.belly);
    belly.position.set(0, (s.penguin ? 0.08 : 0.058) * k, 0.035 * k);
    body.add(belly);
    const head = new THREE.Group();
    head.position.set(0, (s.penguin ? 0.19 : 0.13) * k, 0.01 * k);
    body.add(head);
    head.add(blob(0.05 * k, 0.047 * k, 0.047 * k, s.body, 32));
    if (s.penguin) {
        const mask = blob(0.04 * k, 0.034 * k, 0.03 * k, s.belly);
        mask.position.set(0, -0.006 * k, 0.026 * k);
        head.add(mask);
    }
    for (const side of [1, -1]) eye(p, 0.011 * k, new THREE.Vector3(side * 0.022 * k, 0.008 * k, 0.04 * k), head);
    cheeks(head, 0.033 * k, -0.008 * k, 0.036 * k, 0.008 * k);
    // Kljun
    const beak = new THREE.Group();
    beak.position.set(0, -0.008 * k, 0.045 * k);
    head.add(beak);
    if (s.beakKind === "duck") {
        const b = glossy(0.024 * k, 0.008 * k, 0.026 * k, s.beak);
        b.position.z = 0.012 * k;
        beak.add(b);
    } else if (s.beakKind === "hook") {
        const g = taperedTube(polyPath([new THREE.Vector3(0, 0.006 * k, -0.004 * k), new THREE.Vector3(0, 0.004 * k, 0.022 * k), new THREE.Vector3(0, -0.012 * k, 0.03 * k)]), (t) => 0.012 * k * (1 - t * 0.85), 14, 12);
        beak.add(new THREE.Mesh(g, hornyMaterial(s.beak)));
    } else {
        const g = new THREE.ConeGeometry(0.009 * k, 0.02 * k, 14);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, 0.008 * k);
        beak.add(new THREE.Mesh(g, hornyMaterial(s.beak)));
    }
    // Krila (peraja)
    for (const side of [1, -1]) {
        const w = blob(0.016 * k, (s.penguin ? 0.06 : 0.035) * k, 0.035 * k, s.wing ?? s.body);
        w.position.set(side * 0.058 * k, (s.penguin ? 0.1 : 0.07) * k, -0.004 * k);
        w.rotation.z = side * 0.25;
        body.add(w);
        p.anims.push(sway(w, "z", 2.4, 0.06, side));
        // Nožice
        const f = glossy(0.014 * k, 0.005 * k, 0.02 * k, s.feet, 16);
        f.position.set(side * 0.022 * k, 0.005 * k, 0.025 * k);
        body.add(f);
    }
    if (s.crest) {
        for (let i = 0; i < 3; i++) {
            const a = new THREE.Vector3((i - 1) * 0.008 * k, 0.04 * k, 0.005 * k);
            const b = a.clone().add(new THREE.Vector3((i - 1) * 0.008 * k, 0.03 * k, -0.012 * k));
            head.add(tube([a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0.004 * k)), b], (t) => 0.007 * k * (1 - t * 0.7), s.crest, undefined, 10, 8));
        }
    }
    if (s.tail) {
        const t = tube([new THREE.Vector3(0, 0.05 * k, -0.05 * k), new THREE.Vector3(0, 0.03 * k, -0.09 * k), new THREE.Vector3(0, 0.0, -0.14 * k)], (q) => 0.016 * k * (1 - q * 0.4), s.tail, undefined, 14, 10);
        body.add(t);
    }
    p.anims.push(breathe(trunk, 2.8, 0.02));
    // Klimanje glavom (kao kod ptica: kratko, pa mirno)
    p.anims.push((time, _dt, live) => {
        const q = live ? Math.max(0, Math.sin(time * 1.6) - 0.6) * 2.5 : 0;
        head.rotation.x = q * 0.25;
        head.rotation.y = live ? Math.sin(time * 0.5) * 0.25 : 0;
    });
    return p;
}

// ── Pojedinačni ljubimci ──────────────────────────────────────────────────────

function fishBowl(): Pet {
    const p = pet();
    // Činija: staklo (providno, sa odsjajem), voda, kamenčići, ribica i mehurići
    const R = 0.1;
    const glass = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28, 0, Math.PI * 2, 0.35, Math.PI - 0.35), lensMaterial("#DDF2FF", 0.22));
    glass.position.y = R * 0.95;
    glass.renderOrder = 3;
    const water = new THREE.Mesh(new THREE.SphereGeometry(R * 0.96, 36, 24, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58 - 0.36), lensMaterial("#7FC8F0", 0.32));
    water.position.y = R * 0.95;
    water.renderOrder = 2;
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.45, 0.02, 28), padMaterial("#F2D9A6"));
    sand.position.y = 0.02;
    p.root.add(glass, water, sand);
    for (let i = 0; i < 5; i++) {
        const stone = glossy(0.012, 0.008, 0.012, ["#F28DB2", "#7FC8F0", "#FFD34D", "#8EE0A0", "#C9A6F2"][i]);
        stone.position.set(Math.cos(i * 1.3) * 0.04, 0.032, Math.sin(i * 1.3) * 0.04);
        p.root.add(stone);
    }
    // Ribica
    const fish = new THREE.Group();
    const fishBody = glossy(0.018, 0.022, 0.034, "#FF8C3A", 28);
    fishBody.material = pearlMaterial("#FF9A4A");
    fish.add(fishBody);
    const tailG = new THREE.ConeGeometry(0.018, 0.028, 16);
    tailG.rotateX(-Math.PI / 2);
    tailG.scale(0.3, 1, 1);
    tailG.translate(0, 0, -0.042);
    const tail = new THREE.Mesh(tailG, pearlMaterial("#FFB070"));
    fish.add(tail);
    for (const side of [1, -1]) eye(p, 0.006, new THREE.Vector3(side * 0.014, 0.006, 0.022), fish);
    const swim = new THREE.Group();
    swim.position.y = 0.09;
    swim.add(fish);
    p.root.add(swim);
    // Mehurići
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.005 + i * 0.001, 10, 8), lensMaterial("#FFFFFF", 0.5));
        p.root.add(b);
        bubbles.push(b);
    }
    p.anims.push((time, _dt, live) => {
        const t = live ? time : 0;
        const a = t * 0.7;
        fish.position.set(Math.cos(a) * 0.035, Math.sin(t * 1.3) * 0.008, Math.sin(a) * 0.03);
        fish.rotation.y = -a + Math.PI;
        tail.rotation.y = live ? Math.sin(t * 9) * 0.4 : 0;
        bubbles.forEach((b, i) => {
            const q = live ? ((t * 0.35 + i * 0.25) % 1) : 0.2 + i * 0.15;
            b.position.set(0.02 + Math.sin(i * 2 + q * 6) * 0.006, 0.06 + q * 0.11, 0.01 * i);
            b.visible = q < 0.92;
        });
    });
    return p;
}

function frog(): Pet {
    const p = pet();
    const body = new THREE.Group();
    p.root.add(body);
    const green = "#6CC24A";
    const trunk = glossy(0.06, 0.04, 0.06, green, 32);
    trunk.position.y = 0.045;
    body.add(trunk);
    const belly = glossy(0.045, 0.028, 0.035, "#D9F2A6");
    belly.position.set(0, 0.035, 0.03);
    body.add(belly);
    for (const side of [1, -1]) {
        const bump = glossy(0.022, 0.022, 0.022, green);
        bump.position.set(side * 0.03, 0.085, 0.025);
        body.add(bump);
        eye(p, 0.013, new THREE.Vector3(side * 0.03, 0.09, 0.04), body);
        const leg = glossy(0.03, 0.018, 0.035, green);
        leg.position.set(side * 0.055, 0.018, -0.01);
        body.add(leg);
        const foot = glossy(0.016, 0.005, 0.02, "#5AAE3A");
        foot.position.set(side * 0.03, 0.005, 0.055);
        body.add(foot);
    }
    const smile = taperedTube((s, out) => out.set((s - 0.5) * 0.05, 0.048 - Math.sin(s * Math.PI) * 0.008, 0.06 - Math.abs(s - 0.5) * 0.015), () => 0.0016, 16, 5);
    body.add(new THREE.Mesh(smile, new THREE.MeshStandardMaterial({ color: "#2E5A1E" })));
    cheeks(body, 0.04, 0.05, 0.05, 0.009);
    p.anims.push(breathe(trunk, 3.2, 0.03));
    return p;
}

function turtle(): Pet {
    const p = pet();
    const shell = buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const ph = v * Math.PI * 0.5;
        const r = 0.07 * Math.sin(ph) + 0.002;
        // Šestougaone ploče: blage izbočine
        const plates = 1 + 0.04 * Math.cos(a * 6) * Math.sin(ph * 2);
        return out.set(Math.sin(a) * r * plates, 0.055 * Math.cos(ph) + 0.03, Math.cos(a) * r * 1.15 * plates);
    }, { nu: 48, nv: 20, closedU: true, inside: () => new THREE.Vector3(0, 0.03, 0) });
    p.root.add(new THREE.Mesh(shell, hornyMaterial("#5E9A3E", 0.5)));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.008, 10, 40), hornyMaterial("#E8C77A", 0.5));
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1, 1.15, 1);
    rim.position.y = 0.03;
    p.root.add(rim);
    const skin = "#A6D96A";
    const head = new THREE.Group();
    head.position.set(0, 0.04, 0.085);
    p.root.add(head);
    head.add(glossy(0.03, 0.026, 0.032, skin));
    for (const side of [1, -1]) eye(p, 0.008, new THREE.Vector3(side * 0.014, 0.01, 0.024), head);
    cheeks(head, 0.02, -0.004, 0.024, 0.006);
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const leg = glossy(0.018, 0.014, 0.02, skin);
        leg.position.set(x * 0.055, 0.014, z * 0.055);
        p.root.add(leg);
    }
    p.anims.push((time, _dt, live) => {
        // Glava polako izviruje i vraća se
        head.position.z = 0.085 + (live ? Math.sin(time * 0.6) * 0.008 : 0);
        head.rotation.y = live ? Math.sin(time * 0.4) * 0.3 : 0;
    });
    return p;
}

function hedgehog(): Pet {
    const p = pet();
    const body = new THREE.Group();
    p.root.add(body);
    const face = "#F2D9B8";
    const spines = "#8A5A3A";
    const trunk = blob(0.07, 0.055, 0.075, face);
    trunk.position.y = 0.055;
    body.add(trunk);
    // Bodlje: kratki čuperci na leđima (mekani, zaobljeni — dečji crtež)
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 70; i++) {
        const y = 1 - (i + 0.5) / 70;
        const phi = i * 2.399963;
        const r = Math.sqrt(1 - y * y);
        const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
        if (d.z > 0.35 || d.y < -0.25) continue;
        const base = new THREE.Vector3(d.x * 0.065, 0.055 + d.y * 0.05, d.z * 0.07);
        const tip = base.clone().addScaledVector(d.clone().add(new THREE.Vector3(0, 0.2, -0.5)).normalize(), 0.03);
        parts.push(taperedTube(polyPath([base, base.clone().lerp(tip, 0.5), tip]), (t) => 0.008 * (1 - t * 0.85), 6, 6));
    }
    for (const g of parts) g.deleteAttribute("uv");
    const merged = mergeGeos(parts);
    solidColor(merged, spines);
    body.add(new THREE.Mesh(merged, fur(spines)));
    const snout = blob(0.022, 0.018, 0.03, face);
    snout.position.set(0, 0.045, 0.075);
    body.add(snout);
    const nose = glossy(0.008, 0.007, 0.007, "#2A1E1A");
    nose.material = noseMaterial("#2A1E1A");
    nose.position.set(0, 0.048, 0.104);
    body.add(nose);
    for (const side of [1, -1]) eye(p, 0.008, new THREE.Vector3(side * 0.022, 0.065, 0.068), body);
    cheeks(body, 0.032, 0.045, 0.066, 0.007);
    p.anims.push(breathe(body, 2.5, 0.025));
    return p;
}

function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const index: number[] = [];
    let offset = 0;
    for (const g of list) {
        const pos = g.getAttribute("position");
        const nor = g.getAttribute("normal");
        for (let i = 0; i < pos.count; i++) {
            positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
            normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
        }
        const idx = g.getIndex();
        if (idx) for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + offset);
        offset += pos.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    out.setIndex(index);
    return out;
}

function pony(): Pet {
    const p = pet();
    const white = "#FFF6FA";
    const body = new THREE.Group();
    p.root.add(body);
    const trunk = blob(0.07, 0.065, 0.11, white, 36);
    trunk.position.y = 0.17;
    body.add(trunk);
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        body.add(tube([new THREE.Vector3(x * 0.04, 0.14, z * 0.06), new THREE.Vector3(x * 0.042, 0.07, z * 0.065), new THREE.Vector3(x * 0.04, 0.02, z * 0.065)], () => 0.02, white));
        const hoof = glossy(0.022, 0.012, 0.024, "#C9A2E0");
        hoof.position.set(x * 0.04, 0.012, z * 0.065);
        body.add(hoof);
    }
    const neck = tube([new THREE.Vector3(0, 0.19, 0.07), new THREE.Vector3(0, 0.25, 0.1), new THREE.Vector3(0, 0.3, 0.11)], (t) => 0.035 - t * 0.008, white);
    body.add(neck);
    const head = new THREE.Group();
    head.position.set(0, 0.32, 0.12);
    body.add(head);
    head.add(blob(0.052, 0.05, 0.055, white, 32));
    const snout = blob(0.036, 0.032, 0.04, "#FCE6EE");
    snout.position.set(0, -0.024, 0.045);
    head.add(snout);
    for (const side of [1, -1]) {
        eye(p, 0.012, new THREE.Vector3(side * 0.032, 0.008, 0.04), head);
        const e = ear(0.035, 0.014, white, "#F9C6D6");
        e.position.set(side * 0.025, 0.045, -0.005);
        e.rotation.set(-0.1, 0, -side * 0.25);
        head.add(e);
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), noseMaterial("#D08AA0"));
        nostril.position.set(side * 0.012, -0.018, 0.084);
        head.add(nostril);
    }
    cheeks(head, 0.04, -0.012, 0.036, 0.009);
    // Griva i rep u bojama duge
    const rainbow = ["#FF8FA8", "#FFB870", "#FFE36A", "#8EE0A0", "#7CC4FF", "#B79CFF"];
    rainbow.forEach((hex, i) => {
        const t = i / (rainbow.length - 1);
        const a = new THREE.Vector3(0, 0.37 - t * 0.1, 0.1 - t * 0.08);
        const b = a.clone().add(new THREE.Vector3(-0.035, -0.03, -0.02));
        body.add(tube([a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(-0.004, 0.006, 0)), b], (q) => 0.014 * (1 - q * 0.6), hex, undefined, 12, 10));
    });
    const tail = new THREE.Group();
    tail.position.set(0, 0.19, -0.1);
    body.add(tail);
    rainbow.slice(0, 4).forEach((hex, i) => {
        tail.add(tube([new THREE.Vector3((i - 1.5) * 0.008, 0, 0), new THREE.Vector3((i - 1.5) * 0.01, -0.03, -0.04), new THREE.Vector3((i - 1.5) * 0.012, -0.1, -0.05)], (q) => 0.011 * (1 - q * 0.5), hex, undefined, 12, 8));
    });
    p.anims.push(breathe(trunk, 1.8, 0.012));
    p.anims.push(sway(tail, "z", 1.4, 0.15));
    p.anims.push(sway(head, "x", 0.8, 0.05));
    return p;
}

// ── Postavljanje pored lika ───────────────────────────────────────────────────

/** Ljubimac na mestu za ljubimca, okrenut malo ka liku i ka detetu */
function place(make: () => Pet): ItemBuilder["build"] {
    return (ctx: ItemContext) => {
        const p = make();
        const a = ctx.body.anchors;
        const holder = new THREE.Group();
        holder.name = "ljubimac";
        holder.position.copy(a.petSpot);
        holder.scale.setScalar(a.petScale * 1.15);
        p.root.rotation.y = 0.35;
        holder.add(p.root);
        p.anims.push(blinker(p));
        return {
            object: holder,
            animate: (time, dt, live) => {
                for (const fn of p.anims) fn(time, dt, live);
            },
        };
    };
}

const PETS: Record<string, { make: () => Pet; motion?: ItemBuilder["motion"] }> = {
    pile: { make: () => bird({ body: "#FFD84A", belly: "#FFE98A", beak: "#F29A2E", feet: "#F29A2E", size: 1, beakKind: "short", crest: "#FFD84A" }), motion: "pet-hop" },
    patkica: { make: () => bird({ body: "#FFE14D", belly: "#FFF0A0", beak: "#FF9A3A", feet: "#FF9A3A", size: 1.1, beakKind: "duck" }), motion: "pet-lean" },
    ribica: { make: fishBowl },
    zabica: { make: frog, motion: "pet-hop" },
    pticica: { make: () => bird({ body: "#6EC3F2", belly: "#E6F6FF", beak: "#F2B53A", feet: "#F29A2E", size: 0.95, beakKind: "short", tail: "#4AA3D9" }), motion: "pet-hop" },
    kornjaca: { make: turtle },
    jezic: { make: hedgehog, motion: "pet-lean" },
    zecic: { make: () => sitter({ fur: "#F4F0F6", light: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", ear: "tall", tail: "pom", whiskers: true }), motion: "pet-hop" },
    mace: { make: () => sitter({ fur: "#F2A65A", light: "#FFF1DD", inner: "#F7A9B6", nose: "#F08AA0", ear: "pointy", tail: "long", whiskers: true }), motion: "pet-lean" },
    kuce: { make: () => sitter({ fur: "#EDCB9C", light: "#FFF6E8", inner: "#F3C9A6", nose: "#3A2A2A", ear: "floppy", tail: "wag", earHex: "#B57B50" }), motion: "pet-lean" },
    pingvin: { make: () => bird({ body: "#2E3440", belly: "#FFFFFF", beak: "#F29A2E", feet: "#F29A2E", size: 1.25, beakKind: "short", penguin: true }), motion: "pet-lean" },
    papagaj: { make: () => bird({ body: "#3CC46A", belly: "#FFE14D", beak: "#F2A23A", feet: "#7A7A86", size: 1.3, beakKind: "hook", crest: "#E8503A", wing: "#2F8FD9", tail: "#E8503A" }), motion: "pet-lean" },
    poni: { make: pony, motion: "pet-lean" },
};

registerItems("pet", Object.entries(PETS).map(([id, { make, motion }]) => ({
    id,
    build: place(make),
    motion,
    thumb: { focus: "pet", alone: true },
})));

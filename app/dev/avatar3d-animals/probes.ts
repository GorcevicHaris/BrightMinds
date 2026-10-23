// Probna odeća (samo za proveru kroja na životinjama dok katalog #3 nije gotov): duks sa
// kapuljačom oborenom na leđa, pantalone, patike i kapa. Pravi se istim alatom (Kit) kao
// prava odeća, pa pokazuje da li telo i sidra pristaju.

import * as THREE from "three";
import type { FigureBody } from "@/app/components/avatar3d/contract";
import { footFn } from "@/app/components/avatar3d/engine/body";
import { Kit } from "@/app/components/avatar3d/engine/kit";
import { fabricMaterial, glossyMaterial } from "@/app/components/avatar3d/engine/materials";
import { buildSurface } from "@/app/components/avatar3d/engine/surface";

export type Probe = "hoodie" | "pants" | "sneakers" | "beanie";

export function dressProbe(body: FigureBody, probe: Probe): THREE.Object3D[] {
    const kit = new Kit({ rig: body.rig, root: body.root });
    const shape = body.shape;
    const a = body.anchors;
    switch (probe) {
        case "hoodie": {
            const mat = fabricMaterial("#5BA8E6", "fleece");
            const rib = fabricMaterial("#4A90CC", "rib");
            const top = (ang: number) => shape.neckBaseY - 0.006 - 0.012 * Math.max(0, Math.cos(ang));
            kit.torso(shape.crotchY + 0.03, top, 0.012, mat);
            kit.torsoRing(shape.crotchY + 0.035, 0.013, 0.008, 0.012, rib);
            kit.torsoRing(top, 0.012, 0.009, 0.01, rib);
            for (const side of [1, -1] as const) {
                kit.sleeve(side, 0, 0.9, 0.011, mat);
                kit.armRing(side, 0.9, 0.012, 0.008, 0.011, rib);
            }
            // Oborena kapuljača na leđima
            const hood = kit.torsoPatch(Math.PI * 0.7, Math.PI * 1.3, shape.shoulderY - 0.08, shape.neckBaseY - 0.005, 0.02, mat, { puff: 0.012, soft: 0.25 });
            hood.name = "kapuljaca";
            return kit.objects;
        }
        case "pants": {
            const mat = fabricMaterial("#3E4A6A", "denim");
            kit.torso(shape.crotchY - 0.02, shape.waistY + 0.012, 0.016, mat);
            kit.torsoRing(shape.waistY + 0.012, 0.017, 0.007, 0.012, fabricMaterial("#2E3852", "rib"));
            for (const side of [1, -1] as const) kit.leg(side, 0, 0.93, 0.016, mat);
            return kit.objects;
        }
        case "sneakers": {
            const upper = fabricMaterial("#F25C54", "mesh");
            const sole = glossyMaterial("#FFFFFF", 0.5, 0.2);
            for (const side of [1, -1] as const) {
                const shoe = new THREE.Mesh(buildSurface(footFn(shape, 0.011, 0.012), { nu: 40, nv: 24, closedU: true }), upper);
                const s = new THREE.Mesh(buildSurface(footFn(shape, 0.014, -0.03), { nu: 40, nv: 12, closedU: true }), sole);
                s.scale.set(1, 0.35, 1);
                s.position.y = -shape.ankleY * 0.65;
                kit.rigid(side === 1 ? "footL" : "footR", shoe);
                kit.rigid(side === 1 ? "footL" : "footR", s);
            }
            for (const f of body.parts.feet ?? []) f.visible = false;
            return kit.objects;
        }
        case "beanie": {
            const mat = fabricMaterial("#F2B53A", "knit");
            const head = body.head;
            const brimY = a.head.brimY - body.shape.headBoneY;
            // v na kojem je obim kape (gde površina glave prelazi visinu čela)
            const vAt = (u: number) => {
                let lo = 0;
                let hi = 0.6;
                for (let k = 0; k < 22; k++) {
                    const mid = (lo + hi) / 2;
                    if (head.point(u, mid).y > brimY) lo = mid;
                    else hi = mid;
                }
                return (lo + hi) / 2;
            };
            const n = new THREE.Vector3();
            const cap = buildSurface((u, v, out) => {
                const vv = vAt(u) * v;
                head.point(u, vv, out);
                head.normal(u, vv, n);
                return out.addScaledVector(n, 0.016 + 0.01 * (1 - v));
            }, { nu: 64, nv: 24, closedU: true, inside: () => head.center.clone() });
            const mesh = new THREE.Mesh(cap, mat);
            const pom = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), fabricMaterial("#FFFFFF", "fleece"));
            const top = head.point(0.5, 0).addScaledVector(head.normal(0.5, 0.001), 0.05);
            pom.position.copy(top);
            const group = new THREE.Group();
            group.add(mesh, pom);
            kit.rigid("head", group);
            return kit.objects;
        }
    }
}

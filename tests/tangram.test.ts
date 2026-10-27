// Igra „Tangram” (app/components/games/data/tangramLevels.ts): geometrija delova i oblika,
// nivoi, plan, okretanje, rečenice, bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    boxOf,
    buildTangramLevel,
    doneSentence,
    emptyTangramView,
    figureIntro,
    figureTitle,
    FIGURES,
    fittingTargets,
    fitsTurn,
    getFigure,
    hintFor,
    mergeTangramMonitor,
    orientationOf,
    OTHER_SHAPE,
    OTHER_WAY,
    partSentence,
    PIECE_IDS,
    PIECE_LABEL,
    PIECES,
    rotatePoints,
    solveTangramView,
    tangramLevel,
    tangramResult,
    TANGRAM_LEVELS,
    TANGRAM_MAX_LEVEL,
    tangramRoundView,
    tryPlace,
    TURN_IT,
    type Figure,
    type Pt,
    type TangramView,
} from "@/app/components/games/data/tangramLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore|levo|desno/i;
const AREA = { lg: 2, md: 1, sm: 0.5, sq: 1, pa: 1 } as const;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

// ── Geometrija za proveru (mnogouglovi su konveksni) ─────────────────────────

function area(points: readonly Pt[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
}

const cross = (a: Pt, b: Pt, p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** Površina preseka dva konveksna mnogougla (Sutherland–Hodgman) */
function overlap(subject: readonly Pt[], clipper: readonly Pt[]): number {
    let out: Pt[] = [...subject];
    let signed = 0;
    for (let i = 0; i < clipper.length; i += 1) signed += cross([0, 0], clipper[i], clipper[(i + 1) % clipper.length]);
    const ccw = signed > 0;
    for (let i = 0; i < clipper.length && out.length > 0; i += 1) {
        const a = clipper[i];
        const b = clipper[(i + 1) % clipper.length];
        const inside = (p: Pt) => (ccw ? cross(a, b, p) >= -1e-9 : cross(a, b, p) <= 1e-9);
        const input = out;
        out = [];
        for (let j = 0; j < input.length; j += 1) {
            const p = input[j];
            const q = input[(j + 1) % input.length];
            if (inside(p)) out.push(p);
            if (inside(p) !== inside(q)) {
                const t = cross(a, b, p) / (cross(a, b, p) - cross(a, b, q));
                out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
            }
        }
    }
    return out.length >= 3 ? area(out) : 0;
}

/** Da li dva dela dele ivicu (duž, ne samo tačku) */
function shareEdge(a: readonly Pt[], b: readonly Pt[]): boolean {
    for (let i = 0; i < a.length; i += 1) {
        const p = a[i];
        const q = a[(i + 1) % a.length];
        for (let j = 0; j < b.length; j += 1) {
            const r = b[j];
            const s = b[(j + 1) % b.length];
            if (Math.abs(cross(p, q, r)) > 1e-6 || Math.abs(cross(p, q, s)) > 1e-6) continue;
            const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
            const along = (z: Pt) => ((z[0] - p[0]) * (q[0] - p[0]) + (z[1] - p[1]) * (q[1] - p[1])) / length;
            const lo = Math.max(0, Math.min(along(r), along(s)));
            const hi = Math.min(length, Math.max(along(r), along(s)));
            if (hi - lo > 0.05) return true;
        }
    }
    return false;
}

function touches(a: readonly Pt[], b: readonly Pt[]): boolean {
    return a.some((p) => b.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6));
}

function connected(figure: Figure, loose: boolean): boolean {
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length > 0) {
        const i = stack.pop()!;
        figure.targets.forEach((target, j) => {
            if (seen.has(j)) return;
            const a = figure.targets[i].pts;
            if (shareEdge(a, target.pts) || (loose && touches(a, target.pts))) {
                seen.add(j);
                stack.push(j);
            }
        });
    }
    return seen.size === figure.targets.length;
}

function plans(level: number) {
    const result: { where: string; plan: ReturnType<typeof buildTangramLevel> }[] = [];
    for (const preset of Object.values(BAND_PRESETS)) {
        for (let seed = 1; seed <= 8; seed += 1) {
            result.push({ where: `L${level} ${preset.label} s${seed}`, plan: buildTangramLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 37 + level) }) });
        }
    }
    return result;
}

// ── Delovi ────────────────────────────────────────────────────────────────────

describe("tangram pieces", () => {
    it("is the classic seven-piece set: together the pieces cover a square of area 8", () => {
        assert.equal(PIECE_IDS.length, 7);
        const total = PIECE_IDS.reduce((sum, id) => sum + AREA[PIECES[id].kind], 0);
        assert.equal(total, 8);
        for (const id of PIECE_IDS) assert.ok(PIECE_LABEL[id], id);
        // Svaki deo ima svoju boju
        assert.equal(new Set(PIECE_IDS.map((id) => PIECES[id].color)).size, 7);
    });

    it("knows when a turned piece looks the same (square every 90°, parallelogram every 180°)", () => {
        assert.ok(fitsTurn("sq", 2, 0));
        assert.ok(!fitsTurn("sq", 1, 0));
        assert.ok(fitsTurn("pa", 4, 0));
        assert.ok(!fitsTurn("pa", 2, 0));
        assert.ok(fitsTurn("lg", 8, 0));
        assert.ok(!fitsTurn("lg", 4, 0));
        // Okret od 8 × 45° je pun krug
        const turned = rotatePoints([[1, 0]], 8)[0];
        assert.ok(Math.abs(turned[0] - 1) < 1e-9 && Math.abs(turned[1]) < 1e-9);
    });

    it("never needs a mirrored parallelogram", () => {
        // Ogledalo paralelograma se ne dobija okretanjem
        assert.equal(orientationOf("pa", [[0, 1], [1, 1], [2, 0], [1, 0]]), -1);
        assert.notEqual(orientationOf("pa", [[0, 0], [1, 0], [2, 1], [1, 1]]), -1);
    });
});

// ── Oblici ────────────────────────────────────────────────────────────────────

describe("tangram figures", () => {
    it("has unique figures, each with a name, a sentence and real pieces", () => {
        assert.equal(new Set(FIGURES.map((figure) => figure.id)).size, FIGURES.length);
        for (const figure of FIGURES) {
            assert.ok(figure.name && figure.acc && figure.done, figure.id);
            assert.ok(figure.targets.length >= 2 && figure.targets.length <= 7, figure.id);
            const pieces = figure.targets.map((target) => target.piece);
            assert.equal(new Set(pieces).size, pieces.length, `${figure.id}: svaki deo samo jednom`);
        }
    });

    it("is drawn from exact pieces: right size, a reachable turn, no overlaps, all joined", () => {
        for (const figure of FIGURES) {
            for (const target of figure.targets) {
                const where = `${figure.id} #${target.index} ${target.piece}`;
                assert.ok(Math.abs(area(target.pts) - AREA[target.kind]) < 1e-6, `${where}: površina`);
                assert.ok(target.rot >= 0 && target.rot < 8, `${where}: okret (ogledalo?)`);
            }
            for (let i = 0; i < figure.targets.length; i += 1) {
                for (let j = i + 1; j < figure.targets.length; j += 1) {
                    assert.ok(overlap(figure.targets[i].pts, figure.targets[j].pts) < 1e-4, `${figure.id}: #${i} i #${j} se preklapaju`);
                }
            }
            // Delovi se dodiruju ivicom; samo rep ribe ili mačke sme da se dodiruje u tački
            assert.ok(connected(figure, Boolean(figure.touch)), `${figure.id}: delovi nisu spojeni`);
            if (figure.touch) assert.ok(!connected(figure, false), `${figure.id}: „touch” nije potreban`);
            // Mesto je unutar crteža
            const box = boxOf(figure.targets.flatMap((target) => target.pts));
            assert.ok(figure.view.x <= box.x && figure.view.y <= box.y && figure.view.x + figure.view.w >= box.x + box.w && figure.view.y + figure.view.h >= box.y + box.h, figure.id);
        }
    });

    it("covers the classic square with all seven pieces", () => {
        const square = getFigure("square-7")!;
        const box = boxOf(square.targets.flatMap((target) => target.pts));
        assert.ok(Math.abs(box.w - 2 * Math.SQRT2) < 1e-9 && Math.abs(box.h - 2 * Math.SQRT2) < 1e-9);
        assert.equal(square.targets.length, 7);
    });
});

// ── Nivoi i plan ──────────────────────────────────────────────────────────────

describe("tangram levels", () => {
    it("has fifteen levels in three tiers with a ramp", () => {
        assert.equal(TANGRAM_MAX_LEVEL, 15);
        assert.equal(TANGRAM_LEVELS.length, MAX_LEVEL);
        const pieces = (level: number) => Math.max(...tangramLevel(level).pool.map((id) => getFigure(id)!.targets.length));
        // Lako: bez okretanja i sa obrisima u boji; Teško: svih sedam delova
        for (const level of [1, 2, 3, 4, 5]) {
            assert.equal(tangramLevel(level).rotated, 0, `L${level}`);
            assert.equal(tangramLevel(level).support, "tint", `L${level}`);
            assert.ok(tangramLevel(level).earlyHint, `L${level}`);
        }
        for (const level of [11, 12, 13, 14, 15]) assert.equal(pieces(level), 7, `L${level}`);
        for (let level = 2; level <= 15; level += 1) assert.ok(pieces(level) >= pieces(level - 1), `L${level}: delova nije manje`);
        assert.equal(pieces(1), 2);
        assert.ok(tangramLevel(6).introRotate);
        assert.equal(tangramLevel(15).rotated, "all");
        assert.equal(tangramLevel(14).support, "outline");
        assert.equal(tangramLevel(15).support, "outline");
        for (const level of LEVELS) for (const id of tangramLevel(level).pool) assert.ok(getFigure(id), `L${level}: ${id}`);
    });

    it("builds a valid plan for every level, age band and many seeds", () => {
        for (const level of LEVELS) {
            const rule = tangramLevel(level);
            for (const { where, plan } of plans(level)) {
                assert.ok(plan.rounds.length >= 2, where);
                assert.equal(new Set(plan.rounds.map((round) => round.figure)).size, plan.rounds.length, `${where}: oblik se ponavlja`);
                assert.equal(plan.earlyHint, rule.earlyHint, where);
                for (const round of plan.rounds) {
                    const figure = getFigure(round.figure)!;
                    const pieces = figure.targets.map((target) => target.piece).sort();
                    // U korpi su tačno delovi oblika, svaki jednom
                    assert.deepEqual([...round.tray].sort(), pieces, `${where}: ${round.figure}`);
                    let turned = 0;
                    for (const piece of round.tray) {
                        const rot = round.rot[piece];
                        assert.ok(Number.isInteger(rot) && rot >= 0 && rot < 8, `${where}: okret ${piece}`);
                        const kind = PIECES[piece].kind;
                        const fits = figure.targets.some((target) => target.kind === kind && fitsTurn(kind, rot, target.rot));
                        if (!fits) {
                            turned += 1;
                            // Deo se može okrenuti u pravi položaj u najviše `maxTurns` okreta
                            const reachable = Array.from({ length: rule.maxTurns }, (_, i) => i + 1).some((k) => figure.targets.some((target) => target.kind === kind && fitsTurn(kind, rot + k, target.rot)));
                            assert.ok(reachable, `${where}: ${piece} predaleko okrenut`);
                        }
                    }
                    const wanted = rule.rotated === "all" ? figure.targets.length : rule.rotated;
                    assert.ok(turned <= wanted, `${where}: previše okrenutih`);
                    assert.equal(round.rotate, turned > 0, `${where}: dugme „Okreni”`);
                    if (rule.rotated !== 0) assert.ok(turned >= 1, `${where}: bar jedan okrenut`);
                    assert.equal(round.support, rule.support, where);
                    // Rešivo: svaki deo, okrenut kako treba, ima svoje mesto (svako mesto jednom)
                    const view = { ...emptyTangramView(plan.rounds.length), ...tangramRoundView(round) } as TangramView;
                    const solvedRot = Object.fromEntries(round.tray.map((piece) => [piece, figure.targets.find((target) => target.piece === piece)!.rot]));
                    let state: TangramView = { ...view, rot: solvedRot };
                    for (const piece of round.tray) {
                        const fit = fittingTargets(state, piece)[0];
                        assert.ok(fit, `${where}: ${piece} nema mesto`);
                        assert.equal(tryPlace(state, piece, fit.index), "ok");
                        state = { ...state, placed: [...state.placed, piece], at: { ...state.at, [piece]: fit.index } };
                    }
                }
                if (level === 1) assert.equal(plan.rounds[0].figure, rule.pool[0], `${where}: prvi je kvadrat`);
            }
        }
    });

    it("introduces turning with one pre-selected piece and the turn button", () => {
        for (const { where, plan } of plans(6)) {
            const first = plan.rounds[0];
            assert.ok(first.intro && first.rotate, where);
            const view = tangramRoundView(first);
            assert.ok(view.selected && view.introPiece === view.selected, where);
            assert.ok(["lg", "md", "sm"].includes(PIECES[view.selected as keyof typeof PIECES].kind), `${where}: okreće se trougao`);
            assert.ok(plan.rounds.slice(1).every((round) => !round.intro), where);
        }
    });

    it("gives different tasks for different seeds, and the same for the same seed", () => {
        const a = buildTangramLevel(9, { maxRounds: 8, maxChoices: 6, random: seeded(1) });
        const b = buildTangramLevel(9, { maxRounds: 8, maxChoices: 6, random: seeded(1) });
        assert.deepEqual(a, b);
        const differs = LEVELS.some((level) => JSON.stringify(buildTangramLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(1) })) !== JSON.stringify(buildTangramLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(2) })));
        assert.ok(differs);
    });
});

// ── Pravila slaganja ──────────────────────────────────────────────────────────

describe("tangram placing", () => {
    const houseView = (rot: Record<string, number>): TangramView => ({ ...emptyTangramView(3), figure: "house-2", tray: ["md", "sq"], rot });

    it("places a piece only on a free spot of the same shape and turn", () => {
        const view = houseView({ md: 0, sq: 0 });
        const roof = getFigure("house-2")!.targets.find((target) => target.piece === "md")!;
        const wall = getFigure("house-2")!.targets.find((target) => target.piece === "sq")!;
        assert.equal(tryPlace({ ...view, rot: { md: roof.rot, sq: 0 } }, "md", roof.index), "ok");
        assert.equal(tryPlace({ ...view, rot: { md: roof.rot + 1, sq: 0 } }, "md", roof.index), "turn");
        assert.equal(tryPlace(view, "sq", roof.index), "shape");
        assert.equal(tryPlace({ ...view, at: { md: roof.index } }, "sq", roof.index), "taken");
        // Kvadrat okrenut za 90° izgleda isto
        assert.equal(tryPlace({ ...view, rot: { md: 0, sq: 2 } }, "sq", wall.index), "ok");
    });

    it("lets either big triangle go to either big triangle spot when the turn fits", () => {
        const figure = getFigure("square-7")!;
        const spots = figure.targets.filter((target) => target.kind === "lg");
        const view: TangramView = { ...emptyTangramView(2), figure: "square-7", tray: ["lgA", "lgB"], rot: { lgA: spots[1].rot, lgB: spots[0].rot } };
        assert.equal(tryPlace(view, "lgA", spots[1].index), "ok");
        assert.equal(tryPlace(view, "lgB", spots[0].index), "ok");
    });

    it("hints the selected piece's spot, and asks to turn it when it does not fit yet", () => {
        const roof = getFigure("house-2")!.targets.find((target) => target.piece === "md")!;
        const turned: TangramView = { ...houseView({ md: roof.rot + 1, sq: 0 }), selected: "md" };
        assert.deepEqual(hintFor(turned), { piece: "md", target: roof.index, turn: true });
        const straight: TangramView = { ...houseView({ md: roof.rot, sq: 0 }), selected: null };
        assert.deepEqual(hintFor(straight), { piece: "md", target: roof.index, turn: false });
    });
});

// ── Rečenice ──────────────────────────────────────────────────────────────────

describe("tangram sentences", () => {
    it("says what to build (with correct numbers), never where to tap", () => {
        assert.equal(figureIntro({ figure: "house-2", support: "tint", rotate: false, intro: false }), "Složi kućicu od dva dela.");
        assert.equal(figureIntro({ figure: "rocket-5", support: "lines", rotate: true, intro: false }), "Složi raketu od pet delova. Neke delove treba okrenuti.");
        assert.equal(figureIntro({ figure: "dog-4", support: "lines", rotate: true, intro: true }), "Složi psa od četiri dela. Jedan deo treba okrenuti.");
        assert.equal(figureIntro({ figure: "rabbit-7", support: "outline", rotate: true, intro: false }), "Pogledaj senku. Složi zeku od sedam delova. Neke delove treba okrenuti.");
        assert.equal(partSentence("house-2", 0), "Ovaj trougao je krov.");
        assert.equal(doneSentence("fish-4"), "Riba pliva.");
        assert.equal(TURN_IT, "Skoro! Okreni ga.");
        const lines = [TURN_IT, OTHER_SHAPE, OTHER_WAY];
        for (const figure of FIGURES) {
            lines.push(figureTitle(figure.id), figure.done);
            for (const support of ["tint", "outline"] as const) for (const rotate of [false, true]) lines.push(figureIntro({ figure: figure.id, support, rotate, intro: false }));
            for (const target of figure.targets) {
                const part = partSentence(figure.id, target.index);
                if (part) lines.push(part);
            }
        }
        for (const text of lines) {
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
            assert.doesNotMatch(text, /undefined|null|\s{2}/, text);
            assert.match(text, /[.!]$/, text);
        }
    });
});

// ── Bodovanje i monitor ───────────────────────────────────────────────────────

describe("tangram scoring", () => {
    const view = (extra: Partial<TangramView> = {}): TangramView => ({ ...emptyTangramView(4), figure: "house-2", tray: ["md", "sq"], ...extra });

    it("does not score the demonstrated first figure of level 1", () => {
        const { next, modeled } = solveTangramView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean figure as correct, a helped one as prompted, one with mistakes as neither", () => {
        assert.equal(solveTangramView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveTangramView(view({ round: 2, helped: true }), 3).next.promptedCount, 1);
        assert.equal(solveTangramView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveTangramView(view({ round: 2, wrong: ["sq>0"] }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo figure", () => {
        const result = tangramResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeTangramMonitor({
            figure: "house-2",
            tray: ["md", "sq", "lgA", "x"],
            rot: { md: 9, sq: 2 },
            placed: ["sq", "md", "pa"],
            at: { sq: 0, md: 0 },
            selected: "sq",
            support: "rainbow",
            round: 99,
            totalRounds: 3,
        } as unknown as Partial<TangramView>);
        assert.deepEqual(merged.tray, ["md", "sq"]);
        assert.deepEqual(merged.rot, { md: 0, sq: 2 });
        // Kvadrat ne ide na mesto krova (drugi oblik), a krov ne ide na zauzeto mesto
        const roof = getFigure("house-2")!.targets.find((target) => target.piece === "md")!.index;
        assert.deepEqual(merged.placed, roof === 0 ? ["md"] : []);
        assert.equal(merged.selected, roof === 0 ? "sq" : "sq");
        assert.equal(merged.support, "tint");
        assert.equal(merged.round, 3);
        assert.equal(mergeTangramMonitor({ figure: "volcano" } as Partial<TangramView>).figure, "");
        assert.deepEqual(mergeTangramMonitor(null).tray, []);
    });
});

// ── Registar ──────────────────────────────────────────────────────────────────

describe("tangram game registry entry", () => {
    const game = getGame("tangram");

    it("is activity 35, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 35);
        assert.equal(game.gameType, "tangram");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(35, 'Tangram', '[^']+', 'motor'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("tangram"));
        assert.ok(isRemoteGame("tangram"));
    });

    it("never uses Math.random in the game component (tasks come from useGameRandom)", () => {
        const source = readFileSync(path.join(process.cwd(), "app/components/games/TangramGame.tsx"), "utf8");
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /data-action="rotate"/);
        assert.match(source, /data-piece=\{id\}/);
        assert.match(source, /data-slot=\{`t\$\{target\.index\}`\}/);
    });
});

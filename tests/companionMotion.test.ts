import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, isValidElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChildSettingsProvider } from "@/app/components/ChildSettingsProvider";
import Companion, { COMPANIONS, type CompanionKind } from "@/app/components/avatar/Companion";
import { ACTION_MS, COMPANION_ACTIONS, liveClass, sayMove } from "@/app/components/avatar/motion";
import { renderWorn, WEAR_ITEMS } from "@/app/components/avatar/wearables";
import { FALLBACK_SETTINGS } from "@/lib/childSettings";

type Variant = "face" | "bust" | "full" | "portrait";

const render = (kind: CompanionKind, variant: Variant, reduceMotion = false, wear = {}) =>
    renderToStaticMarkup(
        createElement(
            ChildSettingsProvider,
            // Deca se prosleđuju kao treći argument (pravilo react/no-children-prop)
            { settings: { ...FALLBACK_SETTINGS, reduceMotion } } as ComponentProps<typeof ChildSettingsProvider>,
            createElement(Companion, { kind, variant, wear, emotion: "neutral" })
        )
    );

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("pokreti drugara", () => {
    it("ceo lik i portret se mirno kreću, poprsje i lice ne", () => {
        for (const { kind } of COMPANIONS) {
            for (const variant of ["full", "portrait"] as const) {
                const svg = render(kind, variant);
                assert.match(svg, /<svg[^>]*class="[^"]*\bcm-live\b/, `${kind}:${variant}`);
                for (const group of ["cm-act", "cm-talk", "cm-breathe", "cm-nod", "cm-arm-l", "cm-arm-r", "cm-shadow"]) {
                    assert.ok(svg.includes(`class="${group}"`), `${kind}:${variant}: ${group}`);
                }
            }
            for (const variant of ["bust", "face"] as const) assert.doesNotMatch(render(kind, variant), /\bcm-live\b/, `${kind}:${variant}`);
        }
    });

    it("„Manje animacija” gasi sve stalne pokrete (lik miruje)", () => {
        for (const { kind } of COMPANIONS) {
            for (const variant of ["full", "portrait"] as const) {
                const svg = render(kind, variant, true, { hand: "tri-balona", pet: "kuce", background: "svemir" });
                assert.doesNotMatch(svg, /\bcm-live\b/, `${kind}:${variant}`);
                assert.doesNotMatch(svg, /data-say=/, `${kind}:${variant}`);
            }
        }
        assert.equal(liveClass(true, true), undefined);
        assert.equal(liveClass(false, false), undefined);
        assert.equal(liveClass(true, false), "cm-live");
    });

    it("mačka i pas mašu repom, uši mačke i zeke mrdnu; meda nema rep koji se njiše", () => {
        for (const kind of ["cat", "dog"] as const) assert.ok(render(kind, "full").includes("cm-tail"), kind);
        for (const kind of ["cat", "bunny"] as const) assert.ok(render(kind, "full").includes("cm-ear-l"), kind);
        assert.ok(!render("bear", "full").includes("cm-tail"));
        assert.ok(!render("bear", "full").includes("cm-ear-l"));
        assert.ok(render("woman", "full").includes("cm-hair"));
    });

    it("predmeti na celom liku: grupa za iskakanje i stalni pokret (balon, plašt, krila, ljubimac)", () => {
        const cases: [Parameters<typeof renderWorn>[0], Parameters<typeof renderWorn>[1], string][] = [
            [{ hand: "tri-balona" }, "hand", "cm-float"],
            [{ back: "plast" }, "back", "cm-cape"],
            [{ back: "krila-vile" }, "back", "cm-wings"],
            [{ pet: "kuce" }, "pet", "cm-pet-hop"],
            [{ pet: "poni" }, "pet", "cm-pet-lean"],
        ];
        for (const [wear, slot, motion] of cases) {
            const full = renderToStaticMarkup(createElement("svg", null, renderWorn(wear, slot, { variant: "full", kind: "cat" })));
            assert.ok(full.includes(`data-pop="${slot}"`), slot);
            assert.ok(full.includes(`class="${motion}"`), motion);
        }
        // Na poprsju nema ni iskakanja ni pokreta (isto kao ranije)
        const bust = renderToStaticMarkup(createElement("svg", null, renderWorn({ hat: "kruna" }, "hat")));
        assert.ok(!bust.includes("data-pop") && !bust.includes("cm-"));
        // Ranac nema pokret (ide zajedno sa drugarom)
        assert.ok(!renderToStaticMarkup(createElement("svg", null, renderWorn({ back: "ranac" }, "back", { variant: "full" }))).includes("cm-"));
    });

    it("svaki pokret ima pravilo u globals.css, a sistemsko „smanji pokrete” ih gasi", () => {
        for (const action of COMPANION_ACTIONS) {
            assert.ok(CSS.includes(`[data-act="${action}"]`), action);
            assert.ok(ACTION_MS[action] > 0 && ACTION_MS[action] <= 2000, `${action}: kratko`);
        }
        for (const move of ["wave", "bounce", "cheer", "nod"]) assert.ok(CSS.includes(`[data-say="${move}"]`), move);
        const motions = new Set(WEAR_ITEMS.map((item) => item.motion).filter(Boolean));
        for (const motion of [...motions, "pet-hop"]) assert.ok(CSS.includes(`.cm-live .cm-${motion} {`), String(motion));
        assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\.cm-live,\s*\.cm-live \* \{\s*animation: none !important;/);
    });

    it("petlje su spore (najmanje 3 s), bez treperenja", () => {
        const loops = [...CSS.matchAll(/\.cm-live \.cm-[a-z-]+ \{ animation: cm-[a-z0-9-]+ ([\d.]+)s [^;]*infinite/g)].map((match) => Number(match[1]));
        assert.ok(loops.length >= 15, `${loops.length} petlji`);
        for (const seconds of loops) assert.ok(seconds >= 3, `${seconds} s`);
    });

    it("pokret uz govor: pozdrav maše, veselo poskoči, ponosno raširi ruke, nežno klimne", () => {
        assert.equal(sayMove("hello"), "wave");
        assert.equal(sayMove("happy"), "bounce");
        assert.equal(sayMove("proud"), "cheer");
        assert.equal(sayMove("gentle"), "nod");
        assert.equal(sayMove("sad"), undefined);
        assert.equal(sayMove("neutral"), undefined);
    });

    it("Companion prosleđuje jednokratni pokret liku (i učitelju i životinji)", () => {
        for (const { kind } of COMPANIONS) {
            const element = Companion({ kind, variant: "full", action: "cheer", actionKey: 3 }) as ReactElement<{ action?: string; actionKey?: number }>;
            assert.ok(isValidElement(element));
            assert.equal(element.props.action, "cheer", kind);
            assert.equal(element.props.actionKey, 3, kind);
        }
        // Bez pokreta: dosadašnji poziv i dalje radi
        const plain = Companion({ kind: "cat" }) as ReactElement<{ action?: string }>;
        assert.equal(plain.props.action, undefined);
    });
});

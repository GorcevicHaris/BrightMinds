// Drugar na ekranu deteta stiže uz samu stranicu: prvi prikaz je već kupljeni drugar, a ne
// podrazumevani (ranije se na sekund pokazao običan dečak/devojčica, pa tek onda pravi drugar).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompanionProvider, useCompanion } from "@/app/dashboard/child/[id]/companionState";
import { companionPayload } from "@/lib/companionPayload";

function Probe() {
    const companion = useCompanion();
    return createElement("p", null, `${companion?.kind}|${companion?.coins}|${companion?.loaded}|${companion?.wear.background ?? "-"}`);
}

const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(CompanionProvider, { childId: 33, gender: "male", ...props } as never, createElement(Probe)));

describe("drugar odmah uz stranicu", () => {
    it("prvi prikaz koristi drugara sa servera (vrsta, odeća, novčići), bez čekanja na zahtev", () => {
        const initial = companionPayload({ companion: { kind: "cat", owned: [], wear: {} } }, "male", 100);
        assert.equal(initial.companion.kind, "cat");
        const html = render({ initial });
        assert.match(html, /<p>cat\|\d+\|true\|/);
    });

    it("bez poslatog stanja ostaje stari put: podrazumevani drugar dok zahtev ne stigne", () => {
        const html = render({});
        assert.match(html, /\|0\|false\|/);
    });

    it("stranica deteta šalje drugara klijentu, a API koristi isti oblik odgovora", () => {
        const page = readFileSync(path.join(process.cwd(), "app/dashboard/child/[id]/page.tsx"), "utf8");
        assert.match(page, /companionPayload\(row\.settings/);
        assert.match(page, /companion=\{companion\}/);
        const route = readFileSync(path.join(process.cwd(), "app/api/children/[id]/companion/route.ts"), "utf8");
        assert.match(route, /companionBody\(state, row\.experience_points\)/);
    });
});

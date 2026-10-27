// Raspored po izmerenom polju za igru: „Šta dolazi sledeće?” (pattern/sizing.ts) i „Poređaj po
// veličini” (seriation/sizing.ts). Polja su izmerena u pregledaču (360 × 740, 390 × 844, 844 × 390,
// 1000 × 560, 768 × 1024): slike u nizu, na karticama i predmeti ne smeju biti sitni, a sve mora
// da stane u polje.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARRIER_IDS } from "@/app/components/games/data/patternLevels";
import { itemShare, layoutItems, layoutTransfer, rowHeightUnits, splitRow, type BoardBox } from "@/app/components/games/pattern/sizing";
import { layoutCells } from "@/app/components/games/seriation/sizing";

const PHONE: BoardBox = { w: 310, h: 423, short: false };
const PHONE_390: BoardBox = { w: 340, h: 527, short: false };
const LOW: BoardBox = { w: 770, h: 222, short: true };
const LAPTOP: BoardBox = { w: 870, h: 332, short: true };
const TABLET: BoardBox = { w: 678, h: 589, short: false };
const BOXES = [PHONE, PHONE_390, LOW, LAPTOP, TABLET];
const LABELS = ["Narandžasta", "Plava", "Žuta", "Ljubičasta"];

describe("Šta dolazi sledeće? — raspored", () => {
    it("dve trake čuvaju redosled i sve stvari", () => {
        for (const carrier of CARRIER_IDS) {
            for (const n of [5, 6, 7]) {
                const { lines } = splitRow(n, carrier, 2);
                assert.equal(lines.length, 2);
                assert.equal(lines[0][0], 0);
                assert.equal(lines[0][1], lines[1][0]);
                assert.equal(lines[1][1], n);
            }
        }
    });

    it("dug niz na uskom telefonu ide u dve trake, a stvari i slike ostaju krupne", () => {
        for (const box of [PHONE, PHONE_390]) {
            for (const carrier of CARRIER_IDS) {
                const fit = layoutItems(box, { n: 7, carrier, arcs: false, labels: LABELS });
                assert.equal(fit.row.lines.length, 2, `${carrier} ${box.w}`);
                assert.ok(fit.u * itemShare(carrier) >= 44, `${carrier} ${box.w}: stvar ${fit.u * itemShare(carrier)}`);
                assert.ok(fit.choices.pic >= 56, `${carrier} ${box.w}: slika ${fit.choices.pic}`);
            }
        }
    });

    it("na niskom položenom ekranu i laptopu stvari i slike nisu sitne", () => {
        for (const box of [LOW, LAPTOP]) {
            for (const carrier of CARRIER_IDS) {
                const fit = layoutItems(box, { n: 7, carrier, arcs: true, labels: LABELS });
                assert.ok(fit.u * itemShare(carrier) >= 44, `${carrier} ${box.w}: stvar ${fit.u * itemShare(carrier)}`);
                // Sa lukovima (pomoć) niz je malo viši, pa su slike malo manje
                assert.ok(fit.choices.pic >= 50, `${carrier} ${box.w}: slika ${fit.choices.pic}`);
            }
        }
    });

    it("i niz od pet stvari na uskom telefonu (voz sa lokomotivom) ide u dve trake", () => {
        const fit = layoutItems(PHONE, { n: 5, carrier: "train", arcs: true, labels: ["Mačka", "Pas", "Krava"] });
        assert.equal(fit.row.lines.length, 2);
        assert.ok(fit.u * itemShare("train") >= 44, `${fit.u * itemShare("train")}`);
    });

    it("na tabletu dug niz ostaje u jednoj traci", () => {
        for (const carrier of CARRIER_IDS) assert.equal(layoutItems(TABLET, { n: 7, carrier, arcs: false, labels: LABELS }).row.lines.length, 1, carrier);
    });

    it("niz i izbori staju u polje", () => {
        for (const box of BOXES) {
            for (const carrier of CARRIER_IDS) {
                for (const arcs of [false, true]) {
                    const fit = layoutItems(box, { n: 7, carrier, arcs, labels: LABELS });
                    const rowW = fit.row.units * fit.u + 12;
                    const rowH = rowHeightUnits(carrier, fit.row.lines.length, arcs) * fit.u;
                    const choicesW = fit.choices.cols * fit.choices.cardW + (fit.choices.cols - 1) * 12;
                    const choicesH = fit.choices.rows * fit.choices.cardH + (fit.choices.rows - 1) * 12;
                    const banner = box.short ? 28 + fit.gap : 0;
                    assert.ok(rowW <= box.w + 0.5 && choicesW <= box.w + 0.5, `${carrier} ${box.w}: širina`);
                    assert.ok(banner + rowH + fit.gap + choicesH <= box.h + 0.5, `${carrier} ${box.w}×${box.h}: visina`);
                }
            }
        }
    });

    it("prenošenje pravila: nizovi za izbor nisu sitni ni na niskom ekranu (ranije oko 22 px)", () => {
        for (const carrier of CARRIER_IDS) {
            const low = layoutTransfer(LOW, { n: 6, carrier, count: 3, length: 6 });
            assert.ok(low.tile >= 48, `${carrier}: ${low.tile}`);
            assert.ok(low.u * itemShare(carrier) >= 40, `${carrier}: uzor ${low.u * itemShare(carrier)}`);
            const laptop = layoutTransfer(LAPTOP, { n: 6, carrier, count: 3, length: 6 });
            assert.ok(laptop.tile >= 54, `${carrier}: ${laptop.tile}`);
            // Na uskom telefonu nizovi od šest slika zauzimaju celu širinu
            const phone = layoutTransfer(PHONE, { n: 6, carrier, count: 3, length: 6 });
            assert.ok(phone.tile >= 48, `${carrier}: ${phone.tile}`);
        }
    });
});

describe("Poređaj po veličini — raspored", () => {
    const SIX = { count: 6, insert: false, given: 0, gapShare: 0.4 };

    it("šest predmeta na uskom telefonu: dve police i krupni predmeti (ranije oko 46 px)", () => {
        for (const aspect of [0.8, 0.9, 1.05, 1.15, 1.25, 1.3]) {
            const fit = layoutCells({ w: 310, h: 395, short: false }, { ...SIX, aspect, same: true });
            assert.equal(fit.shelves.length, 2, `${aspect}`);
            assert.deepEqual(fit.shelves, [3, 3]);
            // Visoki predmeti (baloni, brojevi) su ograničeni visinom polja: bar 54 × 70 px
            assert.ok(fit.cell >= (aspect >= 1.25 ? 54 : 60), `${aspect}: ${fit.cell}`);
            assert.equal(fit.tray, fit.cell);
        }
    });

    it("na niskom položenom ekranu predmeti su krupniji nego ranije (oko 52 px)", () => {
        for (const aspect of [0.8, 1.15, 1.3]) {
            const fit = layoutCells(LOW, { ...SIX, aspect, same: true });
            assert.ok(fit.cell >= 72, `${aspect}: ${fit.cell}`);
        }
    });

    it("kad se ne poredi veličina, korpa sme biti krupnija od mesta", () => {
        const fit = layoutCells({ w: 678, h: 589, short: false }, { ...SIX, aspect: 1.25, same: false });
        assert.ok(fit.tray >= fit.cell);
    });

    it("red i korpa staju u polje", () => {
        for (const box of [{ w: 310, h: 395, short: false }, { w: 340, h: 499, short: false }, LOW, LAPTOP, TABLET]) {
            for (const aspect of [0.8, 1.3]) {
                for (const same of [true, false]) {
                    const fit = layoutCells(box, { ...SIX, aspect, same });
                    const widest = Math.max(...fit.shelves);
                    const rowW = widest * fit.cell + (widest - 1) * fit.gap + 12;
                    const rowH = fit.shelves.length * (fit.cell * aspect + 40) + (box.short ? 24 : 0);
                    const rows = Math.ceil(6 / fit.trayCols);
                    const trayW = fit.trayCols * fit.tray + (fit.trayCols - 1) * fit.gap + 16;
                    const trayH = rows * fit.tray * aspect + (rows - 1) * fit.gap + 16;
                    if (fit.side) {
                        assert.ok(rowW + 8 + trayW <= box.w + 0.5 && Math.max(rowH, trayH) <= box.h + 0.5, `${box.w}×${box.h} ${aspect}`);
                    } else {
                        assert.ok(Math.max(rowW, trayW) <= box.w + 0.5 && rowH + 8 + trayH <= box.h + 0.5, `${box.w}×${box.h} ${aspect}`);
                    }
                }
            }
        }
    });
});

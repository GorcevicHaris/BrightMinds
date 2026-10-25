// Zajednički komplet slika predmeta i životinja za igre koje su ranije imale emodži („Razvrstaj”,
// „Brojimo”, „Slova”, „Čemu služi?”, „Gde je?”). Emodži izgleda drugačije na svakom uređaju (na
// nekim je siv ili ga nema), a crtež je svuda isti.
//
// Najpre se ponovo koriste crteži koji već postoje (hrana i životinje iz igre „Šta jede?”,
// predmeti iz „Šta fali?”, roba iz „Prodavnice”, stvari iz „Spakuj ranac”, odeća iz „Obuci se”,
// mame i bebe iz „Mama i beba”, predmeti sa slika situacija), a ostalo je nacrtano ovde u istom
// stilu. Svaka slika ima svoj okvir (`view`) u kome predmet ispunjava kvadrat.

import type { ReactNode } from "react";
import type { AnimalId, FoodId } from "@/app/components/games/data/foodItems";
import type { ThingId } from "@/app/components/games/data/missingItems";
import type { GoodId } from "@/app/components/games/data/marketLevels";
import type { ItemId } from "@/app/components/games/data/backpackLevels";
import type { ClothingId } from "@/app/components/games/data/weatherLevels";
import type { SpeciesId } from "@/app/components/games/data/familyLevels";
import type { PropId } from "@/app/components/games/scene/types";
import type { DrawId } from "@/app/components/games/sequence/art";
import { FOOD_ART } from "@/app/components/games/food/foods";
import { ANIMAL_ART } from "@/app/components/games/food/animals";
import { THING_ART } from "@/app/components/games/missing/things";
import { GOOD_ART } from "@/app/components/games/market/MarketArt";
import { ITEM_ART } from "@/app/components/games/backpack/items";
import { clothingIconArt } from "@/app/components/games/weather/WeatherArt";
import { babyArt, motherArt } from "@/app/components/games/families/animals";
import { Prop } from "@/app/components/games/scene/props";
import { Drawing } from "@/app/components/games/sequence/drawings";
import { BODY_ART } from "./body";
import { CREATURE_ART } from "./creatures";
import { OBJECT_ART } from "./objects";
import { PRODUCE_ART } from "./produce";
import { SIGN_ART } from "./signs";
import { VEHICLE_ART } from "./vehicles";

export interface Art {
    /** viewBox crteža */
    view: string;
    draw: () => ReactNode;
}

const SQUARE = "0 0 100 100";
const own = (draw: () => ReactNode): Art => ({ view: SQUARE, draw });
const food = (id: FoodId): Art => own(FOOD_ART[id]);
const animal = (id: AnimalId): Art => own(() => ANIMAL_ART[id].draw(false));
const thing = (id: ThingId): Art => own(() => THING_ART[id].map((layer, i) => <g key={i}>{layer.draw()}</g>));
const good = (id: GoodId): Art => own(GOOD_ART[id]);
const item = (id: ItemId): Art => own(ITEM_ART[id]);
const mother = (id: SpeciesId): Art => own(() => motherArt(id));
const baby = (id: SpeciesId): Art => own(() => babyArt(id));
const cloth = (id: ClothingId): Art => clothingIconArt(id, "amar");

/** Predmet sa slika situacija crta se oko sredine donje ivice; okvir je kvadrat oko njega (uz malo vazduha) */
function framed(x: number, y: number, size: number, draw: () => ReactNode): Art {
    const pad = size * 0.06;
    return { view: `${x - pad} ${y - pad} ${size + 2 * pad} ${size + 2 * pad}`, draw };
}
const prop = (id: PropId, x: number, y: number, size: number, tone?: string): Art => framed(x, y, size, () => <Prop id={id} tone={tone} />);
const drawing = (id: DrawId, x: number, y: number, size: number): Art => framed(x, y, size, () => <Drawing id={id} />);

function ownAll<K extends string>(set: Record<K, () => ReactNode>): Record<K, Art> {
    return Object.fromEntries(Object.entries<() => ReactNode>(set).map(([id, draw]) => [id, own(draw)])) as Record<K, Art>;
}

export const PICTURES = {
    ...ownAll(PRODUCE_ART),
    ...ownAll(CREATURE_ART),
    ...ownAll(OBJECT_ART),
    ...ownAll(VEHICLE_ART),
    ...ownAll(BODY_ART),
    ...ownAll(SIGN_ART),

    // Hrana i životinje iz igre „Šta jede?”
    apple: food("apple"),
    banana: food("banana"),
    carrot: food("carrot"),
    flower: food("flower"),
    rabbit: animal("rabbit"),
    cat: animal("cat"),
    dog: animal("dog"),
    cow: animal("cow"),
    bird: animal("bird"),
    bee: animal("bee"),
    frog: animal("frog"),
    mouse: animal("mouse"),
    sheep: animal("sheep"),
    hedgehog: animal("hedgehog"),
    giraffe: animal("giraffe"),
    turtle: animal("turtle"),
    elephant: animal("elephant"),
    // Mame i bebe iz igre „Mama i beba”
    pig: mother("pig"),
    lion: mother("lion"),
    duck: mother("duck"),
    chick: baby("chicken"),
    kitten: baby("cat"),
    puppy: baby("dog"),
    // Predmeti iz igre „Šta fali?”
    ball: thing("ball"),
    teddy: thing("teddy"),
    car: thing("car"),
    toyDuck: thing("duck"),
    umbrella: thing("umbrella"),
    balloon: thing("balloon"),
    house: thing("house"),
    bicycle: thing("bicycle"),
    butterfly: thing("butterfly"),
    fish: thing("fish"),
    shoe: thing("shoe"),
    pretzel: thing("pretzel"),
    sunFace: thing("sun"),
    // Roba iz „Prodavnice” i stvari iz „Spakuj ranac”
    cheese: good("cheese"),
    chocolate: good("chocolate"),
    bread: good("bread"),
    iceCream: good("icecream"),
    pencil: good("pencil"),
    notebook: item("notebook"),
    book: item("book"),
    crayons: item("crayons"),
    ruler: item("ruler"),
    phone: item("phone"),
    sneakers: item("sneakers"),
    // Odeća iz igre „Obuci se”
    tshirt: cloth("tshirt"),
    gloves: cloth("gloves"),
    scarf: cloth("scarf"),
    jacket: cloth("jacket"),
    shorts: cloth("shorts"),
    cap: cloth("sunCap"),
    backpack: cloth("backpack"),
    // Predmeti sa slika situacija (okvir je izmeren oko crteža)
    bus: prop("bus", -44, -61.5, 88),
    train: prop("train", -70, -94.5, 140),
    fireTruck: prop("fireTruck", -46, -64.5, 90),
    boat: prop("boat", -26, -51, 52),
    kite: prop("kite", -25, -40, 50),
    drum: prop("drum", -16, -32, 32),
    parasol: prop("parasol", -35, -70, 70),
    snowman: prop("snowman", -21.5, -43, 43),
    spoon: prop("spoon", -16.3, -20.2, 22.2),
    fork: prop("fork", -15.4, -19.1, 20.8),
    scissors: prop("scissors", -19.1, -27.2, 29),
    glass: prop("glass", -9, -18, 18),
    toothbrush: prop("toothbrush", -24.5, -28.5, 30),
    shower: prop("shower", -15, -80, 30),
    thermometer: prop("thermometer", -15.3, -18.8, 21.2),
    glasses: prop("glasses", -12.5, -18.5, 25),
    magnifier: prop("magnifier", -20.6, -25.2, 28.7),
    spider: prop("spider", -16, -21, 32),
    moon: prop("moon", -13.2, -24, 24),
    rainbow: prop("rainbow", -40, -58, 80),
    watermelon: prop("watermelon", -13.5, -23.1, 27),
    bookOpen: prop("bookOpen", -20, -33, 40),
    // Crteži iz igre „Šta je prvo?”
    soap: drawing("soap", -9, -13, 18),
    sponge: drawing("sponge", -9, -14.5, 18),
    bowl: drawing("bowl", -16, -23, 32),
    cakeSlice: drawing("cakeSlice", -18, -28.7, 36),
    cake: drawing("cakeCandles", -26, -44.5, 52),
} satisfies Record<string, Art>;

export type PictureId = keyof typeof PICTURES;

export const PICTURE_IDS = Object.keys(PICTURES) as PictureId[];

export function isPictureId(value: unknown): value is PictureId {
    return typeof value === "string" && Object.hasOwn(PICTURES, value);
}

interface PictureProps {
    id: PictureId;
    className?: string;
    /** Drugi okvir (npr. tesno oko crteža, kad slika mora da bude tačne veličine) */
    view?: string;
    /** Za sliku unutar drugog SVG-a (npr. igračka na sceni igre „Gde je?”) */
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

/** Slika predmeta ili životinje u kvadratu */
export function Picture({ id, className, view, x, y, width, height }: PictureProps) {
    const art: Art = PICTURES[id];
    return (
        <svg viewBox={view ?? art.view} className={className} x={x} y={y} width={width} height={height} aria-hidden="true" focusable="false">
            {art.draw()}
        </svg>
    );
}

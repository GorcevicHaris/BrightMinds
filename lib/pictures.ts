// lib/pictures.ts
// Jedna slika po životinji za celu aplikaciju. Ista životinja izgleda isto u memoriji,
// u igri „Slušaj i spoji” i u tajnom kodu deteta — dete je prepoznaje gde god da je vidi.
// Sve slike su iz istog skupa (ista podloga, isti stil crtanja).

export const ANIMAL_PICTURES = {
    dog: { name: "Pas", image: "/soundImage/dog.webp" },
    cat: { name: "Mačka", image: "/soundImage/cat.webp" },
    cow: { name: "Krava", image: "/soundImage/cow.webp" },
    pig: { name: "Svinja", image: "/soundImage/pigg.webp" },
    bird: { name: "Ptica", image: "/soundImage/bird.webp" },
    horse: { name: "Konj", image: "/soundImage/horsee.webp" },
    rooster: { name: "Petao", image: "/soundImage/cock.webp" },
    bear: { name: "Medved", image: "/soundImage/bear.webp" },
    monkey: { name: "Majmun", image: "/soundImage/monkey.webp" },
    crocodile: { name: "Krokodil", image: "/pins/animals/crocodile.webp" },
    zebra: { name: "Zebra", image: "/pins/animals/zebra.webp" },
    lion: { name: "Lav", image: "/pins/animals/lion.webp" },
    tiger: { name: "Tigar", image: "/pins/animals/tiger.webp" },
    puma: { name: "Puma", image: "/pins/animals/puma.webp" },
} as const;

export type AnimalId = keyof typeof ANIMAL_PICTURES;

export function animalImage(id: AnimalId): string {
    return ANIMAL_PICTURES[id].image;
}

// Vizuelni PIN: dete bira po jednu sličicu iz svake kategorije, redom.
// VAŽNO: `id` vrednosti se čuvaju u bazi kao deo PIN-a — ne menjati ih.
// (Neki ID-jevi u kategoriji hrane istorijski ne odgovaraju slici; naziv i slika su tačni.)

export interface VisualPinItem {
    id: string;
    emoji: string;
    name: string;
    image: string;
}

export interface VisualPinCategory {
    id: string;
    name: string;
    /** Akuzativ jednine za uputstvo: "Izaberi ..." */
    prompt: string;
    items: VisualPinItem[];
}

export const PIN_LENGTH = 4;

export const VISUAL_PIN_CATEGORIES: VisualPinCategory[] = [
    {
        id: 'animals',
        name: 'Životinje',
        prompt: 'životinju',
        items: [
            { id: 'dog', emoji: '🐶', name: 'Pas', image: '/pins/animals/dog.webp' },
            { id: 'cat', emoji: '🐱', name: 'Maca', image: '/pins/animals/cat.webp' },
            { id: 'lion', emoji: '🦁', name: 'Lav', image: '/pins/animals/lion.webp' },
            { id: 'tiger', emoji: '🐯', name: 'Tigar', image: '/pins/animals/tiger.webp' },
            { id: 'bear', emoji: '🐻', name: 'Meda', image: '/pins/animals/bear.webp' },
            { id: 'cow', emoji: '🐮', name: 'Krava', image: '/pins/animals/cow.webp' },
            { id: 'crocodile', emoji: '🐊', name: 'Krokodil', image: '/pins/animals/crocodile.webp' },
            { id: 'zebra', emoji: '🦓', name: 'Zebra', image: '/pins/animals/zebra.webp' },
            { id: 'horse', emoji: '🐴', name: 'Konj', image: '/pins/animals/horse.webp' },
            { id: 'puma', emoji: '🐆', name: 'Puma', image: '/pins/animals/puma.webp' },
        ]
    },
    {
        id: 'food',
        name: 'Hrana',
        prompt: 'hranu',
        items: [
            { id: 'cevapi', emoji: '🍢', name: 'Ćevapi', image: '/pins/food/cevapi.webp' },
            { id: 'sausages', emoji: '🧆', name: 'Ćufte', image: '/pins/food/cufte.webp' },
            { id: 'pancakes', emoji: '🥞', name: 'Palačinke', image: '/pins/food/palacinke.webp' },
            { id: 'meatballs', emoji: '🍕', name: 'Pica', image: '/pins/food/pica.webp' },
            { id: 'pizza', emoji: '🍩', name: 'Krofne', image: '/pins/food/krofne.webp' },
            { id: 'burger', emoji: '🍔', name: 'Burger', image: '/pins/food/burger.webp' },
            { id: 'eggs', emoji: '🍳', name: 'Jaja', image: '/pins/food/jaja.webp' },
            { id: 'gyros', emoji: '🐟', name: 'Riba', image: '/pins/food/riba.webp' },
            { id: 'fish', emoji: '🌯', name: 'Kebab', image: '/pins/food/kebab.webp' },
            { id: 'fries', emoji: '🥪', name: 'Sendvič', image: '/pins/food/sendvic.webp' },
        ]
    },
    {
        id: 'items',
        name: 'Predmeti',
        prompt: 'predmet',
        items: [
            { id: 'spinner', emoji: '🌀', name: 'Spinner', image: '/pins/items/spinner.webp' },
            { id: 'phone', emoji: '📱', name: 'Telefon', image: '/pins/items/phone.webp' },
            { id: 'tablet', emoji: '📟', name: 'Tablet', image: '/pins/items/tablet.webp' },
            { id: 'computer', emoji: '💻', name: 'Kompjuter', image: '/pins/items/computer.webp' },
            { id: 'car', emoji: '🚗', name: 'Auto', image: '/pins/items/car.webp' },
            { id: 'book', emoji: '📚', name: 'Knjiga', image: '/pins/items/book.webp' },
            { id: 'lego', emoji: '🧱', name: 'Lego', image: '/pins/items/lego.webp' },
            { id: 'laptop', emoji: '💻', name: 'Laptop', image: '/pins/items/laptop.webp' },
            { id: 'drums', emoji: '🥁', name: 'Bubnjevi', image: '/pins/items/drums.webp' },
            { id: 'ball', emoji: '⚽', name: 'Lopta', image: '/pins/items/ball.webp' },
        ]
    },
    {
        id: 'juices',
        name: 'Sokovi',
        prompt: 'sok',
        items: [
            { id: 'orange_juice', emoji: '🍊', name: 'Sok od narandže', image: '/pins/juices/orange_juice.webp' },
            { id: 'sprite', emoji: '🥤', name: 'Sprite', image: '/pins/juices/sprite.webp' },
            { id: 'pepsi', emoji: '🥤', name: 'Pepsi', image: '/pins/juices/pepsi.webp' },
            { id: 'cedevita', emoji: '🍊', name: 'Cedevita', image: '/pins/juices/cedevita.webp' },
            { id: 'strawberry_juice', emoji: '🍓', name: 'Sok od jagode', image: '/pins/juices/strawberry_juice.webp' },
            { id: 'fanta_blue', emoji: '🥤', name: 'Plava Fanta', image: '/pins/juices/fanta_blue.webp' },
            { id: 'bravo_orange', emoji: '🍊', name: 'Bravo narandža', image: '/pins/juices/bravo_orange.webp' },
            { id: 'apple_juice', emoji: '🍎', name: 'Sok od jabuke', image: '/pins/juices/apple_juice.webp' },
            { id: 'fanta_yellow', emoji: '🥤', name: 'Žuta Fanta', image: '/pins/juices/fanta_yellow.webp' },
            { id: 'coca_cola', emoji: '🥤', name: 'Coca Cola', image: '/pins/juices/coca_cola.webp' },
        ]
    }
];

export function pinToItems(pin: string | null | undefined): (VisualPinItem | undefined)[] {
    if (!pin) return [];
    return pin.split(',').map((id, idx) => VISUAL_PIN_CATEGORIES[idx]?.items.find((item) => item.id === id));
}

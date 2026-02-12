export interface VisualPinItem {
    id: string;
    emoji: string;
    name: string;
    image: string;
}

export const VISUAL_PIN_CATEGORIES = [
    {
        id: 'animals',
        name: 'Životinje',
        items: [
            { id: 'dog', emoji: '🐶', name: 'Pas', image: '/pins/animals/dog.png' },
            { id: 'cat', emoji: '🐱', name: 'Maca', image: '/pins/animals/cat.png' },
            { id: 'lion', emoji: '🦁', name: 'Lav', image: '/pins/animals/lion.png' },
            { id: 'tiger', emoji: '🐯', name: 'Tigar', image: '/pins/animals/tiger.png' },
            { id: 'bear', emoji: '🐻', name: 'Meda', image: '/pins/animals/bear.png' },
            { id: 'cow', emoji: '🐮', name: 'Krava', image: '/pins/animals/cow.png' },
            { id: 'crocodile', emoji: '🐊', name: 'Krokodil', image: '/pins/animals/crocodile.png' },
            { id: 'zebra', emoji: '🦓', name: 'Zebra', image: '/pins/animals/zebra.png' },
            { id: 'horse', emoji: '🐴', name: 'Konj', image: '/pins/animals/horse.png' },
            { id: 'puma', emoji: '🐆', name: 'Puma', image: '/pins/animals/puma.png' },
        ]
    },
    {
        id: 'food',
        name: 'Hrana',
        items: [
            { id: 'cevapi', emoji: '🍢', name: 'Ćevapi', image: '/pins/food/cevapi.png' },
            { id: 'sausages', emoji: '🌭', name: 'Kobasice', image: '/pins/food/sausages.png' },
            { id: 'pancakes', emoji: '🥞', name: 'Palačinke', image: '/pins/food/pancakes.png' },
            { id: 'meatballs', emoji: '🧆', name: 'Ćufte', image: '/pins/food/meatballs.png' },
            { id: 'pizza', emoji: '🍕', name: 'Pica', image: '/pins/food/pizza.png' },
            { id: 'burger', emoji: '🍔', name: 'Burger', image: '/pins/food/burger.png' },
            { id: 'eggs', emoji: '🍳', name: 'Jaja', image: '/pins/food/eggs.png' },
            { id: 'gyros', emoji: '🌯', name: 'Giros', image: '/pins/food/gyros.png' },
            { id: 'fish', emoji: '🐟', name: 'Riba', image: '/pins/food/fish.png' },
            { id: 'fries', emoji: '🍟', name: 'Pomfrit', image: '/pins/food/fries.png' },
        ]
    },
    {
        id: 'items',
        name: 'Predmeti',
        items: [
            { id: 'spinner', emoji: '🌀', name: 'Spinner', image: '/pins/items/spinner.png' },
            { id: 'phone', emoji: '📱', name: 'Telefon', image: '/pins/items/phone.png' },
            { id: 'tablet', emoji: '📟', name: 'Tablet', image: '/pins/items/tablet.png' },
            { id: 'computer', emoji: '💻', name: 'Kompjuter', image: '/pins/items/computer.png' },
            { id: 'car', emoji: '🚗', name: 'Auto', image: '/pins/items/car.png' },
            { id: 'book', emoji: '📚', name: 'Knjiga', image: '/pins/items/book.png' },
            { id: 'lego', emoji: '🧱', name: 'Lego', image: '/pins/items/lego.png' },
            { id: 'laptop', emoji: '💻', name: 'Laptop', image: '/pins/items/laptop.png' },
            { id: 'drums', emoji: '🥁', name: 'Bubnjevi', image: '/pins/items/drums.png' },
            { id: 'ball', emoji: '⚽', name: 'Lopta', image: '/pins/items/ball.png' },
        ]
    },
    {
        id: 'juices',
        name: 'Sokovi',
        items: [
            { id: 'orange_juice', emoji: '🍊', name: 'Sok od narandže', image: '/pins/juices/orange_juice.png' },
            { id: 'sprite', emoji: '🥤', name: 'Sprite', image: '/pins/juices/sprite.png' },
            { id: 'pepsi', emoji: '🥤', name: 'Pepsi', image: '/pins/juices/pepsi.png' },
            { id: 'cedevita', emoji: '🍊', name: 'Cedevita', image: '/pins/juices/cedevita.png' },
            { id: 'strawberry_juice', emoji: '🍓', name: 'Sok od jagode', image: '/pins/juices/strawberry_juice.png' },
            { id: 'fanta_blue', emoji: '🥤', name: 'Plava Fanta', image: '/pins/juices/fanta_blue.png' },
            { id: 'bravo_orange', emoji: '🍊', name: 'Bravo narandža', image: '/pins/juices/bravo_orange.png' },
            { id: 'apple_juice', emoji: '🍎', name: 'Sok od jabuke', image: '/pins/juices/apple_juice.png' },
            { id: 'fanta_yellow', emoji: '🥤', name: 'Žuta Fanta', image: '/pins/juices/fanta_yellow.png' },
            { id: 'coca_cola', emoji: '🥤', name: 'Coca Cola', image: '/pins/juices/coca_cola.png' },
        ]
    }
];

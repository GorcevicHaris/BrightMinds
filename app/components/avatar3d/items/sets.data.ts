// Kompleti — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Preneti iz 2D (app/components/avatar/wearables.tsx); id-jevi se ne menjaju (cilj „set:<id>” je u bazi).
// Komplet sme da dobije i predmet za donji deo (`bottom`) kad ga katalog doda.

import type { SetData } from "../data";

export const SETS: readonly SetData[] = [
    { id: "astronaut", label: "Astronaut", items: { hat: "astronautski-slem", outfit: "kostim-astronauta", feet: "cizme-astronauta", back: "raketa-ranac", hand: "dvogled", background: "svemir" } },
    { id: "vatrogasac", label: "Vatrogasac", items: { hat: "vatrogasni-slem", outfit: "kostim-vatrogasca", feet: "vatrogasne-cizme", hand: "lampa", pet: "kuce", background: "grad" } },
    { id: "pirat", label: "Pirat", items: { hat: "piratski-sesir", outfit: "kostim-pirata", neck: "marama", hand: "mapa", pet: "papagaj", background: "plaza" } },
    { id: "princeza", label: "Princeza", items: { hat: "tijara", outfit: "haljina-princeze", neck: "ogrlica-srce", feet: "cipele-masna", hand: "stapic-zvezda", background: "zamak" } },
    { id: "princ", label: "Princ", items: { hat: "kruna", outfit: "kostim-princa", back: "kraljevski-plast", feet: "lakovane-cipele", pet: "poni", background: "zamak" } },
    { id: "vitez", label: "Vitez", items: { hat: "slem-viteza", outfit: "kostim-viteza", back: "plast", feet: "kaubojske-cizme", pet: "poni", background: "zamak" } },
    { id: "superheroj", label: "Superheroj", items: { glasses: "maska-superheroja", outfit: "kostim-superheroja", back: "kraljevski-plast", feet: "cizme-superheroja", background: "grad" } },
    { id: "doktor", label: "Doktor", items: { glasses: "naocare", outfit: "kostim-doktora", feet: "plave-patike", hand: "medvedic", pet: "mace", background: "soba" } },
    { id: "kuvar", label: "Kuvar", items: { hat: "kuvarska-kapa", neck: "marama", outfit: "kostim-kuvara", feet: "lakovane-cipele", hand: "varjaca", background: "soba" } },
    { id: "pcelica", label: "Pčelica", items: { hat: "antene", outfit: "kostim-pcelice", back: "krila-pcelice", feet: "zute-patike", hand: "cvet", background: "livada" } },
    { id: "bubamara", label: "Bubamara", items: { hat: "antene", outfit: "kostim-bubamare", back: "krila-bubamare", feet: "crvene-patike", hand: "suncokret", background: "livada" } },
    { id: "dinosaurus", label: "Dinosaurus", items: { hat: "kapa-dino", outfit: "kostim-dinosaurusa", feet: "zelene-patike", pet: "kornjaca", hand: "jabuka", background: "suma" } },
    { id: "meda", label: "Meda", items: { hat: "kapa-meda", outfit: "kostim-mede", feet: "papuce-mede", back: "ranac-meda", hand: "kolacic", background: "suma" } },
    { id: "zimski", label: "Zimski dan", items: { hat: "zimska-kapa", glasses: "skijaske-naocare", neck: "prugasti-sal", outfit: "zimska-jakna", feet: "cizme-sneg", pet: "pingvin", background: "zimski-dan" } },
    { id: "plaza", label: "Na plaži", items: { hat: "sesir", glasses: "suncane-naocare", neck: "ogrlica-cvece", outfit: "kupaci-ribice", feet: "sandale", hand: "kofica", background: "plaza" } },
    { id: "ronilac", label: "Ronilac", items: { glasses: "ronilacka-maska", outfit: "kostim-ronioca", feet: "peraja", back: "boca-ronioca", pet: "ribica", background: "podvodni-svet" } },
    { id: "fudbaler", label: "Fudbaler", items: { hat: "kapa-siltom", neck: "pistaljka", outfit: "fudbalski-dres", feet: "kopacke", hand: "lopta", background: "park" } },
    { id: "kosarkas", label: "Košarkaš", items: { hat: "zelena-kapa-siltom", neck: "medalja", outfit: "kosarkaski-dres", feet: "narandzaste-kopacke", background: "grad" } },
    { id: "carobnjak", label: "Čarobnjak", items: { hat: "sesir-carobnjaka", outfit: "kostim-carobnjaka", back: "plast", hand: "stapic-zvezda", pet: "zecic", background: "svemir" } },
    { id: "kauboj", label: "Kauboj", items: { hat: "kaubojski-sesir", neck: "marama", outfit: "kostim-kauboja", feet: "kaubojske-cizme", hand: "laso", pet: "poni", background: "farma" } },
    { id: "balerina", label: "Balerina", items: { hat: "tijara", outfit: "kostim-balerine", feet: "baletanke", back: "krila-vile", hand: "cvet", background: "soba" } },
    { id: "pilot", label: "Pilot", items: { hat: "kapa-pilota", glasses: "pilotske-naocare", outfit: "kostim-pilota", feet: "lakovane-cipele", back: "krila-ptice", background: "duga" } },
    { id: "farmer", label: "Farmer", items: { hat: "slamnati-sesir", outfit: "kosulja-prsluk", feet: "zute-cizme", hand: "kantica", pet: "pile", background: "farma" } },
    { id: "mornar", label: "Mornar", items: { hat: "mornarska-kapa", neck: "kravata", outfit: "majica-pruge", feet: "plave-patike", hand: "dvogled", background: "plaza" } },
    { id: "kisni-dan", label: "Kišni dan", items: { hat: "zimska-kapa", outfit: "zuta-kabanica", feet: "zute-cizme", hand: "kisobran", pet: "patkica", background: "park" } },
    { id: "laku-noc", label: "Laku noć", items: { outfit: "pidzama", feet: "papuce-zeke", hand: "knjiga", back: "ranac-meda", pet: "mace", background: "soba" } },
    { id: "rodjendan", label: "Rođendan", items: { hat: "rodjendanska-kapa", neck: "leptir-masna", outfit: "haljina-zvezde", feet: "sjajne-patike", hand: "tri-balona", background: "vasar" } },
    { id: "vila", label: "Vila", items: { hat: "cvetni-venac", glasses: "maska-leptira", outfit: "haljina-cvece", back: "krila-vile", hand: "stapic-zvezda", background: "livada" } },
    { id: "slikar", label: "Mali slikar", items: { hat: "sesir", neck: "leptir-masna-tufne", outfit: "kombinezon", feet: "crvene-patike", hand: "cetkica", background: "soba" } },
    { id: "muzicar", label: "Muzičar", items: { glasses: "naocare-zvezde", neck: "leptir-masna", outfit: "odelo", feet: "lakovane-cipele", hand: "gitara", background: "vasar" } },
];

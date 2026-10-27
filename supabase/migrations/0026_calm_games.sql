-- =============================================================================
-- Bright Minds — migracija 0026: mirne igre, pamćenje, stvaranje i svakodnevne navike
-- =============================================================================
-- Šest novih igara:
--   • activities.id = 43 — „Balon disanja”: vođeno mirno disanje (udah — balon raste, izdah —
--     balon se smanjuje), bez grešaka i bez žurbe. Samoregulacija.
--   • activities.id = 44 — „Zapamti niz”: ponovi niz svetala i zvukova koji raste (Simon),
--     na kraju i unazad. Radna memorija.
--   • activities.id = 45 — „Ponovi ritam”: broj udaraca, pa veliki i mali bubanj, pa duži
--     ritmovi. Slušna pažnja i ritam.
--   • activities.id = 46 — „Mešaj boje”: dve boje daju novu, pa svetle i tamne nijanse.
--   • activities.id = 47 — „Posadi cvet”: seme, voda i sunce; šta je biljci potrebno.
--   • activities.id = 48 — „Operi ruke i zube”: svakodnevni redosled korak po korak.
-- „Balon disanja” nema pogrešnih odgovora: svaki dovršen udah se računa kao tačan, pa se i ona
-- ocenjuje kao ostale igre (graded = true, kao redovi 17–28).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovih redova
-- server ne može da sačuva rezultat novih igara. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions, graded)
values
    (43, 'Balon disanja', 'Udahni i izdahni sa balonom', 'social', 'beginner', 'Udahni dok balon raste, izdahni dok se smanjuje', true),
    (44, 'Zapamti niz', 'Ponovi niz svetala i zvukova', 'cognitive', 'beginner', 'Pogledaj i poslušaj niz, pa ga ponovi istim redom', true),
    (45, 'Ponovi ritam', 'Slušaj bubanj i ponovi ritam', 'motor', 'beginner', 'Poslušaj ritam bubnja i ponovi ga', true),
    (46, 'Mešaj boje', 'Pomešaj dve boje i dobij novu', 'cognitive', 'beginner', 'Izaberi dve boje koje zajedno daju traženu boju', true),
    (47, 'Posadi cvet', 'Posadi seme i neguj biljku', 'cognitive', 'beginner', 'Daj biljci ono što joj je potrebno da poraste', true),
    (48, 'Operi ruke i zube', 'Korak po korak do čistih ruku i zuba', 'social', 'beginner', 'Izaberi sledeći korak pranja ruku i zuba', true)
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category, graded = excluded.graded;

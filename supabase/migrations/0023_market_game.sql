-- =============================================================================
-- Bright Minds — migracija 0023: igra „Prodavnica”
-- =============================================================================
-- Nova igra:
--   • activities.id = 28 — „Prodavnica”: kupovina po spisku sa slikama, plaćanje kod
--     prodavačice Emine novčićima i novčanicama (1, 2, 5, 10, 20, 50, 100 i 200 dinara),
--     sabiranje cena, kusur i kupovina sa budžetom. Brojanje i prvi pojmovi o novcu.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (28, 'Prodavnica', 'Kupi sa spiska i plati kod Emine', 'cognitive', 'beginner', 'Kupi sve sa spiska i plati tačno onoliko koliko košta')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

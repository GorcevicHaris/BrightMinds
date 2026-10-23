-- =============================================================================
-- Bright Minds — migracija 0008: igra „Brojimo”
-- =============================================================================
-- Nova igra:
--   • activities.id = 13 — „Brojimo”: rano brojanje i količine (koliko ima, broj ↔ količina,
--     više / manje, do 20 u okviru od deset, jedan više / jedan manje, sabiranje sa predmetima).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (13, 'Brojimo', 'Koliko ima? Gde ima više?', 'cognitive', 'beginner', 'Slušaj pitanje i izaberi pravi odgovor')
on conflict (id) do update set title = excluded.title, description = excluded.description;

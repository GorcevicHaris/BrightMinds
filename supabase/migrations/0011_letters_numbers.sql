-- =============================================================================
-- Bright Minds — migracija 0011: igra „Slova”
-- =============================================================================
-- Nova igra:
--   • activities.id = 15 — „Slova”: precrtavanje slova prstom (redosled poteza sa numerisanim
--     strelicama), „Gde je slovo…?”, prvi glas u reči i prvo slovo imena; latinica i ćirilica.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (15, 'Slova', 'Piši slova prstom', 'cognitive', 'beginner', 'Prati tačkicu i napiši slovo')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

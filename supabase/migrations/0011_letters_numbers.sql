-- =============================================================================
-- Bright Minds — migracija 0011: igre „Slova” i „Brojevi”
-- =============================================================================
-- Nove igre:
--   • activities.id = 15 — „Slova”: precrtavanje slova prstom (redosled poteza sa numerisanim
--     strelicama), „Gde je slovo…?”, prvi glas u reči i prvo slovo imena; latinica i ćirilica.
--   • activities.id = 16 — „Brojevi”: pisanje cifara 0–9 i brojeva do 20, broj ↔ tačkice,
--     „Koji broj nedostaje?” i „Koji broj je veći / manji?” (dopuna igri „Brojimo”).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (15, 'Slova', 'Piši slova prstom', 'cognitive', 'beginner', 'Prati tačkicu i napiši slovo'),
    (16, 'Brojevi', 'Piši brojeve i pronađi broj', 'cognitive', 'beginner', 'Prati tačkicu i napiši broj')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

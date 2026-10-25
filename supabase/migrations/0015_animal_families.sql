-- =============================================================================
-- Bright Minds — migracija 0015: igra „Mama i beba”
-- =============================================================================
-- Nova igra:
--   • activities.id = 20 — „Mama i beba”: beba životinje se prevlači do svoje mame (krava i
--     tele, ovca i jagnje…), „Čija je ovo beba?”, „Gde je jagnje?”, bebe koje ne liče na mamu
--     (pile, punoglavac, gusenica), porodice (tata, mama i beba) i porodica ljudi.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (20, 'Mama i beba', 'Svaka beba traži svoju mamu', 'cognitive', 'beginner', 'Spoji svaku bebu sa njenom mamom')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

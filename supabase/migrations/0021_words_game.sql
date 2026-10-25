-- =============================================================================
-- Bright Minds — migracija 0021: igra „Prve reči”
-- =============================================================================
-- Nova igra:
--   • activities.id = 26 — „Prve reči”: rano čitanje po srpskoj latinici — slika i reč,
--     prvo slovo reči, slaganje reči od slogova i od slova, kratka rečenica i slika.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (26, 'Prve reči', 'Čitaj reči, slogove i slova', 'cognitive', 'beginner', 'Pročitaj reč i pronađi sliku, slovo ili slog')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

-- =============================================================================
-- Bright Minds — migracija 0018: igra „Lavirint”
-- =============================================================================
-- Nova igra:
--   • activities.id = 23 — „Lavirint”: dete prstom vodi lik (Amar, Lejla, zeka…) kroz vrt
--     sa živom ogradom do cilja (kuća, mama, šargarepa). Od širokog pravog hodnika do
--     lavirinata 8 × 8 sa zvezdicama, ključem i vratima. Fina motorika i planiranje pokreta.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (23, 'Lavirint', 'Pronađi put do cilja', 'motor', 'beginner', 'Vodi lik kroz lavirint do cilja')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

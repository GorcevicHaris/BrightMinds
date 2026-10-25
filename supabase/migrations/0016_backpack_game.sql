-- =============================================================================
-- Bright Minds — migracija 0016: igra „Spakuj ranac”
-- =============================================================================
-- Nova igra:
--   • activities.id = 21 — „Spakuj ranac”: po slikovnoj listi u ranac ide ono što treba za
--     školu (igračke ostaju na stolu), lista koja se pamti, „Šta fali u rancu?” i pakovanje
--     po rasporedu časova. Radno pamćenje, planiranje i organizacija.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (21, 'Spakuj ranac', 'Spakuj ono što treba za školu', 'cognitive', 'beginner', 'Po listi ili rasporedu spakuj ranac za školu')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

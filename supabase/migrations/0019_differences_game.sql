-- =============================================================================
-- Bright Minds — migracija 0019: igra „Pronađi razlike”
-- =============================================================================
-- Nova igra:
--   • activities.id = 24 — „Pronađi razlike”: dve slike (soba, park, kuhinja, plaža,
--     učionica, dvorište, pijaca, akvarijum, zima) iste su osim nekoliko razlika — nešto
--     nedostaje, druge je boje ili veličine. Od jedne krupne do šest suptilnih razlika.
--     Vizuelna pažnja i pretraživanje.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (24, 'Pronađi razlike', 'Dve slike, a nisu iste', 'cognitive', 'beginner', 'Pronađi šta je drugačije na dve slike')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

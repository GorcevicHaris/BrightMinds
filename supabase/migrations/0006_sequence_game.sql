-- =============================================================================
-- Bright Minds — migracija 0006: igra „Šta je prvo?”
-- =============================================================================
-- Nova igra (activities.id = 10): ređanje koraka iz svakodnevnog života. Rezultati
-- partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda server
-- ne može da sačuva rezultat nove igre. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values (10, 'Šta je prvo?', 'Složi korake redom', 'cognitive', 'beginner', 'Složi korake redom')
on conflict (id) do update set title = excluded.title, description = excluded.description;

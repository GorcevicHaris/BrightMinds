-- =============================================================================
-- Bright Minds — migracija 0012: igra „Šta jede?”
-- =============================================================================
-- Nova igra:
--   • activities.id = 17 — „Šta jede?”: ko šta jede (zeka – šargarepa, panda – bambus),
--     obrnuto pitanje „Ko jede bambus?”, „Šta ne jede…?”, „Ko još jede travu?” i hranjenje
--     (hrana se prevlači do prave životinje). Razumevanje govora i znanje o svetu.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (17, 'Šta jede?', 'Ko šta jede: nahrani životinje', 'cognitive', 'beginner', 'Slušaj pitanje i izaberi hranu ili životinju')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

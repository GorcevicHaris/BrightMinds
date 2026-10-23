-- =============================================================================
-- Bright Minds — migracija 0007: igre „Gde je?” i „Čemu služi?”
-- =============================================================================
-- Dve nove igre:
--   • activities.id = 11 — „Gde je?”: razumevanje prostornih predloga
--     (u, na, ispod, pored, iza, ispred, iznad, između);
--   • activities.id = 12 — „Čemu služi?”: izbor predmeta po funkciji i osobini
--     („Čime pišemo?”, „Ko ima surlu?”).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovih redova
-- server ne može da sačuva rezultat novih igara. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (11, 'Gde je?', 'U, na, ispod ili pored?', 'cognitive', 'beginner', 'Slušaj i pronađi pravu sliku'),
    (12, 'Čemu služi?', 'Čuj pitanje i pronađi predmet', 'cognitive', 'beginner', 'Slušaj pitanje i pronađi pravu sliku')
on conflict (id) do update set title = excluded.title, description = excluded.description;

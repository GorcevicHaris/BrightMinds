-- =============================================================================
-- Bright Minds — migracija 0022: igra „Obuci se”
-- =============================================================================
-- Nova igra:
--   • activities.id = 27 — „Obuci se”: kroz prozor se vidi vreme (sunce, kiša, sneg, vetar,
--     hladno), a dete oblači Amara ili Lejlu — od jedne stvari (kapa, kišobran, rukavice)
--     do cele odeće, redosleda oblačenja, mešanog vremena, nedeljne prognoze i mesta
--     (bazen, škola, park pod snegom). Veština svakodnevnog života.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (27, 'Obuci se', 'Pogledaj kroz prozor i obuci lik', 'social', 'beginner', 'Obuci lik za vreme koje se vidi kroz prozor')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

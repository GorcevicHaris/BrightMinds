-- =============================================================================
-- Bright Minds — migracija 0009: igra „Šta gleda?”
-- =============================================================================
-- Nova igra:
--   • activities.id = 14 — „Šta gleda?”: praćenje pogleda lika na slici (zajednička pažnja),
--     pa „Šta želi?” (pogled pokazuje želju) i „Ko zna?” (ko je video, taj zna).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Kategorija je 'social' (baza prima samo
-- cognitive, motor i social). Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (14, 'Šta gleda?', 'Prati pogled i pronađi predmet', 'social', 'beginner', 'Pogledaj sliku i pronađi ono u šta lik gleda')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

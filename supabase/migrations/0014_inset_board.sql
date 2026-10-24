-- =============================================================================
-- Bright Minds — migracija 0014: igra „Umetaljka”
-- =============================================================================
-- Nova igra:
--   • activities.id = 19 — „Umetaljka”: drvena tabla sa rupama u obliku krugova, zvezda,
--     srca, pa predmeta (jabuka, šolja, ključ); dete prevlači svaki komad u njegovu rupu,
--     a na težim nivoima komad prvo okrene. Vizuelno uparivanje i spretnost ruku.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (19, 'Umetaljka', 'Svaki oblik u svoju rupu', 'motor', 'beginner', 'Prevuci svaki oblik u rupu istog oblika')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

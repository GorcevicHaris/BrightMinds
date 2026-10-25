-- =============================================================================
-- Bright Minds — migracija 0020: igra „Šta fali?”
-- =============================================================================
-- Nova igra:
--   • activities.id = 25 — „Šta fali?”: dopunjavanje slike (biciklu fali točak, kući vrata)
--     i Kimova igra (na polici nečega nema, dve stvari fale ili su zamenile mesta).
--     Vizuelno pamćenje i opažanje.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (25, 'Šta fali?', 'Zapamti i pronađi šta fali', 'cognitive', 'beginner', 'Pogledaj sliku ili policu i pronađi šta fali')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

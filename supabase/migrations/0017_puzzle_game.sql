-- =============================================================================
-- Bright Minds — migracija 0017: igra „Složi sliku”
-- =============================================================================
-- Nova igra:
--   • activities.id = 22 — „Složi sliku”: slika isečena na delove (od dve polovine do
--     16 delova sa ušicama), dete prevlači delove na tablu i sastavlja celu sliku; na nivou
--     „pola slike” bira drugu polovinu. Vizuelno-prostorno opažanje.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (22, 'Složi sliku', 'Spoji delove u celu sliku', 'cognitive', 'beginner', 'Prevuci delove na tablu i složi celu sliku')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

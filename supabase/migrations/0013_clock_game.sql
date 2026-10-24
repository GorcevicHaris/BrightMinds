-- =============================================================================
-- Bright Minds — migracija 0013: igra „Sat”
-- =============================================================================
-- Nova igra:
--   • activities.id = 18 — „Sat”: drvena tabla sa brojevima 0–9 (ispod rupe toliko
--     životinja), drveni sat koji dete slaže broj po broj (svaki broj svog oblika i boje),
--     pa čitanje vremena: pun sat i pola sata („Pokaži tri sata.”, „pola četiri”).
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovog reda
-- server ne može da sačuva rezultat nove igre. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (18, 'Sat', 'Složi brojeve i sat, pa pogodi koliko je sati', 'cognitive', 'beginner', 'Prevuci broj u njegovu rupu; pokaži ili izaberi koliko je sati')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

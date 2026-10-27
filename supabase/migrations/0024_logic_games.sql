-- =============================================================================
-- Bright Minds — migracija 0024: sedam igara logike i matematike
-- =============================================================================
-- Nove igre:
--   • activities.id = 29 — „Šta dolazi sledeće?”: nizovi boja, oblika, slika i brojeva
--     (AB, AAB, ABC, rastući nizovi), pa prenošenje pravila niza.
--   • activities.id = 30 — „Poređaj po veličini”: od najmanjeg do najvećeg, po visini,
--     dužini i količini, pa brojevi (seriacija).
--   • activities.id = 31 — „Vaga”: teže i lakše, pa ravnoteža sa tegovima i jednakost (=).
--   • activities.id = 32 — „Računanje”: sabiranje i oduzimanje sa predmetima, desetica,
--     pa brojevne rečenice do 20.
--   • activities.id = 33 — „Šta ne pripada?”: uljez po boji, obliku, vrsti, pa po pravilu.
--   • activities.id = 34 — „Vodi robota”: strelicama vodi Robotića do cilja, ispravi grešku
--     i ponovi korake (prvo programiranje).
--   • activities.id = 35 — „Tangram”: složi siluetu od delova, od dva dela do sedam.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovih redova
-- server ne može da sačuva rezultat novih igara. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (29, 'Šta dolazi sledeće?', 'Nastavi niz boja, oblika i brojeva', 'cognitive', 'beginner', 'Pogledaj niz i pronađi šta dolazi sledeće'),
    (30, 'Poređaj po veličini', 'Od najmanjeg do najvećeg', 'cognitive', 'beginner', 'Poređaj predmete redom po veličini, visini ili broju'),
    (31, 'Vaga', 'Šta je teže? Napravi ravnotežu', 'cognitive', 'beginner', 'Pogledaj vagu i pronađi šta je teže ili napravi ravnotežu'),
    (32, 'Računanje', 'Saberi i oduzmi do 20', 'cognitive', 'beginner', 'Prebroji, saberi ili oduzmi i pronađi tačan broj'),
    (33, 'Šta ne pripada?', 'Pronađi uljeza i reci zašto', 'cognitive', 'beginner', 'Pronađi sliku koja ne ide uz ostale'),
    (34, 'Vodi robota', 'Strelicama vodi Robotića do cilja', 'cognitive', 'beginner', 'Složi strelice i pokreni Robotića do cilja'),
    (35, 'Tangram', 'Složi oblik od delova', 'motor', 'beginner', 'Slaži delove tako da popune oblik')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

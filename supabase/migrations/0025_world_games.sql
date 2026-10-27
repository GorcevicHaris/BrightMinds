-- =============================================================================
-- Bright Minds — migracija 0025: sedam igara o svetu oko nas
-- =============================================================================
-- Nove igre (jezik, priroda i svakodnevni život, uzrast 3–10):
--   • activities.id = 36 — „Suprotnosti”: veliko i malo, puno i prazno, dan i noć… od iste
--     stvari na dve slike do suprotnosti samo rečima.
--   • activities.id = 37 — „Koliko slogova?”: tapšanje slogova u bubanj, brojanje i
--     razvrstavanje reči po broju slogova, najduža reč i prvi slog (glasovna svesnost).
--   • activities.id = 38 — „Ko šta radi?”: zanimanja, alati, mesta rada, ko nam pomaže u
--     nevolji i zagonetke („Nosim beli mantil.”).
--   • activities.id = 39 — „Ko gde živi?”: životinje i staništa (farma, šuma, more, led i
--     sneg, džungla, savana) i domovi (gnezdo, košnica).
--   • activities.id = 40 — „Godišnja doba”: proleće, leto, jesen i zima, redosled kroz
--     godinu, delovi dana i meseci.
--   • activities.id = 41 — „Moje telo”: delovi lica i tela, čula, odeća i brojanje.
--   • activities.id = 42 — „Saobraćaj”: semafor, čekanje zelenog svetla, kaciga, pojas,
--     pešački prelaz, koraci prelaska ulice i znakovi.
-- Rezultati partija se vezuju za tabelu activities stranim ključem, pa bez ovih redova
-- server ne može da sačuva rezultat novih igara. Baza prima samo kategorije
-- cognitive / motor / social. Bezbedno je pokrenuti više puta.
-- =============================================================================

insert into public.activities (id, title, description, category, difficulty_level, instructions)
values
    (36, 'Suprotnosti', 'Veliko i malo, dan i noć', 'cognitive', 'beginner', 'Pronađi suprotnost: veliko i malo, puno i prazno, otvoreno i zatvoreno'),
    (37, 'Koliko slogova?', 'Tapši slogove i prebroj ih', 'cognitive', 'beginner', 'Tapši slogove reči u bubanj i prebroj ih'),
    (38, 'Ko šta radi?', 'Zanimanja, alati i mesta rada', 'social', 'beginner', 'Spoji radnike sa alatima, mestima rada i nevoljama u kojima pomažu'),
    (39, 'Ko gde živi?', 'Životinje i njihov dom', 'cognitive', 'beginner', 'Smesti svaku životinju tamo gde živi'),
    (40, 'Godišnja doba', 'Proleće, leto, jesen, zima', 'cognitive', 'beginner', 'Prepoznaj godišnje doba, delove dana i mesece i poređaj ih redom'),
    (41, 'Moje telo', 'Delovi tela i čula', 'cognitive', 'beginner', 'Pokaži delove lica i tela i čime šta radimo'),
    (42, 'Saobraćaj', 'Semafor, prelaz, kaciga i pojas', 'social', 'beginner', 'Sačekaj zeleno svetlo i izaberi ono što je bezbedno')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category;

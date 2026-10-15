-- =============================================================================
-- Bright Minds — migracija 0004: posete (play_sessions), položen nivo i brzina
-- =============================================================================
--
-- ŠTA RADI I ZAŠTO
--   1. Tabela play_sessions — jedna POSETA deteta (od prvog završenog nivoa do
--      izlaska iz igre): child_id, started_at, ended_at, mood_before, mood_after,
--      created_by.
--      Zašto: do sada se raspoloženje pre igre prepisivalo u SVAKI zapis partije
--      te posete, a raspoloženje posle igre naknadno upisivalo u N zapisa. Jedan
--      odgovor deteta bio je sačuvan N puta, pa je i statistika raspoloženja bila
--      uvećana onoliko puta koliko je nivoa dete odigralo. Sada odgovor živi na
--      jednom mestu (poseta), a zapis partije samo pokazuje na posetu.
--   2. progress_logs.session_id — kojoj poseti partija pripada (NULL za starije
--      zapise; oni zadržavaju svoje kolone mood_before/mood_after i ništa se ne
--      rekonstruiše niti briše).
--   3. progress_logs.passed — da li je partija „položila” nivo. Odluka se donosi
--      JEDNOM, pri upisu, a ne iznova pri svakom čitanju. Postojeći redovi se
--      dopunjuju istim pravilom koje koristi kod (isLevelPassed u
--      app/api/_lib/children.ts). Okidač popunjava kolonu i kada je upis ne
--      pošalje (stariji kod, zastareo spisak kolona u API-ju), pa posle ove
--      migracije nijedan novi red nema passed = NULL.
--   4. activities.graded — false za igru bez pogrešnih odgovora (Emocije, ID 8):
--      u njoj je svaki završen nivo položen. Izvor istine je lib/games.ts; kolona
--      postoji da bi pravilo moglo da se primeni i u bazi (dopuna, okidač).
--   5. Pogled child_game_progress — najviši položen nivo, broj partija i poslednja
--      partija po (dete, igra). Dečji početni ekran tako dobija otključane nivoe
--      JEDNIM malim upitom umesto po jednog (ili više) upita za svaku igru.
--   6. Indeksi koji su nedostajali — spisak svih upita iz koda i indeks koji ih
--      pokriva nalazi se u odeljku 7.
--   7. Row Level Security na novoj tabeli, bez ijednog pravila (kao u 0001).
--
-- ŠTA NAMERNO NIJE PODELJENO U VIŠE TABELA
--   • children zadržava streak, experience_points, last_login_at i settings.
--     To su osobine jednog deteta, po jedna vrednost u jednom redu: ništa se ne
--     ponavlja. Posebna tabela (npr. child_stats) bi svakoj prijavi i svakoj
--     partiji dodala još jedno spajanje ili još jedan upit, bez ikakve uštede.
--     experience_points nije „izveden” podatak: uključuje i dnevnu nagradu za
--     prijavu, koja se nigde drugde ne beleži.
--   • children.settings ostaje jsonb. To je konfiguracija bez stalne šeme (nova
--     podešavanja se dodaju bez migracije), čita se i upisuje uvek cela, a oblik
--     proverava aplikacija (lib/childSettings.ts). Nijedan upit ne filtrira po
--     pojedinačnom podešavanju, pa tabela „ključ–vrednost” ne bi donela ništa.
--   • custom_stories.steps ostaje jsonb niz: koraci se uvek čitaju i čuvaju
--     zajedno sa pričom (2–8 komada) i nikada se ne pretražuju pojedinačno.
--   • Rezultat partije ostaje u progress_logs (nema posebne tabele po pitanju):
--     aplikacija beleži samo zbir po partiji, a ne pojedinačne odgovore.
--   • child_game_progress je POGLED, a ne tabela koju održava okidač: zbirna
--     tabela bi bila isti podatak sačuvan dva puta (mogla bi da se „razmimoiđe”
--     sa zapisima). Dete ima stotine do nekoliko hiljada zapisa, što indeks
--     (child_id, activity_id) pročita za oko milisekundu.
--   • Nema particionisanja: reč je o desetinama ili stotinama hiljada redova, a
--     ne o stotinama miliona; particije bi samo otežale strane ključeve i upite.
--   • progress_logs zadržava notes, duration_minutes i success_level iako su
--     izvedeni iz level/stars/score/duration_seconds. To je svesna, privremena
--     redundansa zbog kompatibilnosti: stariji zapisi imaju SAMO te kolone, a u
--     starim bazama one mogu biti NOT NULL. Kod pri čitanju uvek daje prednost
--     novim kolonama. Uklanjanje je posao za zasebnu migraciju, kada starih
--     zapisa i starih čitalaca više ne bude.
--   • progress_logs.recorded_by ostaje i uz play_sessions.created_by: zapis tako
--     zna ko ga je zabeležio i ako se poseta obriše (session_id tada postaje NULL).
--
-- PREDUSLOV
--   Tabele iz migracije 0001 (users, children, activities, progress_logs). Na
--   praznoj bazi prvo pokrenite 0001. Migracije 0002 i 0003 nisu preduslov.
--   Pogled traži Postgres 15 ili noviji (security_invoker); na starijem se
--   preskače uz poruku, a aplikacija nastavlja da računa nivoe na stari način.
--
-- BEZBEDNA JE ZA PONAVLJANJE (idempotentna) I NIŠTA NE BRIŠE
--   Dodaje tabelu, kolone, pogled, okidač i indekse ako već ne postoje. Jedina
--   izmena postojećih redova je dopuna prazne kolone progress_logs.passed (i
--   activities.graded za igru 8). Stare kolone raspoloženja se ne diraju.
--   Dopuna jednom prepisuje sve redove progress_logs i pravi indekse, pa na većoj
--   bazi traje nekoliko sekundi; za to vreme upis partija čeka. Pokrenite je kada
--   deca ne igraju. Ako nešto ne može bezbedno da se doda, migracija NE pada, već
--   zabeleži poruku (NOTICE + tabela rezultata na kraju). Poruke tipa "already
--   exists, skipping" su očekivane.
--
-- BEZ OVE MIGRACIJE aplikacija i dalje radi kao do sada: raspoloženje se čuva uz
--   svaki zapis partije, a otključani nivoi se računaju čitanjem zapisa po igri.
--
-- KAKO SE POKREĆE
--   • Supabase Dashboard → SQL Editor → New query → nalepite ceo fajl → Run, ili
--   • Supabase CLI:  supabase link --project-ref <ref>  pa  supabase db push
--
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Preduslov: tabele iz migracije 0001
-- -----------------------------------------------------------------------------

do $$
begin
    if to_regclass('public.users') is null or to_regclass('public.children') is null
       or to_regclass('public.activities') is null or to_regclass('public.progress_logs') is null then
        raise exception 'Bright Minds: tabele users, children, activities i progress_logs ne postoje. Prvo pokrenite migraciju 0001_bright_minds_schema.sql.';
    end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Izveštaj i pomoćne funkcije (žive samo u ovoj sesiji, šema pg_temp)
-- -----------------------------------------------------------------------------

create temporary table if not exists bm_migration_report (
    n      integer generated always as identity,
    run_at timestamptz not null default now(),
    poruka text not null
);

insert into pg_temp.bm_migration_report (poruka)
values ('Migracija 0004 je primenjena. Ako ispod ima još redova, to su stavke koje traže vašu pažnju.');

-- Beleži poruku u izveštaj i ispisuje je kao NOTICE.
create or replace function pg_temp.bm4_note(p_message text) returns void
language plpgsql
as $fn$
begin
    insert into pg_temp.bm_migration_report (poruka) values (p_message);
    raise notice 'Bright Minds: %', p_message;
end
$fn$;

-- Dodaje strani ključ ako ograničenje sa tim imenom još ne postoji. Greška (npr.
-- children.id bez primarnog ključa u staroj bazi) se beleži i ne obara migraciju.
create or replace function pg_temp.bm4_add_fk(
    p_table text, p_column text, p_ref_table text, p_on_delete text, p_name text, p_consequence text
) returns void
language plpgsql
as $fn$
begin
    if exists (
        select 1 from pg_constraint
         where conrelid = format('public.%I', p_table)::regclass and conname = p_name
    ) then
        return;
    end if;

    execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I (id) on delete %s',
        p_table, p_name, p_column, p_ref_table, p_on_delete
    );
exception when others then
    perform pg_temp.bm4_note(format('strani ključ %s.%s -> %s.id nije dodat: %s. %s', p_table, p_column, p_ref_table, sqlerrm, p_consequence));
end
$fn$;

-- -----------------------------------------------------------------------------
-- 1. Posete (play_sessions)
--    Jedan red po poseti: dete uđe u igru, (opciono) izabere lice „kako si?”,
--    odigra jedan ili više nivoa i (opciono) izabere lice na izlasku.
--    ended_at se upisuje kada dete odgovori na pitanje posle igre; ako poseta
--    završi bez tog pitanja ostaje NULL (kraj igranja je tada vreme poslednje
--    partije te posete — ne čuva se dva puta).
-- -----------------------------------------------------------------------------

create table if not exists public.play_sessions (
    id          bigint generated by default as identity primary key,
    child_id    bigint not null,
    started_at  timestamptz not null default now(),
    ended_at    timestamptz,
    mood_before text,
    mood_after  text,
    created_by  bigint,
    -- Iste dozvoljene vrednosti kao progress_logs_mood_*_check u migraciji 0001
    constraint play_sessions_mood_before_check
        check (mood_before in ('very_upset', 'upset', 'neutral', 'happy', 'very_happy')),
    constraint play_sessions_mood_after_check
        check (mood_after in ('very_upset', 'upset', 'neutral', 'happy', 'very_happy'))
);

comment on table public.play_sessions is
    'Jedna poseta deteta igri. Raspoloženje pre/posle se čuva ovde jednom, a ne uz svaki zapis partije.';
comment on column public.play_sessions.ended_at is
    'Kada je dete odgovorilo na pitanje posle igre; NULL ako poseta nije završena tim pitanjem.';
comment on column public.play_sessions.created_by is
    'Nalog (users.id) pod kojim je poseta zabeležena; NULL ako je nalog obrisan.';

-- -----------------------------------------------------------------------------
-- 2. Nove kolone
-- -----------------------------------------------------------------------------

alter table public.progress_logs
    add column if not exists session_id bigint,
    add column if not exists passed     boolean;

alter table public.activities
    add column if not exists graded boolean not null default true;

comment on column public.progress_logs.session_id is
    'Poseta (play_sessions.id) kojoj partija pripada. NULL = zapis pre migracije 0004; tada važe mood_before/mood_after iz samog zapisa.';
comment on column public.progress_logs.passed is
    'Da li partija otključava sledeći nivo (odluka doneta pri upisu). Pravilo: isLevelPassed u app/api/_lib/children.ts.';
comment on column public.activities.graded is
    'false = igra bez pogrešnih odgovora: svaki završen nivo je položen. Izvor istine: GAMES[].graded u lib/games.ts.';

-- -----------------------------------------------------------------------------
-- 3. Strani ključevi
--    Brisanje deteta briše i njegove posete; brisanje naloga samo prazni polje
--    "ko je zabeležio"; brisanje posete ne briše partije, samo ih odvezuje.
-- -----------------------------------------------------------------------------

do $$
begin
    perform pg_temp.bm4_add_fk('play_sessions', 'child_id', 'children', 'cascade', 'play_sessions_child_id_fkey',
        'Posete rade, ali se ne brišu automatski kada se obriše dete (aplikacija ih tada briše sama).');
    perform pg_temp.bm4_add_fk('play_sessions', 'created_by', 'users', 'set null', 'play_sessions_created_by_fkey',
        'Posete rade i bez njega.');
    perform pg_temp.bm4_add_fk('progress_logs', 'session_id', 'play_sessions', 'set null', 'progress_logs_session_id_fkey',
        'Partije se i dalje vezuju za posetu, samo bez provere u bazi.');
end
$$;

-- -----------------------------------------------------------------------------
-- 4. Igra bez pogrešnih odgovora (Emocije, ID 8)
-- -----------------------------------------------------------------------------

do $$
begin
    update public.activities set graded = false where id = 8 and graded;

    if not exists (select 1 from public.activities where id = 8) then
        insert into public.activities (id, title, description, category, difficulty_level, instructions, graded)
        values (8, 'Emocije', 'Kako se ko oseća?', 'emotional', 'beginner', 'Kako se ko oseća?', false);
    end if;
exception when others then
    perform pg_temp.bm4_note(format('igra 8 (Emocije) nije označena kao igra bez ocenjivanja (%s). Aplikacija to zna iz koda i šalje passed pri upisu, pa ovo utiče samo na dopunu starih zapisa te igre.', sqlerrm));
end
$$;

-- -----------------------------------------------------------------------------
-- 5. Položen nivo (progress_logs.passed)
--    PRAVILO — isto na tri mesta: isLevelPassed (app/api/_lib/children.ts),
--    okidač ispod i dopuna ispod. Ako ga menjate, menjajte sva tri.
--      • igra bez ocenjivanja (activities.graded = false)      → položeno
--      • zapis sa brojem odgovora (correct_count, total_count) → bar polovina
--        zadataka rešena samostalno (ADVANCE_RATIO = 0.5 u lib/games.ts)
--      • stariji zapis bez tih kolona → bar jedna zvezdica; bez zvezdica sve
--        osim uspešnosti 'struggled'
-- -----------------------------------------------------------------------------

-- Okidač: popunjava passed kada ga upis ne pošalje. Aplikacija ga šalje sama;
-- ovo pokriva stariji kod koji još radi posle migracije i upis koji je pao na
-- stariji skup kolona — bez okidača bi takve partije ostale NULL i pogled ih ne
-- bi računao u otključane nivoe.
create or replace function public.bm_progress_logs_set_passed()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
    if new.passed is null then
        new.passed := case
            when not coalesce((select a.graded from public.activities a where a.id = new.activity_id), true)
                then true
            when new.correct_count is not null and new.total_count is not null
                then case when new.total_count > 0
                          then new.correct_count::numeric / new.total_count >= 0.5
                          else false end
            else coalesce(new.stars >= 1, new.success_level::text is distinct from 'struggled')
        end;
    end if;
    return new;
end
$fn$;

do $$
begin
    if not exists (
        select 1 from pg_trigger
         where tgrelid = 'public.progress_logs'::regclass
           and tgname = 'progress_logs_set_passed'
           and not tgisinternal
    ) then
        create trigger progress_logs_set_passed
            before insert on public.progress_logs
            for each row execute function public.bm_progress_logs_set_passed();
    end if;
end
$$;

-- Dopuna postojećih redova (samo tamo gde je kolona prazna).
update public.progress_logs p
   set passed = case
           when not coalesce((select a.graded from public.activities a where a.id = p.activity_id), true)
               then true
           when p.correct_count is not null and p.total_count is not null
               then case when p.total_count > 0
                         then p.correct_count::numeric / p.total_count >= 0.5
                         else false end
           else coalesce(p.stars >= 1, p.success_level::text is distinct from 'struggled')
       end
 where p.passed is null;

-- -----------------------------------------------------------------------------
-- 6. Pogled: napredak po (dete, igra)
-- -----------------------------------------------------------------------------
-- BEZBEDNOST — zašto security_invoker i REVOKE:
--   Običan pogled se izvršava sa pravima svog VLASNIKA (uloga koja pokreće
--   migraciju), a ona zaobilazi Row Level Security. Uz to Supabase novim
--   objektima u šemi public podrazumevano daje prava ulogama `anon` i
--   `authenticated`. Takav pogled bi zato bio rupa: bilo ko bi JAVNIM anon
--   ključem mogao da čita napredak sve dece, iako je sama tabela progress_logs
--   zaključana RLS-om.
--   Dve nezavisne brave:
--     1) security_invoker = true — pogled čita tabelu sa pravima ONOGA KO PITA,
--        pa za anon/authenticated važi RLS tabele (nema pravila → nema redova);
--     2) REVOKE ALL za anon i authenticated — te uloge pogled ne mogu ni da
--        upitaju. (Uloge postoje na Supabase-u, ali ne i na običnom Postgres-u,
--        pa se prvo proverava da li postoje.)
--   Server koristi service-role ključ, koji zaobilazi RLS, pa on vidi sve.
--
-- highest_level_passed je 0 kada dete igru jeste igralo, ali još nijedan nivo
-- nije položilo. Igra koju dete nije igralo nema red u pogledu.

do $$
begin
    if current_setting('server_version_num')::integer < 150000 then
        perform pg_temp.bm4_note('pogled child_game_progress NIJE napravljen: traži Postgres 15 ili noviji (security_invoker). Aplikacija nastavlja da računa otključane nivoe čitanjem zapisa, kao do sada.');
        return;
    end if;

    execute $view$
        create or replace view public.child_game_progress
        with (security_invoker = true) as
        select p.child_id,
               p.activity_id,
               coalesce(max(p.level) filter (where p.passed), 0)::integer as highest_level_passed,
               count(*)::integer                                          as plays,
               max(p.completed_at)                                        as last_played_at
          from public.progress_logs p
         group by p.child_id, p.activity_id
    $view$;

    execute $c$comment on view public.child_game_progress is
        'Najviši položen nivo, broj partija i poslednja partija po (dete, igra). security_invoker + bez prava za anon/authenticated — videti migraciju 0004.'$c$;

    execute 'revoke all on public.child_game_progress from public';
    if exists (select 1 from pg_roles where rolname = 'anon') then
        execute 'revoke all on public.child_game_progress from anon';
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute 'revoke all on public.child_game_progress from authenticated';
    end if;
    -- Server čita pogled kao service_role; pravo se daje izričito da ne zavisi
    -- od podrazumevanih prava projekta.
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        execute 'grant select on public.child_game_progress to service_role';
    end if;
exception when others then
    perform pg_temp.bm4_note(format('pogled child_game_progress nije napravljen: %s. Aplikacija nastavlja da računa otključane nivoe čitanjem zapisa, kao do sada.', sqlerrm));
end
$$;

-- -----------------------------------------------------------------------------
-- 7. Indeksi
-- -----------------------------------------------------------------------------
-- SVI UPITI IZ KODA (tabela · filter · redosled → indeks koji ih pokriva).
-- "PK" = primarni ključ; (0001)/(0003) = indeks iz te migracije; NOVO = dodaje
-- se ovde.
--
-- users
--   id = ?                                              → PK
--   email ILIKE ? · order id · limit 5 (prijava)        → nema indeksa; videti (a)
--   INSERT (registracija)                               → users_email_lower_key (0001) čuva jedinstvenost
--
-- children
--   id = ? / id IN (…) · order first_name, id           → PK (sortira se šačica redova)
--   pin_code = ? [· id <> ?] · order id · limit 2       → children_pin_code_key (0001, delimičan jedinstven)
--   UPDATE … where id = ? [and stara vrednost]          → PK
--
-- user_children
--   user_id = ? [and child_id = ?]                      → user_children_user_child_key (0001)
--   child_id = ? · order is_primary desc, user_id       → user_children_child_idx (0001)
--   DELETE where child_id = ?                           → user_children_child_idx (0001)
--
-- progress_logs
--   child_id = ? and activity_id IN (…) · order completed_at desc, id desc
--       (statistika napretka)                           → progress_logs_child_completed_idx (0001)
--   child_id = ? [and id < ?] · order id desc · limit 1000 (izvoz u CSV)
--                                                       → indeksi iz 0001 koji počinju sa child_id, za filter; videti (b)
--   child_id = ? and activity_id = ? and level is not null · order level desc, id desc
--       (otključani nivoi u bazi BEZ pogleda)           → progress_logs_child_activity_idx (0001)
--   child_id = ? · group by activity_id (pogled child_game_progress)
--                                                       → progress_logs_child_activity_idx (0001); videti (c)
--   id IN (…) and child_id = ? (UPDATE mood_after)      → PK
--   DELETE where child_id = ? / kaskada sa children     → indeksi iz 0001 koji počinju sa child_id
--   session_id = ? (ON DELETE SET NULL sa play_sessions) → NOVO progress_logs_session_idx
--   recorded_by = ? (ON DELETE SET NULL sa users)       → NOVO progress_logs_recorded_by_idx
--   activity_id = ? (strani ključ ka activities)        → namerno bez indeksa; videti (d)
--
-- play_sessions
--   id = ? and child_id = ? (provera / UPDATE)          → PK
--   child_id = ? · order started_at desc, id desc       → NOVO play_sessions_child_started_idx
--   DELETE where child_id = ? / kaskada sa children     → NOVO play_sessions_child_started_idx
--   created_by = ? (ON DELETE SET NULL sa users)        → NOVO play_sessions_created_by_idx
--
-- custom_stories (0003)
--   child_id = ? · order updated_at desc, id desc       → custom_stories_child_updated_idx (0003)
--   id = ? and child_id = ?                             → PK
--
-- activities — aplikacija ih ne čita (nazivi igara su u kodu); samo PK.
--
-- NAPOMENE
--   (a) Prijava traži nalog sa ILIKE (bez obzira na velika/mala slova), a to
--       indeks nad lower(email) ne može da ubrza. Tabela naloga je mala, pa je
--       čitanje cele tabele brže od održavanja trigram indeksa (pg_trgm). Pravo
--       rešenje, ako naloga bude mnogo, jeste čuvanje adrese malim slovima i
--       poređenje sa "=" — to je izmena koda prijave, van ove migracije.
--   (b) Izvoz filtrira po indeksu, a redosled po id-u sortira u memoriji. To je
--       redak, ručno pokrenut posao nad zapisima JEDNOG deteta; treći indeks koji
--       počinje sa child_id samo bi usporio svaki upis partije.
--   (c) Pogled mora da pročita SVE partije deteta (zbog broja partija i poslednje
--       partije), pa mu delimičan indeks (child_id, activity_id, level desc)
--       WHERE passed ne pomaže — provereno EXPLAIN-om, planer ga ne koristi.
--       Postojeći indeks (child_id, activity_id) vraća redove već grupisane po
--       igri (1000 partija jednog deteta ≈ 0,4 ms). Pokrivajući indeks
--       (… INCLUDE (passed, completed_at)) bi to vreme prepolovio, ali bi bio
--       duplikat postojećeg i plaćao bi se pri svakom upisu partije.
--   (d) activity_id ima 7–8 različitih vrednosti, a igre se nikada ne brišu:
--       indeks bi se plaćao pri svakom upisu, a ne bi ga koristio nijedan upit.
--   Indeks nad custom_stories.created_by nije dodat iz istog razloga kao (d):
--   tabela je mala (najviše 20 priča po detetu), a nalozi se retko brišu.

-- Odvezivanje partija kada se obriše poseta (ON DELETE SET NULL). Delimičan:
-- stariji zapisi bez posete ne zauzimaju mesto u indeksu.
create index if not exists progress_logs_session_idx
    on public.progress_logs (session_id)
    where session_id is not null;

-- Pražnjenje "ko je zabeležio" kada se obriše nalog (ON DELETE SET NULL); bez
-- indeksa Postgres za svaki obrisan nalog čita celu tabelu partija.
create index if not exists progress_logs_recorded_by_idx
    on public.progress_logs (recorded_by)
    where recorded_by is not null;

-- Posete jednog deteta, najnovije prvo (statistika, izvoz, brisanje, kaskada).
create index if not exists play_sessions_child_started_idx
    on public.play_sessions (child_id, started_at desc);

create index if not exists play_sessions_created_by_idx
    on public.play_sessions (created_by)
    where created_by is not null;

-- -----------------------------------------------------------------------------
-- 8. Row Level Security
--    Uključen, bez pravila za `anon` i `authenticated` — javnim ključem se posete
--    ne mogu ni čitati ni menjati (objašnjenje u migraciji 0001, odeljak 10).
-- -----------------------------------------------------------------------------

alter table public.play_sessions enable row level security;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        execute 'grant all on public.play_sessions to service_role';
    end if;
end
$$;

commit;

-- Sveže statistike za planer upita (nove kolone, nova tabela, novi indeksi).
analyze public.progress_logs;
analyze public.play_sessions;
analyze public.activities;

-- Supabase API (PostgREST) pamti spisak tabela i kolona; ovim ga odmah osvežavamo
-- da aplikacija vidi novu tabelu, kolone i pogled. Van Supabase-a ne radi ništa.
notify pgrst, 'reload schema';

-- Izveštaj: prvi red potvrđuje da je migracija prošla; ostali (ako ih ima) su
-- stavke koje nisu mogle bezbedno da se dodaju i šta treba uraditi.
select poruka as "Bright Minds — rezultat migracije"
  from pg_temp.bm_migration_report
 where run_at = (select max(run_at) from pg_temp.bm_migration_report)
 order by n;

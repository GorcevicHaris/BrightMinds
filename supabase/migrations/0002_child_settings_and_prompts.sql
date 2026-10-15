-- =============================================================================
-- Bright Minds — migracija 0002: podešavanja po detetu i odgovori uz pomoć
-- =============================================================================
--
-- ŠTA RADI
--   1. children.settings (jsonb, podrazumevano '{}')
--      Podešavanja koja roditelj ili terapeut bira za dete: zvuk, pismo, velika
--      slova, pomoć posle greške, dnevno ograničenje igre… Model i dozvoljene
--      vrednosti su u lib/childSettings.ts; aplikacija upisuje samo prečišćen
--      objekat, a prazan objekat '{}' znači "preporuke za uzrast".
--   2. progress_logs.prompted_count (integer, sme biti NULL)
--      Koliko zadataka u partiji je dete rešilo tek UZ POMOĆ (istaknut tačan
--      odgovor). correct_count ostaje broj SAMOSTALNO tačnih odgovora. NULL znači
--      "nije zabeleženo" (partije sačuvane pre ove migracije).
--   3. CHECK ograničenje: prompted_count je NULL ili >= 0 (dodaje se kao
--      NOT VALID, pa potvrđuje ako ga nijedan red ne krši — kao u migraciji 0001).
--
-- PREDUSLOV
--   Tabele children i progress_logs moraju da postoje. Na praznoj bazi prvo
--   pokrenite 0001_bright_minds_schema.sql.
--
-- BEZBEDNA JE ZA PONAVLJANJE (idempotentna) I NIŠTA NE BRIŠE
--   Samo dodaje dve kolone i jedno ograničenje ako već ne postoje. Postojeći
--   redovi se ne menjaju (deca dobijaju settings = '{}', stare partije
--   prompted_count = NULL). Ako ograničenje ne može da se doda, migracija NE
--   pada, već zabeleži poruku: ispiše je kao NOTICE i prikaže u tabeli rezultata
--   na kraju. Poruke tipa "already exists, skipping" su očekivane.
--
-- BEZ OVE MIGRACIJE aplikacija i dalje radi: igra koristi preporučena podešavanja
--   za uzrast, čuvanje podešavanja vraća grešku 409 sa uputstvom da se pokrene ova
--   migracija, a partije se čuvaju bez broja odgovora uz pomoć.
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
    if to_regclass('public.children') is null or to_regclass('public.progress_logs') is null then
        raise exception 'Bright Minds: tabele children i progress_logs ne postoje. Prvo pokrenite migraciju 0001_bright_minds_schema.sql.';
    end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Izveštaj (živi samo u ovoj sesiji; isti oblik kao u migraciji 0001)
-- -----------------------------------------------------------------------------

create temporary table if not exists bm_migration_report (
    n      integer generated always as identity,
    run_at timestamptz not null default now(),
    poruka text not null
);

insert into pg_temp.bm_migration_report (poruka)
values ('Migracija 0002 je primenjena. Ako ispod ima još redova, to su stavke koje traže vašu pažnju.');

-- -----------------------------------------------------------------------------
-- 1. Podešavanja po detetu
-- -----------------------------------------------------------------------------

alter table public.children
    add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.children.settings is
    'Podešavanja po detetu (lib/childSettings.ts). Prazan objekat = preporuke za uzrast.';

-- -----------------------------------------------------------------------------
-- 2. Odgovori uz pomoć
-- -----------------------------------------------------------------------------

alter table public.progress_logs
    add column if not exists prompted_count integer;

comment on column public.progress_logs.prompted_count is
    'Broj zadataka rešenih tek uz pomoć (istaknut odgovor). correct_count = samostalno tačni. NULL = nije zabeleženo.';

-- -----------------------------------------------------------------------------
-- 3. CHECK ograničenje (NOT VALID, pa VALIDATE ako ga nijedan red ne krši)
-- -----------------------------------------------------------------------------

do $$
declare
    v_violations bigint;
    v_message    text;
begin
    if exists (
        select 1 from pg_constraint
         where conrelid = 'public.progress_logs'::regclass
           and conname = 'progress_logs_prompted_count_check'
    ) then
        return;
    end if;

    select count(*) into v_violations
      from public.progress_logs
     where not (prompted_count is null or prompted_count >= 0);

    alter table public.progress_logs
        add constraint progress_logs_prompted_count_check
        check (prompted_count is null or prompted_count >= 0) not valid;

    if v_violations = 0 then
        alter table public.progress_logs validate constraint progress_logs_prompted_count_check;
    else
        v_message := format('ograničenje progress_logs_prompted_count_check dodato kao NOT VALID: %s postojećih redova u tabeli progress_logs ga krši (ti redovi ne mogu da se menjaju dok se ne isprave).', v_violations);
        insert into pg_temp.bm_migration_report (poruka) values (v_message);
        raise notice 'Bright Minds: %', v_message;
    end if;
exception when others then
    v_message := format('ograničenje progress_logs_prompted_count_check nije dodato: %s', sqlerrm);
    insert into pg_temp.bm_migration_report (poruka) values (v_message);
    raise notice 'Bright Minds: %', v_message;
end
$$;

commit;

-- Supabase API (PostgREST) pamti spisak kolona; ovim ga odmah osvežavamo da
-- aplikacija vidi nove kolone bez čekanja. Van Supabase-a naredba ne radi ništa.
notify pgrst, 'reload schema';

-- Izveštaj: prvi red potvrđuje da je migracija prošla; ostali (ako ih ima) su
-- stavke koje nisu mogle bezbedno da se dodaju i šta treba uraditi.
select poruka as "Bright Minds — rezultat migracije"
  from pg_temp.bm_migration_report
 where run_at = (select max(run_at) from pg_temp.bm_migration_report)
 order by n;

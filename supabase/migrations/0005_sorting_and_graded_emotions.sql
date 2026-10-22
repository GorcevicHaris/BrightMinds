-- =============================================================================
-- Bright Minds — migracija 0005: igra „Razvrstaj” i ocenjivanje Emocija
-- =============================================================================
--
-- ŠTA RADI I ZAŠTO
--   1. Nova igra „Razvrstaj” (activities.id = 9). Rezultati partija se vezuju za
--      tabelu activities stranim ključem, pa bez ovog reda server ne može da
--      sačuva rezultat nove igre.
--   2. Emocije (id 8) se sada ocenjuju: tačno je osećanje koje većina ljudi tada
--      ima, a dete posle pogrešnog izbora pokušava ponovo (lib/games.ts: graded).
--      Kolona activities.graded se usklađuje sa kodom.
--   3. Pravilo „položen nivo” u okidaču: nivo bez ocenjivanih zadataka (priča
--      pročitana u režimu „Čitaj priču”, total_count = 0) je položen — isto kao
--      isLevelPassed u app/api/_lib/children.ts. Aplikacija passed šalje sama;
--      okidač je rezerva za stariji kod.
--
-- Bezbedno je pokrenuti više puta (svaki korak proverava stanje pre izmene).
-- =============================================================================

-- 1. Igra „Razvrstaj”
insert into public.activities (id, title, description, category, difficulty_level, instructions)
values (9, 'Razvrstaj', 'Stavi u pravu korpu', 'cognitive', 'beginner', 'Stavi u pravu korpu')
on conflict (id) do update set title = excluded.title, description = excluded.description;

-- 2. Emocije se ocenjuju (kolona postoji od migracije 0004)
do $$
begin
    if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'activities' and column_name = 'graded'
    ) then
        update public.activities set graded = true where id in (8, 9) and graded is distinct from true;
    end if;
end
$$;

-- 3. Okidač: nivo bez zadataka je položen
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
                          else true end
            else coalesce(new.stars >= 1, new.success_level::text is distinct from 'struggled')
        end;
    end if;
    return new;
end
$fn$;

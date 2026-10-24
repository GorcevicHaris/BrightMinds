# Baza podataka (Supabase)

Aplikacija koristi Supabase Postgres. Bazi pristupa **samo server** (API rute i
serverske komponente) preko service-role ključa — pregledač nikada ne čita tabele
direktno.

## 1. Promenljive okruženja

Upišite ih u `.env.local` u korenu projekta (fajl se ne šalje u git), a na
hostingu u podešavanja okruženja.

| Promenljiva | Obavezna | Čemu služi |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | da | Adresa projekta (Supabase → Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | da | Javni ključ; koristi ga samo praćenje igre uživo (Realtime Broadcast) |
| `SUPABASE_SERVICE_ROLE_KEY` | da | Tajni serverski ključ za sve upite. **Nikada ga ne stavljajte u kod koji ide u pregledač, niti mu dodajte prefiks `NEXT_PUBLIC_`.** |
| `JWT_SECRET` | da | Dugačak nasumičan niz za potpisivanje sesija (npr. `openssl rand -base64 48`) |
| `ELEVENLABS_API_KEY` | ne | Glas (čitanje teksta). Bez njega `/api/tts` vraća 503 i aplikacija radi bez glasa |
| `ELEVENLABS_VOICE_ID` | ne | Muški glas (postoji podrazumevani) |
| `ELEVENLABS_FEMALE_VOICE_ID` | ne | Ženski glas (postoji podrazumevani) |

Ako `NEXT_PUBLIC_SUPABASE_URL` ili `SUPABASE_SERVICE_ROLE_KEY` nedostaju, API
rute vraćaju `503` sa porukom „Baza podataka nije podešena. Dodajte Supabase
ključeve u .env.local.” Posle izmene `.env.local` ponovo pokrenite server.

## 2. Primena migracija

Migracije se pokreću **redom, po broju u nazivu fajla**:

| Fajl | Šta dodaje |
| --- | --- |
| [`migrations/0001_bright_minds_schema.sql`](./migrations/0001_bright_minds_schema.sql) | Tabele, kolone za rezultate partija, indekse, strane ključeve i RLS |
| [`migrations/0002_child_settings_and_prompts.sql`](./migrations/0002_child_settings_and_prompts.sql) | Podešavanja po detetu i broj odgovora uz pomoć — videti odeljak 5 |
| [`migrations/0003_custom_stories.sql`](./migrations/0003_custom_stories.sql) | Tabelu za „Moje priče” (priče koje odrasli piše za dete) — videti odeljak 6 |
| [`migrations/0004_sessions_and_performance.sql`](./migrations/0004_sessions_and_performance.sql) | Posete (`play_sessions`), sačuvanu odluku „nivo položen”, pogled za otključane nivoe i indekse koji su nedostajali — videti odeljak 7 |

Sve su **bezbedne za ponavljanje** i **ne brišu podatke** — mogu da se pokrenu
više puta. `0001` radi i na praznoj i na postojećoj bazi; `0002` traži da tabele
`children` i `progress_logs` već postoje, `0003` tabele `children` i `users`, a
`0004` sve tabele iz `0001` (na praznoj bazi prvo pokrenite `0001`, inače se
prekidaju sa jasnom porukom i ništa ne menjaju).

**Preko Supabase Dashboard-a (najjednostavnije)**

1. Otvorite projekat → **SQL Editor** → **New query**.
2. Nalepite ceo sadržaj fajla `0001_bright_minds_schema.sql`.
3. Kliknite **Run**.
4. Pročitajte tabelu „Bright Minds — rezultat migracije” ispod upita. Prvi red
   potvrđuje da je migracija prošla; ostali redovi (ako ih ima) su stavke koje
   traže vašu pažnju — videti odeljak 3.
5. Ponovite korake 1–4 za `0002_child_settings_and_prompts.sql`, pa za
   `0003_custom_stories.sql` i `0004_sessions_and_performance.sql`.

**Preko Supabase CLI-ja**

```bash
supabase link --project-ref <ref-projekta>
supabase db push
```

Pre pokretanja na produkciji napravite rezervnu kopiju (Supabase → Database →
Backups).

> **Važno:** migracija `0001` uključuje Row Level Security na svim tabelama, bez
> pravila za javni (anon) ključ. Od tog trenutka server **mora** imati
> `SUPABASE_SERVICE_ROLE_KEY`; sa samim anon ključem više nema pristupa
> podacima. Proverite da je ključ podešen na hostingu **pre** nego što pokrenete
> migraciju.

## 3. Poruke koje migracija može da ispiše

Kada nešto ne može bezbedno da se doda, migracija ne pada nego zabeleži poruku:
prikaže je u tabeli rezultata na kraju i ispiše kao NOTICE koji počinje sa
`Bright Minds:`. Ispravite podatke i pokrenite je ponovo. (Poruke „already
exists, skipping” su očekivane i mogu se zanemariti.)

| Poruka | Šta uraditi |
| --- | --- |
| Jedinstveni indeks nad `children.pin_code` nije napravljen | Dva ili više deteta imaju isti tajni kod. Ta deca ne mogu da se prijave kodom dok im roditelj u panelu ne izabere nove sličice. |
| Jedinstveni indeks nad `lower(email)` nije napravljen | Postoje nalozi čije se adrese razlikuju samo po velikim/malim slovima. Spojite ih ili obrišite duplikat. |
| Strani ključ nije dodat: N redova pokazuje na nepostojeći zapis | Postoje „siročići” (npr. rezultati obrisanog deteta). Obrišite ih ili ispravite. |
| Ograničenje … dodato kao NOT VALID / nije dodato | Postojeći redovi imaju vrednost van dozvoljenog skupa (npr. nepoznat pol ili raspoloženje). |

## 4. Rad pre i posle migracije 0001

Aplikacija **radi i pre migracije**: ako nove kolone ne postoje, rezultati se
čuvaju u starom obliku (beleška „Nivo N, Zvezdice: S, Rezultat: R”), a
otključani nivoi se računaju čitanjem tih beleški.

Posle migracije:

- svaka partija čuva nivo, zvezdice, rezultat, broj tačnih/ukupnih odgovora i
  trajanje u sekundama u posebnim kolonama, pa je **statistika tačnija** i brža;
- stari zapisi se automatski dopunjuju iz beleški;
- tajni kod deteta je jedinstven na nivou baze;
- brisanje deteta briše i njegove rezultate i veze (ON DELETE CASCADE);
- tabele su zatvorene za direktan pristup javnim ključem (RLS).

Napomena: ako nalog ne može da se napravi pre migracije (greška pri
registraciji), verovatno je kolona `users.parental_pin` u staroj bazi obavezna
bez podrazumevane vrednosti — migracija to ispravlja.

## 5. Migracija 0002 — podešavanja po detetu i odgovori uz pomoć

Fajl: [`migrations/0002_child_settings_and_prompts.sql`](./migrations/0002_child_settings_and_prompts.sql)

Dodaje (samo ako već ne postoji):

| Šta | Čemu služi |
| --- | --- |
| `children.settings` (`jsonb`, podrazumevano `{}`) | Podešavanja koja roditelj ili terapeut bira za dete: zvuk, pismo, velika slova, pomoć posle greške, dnevno ograničenje igre… Dozvoljene vrednosti su u `lib/childSettings.ts`; server upisuje samo prečišćen objekat. Prazan objekat znači „preporuke za uzrast”. |
| `progress_logs.prompted_count` (`integer`, sme biti prazno) | Koliko zadataka u partiji je dete rešilo tek **uz pomoć** (istaknut tačan odgovor). `correct_count` ostaje broj **samostalno** tačnih odgovora, pa terapeut vidi šta dete ume bez pomoći. Prazno = nije zabeleženo (starije partije). |
| Ograničenje `progress_logs_prompted_count_check` | `prompted_count` je prazno ili ≥ 0. Dodaje se kao `NOT VALID` i odmah potvrđuje ako ga nijedan red ne krši. |

Postojeći redovi se ne menjaju. Na kraju migracija osvežava spisak kolona koji
pamti Supabase API (`notify pgrst, 'reload schema'`), pa nove kolone važe odmah.

**Aplikacija radi i bez migracije 0002**, uz dva izuzetka:

- **čuvanje podešavanja** (`PUT /api/children/[id]/settings`) vraća `409` sa
  porukom „Podešavanja traže novu verziju baze. Pokrenite migraciju 0002 iz
  fascikle supabase/migrations.” Čitanje radi i vraća prazna podešavanja, pa
  igra koristi preporuke za uzrast deteta;
- **broj odgovora uz pomoć se ne čuva** — partija se i dalje snima sa svim
  ostalim podacima (nivo, zvezdice, samostalno tačni i ukupni odgovori), a
  statistika ne prikazuje odgovore „uz pomoć”.

Otključavanje nivoa ne zavisi od ove migracije: nivo otključava sledeći kada je
dete bar polovinu zadataka rešilo samostalno (`correct_count / total_count`,
kolone iz migracije `0001`). Za starije zapise bez tih kolona važi staro pravilo
(bar jedna zvezdica).

## 6. Migracija 0003 — „Moje priče”

Fajl: [`migrations/0003_custom_stories.sql`](./migrations/0003_custom_stories.sql)

Roditelj ili terapeut može da napiše kratku priču baš za svoje dete (npr. „Sutra
idemo kod zubara”): naslov, sličica i 2–8 kratkih koraka. Dete je čita ili sluša
korak po korak, bez pitanja i bez bodovanja. Migracija dodaje (samo ako već ne
postoji):

| Šta | Čemu služi |
| --- | --- |
| Tabela `custom_stories` | Jedan red po priči: `child_id`, `title`, `emoji`, `steps` (`jsonb` niz `[{ "text": "…", "emoji": "…" }]`), `created_by`, `created_at`, `updated_at`. Oblik i ograničenja dužine proverava server (`lib/customStories.ts`); najviše 20 priča po detetu. |
| Strani ključevi | Brisanje deteta briše i njegove priče (`ON DELETE CASCADE`); brisanje naloga samo prazni `created_by`. |
| Indeks `custom_stories_child_updated_idx` | Spisak priča jednog deteta, najnovije prvo. |
| Okidač `custom_stories_set_updated_at` | Održava `updated_at` (ista funkcija `bm_set_updated_at` kao za `children`). |
| Row Level Security, bez pravila | Kao i ostale tabele: pristup ima samo server, service-role ključem. |

Postojeće tabele i redovi se ne menjaju. Ako strani ključ ne može da se doda,
migracija ne pada nego to prijavi u tabeli rezultata (videti odeljak 3). Na kraju
osvežava spisak tabela koji pamti Supabase API (`notify pgrst, 'reload schema'`).

**Aplikacija radi i bez migracije 0003:**

- **čitanje** (`GET /api/children/[id]/stories`) vraća prazan spisak, pa dete
  jednostavno ne vidi odeljak „Moje priče”;
- **čuvanje** (`POST`, `PUT`) i **brisanje** (`DELETE`) vraćaju `409` sa porukom
  „Priče traže novu verziju baze. Pokrenite migraciju 0003 iz fascikle
  supabase/migrations.”

## 7. Migracija 0004 — posete, položen nivo i brzina

Fajl: [`migrations/0004_sessions_and_performance.sql`](./migrations/0004_sessions_and_performance.sql)

### Šta dodaje i zašto

| Šta | Čemu služi |
| --- | --- |
| Tabela `play_sessions` | Jedan red po **poseti** deteta: `child_id`, `started_at`, `ended_at`, `mood_before`, `mood_after`, `created_by`. Do sada se raspoloženje pre igre prepisivalo u svaki zapis partije te posete, a raspoloženje posle igre naknadno upisivalo u N zapisa — jedan odgovor deteta bio je sačuvan N puta i statistika raspoloženja je bila uvećana onoliko puta koliko je nivoa odigrano. Sada se odgovor čuva jednom. |
| `progress_logs.session_id` | Kojoj poseti partija pripada. Stariji zapisi ostaju sa `NULL` i zadržavaju svoje kolone `mood_before`/`mood_after` (ništa se ne rekonstruiše i ne briše). |
| `progress_logs.passed` | Da li partija otključava sledeći nivo. Odluka se donosi **jednom, pri upisu**, umesto iznova pri svakom čitanju. Postojeći redovi se dopunjuju istim pravilom koje koristi kod. |
| Okidač `progress_logs_set_passed` | Popunjava `passed` kada ga upis ne pošalje (stariji kod koji još radi posle migracije), pa nijedan novi red ne ostaje bez odluke. |
| `activities.graded` | `false` za igru bez pogrešnih odgovora (Emocije, ID 8): u njoj je svaki završen nivo položen. Izvor istine je `lib/games.ts`; kolona postoji da bi pravilo moglo da se primeni i u bazi. |
| Pogled `child_game_progress` | Najviši položen nivo, broj partija i poslednja partija po (dete, igra). Dečji početni ekran dobija otključane nivoe **jednim** malim upitom umesto po jednog ili više upita za svaku igru. |
| Indeksi | `progress_logs (session_id)`, `progress_logs (recorded_by)`, `play_sessions (child_id, started_at desc)`, `play_sessions (created_by)` — videti „Upiti i indeksi” ispod. |
| Row Level Security, bez pravila | Na `play_sessions`, kao i na ostalim tabelama. |

Pravilo „nivo položen” (isto u kodu — `isLevelPassed` u `app/api/_lib/children.ts` —
u okidaču i u dopuni): igra bez ocenjivanja → položeno; zapis sa brojem odgovora
→ bar polovina zadataka rešena samostalno; stariji zapis → bar jedna zvezdica, a
bez zvezdica sve osim uspešnosti `struggled`.

### Bezbednost pogleda

Običan pogled se izvršava sa pravima svog vlasnika i **zaobilazi Row Level
Security**, a Supabase novim objektima podrazumevano daje prava javnim ulogama.
Takav pogled bi svakome ko ima javni (anon) ključ otkrio napredak sve dece. Zato
je `child_game_progress` napravljen sa `security_invoker = true` (čita tabelu sa
pravima onoga ko pita, pa RLS važi) **i** ulogama `anon` i `authenticated` su
oduzeta sva prava nad njim. Ako ikada pravite novi pogled nad ovim tabelama,
uradite isto.

Pogled traži Postgres 15 ili noviji. Na starijem se preskače uz poruku u tabeli
rezultata, a aplikacija nastavlja da računa nivoe na stari način.

### Šta namerno nije podeljeno u više tabela

| Šta | Zašto ostaje kako jeste |
| --- | --- |
| `children.streak`, `experience_points`, `last_login_at` | Osobine jednog deteta, po jedna vrednost u jednom redu — ništa se ne ponavlja. Posebna tabela bi svakoj prijavi i partiji dodala još jedno spajanje ili upit, bez uštede. Poeni nisu izveden podatak: sadrže i dnevnu nagradu za prijavu, koja se nigde drugde ne beleži. |
| `children.settings` (`jsonb`) | Konfiguracija bez stalne šeme: čita se i upisuje uvek cela, oblik proverava aplikacija (`lib/childSettings.ts`), a nova podešavanja ne traže migraciju. Nijedan upit ne filtrira po pojedinačnom podešavanju. |
| `custom_stories.steps` (`jsonb`) | Koraci se uvek čitaju i čuvaju zajedno sa pričom (2–8 komada) i ne pretražuju se pojedinačno. |
| Zbir po (dete, igra) kao pogled, ne tabela | Zbirna tabela koju održava okidač bila bi isti podatak sačuvan dva puta. Dete ima stotine do nekoliko hiljada zapisa, što indeks pročita za oko milisekundu. |
| Bez particionisanja | Desetine ili stotine hiljada redova, ne stotine miliona. |
| `progress_logs.notes`, `duration_minutes`, `success_level` | Izvedeni su iz `level`/`stars`/`score`/`duration_seconds`, ali stariji zapisi imaju **samo** njih, a u starim bazama mogu biti obavezni. Svesna, privremena redundansa; kod pri čitanju daje prednost novim kolonama. |
| `progress_logs.recorded_by` uz `play_sessions.created_by` | Zapis zna ko ga je zabeležio i ako se poseta obriše. |

### Upiti i indeksi

Svaki upit iz koda i indeks koji ga pokriva (potpun spisak je u komentaru
odeljka 7 migracije):

| Upit | Indeks |
| --- | --- |
| `users`: po `id` | primarni ključ |
| `users`: prijava, `email ILIKE` | nema — tabela je mala; `ILIKE` ne može da koristi indeks nad `lower(email)` (videti napomenu u migraciji) |
| `children`: po `id`, spisak po `id IN (…)` | primarni ključ |
| `children`: po `pin_code` | `children_pin_code_key` (0001) |
| `user_children`: po `user_id` (+ `child_id`) | `user_children_user_child_key` (0001) |
| `user_children`: po `child_id` | `user_children_child_idx` (0001) |
| `progress_logs`: statistika — `child_id`, `activity_id IN (…)`, najnovije prvo | `progress_logs_child_completed_idx` (0001) |
| `progress_logs`: pogled `child_game_progress` i otključani nivoi bez pogleda — `child_id`, `activity_id` | `progress_logs_child_activity_idx` (0001) |
| `progress_logs`: odvezivanje partija kad se obriše poseta (`session_id`) | **novo** `progress_logs_session_idx` |
| `progress_logs`: pražnjenje `recorded_by` kad se obriše nalog | **novo** `progress_logs_recorded_by_idx` |
| `play_sessions`: po `id` (+ `child_id`) | primarni ključ |
| `play_sessions`: posete deteta, najnovije prvo; brisanje po detetu | **novo** `play_sessions_child_started_idx` |
| `play_sessions`: pražnjenje `created_by` kad se obriše nalog | **novo** `play_sessions_created_by_idx` |
| `custom_stories`: priče deteta, najnovije prvo | `custom_stories_child_updated_idx` (0003) |

Namerno **nije** dodat delimičan indeks `(child_id, activity_id, level desc)
where passed`: pogled mora da pročita sve partije deteta (zbog broja partija), pa
ga planer upita ne koristi. Nije dodat ni indeks nad `progress_logs.activity_id`
(7–8 različitih vrednosti, igre se ne brišu).

### Rad bez migracije 0004

**Aplikacija radi i bez nje**, kao do sada:

- raspoloženje pre igre se čuva uz svaki zapis partije, a posle igre se naknadno
  upisuje uz zapise te posete (`POST /api/activities/complete` tada vraća
  `sessionId: null`);
- otključani nivoi se računaju čitanjem zapisa, po jedan upit za svaku igru;
- statistika čita raspoloženje iz zapisa.

Posle migracije stari zapisi i dalje važe: statistika raspoloženja broji **jedan
izbor po poseti** za nove zapise, a po partiji samo za starije zapise bez posete.
Brisanje rezultata deteta (`DELETE /api/children/[id]/progress`) briše i posete.

Napomena: dopuna kolone `passed` jednom prepisuje sve redove `progress_logs`, pa
na većoj bazi migracija traje nekoliko sekundi i za to vreme upis partija čeka.
Pokrenite je kada deca ne igraju.

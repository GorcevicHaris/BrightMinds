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

Obe su **bezbedne za ponavljanje** i **ne brišu podatke** — mogu da se pokrenu
više puta. `0001` radi i na praznoj i na postojećoj bazi; `0002` traži da tabele
`children` i `progress_logs` već postoje (na praznoj bazi prvo pokrenite `0001`,
inače se prekida sa jasnom porukom i ništa ne menja).

**Preko Supabase Dashboard-a (najjednostavnije)**

1. Otvorite projekat → **SQL Editor** → **New query**.
2. Nalepite ceo sadržaj fajla `0001_bright_minds_schema.sql`.
3. Kliknite **Run**.
4. Pročitajte tabelu „Bright Minds — rezultat migracije” ispod upita. Prvi red
   potvrđuje da je migracija prošla; ostali redovi (ako ih ima) su stavke koje
   traže vašu pažnju — videti odeljak 3.
5. Ponovite korake 1–4 za `0002_child_settings_and_prompts.sql`.

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
  ostalim podacima (nivo, zvezdice, samostalno tačni i ukupni odgovori), a u
  izvozu u CSV kolona „Uz pomoć” ostaje prazna.

Otključavanje nivoa ne zavisi od ove migracije: nivo otključava sledeći kada je
dete bar polovinu zadataka rešilo samostalno (`correct_count / total_count`,
kolone iz migracije `0001`). Za starije zapise bez tih kolona važi staro pravilo
(bar jedna zvezdica).

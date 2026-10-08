# Bright Minds

Edukativne igre za decu (posebno decu sa autizmom i razvojnim teškoćama), sa praćenjem napretka za roditelje, učitelje i terapeute.

- **Dete** se prijavljuje vizuelnim kodom (4 sličice) i igra sedam igara u tri težine.
- **Roditelj / učitelj / terapeut** upravlja profilima dece, gleda statistiku i prati igru uživo.

> Bright Minds je vežbanka uz podršku odraslih. Nije terapija ni dijagnostički alat i ne zamenjuje logopeda, defektologa ili psihologa.

Dizajn se oslanja na istraživanja o razvoju dece od 3 do 8 godina i o podršci deci sa autizmom — odluke i izvori su u [docs/istrazivanje.md](docs/istrazivanje.md).

## Pokretanje

```bash
npm install
cp .env.example .env.local   # pa popunite vrednosti
npm run dev
```

Aplikacija je na [http://localhost:3000](http://localhost:3000). Drugi port: `npm run dev -- -p 3100`.

### Promenljive okruženja

| Promenljiva | Obavezna | Čemu služi |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | da | URL Supabase projekta |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | da | javni ključ — samo za Realtime (praćenje uživo) |
| `SUPABASE_SERVICE_ROLE_KEY` | da | serverski ključ — sav pristup bazi ide preko API ruta |
| `JWT_SECRET` | da | potpisivanje sesija (`openssl rand -hex 48`) |
| `ELEVENLABS_API_KEY` | ne | glas učitelja; bez njega se koristi glas pregledača |
| `ELEVENLABS_VOICE_ID`, `ELEVENLABS_FEMALE_VOICE_ID` | ne | muški / ženski glas |

### Baza

Šema i migracija su u [`supabase/`](supabase/README.md). Migracija je idempotentna i ne briše podatke.

## Kako je organizovano

```
app/
  login, register            prijava (dete: vizuelni kod, odrasli: email + lozinka)
  dashboard/                 roditeljski panel (lista dece)
  dashboard/child/[id]/      dečji ekran: izbor igre, težine, igra, rezultat
  dashboard/progress/[id]/   statistika napretka
  dashboard/monitor/[id]/    praćenje igre uživo
  dev/                       probne stranice bez baze, samo u razvoju:
                             /dev/child (?age=4&script=cyrillic&caps=1&motion=reduced&limit=10),
                             /dev/progress (?audience=child), /dev/monitor
  api/                       API rute (auth, children, activities, tts)
  components/
    ui/                      dugmad, polja, kartice, modal, logo
    games/                   sedam igara
    games/kit/               zajednički delovi igara (HUD, kartice odgovora, zvuk, sinhronizacija)
lib/
  games.ts                   spisak igara, boje, zvezdice — jedini izvor istine
  childSettings.ts           podešavanja po detetu i preporuke po uzrastu (3–4, 5–6, 7–8)
  progress.ts                statistika: samostalno / uz pomoć, savladanost
  auth.ts                    sesije i provera pristupa (roditeljska i dečja sesija)
  realtime.ts                praćenje uživo preko Supabase Realtime Broadcast-a
  speech.ts                  govor (ElevenLabs + rezervni glas pregledača)
```

### Dizajn

Tokeni (boje, senke, animacije) su u [`app/globals.css`](app/globals.css). Principi: miran i predvidljiv interfejs, veliki ciljevi za dodir, jasan kontrast, bez vremenskog pritiska i bez kažnjavanja grešaka. Animacije se gase kada sistem traži smanjeno kretanje.

### Podešavanja po detetu

Roditelj ili terapeut na kartici deteta bira „Podesi”: uzrasnu grupu, broj ponuđenih odgovora, kada se nudi pomoć, pismo (latinica/ćirilica) i velika slova, zvuk po kanalima (glas, efekti, zvuci u igri, nagli zvuci, jačina), manje animacija, dnevno vreme igre i pitanje o raspoloženju. Čuvaju se u koloni `children.settings` (migracija `0002`).

### Plan igre i priče za dete

- **Plan „prvo–zatim”** (u podešavanjima deteta): do četiri igre redom; dete vidi raspored i igra ih tim redom.
- **Moje priče** (dugme na kartici deteta): odrasli piše kratku priču u koracima, dete je čita na svom ekranu. Tabela `custom_stories` (migracija `0003`).

### Baza

Migracije su u [`supabase/migrations`](supabase/migrations) i pokreću se redom; svaka je bezbedna za ponovno pokretanje, a aplikacija radi i dok novije nisu primenjene:

| Migracija | Šta donosi |
| --- | --- |
| `0001` | osnovna šema, strani ključevi, indeksi, RLS |
| `0002` | podešavanja po detetu, broj odgovora uz pomoć |
| `0003` | priče koje piše odrasli |
| `0004` | sesije igre (`play_sessions`), sačuvana odluka „položeno”, pogled sa najvišim položenim nivoom, dodatni indeksi |

### Dodavanje igre

1. Dodajte unos u `lib/games.ts` (ID, `activityId`, naziv, boje).
2. Napravite komponentu u `app/components/games/` koja prima `GameProps` iz `games/kit` i na kraju nivoa zove `onComplete({ score, durationSec, correct, total, prompted })` — `correct` su zadaci rešeni samostalno iz prvog pokušaja, `prompted` oni rešeni tek uz istaknut odgovor. Poštujte `useChildSettings()` (broj izbora, pomoć, uzrast).
3. Celo stanje za prikaz držite u jednom JSON objektu (`view`) i šaljite ga kroz `useGameSync` — isti objekat koristi roditelj za prikaz uživo.
4. Registrujte komponentu u `GameContainer.tsx` i `LiveMonitor.tsx`.

## Skripte

| Skripta | Opis |
| --- | --- |
| `npm run dev` | razvojni server |
| `npm run build` / `npm start` | produkcija |
| `npm run lint` | ESLint |
| `npm run typecheck` | provera tipova |
| `npm test` | automatski testovi |

## Testovi

```bash
npm test                                                          # svi testovi
node --import ./tests/setup/register.mjs --test tests/script.test.ts   # jedan fajl
```

Testovi su u [`tests/`](tests) i koriste ugrađeni Node test runner (`node:test`) — bez dodatnih paketa, bez pregledača i bez prave baze. Potreban je Node 26 (izvršava `.ts` fajlove direktno). Pokrivaju čistu logiku (`lib/`, sadržaj igara u `app/components/games/data/`) i API rute (`tests/api/`); React komponente se ne testiraju.

- [`tests/setup/register.mjs`](tests/setup/register.mjs) uči Node aliasu `@/` i uvozu bez nastavka, i zamenjuje dva modula: `next/headers` (kolačiće postavlja test) i `@supabase/supabase-js` (baza u memoriji, [`tests/setup/fakeSupabase.ts`](tests/setup/fakeSupabase.ts)). Pravi `lib/auth.ts` i `lib/supabase.ts` se izvršavaju i u testovima.
- Rute se pozivaju direktno kao funkcije. Sesija je kolačić potpisan test-ključem; `.env.local` se ne čita.
- Bazu bez novijih migracija test opisuje sa `db.dropColumns(...)` i `db.dropTable(...)`, pa se proverava i rad dok migracije nisu primenjene.
- Test označen sa `todo` opisuje poznatu grešku koja još nije ispravljena: ne obara `npm test`, ali ostaje vidljiv u izveštaju.

Iste provere (lint, tipovi, testovi, build) pokreće GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

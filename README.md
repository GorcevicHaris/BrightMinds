# Bright Minds

Edukativne igre za decu (posebno decu sa autizmom i razvojnim teškoćama), sa praćenjem napretka za roditelje, učitelje i terapeute.

- **Dete** se prijavljuje vizuelnim kodom (4 sličice) i igra sedam igara u tri težine.
- **Roditelj / učitelj / terapeut** upravlja profilima dece, gleda statistiku i prati igru uživo.

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
  dev/games/                 probna stranica za igre bez baze (samo u razvoju)
  api/                       API rute (auth, children, activities, tts)
  components/
    ui/                      dugmad, polja, kartice, modal, logo
    games/                   sedam igara
    games/kit/               zajednički delovi igara (HUD, kartice odgovora, zvuk, sinhronizacija)
lib/
  games.ts                   spisak igara, boje, zvezdice — jedini izvor istine
  auth.ts                    sesije i provera pristupa (roditeljska i dečja sesija)
  realtime.ts                praćenje uživo preko Supabase Realtime Broadcast-a
  speech.ts                  govor (ElevenLabs + rezervni glas pregledača)
```

### Dizajn

Tokeni (boje, senke, animacije) su u [`app/globals.css`](app/globals.css). Principi: miran i predvidljiv interfejs, veliki ciljevi za dodir, jasan kontrast, bez vremenskog pritiska i bez kažnjavanja grešaka. Animacije se gase kada sistem traži smanjeno kretanje.

### Dodavanje igre

1. Dodajte unos u `lib/games.ts` (ID, `activityId`, naziv, boje).
2. Napravite komponentu u `app/components/games/` koja prima `GameProps` iz `games/kit` i na kraju nivoa zove `onComplete({ score, durationSec, correct, total })`.
3. Celo stanje za prikaz držite u jednom JSON objektu (`view`) i šaljite ga kroz `useGameSync` — isti objekat koristi roditelj za prikaz uživo.
4. Registrujte komponentu u `GameContainer.tsx` i `LiveMonitor.tsx`.

## Skripte

| Skripta | Opis |
| --- | --- |
| `npm run dev` | razvojni server |
| `npm run build` / `npm start` | produkcija |
| `npm run lint` | ESLint |
| `npm run typecheck` | provera tipova |

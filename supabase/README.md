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

## 2. Primena migracije

Fajl: [`migrations/0001_bright_minds_schema.sql`](./migrations/0001_bright_minds_schema.sql)

Migracija je **bezbedna za ponavljanje** i **ne briše podatke** — može da se
pokrene i na praznoj i na postojećoj bazi, više puta.

**Preko Supabase Dashboard-a (najjednostavnije)**

1. Otvorite projekat → **SQL Editor** → **New query**.
2. Nalepite ceo sadržaj fajla `0001_bright_minds_schema.sql`.
3. Kliknite **Run**.
4. Pročitajte tabelu „Bright Minds — rezultat migracije” ispod upita. Prvi red
   potvrđuje da je migracija prošla; ostali redovi (ako ih ima) su stavke koje
   traže vašu pažnju — videti odeljak 3.

**Preko Supabase CLI-ja**

```bash
supabase link --project-ref <ref-projekta>
supabase db push
```

Pre pokretanja na produkciji napravite rezervnu kopiju (Supabase → Database →
Backups).

> **Važno:** migracija uključuje Row Level Security na svim tabelama, bez
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

## 4. Rad pre i posle migracije

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

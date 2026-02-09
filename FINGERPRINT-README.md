# Fingerprint Autentifikacija - Uputstvo

## Šta je implementirano?

Dodao sam **biometrijsku autentifikaciju (fingerprint)** pri kreiranju novog deteta. Kada profesor ili roditelj želi da doda dete, mora da:

1. Unese osnovne podatke (ime, prezime, datum rođenja, pol, napomene)
2. **Skenira prst deteta** da bi se generisao jedinstveni fingerprint ID
3. Tek nakon uspešnog skeniranja može da završi kreiranje deteta

## Kako radi?

### Tehnologija
Koristim **Web Authentication API (WebAuthn)** koji je ugrađen u moderne browsere i podržava:
- 👆 Touch ID (na MacBook-u)
- 📱 Face ID (na iPhone-u)
- 🔐 Fingerprint senzore (na Android uređajima i laptopovima)
- 🔑 Druge biometrijske metode

### Proces skeniranja

1. **Korisnik klikne na dugme "Skeniraj prst deteta"**
2. Browser prikazuje sistemski dijalog za biometrijsku autentifikaciju
3. Dete stavlja prst na senzor (ili koristi Face ID)
4. Generiše se **jedinstveni ID** koji se čuva u bazi kao `fingerprint_id`
5. Ovaj ID je vezan samo za to dete i ne može se koristiti za drugo dete

### Baza podataka

U tabeli `children` dodata je kolona:
```sql
fingerprint_id VARCHAR(64) NULL UNIQUE
```

- **VARCHAR(64)**: Dovoljno dug za Base64 enkodovani credential ID
- **UNIQUE**: Svaki fingerprint može biti vezan samo za jedno dete
- **NULL**: Dozvoljeno je NULL za staru decu (pre implementacije)

## Fajlovi koji su izmenjeni/kreirani

### 1. `/lib/webauthn.ts` (NOVO)
Helper biblioteka za WebAuthn API:
- `createFingerprintCredential()` - Kreira novi fingerprint credential
- `verifyFingerprintCredential()` - Verifikuje postojeći credential (za budući login)

### 2. `/app/components/dashboard.tsx` (IZMENJENO)
- Dodao `fingerprint_id` u `Child` interface
- Dodao state za fingerprint status (`idle`, `scanning`, `success`, `error`)
- Dodao `handleFingerprintScan()` funkciju
- Dodao UI za fingerprint skeniranje u modalu
- Dodao validaciju da fingerprint mora biti skeniran pre kreiranja deteta

### 3. `/app/api/children/route.ts` (IZMENJENO)
- POST endpoint sada prima i čuva `fingerprint_id`
- Validacija da `fingerprint_id` mora biti prisutan

### 4. `/migrations/2026_02_09_add_fingerprint.sql` (NOVO)
SQL skripta za dodavanje `fingerprint_id` kolone

### 5. `/migrate-fingerprint.js` (NOVO)
Node.js skript za izvršavanje migracije (već izvršeno)

## Kako testirati?

### Preduslov
Moraš imati uređaj sa biometrijskim senzorom:
- MacBook sa Touch ID
- iPhone/iPad sa Face ID ili Touch ID
- Android telefon sa fingerprint senzorom
- Windows laptop sa Windows Hello

### Testiranje

1. Pokreni aplikaciju:
```bash
npm run dev
```

2. Uloguj se kao profesor/roditelj

3. Klikni na "Dodaj dete"

4. Popuni osnovne podatke (ime, prezime, itd.)

5. Klikni na **"Skeniraj prst deteta"**

6. Browser će prikazati sistemski dijalog - stavi prst na senzor

7. Ako je uspešno, dugme će postati zeleno sa ✓ ikonom

8. Klikni "Završi dodavanje"

9. Dete je kreirano sa jedinstvenim fingerprint ID-jem!

## Sigurnost

- **Fingerprint se NE čuva** - čuvamo samo jedinstveni ID koji generiše WebAuthn API
- **Biometrijski podaci ostaju na uređaju** - nikada se ne šalju na server
- **Svaki fingerprint je jedinstven** - ne može se koristiti za više dece (UNIQUE constraint)
- **Enkriptovano** - WebAuthn koristi kriptografske ključeve

## Budući razvoj

Možeš dodati:
1. **Login deteta pomoću fingerprinta** - umesto da kuca ID, dete samo stavi prst
2. **Re-enrollment** - mogućnost da se promeni fingerprint ako je potrebno
3. **Multiple fingerprints** - dodati više prstiju za isto dete
4. **Fallback metode** - PIN kod ako fingerprint ne radi

## Problemi?

### "Vaš uređaj ne podržava biometrijsku autentifikaciju"
- Uređaj nema biometrijski senzor
- Browser ne podržava WebAuthn (koristi Chrome/Safari/Edge)
- HTTPS nije omogućen (WebAuthn radi samo preko HTTPS ili localhost)

### "Fingerprint skeniranje je otkazano"
- Korisnik je kliknuo "Cancel" u dijalogu
- Timeout (60 sekundi)

### Baza vraća grešku
- Proveri da li je migracija izvršena: `node migrate-fingerprint.js`
- Proveri da li kolona postoji: `SHOW COLUMNS FROM children LIKE 'fingerprint_id'`

## Napomena za produkciju

Za produkciju moraš:
1. **Omogućiti HTTPS** - WebAuthn ne radi preko HTTP (osim localhost)
2. **Podesiti `rp.id`** - Trenutno koristi `window.location.hostname`, ali za produkciju treba da bude tvoj domen
3. **Testirati na različitim uređajima** - iOS, Android, Windows, macOS

---

**Implementirao:** AI Assistant  
**Datum:** 2026-02-09  
**Tehnologija:** WebAuthn API, Next.js, TypeScript, MySQL

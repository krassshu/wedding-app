# Wedding App

Aplikacja weselna: dodawanie zdjęć i filmów, bingo zdjęć, galeria z folderami.
Next.js 16 (App Router) + self-hosted Supabase Storage.

## Strony

| Ścieżka | Opis |
| --- | --- |
| `/` | Opis, „Zrób zdjęcie", „Dodaj zdjęcie z galerii", ostatnie 9 zdjęć |
| `/bingo` | Siatka zadań z `app/data/bingo.json`, kliknięcie kafelka otwiera aparat |
| `/galeria` | Foldery: Galeria i Bingo |
| `/galeria/wszystkie`, `/galeria/bingo` | Zawartość folderu |

## Storage

Jeden bucket `photos`, folder `gallery/`.
Zdjęcia z bingo mają nazwę `bingo__<idZadania>__<uuid>.<ext>`, dzięki czemu trafiają
jednocześnie do głównej galerii i do folderu Bingo.

Upload korzysta z protokołu TUS:

- pliki są dzielone na fragmenty po 6 MB i wznawiane po zerwaniu połączenia,
- maksymalny rozmiar pliku to 90 MiB (bezpiecznie poniżej limitu Cloudflare Free),
- docelowa nazwa jest zapisywana razem z lokalną kolejką, więc ponowienie nie tworzy
  nowego obiektu,
- każdy upload wymaga krótkotrwałego podpisu wydanego po podaniu kodu weselnego,
- nginx ogranicza pik do 30 równoległych fragmentów i zwraca 429 do automatycznego
  ponowienia.

Bucket pozostaje publiczny do odczytu galerii, ale anonimowy zapis jest wyłączony.
Dozwolone typy MIME są egzekwowane także przez Storage, nie tylko przez przeglądarkę.

## Uruchomienie lokalne (bez Dockera)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Wymaga działającego Supabase (patrz niżej) pod adresem z `NEXT_PUBLIC_SUPABASE_URL`.

## Uruchomienie w Dockerze (Debian)

Cały stos: Postgres, PostgREST, Storage API, imgproxy, nginx (gateway) i aplikacja.
Wszystkie obrazy oparte o Debiana.

```bash
cp .env.example .env
docker compose up -d --build
```

- aplikacja: http://localhost:3000
- Supabase gateway: http://localhost:8000
- Postgres: localhost:5432

Porty są przypięte do `127.0.0.1`, aby były osiągalne dla lokalnego Caddy/tunelu,
ale nie były wystawione bezpośrednio w sieci.

Usługa `storage-init` czeka na migracje Storage API, tworzy publiczny bucket `photos`
i polityki RLS. Odczyt galerii jest publiczny, ale zapis wymaga krótkotrwałego tokenu
wydawanego po podaniu kodu weselnego i związanego dokładnie z jedną ścieżką pliku.

Klucze w `.env.example` są developerskie. Przed wystawieniem na świat wygeneruj własny
`JWT_SECRET` oraz nowe `ANON_KEY` i `SERVICE_ROLE_KEY`.

Ustaw również własne, różne wartości:

- `UPLOAD_GUEST_CODE` — krótki kod przekazany gościom,
- `UPLOAD_SESSION_SECRET` — losowy sekret minimum 32 znaki,
- `ADMIN_PASSWORD` i `ADMIN_SESSION_SECRET`,
- opcjonalnie `DISK_ALERT_WEBHOOK_URL` — webhook Slack/Discord dla alarmu o dysku.

Po zmianie konfiguracji sprawdź:

```bash
npm test
npm run lint
npm run build
docker compose config --quiet
```

Usługa `storage-monitor` sprawdza zajętość wolumenu co minutę. Po przekroczeniu
`DISK_ALERT_PERCENT` staje się `unhealthy`, pokazuje ostrzeżenie w panelu administratora
i — jeśli ustawiono webhook — wysyła alarm najwyżej raz na godzinę.

## Zadania bingo

Edytuj `app/data/bingo.json`:

```json
{ "tasks": [{ "id": "toast", "title": "Moment wznoszenia toastu" }] }
```

`id` jest używane w nazwach plików, więc nie zmieniaj go po starcie wesela.

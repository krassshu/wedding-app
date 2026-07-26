# Wedding App

Aplikacja weselna: dodawanie zdjęć, bingo zdjęć, galeria z folderami.
Next.js 16 (App Router) + Supabase Storage.

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

Usługa `storage-init` czeka na migracje Storage API, tworzy publiczny bucket `photos`
i polityki RLS pozwalające anonimowym gościom czytać i dodawać zdjęcia.

Klucze w `.env.example` są developerskie. Przed wystawieniem na świat wygeneruj własny
`JWT_SECRET` oraz nowe `ANON_KEY` i `SERVICE_ROLE_KEY`.

## Zadania bingo

Edytuj `app/data/bingo.json`:

```json
{ "tasks": [{ "id": "toast", "title": "Moment wznoszenia toastu" }] }
```

`id` jest używane w nazwach plików, więc nie zmieniaj go po starcie wesela.

# Deployment kmplus-people (Docker + Supabase)

Aplikasi ini **Next.js 15 (App Router, full-stack)** dengan Prisma. App jalan
sebagai container Docker di server KMPlus (Hostinger, Jakarta), di belakang
nginx `internal.kmplus.co.id`. **Supabase** (project `kmplus-people`,
`ap-southeast-1`) adalah backend: Postgres, Auth (password), dan Storage
(file). Tidak ada container database lagi. Email set-password dikirim app
lewat `mail.kmplus.co.id`.

Kenapa bukan Vercel: paket Hobby Vercel hanya untuk pemakaian non-komersial,
dan app ini dipakai perusahaan.

## Ringkasan

| Item              | injourney-rinjani2.0 | kmplus-people                  |
|-------------------|----------------------|--------------------------------|
| Tipe app          | Static SPA + nginx   | Next.js SSR (Node 22)          |
| Domain            | injourney-rinjani.kmplus.co.id | internal.kmplus.co.id |
| Host port         | 86                   | **88**                         |
| Container port    | 80                   | 3000                           |
| Database          | -                    | Supabase Postgres (pooler)     |

Kedua stack bisa jalan bersamaan di server yang sama karena port host berbeda
(86 vs 88).

## Cara deploy

`.env.production` berisi semua secret (URL database Supabase, key Supabase,
`SESSION_SECRET`, SMTP). File ini **tidak** ada di git; salinan ada di laptop
yang men-setup Supabase. Template: `.env.production.example`.

Di server (`root@srv927535`):

```bash
cd kmplus-people
git pull                       # branch yang mau dirilis
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Cek status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

App tersedia di `http://<server-ip>:88`, publik lewat nginx di
`https://internal.kmplus.co.id`.

### Perubahan schema

Startup **tidak pernah** seed production: seed menyimpan User demo, dan setiap
login email baru dikirimi link set-password. `prisma/seed.ts` menolak jalan
kalau Supabase Auth terkonfigurasi.

Kalau ada perubahan `prisma/schema.prisma`, boot sekali dengan
`RUN_DB_PUSH=true` di `.env.production` (push lewat `DIRECT_URL`, lalu lockdown
Data API otomatis), kemudian kembalikan ke `false`. `db push` tidak lagi
menerima data loss: perubahan yang menghapus data akan gagal, bukan menghapus.

## Supabase Postgres (database)

Prisma tetap dipakai; hanya database-nya yang pindah ke Supabase.

1. **Connect** (tombol di atas dashboard project) → *ORMs → Prisma*. Isi:

   ```
   # Transaction pooler, port 6543, untuk app.
   # connection_limit minimal 2: tenant lock memegang satu koneksi, load/save memakai yang lain.
   # Server (satu proses): 8. Serverless (banyak instance): 3.
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=8"
   # Session pooler, port 5432 — untuk prisma db push (IPv4)
   DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```

2. Production di-seed sekali (2026-10-09) dengan data demo, tanpa mengirim
   email: tenant disimpan tanpa User, lalu User ditulis langsung. Satu-satunya
   login Supabase: `alfredo@kmplus.co.id` (HR + Admin). Jangan jalankan
   `prisma db seed` ke Supabase.

3. Samakan schema dengan kode, lalu kunci Data API:

   ```bash
   npx prisma db push
   npm run db:lockdown
   ```

   `db:lockdown` menyalakan RLS di semua tabel dan mencabut akses `anon` /
   `authenticated`. Supabase membuka schema `public` lewat Data API ke siapa
   pun yang memegang publishable key; app hanya lewat Prisma, jadi tidak ada
   yang perlu dibuka. Jalankan lagi setiap `db push` yang menambah tabel.
   Lebih aman lagi: matikan Data API di *Project Settings → Data API*.

4. Latensi: server Jakarta ke Supabase Singapura sekitar 20 ms per query. Save
   hanya menulis baris yang berubah (sekitar 0,3 detik); load tenant sekitar
   0,7 detik dengan pool 8.

## Supabase Storage (file upload)

File Deliverable dan surat dokter disimpan di bucket privat `tenant-files`
(ADR-0012). Buat sekali per project:

```bash
curl -s "$SUPABASE_URL/storage/v1/bucket" -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" -H 'Content-Type: application/json' \
  -d '{"id":"tenant-files","name":"tenant-files","public":false,"file_size_limit":20971520}'
```

Browser upload langsung ke Supabase lewat signed URL dari `/api/storage/upload`,
jadi limit body 4.5 MB Vercel tidak berlaku. Tanpa `SUPABASE_*` (lokal) hanya
path yang disimpan.

## Supabase Auth (password login)

Password disimpan di Supabase Auth (ADR-0011). Sekali per project Supabase:

1. **Project Settings → API Keys**: salin URL, publishable key, dan secret key
   ke `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
   Secret key hanya untuk server — jangan pernah diberi prefix `NEXT_PUBLIC_`.
2. **Authentication → Sign In / Providers**: Email aktif, matikan
   *Allow new users to sign up* dan *Confirm email*.
3. **Authentication → URL Configuration**: Site URL = `APP_ORIGIN`; tambahkan
   `https://internal.kmplus.co.id/login/password` (dan
   `http://localhost:3000/login/password` untuk lokal) ke Redirect URLs.
4. **Email set-password dikirim oleh app sendiri** lewat `mail.kmplus.co.id`
   (ADR-0011). Mail server itu tidak pernah menyelesaikan koneksi dari mailer
   Supabase (timeout di 465 dan 587), tapi menerima koneksi dari Vercel. Isi di
   env app (Vercel / `.env.production`):

   ```
   SMTP_HOST=mail.kmplus.co.id
   SMTP_PORT=465
   SMTP_USER=noreply@kmplus.co.id
   SMTP_PASS=<password mailbox noreply>
   SMTP_FROM="KMPlus People <noreply@kmplus.co.id>"
   ```

   Tanpa `SMTP_*` (dev lokal) app memakai mailer Supabase dengan template di
   `supabase/config.toml`; template itu hanya bisa di-push kalau SMTP custom
   Supabase aktif.

Cutover dari Firebase (sekali): password tidak ikut pindah. Buat login Supabase
untuk semua User aktif, lalu kirim link set-password:

```bash
npx tsx --tsconfig tsconfig.json scripts/provision-supabase-logins.ts         # buat login saja
npx tsx --tsconfig tsconfig.json scripts/provision-supabase-logins.ts --send  # + kirim email
```

User demo hasil seed tetap bisa login dengan password lokal tanpa Supabase.

## Nginx / domain internal.kmplus.co.id

Arahkan DNS `internal.kmplus.co.id` ke IP server, lalu reverse-proxy ke
port 88. Contoh server block nginx di host:

```nginx
server {
    listen 80;
    server_name internal.kmplus.co.id;

    location / {
        proxy_pass http://127.0.0.1:88;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Untuk HTTPS gunakan certbot: `certbot --nginx -d internal.kmplus.co.id`.

## Perintah berguna

```bash
# Rebuild + restart app (setelah git pull)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Stop app
docker compose -f docker-compose.prod.yml down

# Backup database Supabase (dari mesin yang punya DIRECT_URL)
pg_dump "$DIRECT_URL" --schema=public --no-owner --no-privileges > backup.sql
```

## Catatan

- `docker-compose.yml` tetap untuk development lokal (Postgres lokal, port 5432).
  Jangan arahkan `.env` lokal ke Supabase production.
- Container database lama (`kmplus-people-db-prod`) dan volume
  `kmplus_people_pg_prod` sudah tidak dipakai. Hapus hanya setelah yakin datanya
  tidak dibutuhkan.

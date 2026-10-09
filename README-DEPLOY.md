# Deployment kmplus-people (Docker)

Aplikasi ini adalah **Next.js 15 (App Router, full-stack)** dengan Prisma +
PostgreSQL. Berbeda dengan `injourney-rinjani2.0` yang berupa static SPA yang
di-serve nginx, kmplus-people butuh **Node.js server runtime** (`next start`)
dan sebuah database. Karena itu deployment memakai stack Docker Compose
(app + postgres), bukan image nginx statis.

## Ringkasan

| Item              | injourney-rinjani2.0 | kmplus-people          |
|-------------------|----------------------|------------------------|
| Tipe app          | Static SPA + nginx   | Next.js SSR (Node)     |
| Domain            | injourney-rinjani.kmplus.co.id | internal.kmplus.co.id |
| Host port         | 86                   | **88**                 |
| Container port    | 80                   | 3000                   |
| Database          | -                    | PostgreSQL (bundled)   |

Kedua stack bisa jalan bersamaan di server yang sama karena port host berbeda
(86 vs 88).

## Cara deploy

Di server (`root@srv927535`), clone/pull repo ini lalu:

```bash
cd kmplus-people

# 1. Siapkan environment
cp .env.production.example .env.production
# edit .env.production:
#   SESSION_SECRET  -> wajib, isi hasil `openssl rand -hex 32`
#   POSTGRES_PASSWORD -> ganti dari default
nano .env.production

# 2. Build + jalankan
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Cek status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

App akan tersedia di `http://<server-ip>:88`.

### Setelah boot pertama

Boot pertama menjalankan `prisma db push` (buat schema) + seed data demo.
Setelah sukses, matikan supaya tidak seed ulang tiap restart — edit
`.env.production`:

```
RUN_DB_PUSH=false
RUN_DB_SEED=false
```

lalu `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`.

## Supabase Postgres (database)

Prisma tetap dipakai; hanya database-nya yang pindah ke Supabase.

1. **Connect** (tombol di atas dashboard project) → *ORMs → Prisma*. Isi:

   ```
   # Transaction pooler, port 6543 — untuk app (serverless/Vercel).
   # connection_limit minimal 2: tenant lock memegang satu koneksi, load/save memakai yang lain.
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3"
   # Session pooler, port 5432 — untuk prisma db push (IPv4)
   DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```

2. Pindahkan data dari server lama (sekali). Dump schema + data, lalu restore
   ke Supabase yang masih kosong:

   ```bash
   docker exec kmplus-people-db-prod pg_dump -U kmplus --schema=public --no-owner --no-privileges kmplus_people > kmplus.sql
   psql "$DIRECT_URL" -f kmplus.sql
   ```

   Tanpa data lama (project baru): `npx prisma db push && npx prisma db seed`.

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

4. Region: taruh Vercel Functions di region yang sama dengan Supabase
   (mis. Supabase `ap-southeast-1` ↔ Vercel `sin1`). Satu save menulis ulang
   semua baris tenant, satu round-trip per baris; lintas benua akan timeout.

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
4. **Authentication → Emails → Reset Password**: ganti link di template menjadi

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Set password</a>
   ```

5. **Authentication → Emails → SMTP Settings**: isi SMTP sendiri (mis. Google
   Workspace atau Resend). Mailer bawaan Supabase hanya mengirim ke anggota tim
   project dan dibatasi beberapa email per jam.

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
# Restart hanya app (mis. setelah update image)
docker compose -f docker-compose.prod.yml up -d --build app

# Stop semua
docker compose -f docker-compose.prod.yml down

# Stop + hapus data DB (HATI-HATI: hilang semua data)
docker compose -f docker-compose.prod.yml down -v

# Backup database
docker exec kmplus-people-db-prod pg_dump -U kmplus kmplus_people > backup.sql
```

## Catatan

- Database di-bundle di dalam compose dan **tidak** publish port ke host
  (hanya diakses app lewat network internal). File `docker-compose.yml` yang
  lama tetap untuk kebutuhan development lokal (publish 5432).
- Login demo tersedia setelah seed (lihat `prisma/seed.ts` /
  `src/lib/server/persist.ts`).

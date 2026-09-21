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

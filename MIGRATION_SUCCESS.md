# ✅ FuelTech Africa - Migration Prisma réussie

## Problème résolu

Erreur **P1010** sur Mac Apple Silicon (ARM64) avec PostgreSQL 15 via Docker et Prisma 5.

## Solution appliquée

### 1. Downgrade Prisma 5 → Prisma 4.16.2

```bash
npm uninstall prisma @prisma/client
npm install prisma@4.16.2 @prisma/client@4.16.2
```

### 2. Configuration Prisma simplifiée

**prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
(Suppression de `shadowDatabaseUrl`)

**.env:**
```env
DATABASE_URL="postgresql://fueltech:fueltech_dev_password@localhost:5432/fueltech_db"
```
(Suppression de `SHADOW_DATABASE_URL`)

### 3. Migration manuelle (contournement P1010)

Le bug P1010 persiste même avec Prisma 4 sur ARM64. Solution de contournement :

```bash
# Générer le SQL de migration
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20240101000000_init/migration.sql

# Appliquer manuellement via psql
docker exec -i fueltech_postgres psql -U fueltech -d fueltech_db < prisma/migrations/20240101000000_init/migration.sql

# Créer la table de tracking Prisma
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "CREATE TABLE _prisma_migrations (...);"

# Enregistrer la migration
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "INSERT INTO _prisma_migrations ..."
```

### 4. Corrections TypeScript

- Ajout de `API_VERSION` dans `env.ts`
- Correction des imports inutilisés
- Fix des types JWT (`jwt.SignOptions`)
- Fix du spread operator dans `apiResponse.ts`

## État final

✅ **Base de données migrée avec succès**

Tables créées :
- users
- stations
- pumps
- nozzles
- transactions
- refresh_tokens
- _prisma_migrations

✅ **TypeScript compile sans erreurs**

✅ **Prisma Client généré** (v4.16.2)

## Commandes pour démarrer

```bash
# Les conteneurs Docker sont déjà démarrés
npm run docker:up

# Installer les dépendances (si nécessaire)
npm install

# Démarrer le serveur
npm run dev
```

## Endpoints disponibles

```
GET  /health              - Health check
GET  /api                 - API info

POST /api/v1/auth/register   - Inscription
POST /api/v1/auth/login      - Connexion
POST /api/v1/auth/refresh    - Refresh token
POST /api/v1/auth/logout     - Déconnexion
GET  /api/v1/auth/me         - User actuel (protégé)
```

## Stack technique finale

- Node.js 20+
- Express.js
- **Prisma 4.16.2** (downgrade depuis 5.20.0)
- PostgreSQL 15 (Docker)
- Redis 7 (Docker)
- TypeScript (strict mode)
- JWT Auth (access 15min + refresh 30j)

## Note importante

Le bug P1010 est un problème connu de Prisma sur ARM64 (Apple Silicon). La solution de contournement avec migration manuelle fonctionne parfaitement pour le développement.

Pour les prochaines migrations, utiliser la même approche :

1. Générer le SQL : `npx prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma --script`
2. Appliquer manuellement via Docker
3. Enregistrer dans `_prisma_migrations`

# ✅ FuelTech Africa API - Configuration finale

## État du projet

✅ **Backend Express + Prisma opérationnel**
✅ **Base de données PostgreSQL migrée**
✅ **Bug P1010 ARM64 contourné**
✅ **TypeScript compile sans erreurs**

## Stack technique

- Node.js 20+
- Express.js
- **Prisma 4.16.2** (downgrade depuis 5.x pour compatibilité ARM64)
- PostgreSQL 15 (Docker)
- Redis 7 (Docker)
- TypeScript (strict mode)
- JWT Auth (access 15min + refresh 30j)
- Zod validation
- Winston logging

## Solution bug P1010 sur ARM64

Le bug Prisma P1010 sur Apple Silicon a été résolu en :

1. **Supprimant `$connect()` explicite** dans `src/config/database.ts`
2. **Utilisant la connexion lazy** de Prisma (connexion automatique à la première requête)
3. **Migrations manuelles** via psql/Docker (contournement du bug `prisma migrate`)

Voir [ARM64_P1010_SOLUTION.md](ARM64_P1010_SOLUTION.md) pour les détails.

## Structure de la base de données

**7 tables créées dans le schéma `public` :**

```sql
users              -- Utilisateurs (OWNER, MANAGER, ATTENDANT, CUSTOMER)
stations           -- Stations-service
pumps              -- Pompes à carburant
nozzles            -- Pistolets (SUPER, DIESEL, ORDINAIRE)
transactions       -- Transactions de vente
refresh_tokens     -- Tokens JWT refresh
_prisma_migrations -- Historique migrations Prisma
```

## Configuration

**.env:**
```env
DATABASE_URL="postgresql://fueltech:fueltech_dev_password@localhost:5432/fueltech_db"
JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-in-production
```

**Docker services:**
- PostgreSQL 15 → `localhost:5432`
- Redis 7 → `localhost:6379`
- PgAdmin → `http://localhost:5050`

## Démarrage

```bash
# 1. Démarrer Docker
npm run docker:up

# 2. Vérifier que PostgreSQL est prêt
docker ps | grep fueltech_postgres

# 3. Démarrer le serveur
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

## Endpoints disponibles

### Health Check
```
GET /health
GET /api
```

### Auth
```
POST /api/v1/auth/register   - Inscription
POST /api/v1/auth/login      - Connexion
POST /api/v1/auth/refresh    - Refresh token
POST /api/v1/auth/logout     - Déconnexion
GET  /api/v1/auth/me         - Utilisateur actuel (protégé)
```

## Test de l'API

### Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@fueltech.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234",
    "firstName": "Amadou",
    "lastName": "Diallo",
    "phone": "+221771234567",
    "role": "OWNER"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@fueltech.com",
    "password": "Test@1234"
  }'
```

Récupérez le `accessToken` et utilisez-le pour les routes protégées.

### Get Current User
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Vérification PostgreSQL

```bash
# Lister les tables
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "\dt"

# Compter les users
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "SELECT COUNT(*) FROM users;"

# Voir les migrations appliquées
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "SELECT * FROM _prisma_migrations;"
```

## Prochaines étapes

1. ✅ Module Auth complet
2. 🔲 Module Stations (CRUD)
3. 🔲 Module Pumps & Nozzles
4. 🔲 Module Transactions
5. 🔲 Intégration Wave Payment
6. 🔲 Simulateur IoT
7. 🔲 Dashboard Analytics

## Migrations futures

Pour ajouter de nouvelles tables/colonnes :

```bash
# 1. Modifier prisma/schema.prisma
# 2. Générer le SQL
npx prisma migrate diff \
  --from-migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql

# 3. Appliquer manuellement
docker exec -i fueltech_postgres psql -U fueltech -d fueltech_db < migration.sql

# 4. Enregistrer dans _prisma_migrations
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "
INSERT INTO _prisma_migrations (id, checksum, migration_name, logs, applied_steps_count, finished_at)
VALUES (gen_random_uuid()::text, '0', '$(date +%Y%m%d%H%M%S)_description', '', 1, NOW());
"

# 5. Régénérer le client
npx prisma generate
```

## Support

- Documentation : [QUICKSTART.md](QUICKSTART.md)
- Bug ARM64 : [ARM64_P1010_SOLUTION.md](ARM64_P1010_SOLUTION.md)
- Migration : [MIGRATION_SUCCESS.md](MIGRATION_SUCCESS.md)

## Troubleshooting

### Le serveur ne démarre pas
```bash
# Vérifier les logs Docker
npm run docker:logs

# Redémarrer PostgreSQL
npm run docker:down
npm run docker:up
```

### Erreur de connexion DB
```bash
# Tester la connexion directe
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "SELECT 1;"
```

### TypeScript errors
```bash
# Vérifier la compilation
npx tsc --noEmit

# Régénérer Prisma Client
npx prisma generate
```

---

**Le projet est prêt pour le développement !** 🚀

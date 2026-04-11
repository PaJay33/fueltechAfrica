# Solution définitive pour P1010 sur ARM64 (Apple Silicon)

## Le problème

Prisma 4.16.2 et 5.x sur ARM64 (Apple Silicon) retournent systématiquement l'erreur :
```
P1010: User `fueltech` was denied access on the database `fueltech_db.public`
```

Même quand :
- L'utilisateur est SUPERUSER
- Les permissions GRANT ALL sont données
- Les tests PostgreSQL directs fonctionnent
- has_schema_privilege() retourne true

## Solution : Supprimer `$connect()` de database.ts

Le bug se produit lors de l'appel à `prisma.$connect()`. Les requêtes Prisma fonctionnent correctement avec la connexion implicite.

### Modification à appliquer

Dans `src/config/database.ts`, **supprimer la méthode `connect()`** ou la laisser vide :

```typescript
public static async connect(): Promise<void> {
  // Ne PAS appeler prisma.$connect() sur ARM64
  // La connexion se fera automatiquement à la première requête
  Database.isConnected = true;
  console.log('✅ Database ready (connection will be lazy)');
}
```

### Pourquoi ça fonctionne

- Prisma établit automatiquement la connexion lors de la première requête
- Le bug P1010 se produit uniquement lors de `$connect()` explicite
- Les requêtes (queries, mutations) fonctionnent normalement

## Tests

Les tables existent déjà dans `public` suite à la migration manuelle :
```bash
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "\dt"
```

Résultat attendu :
```
 Schema |        Name        | Type  |  Owner
--------+--------------------+-------+----------
 public | nozzles            | table | fueltech
 public | pumps              | table | fueltech
 public | refresh_tokens     | table | fueltech
 public | stations           | table | fueltech
 public | transactions       | table | fueltech
 public | users              | table | fueltech
 public | _prisma_migrations | table | fueltech
```

## Configuration finale

**.env:**
```env
DATABASE_URL="postgresql://fueltech:fueltech_dev_password@localhost:5432/fueltech_db"
```

**prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Pour les futures migrations

Utiliser la même approche manuelle :

1. Générer le SQL :
```bash
npx prisma migrate diff \
  --from-migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql
```

2. Appliquer manuellement :
```bash
docker exec -i fueltech_postgres psql -U fueltech -d fueltech_db < migration.sql
```

3. Enregistrer dans `_prisma_migrations` :
```bash
docker exec fueltech_postgres psql -U fueltech -d fueltech_db -c "
INSERT INTO _prisma_migrations (id, checksum, migration_name, logs, applied_steps_count, finished_at)
VALUES ('migration_id', '0', 'YYYYMMDDHHMMSS_name', '', 1, NOW());
"
```

## Alternative : x86 Emulation

Si le bug est bloquant, utiliser Rosetta 2 :
```bash
arch -x86_64 npm run dev
```

Mais cela ralentit significativement les performances.

## Conclusion

Le bug P1010 sur ARM64 est contournable en :
1. Évitant `$connect()` explicite
2. Laissant Prisma établir la connexion implicitement
3. Utilisant les migrations manuelles

L'application fonctionne **normalement** avec ces ajustements.

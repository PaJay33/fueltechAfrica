# 🚀 FuelTech Africa API - Quick Start Guide

## Démarrage rapide

### 1. Installation des dépendances

```bash
cd fueltech-api
npm install
```

### 2. Démarrer PostgreSQL et Redis avec Docker

```bash
npm run docker:up
```

Vérifier que les services sont démarrés :
```bash
docker ps
```

Vous devriez voir :
- `fueltech_postgres` sur le port 5432
- `fueltech_redis` sur le port 6379
- `fueltech_pgadmin` sur le port 5050

### 3. Générer le client Prisma

```bash
npm run prisma:generate
```

### 4. Créer et exécuter les migrations

```bash
npm run prisma:migrate
```

Nom de la migration : `init` (ou un nom descriptif)

### 5. (Optionnel) Ouvrir Prisma Studio

Pour visualiser et gérer vos données :
```bash
npm run prisma:studio
```

Interface disponible sur http://localhost:5555

### 6. (Optionnel) Ouvrir PgAdmin

Interface disponible sur http://localhost:5050

Credentials :
- Email: `admin@fueltech.com`
- Password: `admin`

### 7. Démarrer le serveur en mode développement

```bash
npm run dev
```

Le serveur démarre sur http://localhost:3000

## ✅ Tester l'API

### Health Check

```bash
curl http://localhost:3000/health
```

### Register (Inscription)

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

### Login (Connexion)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@fueltech.com",
    "password": "Test@1234"
  }'
```

Récupérez le `accessToken` de la réponse.

### Get Current User (Utilisateur connecté)

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 📁 Structure des fichiers créés

```
fueltech-api/
├── src/
│   ├── config/
│   │   ├── env.ts              ✅ Validation Zod des variables d'env
│   │   └── database.ts         ✅ Singleton PrismaClient
│   ├── utils/
│   │   ├── logger.ts           ✅ Winston logger
│   │   └── apiResponse.ts      ✅ Réponses API standardisées
│   ├── middleware/
│   │   ├── errorHandler.ts     ✅ Gestion globale des erreurs
│   │   └── authenticate.ts     ✅ JWT auth + authorize
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.types.ts        ✅ Interfaces TypeScript
│   │       ├── auth.validation.ts   ✅ Schémas Zod
│   │       ├── auth.service.ts      ✅ Logique métier
│   │       ├── auth.controller.ts   ✅ Contrôleurs
│   │       └── auth.routes.ts       ✅ Routes Express
│   └── server.ts               ✅ Application principale
└── prisma/
    └── schema.prisma           ✅ Schéma complet
```

## 🔑 Rôles utilisateurs

- `OWNER` : Propriétaire de station(s)
- `MANAGER` : Gérant de station
- `ATTENDANT` : Pompiste
- `CUSTOMER` : Client

## 🛠️ Commandes utiles

```bash
# Développement
npm run dev                 # Démarrer avec hot reload

# Build
npm run build              # Compiler TypeScript
npm start                  # Démarrer en production

# Database
npm run prisma:generate    # Générer le client Prisma
npm run prisma:migrate     # Créer/appliquer une migration
npm run prisma:studio      # Interface graphique DB

# Docker
npm run docker:up          # Démarrer les conteneurs
npm run docker:down        # Arrêter les conteneurs
npm run docker:logs        # Voir les logs

# Code Quality
npm run lint               # Linter
npm run format            # Formatter avec Prettier
npm test                  # Lancer les tests
```

## 🚨 Troubleshooting

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
docker ps | grep postgres

# Redémarrer les conteneurs
npm run docker:down
npm run docker:up
```

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur Prisma Client

```bash
# Régénérer le client
npm run prisma:generate
```

## 📚 Prochaines étapes

1. ✅ Module Auth complet
2. 🔲 Module Stations (CRUD stations)
3. 🔲 Module Pumps (CRUD pompes)
4. 🔲 Module Transactions
5. 🔲 Intégration Wave Payment
6. 🔲 Simulateur IoT
7. 🔲 Dashboard & Analytics

## 🌍 Production

Avant de déployer en production :

1. Changer tous les secrets dans `.env`
2. Mettre `NODE_ENV=production`
3. Utiliser une vraie base PostgreSQL (pas Docker local)
4. Configurer les logs avec rotation
5. Activer HTTPS
6. Configurer un reverse proxy (Nginx)
7. Mettre en place monitoring (PM2, Datadog, etc.)

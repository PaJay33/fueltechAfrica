# FuelTech Africa API

Backend MVP pour la plateforme de digitalisation des stations-service en Afrique.

## Stack Technique

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Auth**: JWT (Access + Refresh tokens)
- **Validation**: Zod
- **Logging**: Winston
- **Payment**: Wave Business API

## Prérequis

- Node.js >= 20.0.0
- Docker & Docker Compose
- npm >= 10.0.0

## Installation

1. **Cloner le projet**
```bash
cd fueltech-api
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer les services Docker**
```bash
npm run docker:up
```

5. **Générer le client Prisma**
```bash
npm run prisma:generate
```

6. **Exécuter les migrations**
```bash
npm run prisma:migrate
```

7. **Seed la base de données (optionnel)**
```bash
npm run prisma:seed
```

## Développement

```bash
# Démarrer en mode développement
npm run dev

# Générer le client Prisma
npm run prisma:generate

# Créer une migration
npm run prisma:migrate

# Ouvrir Prisma Studio
npm run prisma:studio
```

## Scripts disponibles

- `npm run dev` - Démarrer en mode développement avec hot reload
- `npm run build` - Compiler le TypeScript
- `npm start` - Démarrer en production
- `npm run prisma:generate` - Générer le client Prisma
- `npm run prisma:migrate` - Exécuter les migrations
- `npm run prisma:studio` - Ouvrir Prisma Studio
- `npm run docker:up` - Démarrer les conteneurs Docker
- `npm run docker:down` - Arrêter les conteneurs
- `npm test` - Lancer les tests

## Structure du projet

```
fueltech-api/
├── src/
│   ├── modules/           # Modules fonctionnels
│   │   ├── auth/         # Authentification
│   │   ├── stations/     # Gestion des stations
│   │   ├── pumps/        # Gestion des pompes
│   │   ├── transactions/ # Transactions
│   │   └── users/        # Gestion des utilisateurs
│   ├── config/           # Configuration
│   ├── middleware/       # Middlewares Express
│   ├── utils/           # Utilitaires
│   ├── types/           # Types TypeScript
│   └── server.ts        # Point d'entrée
├── prisma/
│   ├── schema.prisma    # Schéma Prisma
│   └── seed.ts          # Données de seed
├── docker-compose.yml   # Configuration Docker
└── package.json
```

## Modèles de données

- **User**: Utilisateurs (OWNER, MANAGER, ATTENDANT, CUSTOMER)
- **Station**: Stations-service
- **Pump**: Pompes à carburant
- **Nozzle**: Pistolets avec types de carburant (SUPER, DIESEL, ORDINAIRE)
- **Transaction**: Transactions de vente
- **RefreshToken**: Tokens de rafraîchissement JWT

## API Endpoints (à implémenter)

### Auth
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/auth/refresh` - Rafraîchir le token
- `POST /api/v1/auth/logout` - Déconnexion

### Stations
- `GET /api/v1/stations` - Liste des stations
- `POST /api/v1/stations` - Créer une station
- `GET /api/v1/stations/:id` - Détails d'une station
- `PATCH /api/v1/stations/:id` - Modifier une station

### Transactions
- `POST /api/v1/transactions` - Créer une transaction
- `GET /api/v1/transactions/:id` - Détails d'une transaction
- `POST /api/v1/transactions/:id/pay` - Payer une transaction

## Services Docker

- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **PgAdmin**: Port 5050 (http://localhost:5050)

## Licence

MIT

# 🚀 FuelTech Africa API - START HERE

## ✅ Le serveur est DÉMARRÉ et FONCTIONNEL !

**URL du serveur :** http://localhost:3000

## 🎯 État actuel

✅ **PostgreSQL local (Homebrew)** configuré et connecté
✅ **Base de données** fueltech_db avec 6 tables migrées
✅ **Serveur Express** démarré sur le port 3000
✅ **Module Auth complet** (register, login, refresh, logout, me)
✅ **Prisma 4.16.2** sans bug P1010
✅ **TypeScript** compile sans erreurs

## 🧪 Test rapide

Ouvrez un nouveau terminal et testez :

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api

# Register un utilisateur
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@fueltech.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 📊 Stack technique

- **Runtime :** Node.js 20+
- **Framework :** Express.js
- **Database :** PostgreSQL 14 (Homebrew local)
- **ORM :** Prisma 4.16.2
- **Auth :** JWT (access 15min + refresh 30j)
- **Validation :** Zod
- **Logging :** Winston

## 📁 Structure backend

```
src/
├── config/
│   ├── database.ts       # PrismaClient simplifié
│   └── env.ts            # Variables d'environnement validées
├── middleware/
│   ├── authenticate.ts   # JWT + authorize
│   └── errorHandler.ts   # Gestion globale d'erreurs
├── modules/
│   └── auth/
│       ├── auth.controller.ts   # 5 endpoints
│       ├── auth.service.ts      # Logique métier
│       ├── auth.routes.ts       # Routes Express
│       ├── auth.types.ts        # Interfaces TS
│       └── auth.validation.ts   # Schémas Zod
├── utils/
│   ├── apiResponse.ts   # Réponses standardisées
│   └── logger.ts        # Winston logger
└── server.ts            # Application Express
```

## 🔐 Endpoints disponibles

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api` | ❌ | API info |
| POST | `/api/v1/auth/register` | ❌ | Inscription |
| POST | `/api/v1/auth/login` | ❌ | Connexion |
| POST | `/api/v1/auth/refresh` | ❌ | Refresh token |
| POST | `/api/v1/auth/logout` | ❌ | Déconnexion |
| GET | `/api/v1/auth/me` | ✅ | User actuel |

## 🗄️ Modèles Prisma

- **User** (OWNER, MANAGER, ATTENDANT, CUSTOMER)
- **Station** (géolocalisation + statut)
- **Pump** (avec maintenance tracking)
- **Nozzle** (SUPER, DIESEL, ORDINAIRE + compteurs)
- **Transaction** (flux complet + Wave Payment)
- **RefreshToken** (avec user-agent/IP tracking)

## 🔧 Commandes

```bash
# Serveur déjà démarré en background
# Pour voir les logs :
npm run dev

# Prisma Studio (interface graphique DB)
npx prisma studio

# Vérifier PostgreSQL
psql -U fueltech -d fueltech_db -c "\dt"

# Compiler TypeScript
npx tsc --noEmit
```

## 📚 Documentation

- **[LOCAL_POSTGRES_SUCCESS.md](LOCAL_POSTGRES_SUCCESS.md)** - Configuration PostgreSQL local
- **[READY_TO_START.md](READY_TO_START.md)** - Guide complet
- **[ARM64_P1010_SOLUTION.md](ARM64_P1010_SOLUTION.md)** - Solution bug Prisma
- **[QUICKSTART.md](QUICKSTART.md)** - Guide de démarrage

## 🎯 Prochaines étapes

Le module **Auth** est complet et testé. Vous pouvez maintenant développer :

1. **Module Stations** - CRUD stations-service
2. **Module Pumps** - Gestion des pompes
3. **Module Nozzles** - Gestion des pistolets
4. **Module Transactions** - Flux de vente complet
5. **Intégration Wave** - Paiements mobile money
6. **Simulateur IoT** - Mock des pompes pour tests
7. **Analytics** - Dashboard et rapports

## 💡 Notes importantes

### PostgreSQL
- **Local Homebrew** utilisé (pas Docker)
- Port **5432**
- User : `fueltech`
- Database : `fueltech_db`

### Prisma
- Version **4.16.2** (évite bug P1010 sur ARM64)
- Connexion lazy (pas de `$connect()` explicite)
- Génération : `npx prisma generate`

### Environnement
- `.env` configuré pour PostgreSQL local
- Logs dans `./logs/`
- Mode développement avec hot-reload

---

**🎉 Tout est prêt ! Le développement peut commencer.**

Pour toute question, consultez la documentation ou vérifiez les logs du serveur.

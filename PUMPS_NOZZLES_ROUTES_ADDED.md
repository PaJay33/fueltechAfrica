# ✅ Routes Pumps et Nozzles ajoutées

## 🎯 Nouvelles routes créées

Deux nouvelles routes ont été ajoutées au module Stations pour permettre d'ajouter des pompes et des pistolets.

## 📁 Fichiers créés

### 1. [src/modules/nozzles/nozzle.types.ts](src/modules/nozzles/nozzle.types.ts)
Interfaces TypeScript pour les pistolets :
- `CreateNozzleDto` - Données pour créer un pistolet
- `UpdateNozzleDto` - Données pour mettre à jour un pistolet
- `NozzleResponse` - Réponse avec relations (pump, station)

### 2. [src/modules/nozzles/nozzle.validation.ts](src/modules/nozzles/nozzle.validation.ts)
Schémas de validation Zod :
- `createNozzleSchema` - Validation pour création
  - Code uppercase alphanumeric avec hyphens (transformation auto)
  - FuelType: SUPER, DIESEL, ORDINAIRE
  - pricePerLiter: nombre positif (max 100000)
- `updateNozzleSchema` - Validation pour mise à jour
- `nozzleIdSchema` - Validation pour ID CUID

## 📝 Fichiers modifiés

### 1. [src/modules/stations/station.service.ts](src/modules/stations/station.service.ts)
Deux nouvelles méthodes ajoutées :

#### `addPump(stationId: string, ownerId: string, dto: CreatePumpDto): Promise<PumpResponse>`
- Vérifie que la station existe
- Vérifie que l'utilisateur possède la station (ownerId)
- Vérifie l'unicité du code de pompe dans la station
- Crée la pompe avec status ACTIVE
- Retourne la pompe avec relations (station, nozzles)

#### `addNozzle(pumpId: string, stationId: string, ownerId: string, dto: CreateNozzleDto): Promise<NozzleResponse>`
- Vérifie que la station existe
- Vérifie que l'utilisateur possède la station (ownerId)
- Vérifie que la pompe existe et appartient à la station
- Vérifie l'unicité du code de pistolet dans la pompe
- Crée le pistolet avec currentReading et previousReading à 0
- Retourne le pistolet avec relations (pump, station)

### 2. [src/modules/stations/station.controller.ts](src/modules/stations/station.controller.ts)
Deux nouvelles méthodes ajoutées :

#### `addPumpToStation(req: Request, res: Response): Promise<void>`
- Endpoint: POST /api/v1/stations/:id/pumps
- Valide stationId depuis req.params.id
- Valide body avec createPumpSchema
- Récupère ownerId depuis req.user.id
- Appelle stationService.addPump()
- Gestion d'erreurs : 404 (station not found), 403 (not owner), 400 (code exists)

#### `addNozzleToPump(req: Request, res: Response): Promise<void>`
- Endpoint: POST /api/v1/stations/:id/pumps/:pumpId/nozzles
- Valide stationId et pumpId depuis req.params
- Valide body avec createNozzleSchema
- Récupère ownerId depuis req.user.id
- Appelle stationService.addNozzle()
- Gestion d'erreurs : 404 (station/pump not found), 403 (not owner), 400 (pump not in station, code exists)

### 3. [src/modules/stations/station.routes.ts](src/modules/stations/station.routes.ts)
Deux nouvelles routes ajoutées :

```typescript
/**
 * @route   POST /api/v1/stations/:id/pumps
 * @desc    Add a pump to a station
 * @access  Private (OWNER only)
 */
router.post(
  '/:id/pumps',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.addPumpToStation(req, res)
);

/**
 * @route   POST /api/v1/stations/:id/pumps/:pumpId/nozzles
 * @desc    Add a nozzle to a pump
 * @access  Private (OWNER only)
 */
router.post(
  '/:id/pumps/:pumpId/nozzles',
  authenticate,
  authorize('OWNER'),
  (req, res) => stationController.addNozzleToPump(req, res)
);
```

## 🔐 Endpoints disponibles

| Méthode | Endpoint | Description | Auth | Rôles |
|---------|----------|-------------|------|-------|
| POST | `/api/v1/stations/:id/pumps` | Ajouter une pompe à une station | ✅ | OWNER |
| POST | `/api/v1/stations/:id/pumps/:pumpId/nozzles` | Ajouter un pistolet à une pompe | ✅ | OWNER |

## 🧪 Tests manuels

### 1. Ajouter une pompe à une station

```bash
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Pompe 1",
    "code": "P001",
    "stationId": "STATION_ID"
  }'
```

**Réponse attendue (201):**
```json
{
  "success": true,
  "message": "Pump added to station successfully",
  "data": {
    "id": "cmnuk...",
    "name": "Pompe 1",
    "code": "P001",
    "status": "ACTIVE",
    "stationId": "STATION_ID",
    "lastMaintenanceDate": null,
    "nextMaintenanceDate": null,
    "createdAt": "2026-04-11T...",
    "updatedAt": "2026-04-11T...",
    "station": {
      "id": "STATION_ID",
      "name": "Station Liberté 5",
      "code": "SN-DKR-001"
    },
    "nozzles": []
  }
}
```

### 2. Ajouter un pistolet à une pompe

```bash
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps/PUMP_ID/nozzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "code": "N001",
    "fuelType": "SUPER",
    "pricePerLiter": 850,
    "pumpId": "PUMP_ID"
  }'
```

**Réponse attendue (201):**
```json
{
  "success": true,
  "message": "Nozzle added to pump successfully",
  "data": {
    "id": "cmnul...",
    "code": "N001",
    "fuelType": "SUPER",
    "status": "ACTIVE",
    "pricePerLiter": 850,
    "currentReading": 0,
    "previousReading": 0,
    "pumpId": "PUMP_ID",
    "createdAt": "2026-04-11T...",
    "updatedAt": "2026-04-11T...",
    "pump": {
      "id": "PUMP_ID",
      "name": "Pompe 1",
      "code": "P001",
      "station": {
        "id": "STATION_ID",
        "name": "Station Liberté 5",
        "code": "SN-DKR-001"
      }
    }
  }
}
```

## 🔍 Validations automatiques

### Pompe (Pump)
- ✅ Nom : 2-50 caractères
- ✅ Code : 2-20 caractères, uppercase alphanumeric avec hyphens
- ✅ Transformation automatique en UPPERCASE
- ✅ Unicité du code dans la station
- ✅ Vérification propriétaire de la station

### Pistolet (Nozzle)
- ✅ Code : 2-20 caractères, uppercase alphanumeric avec hyphens
- ✅ Transformation automatique en UPPERCASE
- ✅ FuelType : SUPER, DIESEL, ORDINAIRE uniquement
- ✅ Prix/litre : nombre positif, max 100000
- ✅ Unicité du code dans la pompe
- ✅ Vérification propriétaire de la station
- ✅ Vérification pompe appartient à la station

## 🛡️ Contrôle d'accès

### OWNER
- ✅ Peut ajouter des pompes à ses stations
- ✅ Peut ajouter des pistolets aux pompes de ses stations

### MANAGER / ATTENDANT / CUSTOMER
- ❌ Ne peuvent pas ajouter de pompes
- ❌ Ne peuvent pas ajouter de pistolets

## 🚨 Gestions d'erreurs

### Ajouter une pompe

**Station non trouvée (404):**
```json
{
  "success": false,
  "message": "Station not found"
}
```

**Pas propriétaire (403):**
```json
{
  "success": false,
  "message": "You do not own this station"
}
```

**Code pompe existe (400):**
```json
{
  "success": false,
  "message": "Pump code already exists in this station"
}
```

**Validation Zod (400):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "code",
      "message": "Pump code must be uppercase alphanumeric with optional hyphens"
    }
  ]
}
```

### Ajouter un pistolet

**Station/Pompe non trouvée (404):**
```json
{
  "success": false,
  "message": "Station not found"
}
```
ou
```json
{
  "success": false,
  "message": "Pump not found"
}
```

**Pas propriétaire (403):**
```json
{
  "success": false,
  "message": "You do not own this station"
}
```

**Pompe pas dans la station (400):**
```json
{
  "success": false,
  "message": "Pump does not belong to this station"
}
```

**Code pistolet existe (400):**
```json
{
  "success": false,
  "message": "Nozzle code already exists in this pump"
}
```

**FuelType invalide (400):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "fuelType",
      "message": "Invalid fuel type. Must be SUPER, DIESEL, or ORDINAIRE"
    }
  ]
}
```

## 📊 Flux complet

### Créer une station complète

1. **Créer la station** (POST /api/v1/stations)
```bash
curl -X POST http://localhost:3000/api/v1/stations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Station Total Liberté",
    "code": "SNDKR001",
    "address": "Avenue Cheikh Anta Diop",
    "city": "Dakar",
    "region": "Dakar"
  }'
```

2. **Ajouter 2 pompes** (POST /api/v1/stations/:id/pumps)
```bash
# Pompe 1
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Pompe 1", "code": "P001", "stationId": "STATION_ID"}'

# Pompe 2
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Pompe 2", "code": "P002", "stationId": "STATION_ID"}'
```

3. **Ajouter 3 pistolets à la Pompe 1** (POST /api/v1/stations/:id/pumps/:pumpId/nozzles)
```bash
# Pistolet Super
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps/PUMP1_ID/nozzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code": "N001", "fuelType": "SUPER", "pricePerLiter": 850, "pumpId": "PUMP1_ID"}'

# Pistolet Diesel
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps/PUMP1_ID/nozzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code": "N002", "fuelType": "DIESEL", "pricePerLiter": 780, "pumpId": "PUMP1_ID"}'

# Pistolet Ordinaire
curl -X POST http://localhost:3000/api/v1/stations/STATION_ID/pumps/PUMP1_ID/nozzles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code": "N003", "fuelType": "ORDINAIRE", "pricePerLiter": 720, "pumpId": "PUMP1_ID"}'
```

4. **Vérifier les statistiques** (GET /api/v1/stations/:id/stats)
```bash
curl http://localhost:3000/api/v1/stations/STATION_ID/stats \
  -H "Authorization: Bearer TOKEN"
```

Résultat attendu :
```json
{
  "success": true,
  "message": "Station statistics retrieved successfully",
  "data": {
    "station": {
      "id": "STATION_ID",
      "name": "Station Total Liberté",
      "code": "SNDKR001",
      "status": "ACTIVE"
    },
    "pumps": {
      "total": 2,
      "active": 2,
      "inactive": 0
    },
    "nozzles": {
      "total": 3,
      "active": 3,
      "inactive": 0
    }
  }
}
```

## ✅ Statut serveur

```bash
npm run dev
```

**Serveur démarré sur http://localhost:3000**

Logs :
```
✅ Database connected successfully
🚀 FuelTech Africa API Server
Environment: development
Port: 3000
```

## 📝 Récapitulatif des endpoints Stations

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| POST | `/api/v1/stations` | Créer une station | OWNER |
| GET | `/api/v1/stations` | Liste stations | Tous |
| GET | `/api/v1/stations/:id` | Détails station | Tous |
| PUT | `/api/v1/stations/:id` | Modifier station | OWNER, MANAGER |
| DELETE | `/api/v1/stations/:id` | Supprimer station | OWNER |
| GET | `/api/v1/stations/my/stations` | Mes stations | OWNER |
| GET | `/api/v1/stations/:id/stats` | Statistiques | Tous |
| **POST** | **`/api/v1/stations/:id/pumps`** | **Ajouter pompe** | **OWNER** |
| **POST** | **`/api/v1/stations/:id/pumps/:pumpId/nozzles`** | **Ajouter pistolet** | **OWNER** |

---

**🎉 Les routes Pumps et Nozzles sont opérationnelles !**

Le serveur tourne sur **http://localhost:3000** et est prêt pour créer des stations complètes avec pompes et pistolets.

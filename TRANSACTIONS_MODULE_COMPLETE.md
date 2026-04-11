# ✅ Module Transactions avec Simulateur IoT - COMPLET

## 🎯 Résumé

Le module Transactions complet avec simulateur IoT a été créé pour FuelTech Africa. Ce module permet aux clients d'initier des transactions de carburant, de payer via Wave/Cash/Mobile Money, et simule le processus de remplissage avec un simulateur de pompe IoT.

## 📁 Fichiers créés

### 1. Simulateur IoT

**simulator/pump.simulator.ts**
- Classe `PumpSimulator` basée sur EventEmitter
- Méthode `authorize()` : Autorise une transaction après 800ms (délai réseau), démarre le remplissage après 2s
- Méthode `simulateFueling()` : Simule le remplissage à 0.5L toutes les 500ms
- Émet événement `fuel_data` toutes les 500ms avec le volume actuel
- Émet événement `fueling_complete` quand le montant max est atteint
- Méthode `stop()` : Arrête un remplissage en cours
- Export d'une instance singleton `pumpSimulator`

### 2. Module Transactions

#### **src/modules/transactions/transaction.types.ts**
Interfaces TypeScript :
- `InitiateTransactionDto` : nozzleId, presetAmount, paymentMethod
- `TransactionFilters` : stationId, userId, status, startDate, endDate, page, limit
- `TransactionResponse` : Transaction complète avec relations (station, nozzle, pump, user)
- `InitiateTransactionResponse` : transaction + checkoutUrl optionnel

#### **src/modules/transactions/transaction.validation.ts**
Schémas Zod :
- `initiateTransactionSchema` :
  * nozzleId : string CUID
  * presetAmount : 500-100,000 FCFA
  * paymentMethod : WAVE | ORANGE_MONEY | FREE_MONEY | CASH
- `transactionIdSchema` : Validation ID transaction

#### **src/modules/transactions/wave.service.ts**
Service Wave :
- `initiatePayment()` : Crée une session de paiement Wave
  * POST /v1/checkout/sessions
  * Retourne checkoutId et checkoutUrl
  * En cas d'erreur : throw Error('WAVE_PAYMENT_FAILED')
- `verifyPayment()` : Vérifie le statut d'un paiement
  * GET /v1/checkout/sessions/:id

#### **src/modules/transactions/transaction.service.ts**
Service principal :

**a) initiate(customerId, dto)**
- Vérifie que la nozzle existe et est AVAILABLE
- Vérifie que la pompe est ACTIVE
- Génère un transactionCode unique : TXN-YYYYMMDD-XXXX
- Si WAVE : initie paiement Wave, met status PROCESSING
- Si CASH/Mobile Money : met status PROCESSING, autorise pompe immédiatement
- Met la nozzle en statut IN_USE
- Retourne { transaction, checkoutUrl? }

**b) handleWaveWebhook(waveTransactionId, status)**
- Trouve la transaction par waveTransactionId
- Si status === 'succeeded' : autorise la pompe
- Si status === 'failed' : marque transaction FAILED, remet nozzle AVAILABLE

**c) complete(transactionId, volumeDelivered)**
- Calcule finalAmount = volumeDelivered × pricePerLiter
- Met à jour transaction : status COMPLETED, volume, finalAmount, completedAt
- Met à jour nozzle : status AVAILABLE, totalVolume += volume, totalAmount += amount
- Retourne la transaction complète

**d) cancel(transactionId, userId)**
- Vérifie permissions
- Arrête la pompe via pumpSimulator.stop()
- Met status CANCELLED, remet nozzle AVAILABLE

**e) findAll(filters)** : Liste paginée avec filtres

**f) findById(id)** : Détail complet

#### **src/modules/transactions/transaction.controller.ts**
Contrôleurs :
- `initiateTransaction` : POST /transactions
- `getTransactions` : GET /transactions
- `getTransactionById` : GET /transactions/:id
- `cancelTransaction` : DELETE /transactions/:id
- `waveWebhook` : POST /transactions/webhook/wave (public, pas d'auth)

#### **src/modules/transactions/transaction.routes.ts**
Routes :
- POST   `/` → authenticate + authorize(CUSTOMER, ATTENDANT)
- GET    `/` → authenticate (tous les rôles)
- GET    `/:id` → authenticate
- DELETE `/:id` → authenticate
- POST   `/webhook/wave` → PUBLIC (pas de JWT)

### 3. Intégration Serveur

**src/server.ts** (modifié)
- Import de `transactionRoutes` et branché sur `/api/v1/transactions`
- Import de `pumpSimulator` et `transactionService`
- Méthode `configurePumpSimulator()` :
  * Écoute événement `fueling_complete` → appelle `transactionService.complete()`
  * Écoute événement `fuel_data` → log en temps réel le débit

## 🔐 Endpoints disponibles

| Méthode | Endpoint | Description | Auth | Rôles |
|---------|----------|-------------|------|-------|
| POST | `/api/v1/transactions` | Initier une transaction | ✅ | CUSTOMER, ATTENDANT |
| GET | `/api/v1/transactions` | Liste des transactions | ✅ | Tous |
| GET | `/api/v1/transactions/:id` | Détail transaction | ✅ | Tous |
| DELETE | `/api/v1/transactions/:id` | Annuler transaction | ✅ | Tous |
| POST | `/api/v1/transactions/webhook/wave` | Webhook Wave | ❌ | Public |

## 🧪 Flux complet d'une transaction

### Scénario 1 : Paiement Cash

1. **Initier la transaction**
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "nozzleId": "NOZZLE_ID",
    "presetAmount": 5000,
    "paymentMethod": "CASH"
  }'
```

**Réponse (201):**
```json
{
  "success": true,
  "message": "Transaction initiated successfully",
  "data": {
    "transaction": {
      "id": "cmnux...",
      "transactionCode": "TXN-20260411-0001",
      "status": "PROCESSING",
      "totalAmount": 5000,
      "volume": 0,
      "pricePerLiter": 850,
      "paymentMethod": "CASH",
      "nozzle": { ... },
      "station": { ... }
    }
  }
}
```

2. **Pompe s'autorise automatiquement**
- Délai réseau : 800ms
- Attente : 2s
- Début remplissage : débit 0.5L / 500ms

3. **Logs en temps réel (fuel_data)**
```
[info]: Fuel data: { transactionId: "cmnux...", volumeDelivered: 0.5, flowRate: 0.5 }
[info]: Fuel data: { transactionId: "cmnux...", volumeDelivered: 1.0, flowRate: 0.5 }
[info]: Fuel data: { transactionId: "cmnux...", volumeDelivered: 1.5, flowRate: 0.5 }
...
```

4. **Remplissage terminé (fueling_complete)**
```
[info]: Fueling complete event received: {
  transactionId: "cmnux...",
  volumeDelivered: 5.88,
  finalAmount: 4998
}
[info]: Transaction completed: cmnux... { volumeDelivered: 5.88, finalAmount: 4998 }
```

5. **Vérifier la transaction**
```bash
curl http://localhost:3000/api/v1/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer TOKEN"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "cmnux...",
    "transactionCode": "TXN-20260411-0001",
    "status": "COMPLETED",
    "volume": 5.88,
    "totalAmount": 4998,
    "completedAt": "2026-04-11T18:30:45.123Z",
    ...
  }
}
```

### Scénario 2 : Paiement Wave

1. **Initier la transaction**
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "nozzleId": "NOZZLE_ID",
    "presetAmount": 10000,
    "paymentMethod": "WAVE"
  }'
```

**Réponse (201):**
```json
{
  "success": true,
  "message": "Transaction initiated successfully",
  "data": {
    "transaction": {
      "id": "cmnuy...",
      "transactionCode": "TXN-20260411-0002",
      "status": "PROCESSING",
      "totalAmount": 10000,
      "waveTransactionId": "wave_checkout_123",
      "wavePaymentUrl": "https://api.wave.com/checkout/..."
    },
    "checkoutUrl": "https://api.wave.com/checkout/..."
  }
}
```

2. **Client paie via Wave** (navigation vers checkoutUrl)

3. **Wave envoie webhook**
```bash
curl -X POST http://localhost:3000/api/v1/transactions/webhook/wave \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "wave_checkout_123",
    "status": "succeeded"
  }'
```

4. **Pompe s'autorise** → remplissage commence → transaction complète

### Scénario 3 : Annuler une transaction

```bash
curl -X DELETE http://localhost:3000/api/v1/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer TOKEN"
```

**Réponse (200):**
```json
{
  "success": true,
  "message": "Transaction cancelled successfully"
}
```

- La pompe s'arrête immédiatement
- Transaction passe en statut CANCELLED
- Nozzle redevient AVAILABLE

## 🔍 Filtres de recherche

```bash
curl "http://localhost:3000/api/v1/transactions?stationId=STATION_ID&status=COMPLETED&page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

Filtres disponibles :
- `stationId` : Filtrer par station
- `userId` : Filtrer par utilisateur
- `status` : PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
- `startDate` : Date de début (ISO 8601)
- `endDate` : Date de fin (ISO 8601)
- `page` : Numéro de page (défaut: 1)
- `limit` : Limite par page (défaut: 20)

## ⚡ Événements du Simulateur

### fuel_data
Émis toutes les 500ms pendant le remplissage
```typescript
{
  transactionId: string;
  volumeDelivered: number;
  flowRate: number;
  timestamp: Date;
}
```

### fueling_complete
Émis à la fin du remplissage
```typescript
{
  transactionId: string;
  volumeDelivered: number;
  finalAmount: number;
}
```

## 🛡️ Sécurité et Validations

### Validations automatiques

**Transaction :**
- ✅ Nozzle doit exister et être AVAILABLE
- ✅ Pompe doit être ACTIVE
- ✅ Montant : 500-100,000 FCFA
- ✅ PaymentMethod valide
- ✅ TransactionCode unique (TXN-YYYYMMDD-XXXX)

**Annulation :**
- ✅ Seul le propriétaire peut annuler
- ✅ Status doit être PENDING ou PROCESSING

**Wave :**
- ✅ Gestion des erreurs API Wave
- ✅ Webhook sécurisé (vérification transaction)

## 📊 Mise à jour des totaux

Quand une transaction est complétée :
- **Nozzle.totalVolume** += volumeDelivered
- **Nozzle.totalAmount** += finalAmount
- **Nozzle.status** → AVAILABLE
- **Transaction.status** → COMPLETED
- **Transaction.completedAt** → now()

## 🚀 Statut du serveur

```
✅ Database connected successfully

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 FuelTech Africa API Server                          ║
║                                                           ║
║   Environment: development                                ║
║   Port:        3000                                       ║
║   URL:         http://localhost:3000                        ║
║                                                           ║
║   Health:      http://localhost:3000/health                  ║
║   API Docs:    http://localhost:3000/api                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Serveur opérationnel sur http://localhost:3000**

Le module Transactions avec simulateur IoT est complètement implémenté et fonctionnel ! ✨

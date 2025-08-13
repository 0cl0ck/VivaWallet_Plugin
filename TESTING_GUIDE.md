# Guide de Test - Plugin Viva Wallet pour Payload CMS

## 🚀 Démarrage Rapide

### 1. Prérequis

- Node.js 18+
- MongoDB (local ou MongoDB Atlas)
- Compte Viva Wallet Demo (gratuit)
- ngrok (pour tester les webhooks en local)

### 2. Obtenir les Credentials Viva Wallet Demo

1. Créez un compte sur [https://demo.vivapayments.com](https://demo.vivapayments.com)
2. Allez dans **Settings > API Access**
3. Créez une nouvelle application OAuth2
4. Notez :
   - Client ID
   - Client Secret
   - Source Code (4 chiffres)

### 3. Configuration Initiale

```bash
# 1. Cloner et installer
cd viva-wallet-plugin
pnpm install

# 2. Copier et configurer l'environnement
cd dev
cp .env.example .env
```

Éditez `dev/.env` :

```env
# MongoDB (local ou Atlas)
DATABASE_URI=mongodb://127.0.0.1/viva-wallet-plugin-dev

# Payload Secret (32+ caractères)
PAYLOAD_SECRET=your-secret-key-minimum-32-characters-change-this

# Viva Wallet Demo Credentials
VIVA_CLIENT_ID=your-demo-client-id
VIVA_CLIENT_SECRET=your-demo-client-secret
VIVA_SOURCE_CODE=0000  # Votre code à 4 chiffres
VIVA_ENVIRONMENT=demo

# URL publique (sera configurée avec ngrok)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## 🧪 Tests Étape par Étape

### Étape 1: Démarrer le serveur de développement

```bash
# Dans le dossier dev/
pnpm dev
```

Le serveur démarre sur http://localhost:3000

### Étape 2: Accéder à l'Admin Payload

1. Ouvrez http://localhost:3000/admin
2. Créez un compte admin lors de la première connexion
3. Vérifiez que vous voyez le groupe "Viva Wallet" dans le menu

### Étape 3: Configurer les Settings

1. Allez dans **Globals > Viva Wallet Settings**
2. Entrez vos credentials :
   - Environment: Demo/Sandbox
   - Client ID: (depuis Viva demo)
   - Client Secret: (depuis Viva demo)
   - Source Code: (4 chiffres)
3. Sauvegardez

### Étape 4: Tester la création d'ordre de paiement

#### Via l'API REST :

```bash
# Obtenez d'abord un token Payload (depuis l'admin UI ou via login API)
TOKEN="your-payload-jwt-token"

# Créez un ordre de paiement
curl -X POST http://localhost:3000/api/viva-wallet/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "customer": {
      "email": "test@example.com",
      "fullName": "John Doe",
      "phone": "+33612345678"
    },
    "merchantTrns": "ORDER-123",
    "customerTrns": "Test payment for order #123"
  }'
```

Réponse attendue :
```json
{
  "success": true,
  "orderCode": "1234567890123456",
  "checkoutUrl": "https://demo.vivapayments.com/web/checkout?ref=1234567890123456"
}
```

### Étape 5: Tester le paiement

1. Ouvrez l'URL de checkout retournée
2. Utilisez une carte de test Viva :
   - Numéro: `4111 1111 1111 1111`
   - Expiration: Date future
   - CVV: `111`
3. Complétez le paiement

### Étape 6: Configurer et tester les webhooks

#### Configurer ngrok :

```bash
# Installez ngrok si ce n'est pas fait
# https://ngrok.com/download

# Exposez votre serveur local
ngrok http 3000
```

Notez l'URL publique (ex: `https://abc123.ngrok.io`)

#### Configurer le webhook dans Viva :

1. Connectez-vous à [demo.vivapayments.com](https://demo.vivapayments.com)
2. Allez dans **Settings > Webhooks**
3. Créez un nouveau webhook :
   - URL: `https://abc123.ngrok.io/api/viva-wallet/webhook`
   - Events: 
     - Transaction Payment Created (1796)
     - Transaction Failed (1798)
4. Viva enverra une requête GET pour vérifier - le plugin répond automatiquement

#### Vérifier la réception :

Après un paiement, vérifiez dans l'admin Payload :
- **Collections > Payment Orders** : Le statut doit passer à "Completed"
- **Collections > Transactions** : Une nouvelle transaction doit apparaître

## 🔍 Tests Avancés

### Test des erreurs

#### 1. Credentials invalides :

```javascript
// Testez avec de mauvais credentials
const settings = {
  clientId: 'invalid',
  clientSecret: 'invalid',
  sourceCode: '0000'
}
// Doit retourner une erreur 401 ou 500
```

#### 2. Montant invalide :

```bash
curl -X POST http://localhost:3000/api/viva-wallet/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": -100
  }'
# Doit retourner une erreur 400
```

#### 3. Webhook avec signature invalide :

```bash
curl -X POST http://localhost:3000/api/viva-wallet/webhook \
  -H "Content-Type: application/json" \
  -H "Viva-Signature-256: invalid-signature" \
  -d '{
    "EventTypeId": 1796,
    "EventData": {}
  }'
# Doit retourner une erreur 401
```

### Test de performance

```javascript
// Script de test de charge
const axios = require('axios')

async function loadTest() {
  const promises = []
  
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.post('http://localhost:3000/api/viva-wallet/create-order', {
        amount: 1000 + i,
        merchantTrns: `LOAD-TEST-${i}`
      }, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      })
    )
  }
  
  const results = await Promise.allSettled(promises)
  console.log('Success:', results.filter(r => r.status === 'fulfilled').length)
  console.log('Failed:', results.filter(r => r.status === 'rejected').length)
}

loadTest()
```

## 🐛 Debugging

### Activer les logs détaillés :

```javascript
// Dans dev/payload.config.ts
export default buildConfig({
  // ...
  debug: true,
  // ...
})
```

### Vérifier les logs :

```bash
# Logs du serveur
pnpm dev

# Logs MongoDB
mongod --dbpath ./data --logpath ./mongodb.log

# Logs ngrok
ngrok http 3000 --log stdout
```

### Inspecter la base de données :

```bash
# MongoDB Compass ou mongosh
mongosh mongodb://127.0.0.1/viva-wallet-plugin-dev

# Vérifier les collections
> show collections
viva-payment-orders
viva-transactions
viva-settings

# Voir les ordres
> db['viva-payment-orders'].find().pretty()

# Voir les transactions
> db['viva-transactions'].find().pretty()
```

## ✅ Checklist de Test

### Configuration
- [ ] Installation des dépendances
- [ ] Configuration .env
- [ ] Démarrage du serveur
- [ ] Accès à l'admin Payload
- [ ] Configuration des settings Viva

### Fonctionnalités de base
- [ ] Création d'ordre de paiement
- [ ] Récupération de l'URL de checkout
- [ ] Paiement sur la page Viva
- [ ] Stockage en base de données

### Webhooks
- [ ] Configuration ngrok
- [ ] Configuration webhook Viva
- [ ] Vérification GET (validation)
- [ ] Réception POST (événements)
- [ ] Mise à jour des statuts

### Gestion d'erreurs
- [ ] Credentials invalides
- [ ] Montants invalides
- [ ] Signatures webhook invalides
- [ ] Erreurs réseau
- [ ] Timeouts

### Sécurité
- [ ] Chiffrement des credentials
- [ ] Validation des signatures
- [ ] Idempotence des webhooks
- [ ] Access control

## 📊 Tests Automatisés

### Tests unitaires :

```bash
# Dans le dossier racine
pnpm test:unit
```

### Tests d'intégration :

```bash
# Avec MongoDB Memory Server
pnpm test:int
```

### Tests E2E :

```bash
# Avec Playwright
pnpm test:e2e
```

## 🔧 Problèmes Courants

### "Token request failed"
- Vérifiez vos credentials Viva
- Assurez-vous d'utiliser l'environnement "demo"
- Vérifiez la connexion internet

### "Webhook signature invalid"
- Vérifiez que l'URL webhook est correcte
- Attendez que Viva valide le webhook (GET request)
- Vérifiez le webhook key dans les settings

### "Order creation failed"
- Vérifiez que le montant est > 0
- Vérifiez le format du Source Code (4 chiffres)
- Consultez les logs pour plus de détails

## 📚 Ressources

- [Documentation Viva Wallet API](https://developer.viva.com)
- [Payload CMS Docs](https://payloadcms.com/docs)
- [Cartes de test Viva](https://developer.viva.com/integration-reference/testing)
- [Support GitHub](https://github.com/your-org/viva-wallet-plugin)
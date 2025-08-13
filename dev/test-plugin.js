/**
 * Script de test pour le plugin Viva Wallet
 * 
 * Usage:
 * 1. Démarrez le serveur dev: pnpm dev
 * 2. Connectez-vous à l'admin et copiez votre token JWT
 * 3. Lancez ce script: node test-plugin.js YOUR_JWT_TOKEN
 */

const TOKEN = process.argv[2]

if (!TOKEN) {
  console.error('❌ Veuillez fournir un token JWT')
  console.log('Usage: node test-plugin.js YOUR_JWT_TOKEN')
  console.log('\n1. Connectez-vous à http://localhost:3000/admin')
  console.log('2. Ouvrez les DevTools > Application > Cookies')
  console.log('3. Copiez la valeur du cookie "payload-token"')
  process.exit(1)
}

const BASE_URL = 'http://localhost:3000'

async function testCreateOrder() {
  console.log('\n📝 Test: Création d\'ordre de paiement...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/viva-wallet/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        amount: 1000, // 10.00 EUR
        customer: {
          email: 'test@example.com',
          fullName: 'Test Customer',
          phone: '+33612345678',
        },
        merchantTrns: `TEST-${Date.now()}`,
        customerTrns: 'Test payment from script',
      }),
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ Ordre créé avec succès!')
      console.log('   Order Code:', data.orderCode)
      console.log('   Checkout URL:', data.checkoutUrl)
      console.log('\n🌐 Ouvrez cette URL pour tester le paiement:')
      console.log(`   ${data.checkoutUrl}`)
      console.log('\n💳 Utilisez ces données de test:')
      console.log('   Carte: 4111 1111 1111 1111')
      console.log('   Expiration: 12/25')
      console.log('   CVV: 111')
      return data.orderCode
    } else {
      console.error('❌ Erreur:', data.error || 'Unknown error')
      console.log('Response:', data)
    }
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message)
  }
}

async function checkSettings() {
  console.log('\n🔧 Vérification des settings...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/globals/viva-settings`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    })

    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Settings trouvés:')
      console.log('   Environment:', settings.environment || 'Non configuré')
      console.log('   Client ID:', settings.clientId ? '***' + settings.clientId.slice(-4) : 'Non configuré')
      console.log('   Source Code:', settings.sourceCode || 'Non configuré')
      
      if (!settings.clientId || !settings.sourceCode) {
        console.log('\n⚠️  Les settings ne sont pas complètement configurés!')
        console.log('   Allez dans Admin > Globals > Viva Wallet Settings')
        return false
      }
      return true
    } else {
      console.error('❌ Impossible de récupérer les settings')
      return false
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    return false
  }
}

async function listPaymentOrders() {
  console.log('\n📋 Liste des ordres de paiement...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/viva-payment-orders`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ ${data.totalDocs} ordre(s) trouvé(s)`)
      
      if (data.docs && data.docs.length > 0) {
        data.docs.slice(0, 5).forEach(order => {
          console.log(`   - ${order.orderCode}: ${order.status} (${order.amount / 100}€)`)
        })
      }
    } else {
      console.error('❌ Impossible de récupérer les ordres')
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests du plugin Viva Wallet')
  console.log('=' .repeat(50))
  
  // 1. Vérifier les settings
  const settingsOk = await checkSettings()
  
  if (!settingsOk) {
    console.log('\n⚠️  Configurez d\'abord les settings dans l\'admin Payload')
    return
  }
  
  // 2. Créer un ordre
  const orderCode = await testCreateOrder()
  
  // 3. Lister les ordres
  await listPaymentOrders()
  
  console.log('\n' + '=' .repeat(50))
  console.log('✅ Tests terminés!')
  
  if (orderCode) {
    console.log('\n📌 Prochaines étapes:')
    console.log('1. Ouvrez l\'URL de checkout ci-dessus')
    console.log('2. Effectuez un paiement test')
    console.log('3. Configurez ngrok et les webhooks pour recevoir les notifications')
    console.log('4. Vérifiez dans Admin > Collections > Transactions')
  }
}

// Lancer les tests
runTests().catch(console.error)
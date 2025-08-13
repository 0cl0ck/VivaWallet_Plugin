'use client'
import { useEffect, useState } from 'react'

export const VivaSettingsView: React.FC = () => {
  const [settings, setSettings] = useState({
    clientId: '',
    clientSecret: '',
    enableLogging: false,
    environment: 'demo' as 'demo' | 'production',
    sourceCode: '',
    webhookKey: '',
    webhookUrl: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/globals/viva-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/globals/viva-settings', {
        body: JSON.stringify(settings),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      
      if (response.ok) {
        setMessage('Settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to save settings')
      }
    } catch (error) {
      setMessage('Error saving settings')
      console.error('Failed to save settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/viva-wallet/test-connection', {
        method: 'POST',
      })
      
      const result = await response.json()
      setMessage(result.success ? 'Connection successful!' : 'Connection failed: ' + result.error)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage('Failed to test connection')
      console.error('Failed to test connection:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: '800px', padding: '40px 20px' }}>
      <h1>Viva Wallet Settings</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Configure your Viva Wallet integration settings. You can obtain these credentials from your Viva Wallet dashboard.
      </p>

      {message && (
        <div style={{
          background: message.includes('success') ? '#d4edda' : '#f8d7da',
          borderRadius: '4px',
          color: message.includes('success') ? '#155724' : '#721c24',
          marginBottom: '20px',
          padding: '15px',
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="environment-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Environment
        </label>
        <select
          id="environment-select"
          onChange={(e) => setSettings({ ...settings, environment: e.target.value as 'demo' | 'production' })}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            width: '100%',
          }}
          value={settings.environment}
        >
          <option value="demo">Demo</option>
          <option value="production">Production</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="client-id-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Client ID
        </label>
        <input
          aria-label="Client ID"
          id="client-id-input"
          onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
          placeholder="Your Viva Wallet Client ID"
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            width: '100%',
          }}
          type="text"
          value={settings.clientId}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="client-secret-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Client Secret
        </label>
        <input
          aria-label="Client Secret"
          id="client-secret-input"
          onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
          placeholder="Your Viva Wallet Client Secret"
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            width: '100%',
          }}
          type="password"
          value={settings.clientSecret}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="source-code-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Source Code
        </label>
        <input
          aria-label="Source Code"
          id="source-code-input"
          onChange={(e) => setSettings({ ...settings, sourceCode: e.target.value })}
          placeholder="Your payment source code"
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            width: '100%',
          }}
          type="text"
          value={settings.sourceCode}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="webhook-url-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
          Webhook URL (Read-only)
        </label>
        <input
          aria-label="Webhook URL"
          id="webhook-url-input"
          readOnly
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            width: '100%',
          }}
          type="text"
          value={settings.webhookUrl || window.location.origin + '/api/viva-wallet/webhook'}
        />
        <small style={{ color: '#666' }}>Configure this URL in your Viva Wallet dashboard</small>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label style={{ alignItems: 'center', display: 'flex' }}>
          <input
            aria-label="Enable debug logging"
            checked={settings.enableLogging}
            onChange={(e) => setSettings({ ...settings, enableLogging: e.target.checked })}
            style={{ marginRight: '10px' }}
            type="checkbox"
          />
          Enable debug logging
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          disabled={loading}
          onClick={saveSettings}
          style={{
            background: '#007cba',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            padding: '10px 20px',
          }}
          type="button"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          disabled={loading || !settings.clientId || !settings.clientSecret}
          onClick={testConnection}
          style={{
            background: '#28a745',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: loading || !settings.clientId || !settings.clientSecret ? 'not-allowed' : 'pointer',
            opacity: loading || !settings.clientId || !settings.clientSecret ? 0.5 : 1,
            padding: '10px 20px',
          }}
          type="button"
        >
          Test Connection
        </button>
      </div>
    </div>
  )
}
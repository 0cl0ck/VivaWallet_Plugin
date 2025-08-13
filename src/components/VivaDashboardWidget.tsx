'use client'
import { useConfig } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

interface DashboardStats {
  completedOrders: number
  pendingOrders: number
  totalOrders: number
  totalRevenue: number
}

export const VivaDashboardWidget = () => {
  const { config } = useConfig()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${config.serverURL}${config.routes.api}/viva-wallet/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch Viva Wallet stats:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchStats()
  }, [config.serverURL, config.routes.api])

  if (loading) {
    return (
      <div style={{ background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px', padding: '20px' }}>
        <h3>Viva Wallet Payment Stats</h3>
        <p>Loading...</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div style={{ background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px', padding: '20px' }}>
      <h3>Viva Wallet Payment Stats</h3>
      <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: '15px' }}>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Orders</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalOrders}</div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>Completed</div>
          <div style={{ color: '#4caf50', fontSize: '24px', fontWeight: 'bold' }}>{stats.completedOrders}</div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>Pending</div>
          <div style={{ color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>{stats.pendingOrders}</div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>Total Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>€{(stats.totalRevenue / 100).toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
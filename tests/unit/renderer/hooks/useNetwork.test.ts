/**
 * Tests for useNetwork hook.
 * Initializes network state from window.network and subscribes to status changes.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNetwork } from '../../../../src/renderer/src/hooks/useNetwork'

describe('useNetwork', () => {
  it('should initialize and fetch network state on mount', async () => {
    ;(window.network.isSupported as jest.Mock).mockResolvedValue(true)
    ;(window.network.getInfo as jest.Mock).mockResolvedValue({
      platform: 'win32',
      supported: true,
      isOnline: true,
      interfaceCount: 3
    })
    ;(window.network.getConnectionStatus as jest.Mock).mockResolvedValue('online')
    ;(window.network.getInterfaces as jest.Mock).mockResolvedValue([
      { name: 'eth0', family: 'IPv4', address: '192.168.1.1', netmask: '255.255.255.0', mac: '00:00:00:00:00:00', internal: false, cidr: '192.168.1.1/24' }
    ])

    const { result } = renderHook(() => useNetwork())

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })

    expect(result.current.isOnline).toBe(true)
    expect(result.current.connectionStatus).toBe('online')
    expect(result.current.interfaces).toHaveLength(1)
    expect(result.current.networkInfo).toBeTruthy()
    expect(result.current.error).toBeNull()
  })

  it('should handle unsupported networks', async () => {
    ;(window.network.isSupported as jest.Mock).mockResolvedValue(false)

    const { result } = renderHook(() => useNetwork())

    await waitFor(() => {
      expect(window.network.isSupported).toHaveBeenCalled()
    })

    expect(result.current.isSupported).toBe(false)
  })

  it('should subscribe to status changes and clean up', async () => {
    const unsubscribe = jest.fn()
    ;(window.network.isSupported as jest.Mock).mockResolvedValue(true)
    ;(window.network.getInfo as jest.Mock).mockResolvedValue({
      platform: 'win32', supported: true, isOnline: true, interfaceCount: 1
    })
    ;(window.network.getConnectionStatus as jest.Mock).mockResolvedValue('online')
    ;(window.network.getInterfaces as jest.Mock).mockResolvedValue([])
    ;(window.network.onStatusChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useNetwork())

    await waitFor(() => {
      expect(window.network.onStatusChange).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should set error when initialization fails', async () => {
    ;(window.network.isSupported as jest.Mock).mockRejectedValue(new Error('network fail'))

    const { result } = renderHook(() => useNetwork())

    await waitFor(() => {
      expect(result.current.error).toBe('network fail')
    })
  })

  describe('refreshInterfaces', () => {
    it('should update interfaces list', async () => {
      ;(window.network.isSupported as jest.Mock).mockResolvedValue(true)
      ;(window.network.getInfo as jest.Mock).mockResolvedValue({
        platform: 'win32', supported: true, isOnline: true, interfaceCount: 0
      })
      ;(window.network.getConnectionStatus as jest.Mock).mockResolvedValue('online')
      ;(window.network.getInterfaces as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useNetwork())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      ;(window.network.getInterfaces as jest.Mock).mockResolvedValue([
        { name: 'wlan0', family: 'IPv4', address: '10.0.0.1', netmask: '255.0.0.0', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: null }
      ])

      await act(async () => {
        await result.current.refreshInterfaces()
      })

      expect(result.current.interfaces).toHaveLength(1)
      expect(result.current.interfaces[0].name).toBe('wlan0')
    })
  })

  describe('refreshStatus', () => {
    it('should update connection status', async () => {
      ;(window.network.isSupported as jest.Mock).mockResolvedValue(true)
      ;(window.network.getInfo as jest.Mock).mockResolvedValue({
        platform: 'win32', supported: true, isOnline: true, interfaceCount: 0
      })
      ;(window.network.getConnectionStatus as jest.Mock).mockResolvedValue('online')
      ;(window.network.getInterfaces as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useNetwork())

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('online')
      })

      ;(window.network.getConnectionStatus as jest.Mock).mockResolvedValue('offline')

      await act(async () => {
        await result.current.refreshStatus()
      })

      expect(result.current.connectionStatus).toBe('offline')
      expect(result.current.isOnline).toBe(false)
    })
  })
})

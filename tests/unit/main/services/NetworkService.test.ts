/**
 * Tests for NetworkService.
 * Validates network interface enumeration and monitoring.
 */
import { NetworkService } from '../../../../src/main/services/network'

// Mock the os module
jest.mock('os', () => ({
  networkInterfaces: jest.fn().mockReturnValue({
    eth0: [
      {
        family: 'IPv4',
        address: '192.168.1.100',
        netmask: '255.255.255.0',
        mac: '00:11:22:33:44:55',
        internal: false,
        cidr: '192.168.1.100/24'
      }
    ],
    lo: [
      {
        family: 'IPv4',
        address: '127.0.0.1',
        netmask: '255.0.0.0',
        mac: '00:00:00:00:00:00',
        internal: true,
        cidr: '127.0.0.1/8'
      }
    ]
  })
}))

import * as os from 'os'

describe('NetworkService', () => {
  let service: NetworkService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new NetworkService()
  })

  describe('isNetworkSupported', () => {
    it('should return true on all platforms', () => {
      expect(service.isNetworkSupported()).toBe(true)
    })
  })

  describe('getNetworkInterfaces', () => {
    it('should return parsed network interfaces', () => {
      const interfaces = service.getNetworkInterfaces()
      expect(interfaces).toHaveLength(2)
      expect(interfaces[0]).toEqual({
        name: 'eth0',
        family: 'IPv4',
        address: '192.168.1.100',
        netmask: '255.255.255.0',
        mac: '00:11:22:33:44:55',
        internal: false,
        cidr: '192.168.1.100/24'
      })
    })

    it('should handle null address arrays gracefully', () => {
      ;(os.networkInterfaces as jest.Mock).mockReturnValueOnce({
        eth0: null
      })
      const interfaces = service.getNetworkInterfaces()
      expect(interfaces).toEqual([])
    })

    it('should return empty array on error', () => {
      ;(os.networkInterfaces as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.getNetworkInterfaces()).toEqual([])
    })

    it('should handle missing cidr field', () => {
      ;(os.networkInterfaces as jest.Mock).mockReturnValueOnce({
        wlan0: [
          {
            family: 'IPv4',
            address: '10.0.0.1',
            netmask: '255.255.255.0',
            mac: 'aa:bb:cc:dd:ee:ff',
            internal: false,
            cidr: null
          }
        ]
      })
      const interfaces = service.getNetworkInterfaces()
      expect(interfaces[0].cidr).toBeNull()
    })
  })

  describe('getConnectionStatus', () => {
    it('should return online when non-loopback interfaces exist', async () => {
      const status = await service.getConnectionStatus()
      expect(status).toBe('online')
    })

    it('should return offline when only loopback interfaces exist', async () => {
      ;(os.networkInterfaces as jest.Mock).mockReturnValueOnce({
        lo: [
          {
            family: 'IPv4',
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '127.0.0.1/8'
          }
        ]
      })
      const status = await service.getConnectionStatus()
      expect(status).toBe('offline')
    })

    it('should return offline when getNetworkInterfaces returns empty due to error', async () => {
      // getNetworkInterfaces catches internally and returns [], so getConnectionStatus sees no interfaces
      ;(os.networkInterfaces as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      const status = await service.getConnectionStatus()
      expect(status).toBe('offline')
    })
  })

  describe('getNetworkInfo', () => {
    it('should return network info with online status', () => {
      const info = service.getNetworkInfo()
      expect(info.platform).toBe(process.platform)
      expect(info.supported).toBe(true)
      expect(info.isOnline).toBe(true)
      expect(info.interfaceCount).toBe(2)
    })

    it('should return info with isOnline=false when interfaces error', () => {
      // getNetworkInterfaces catches internally, so getNetworkInfo gets [] (not an error)
      ;(os.networkInterfaces as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      const info = service.getNetworkInfo()
      expect(info.supported).toBe(true) // isNetworkSupported is always true
      expect(info.isOnline).toBe(false)
      expect(info.interfaceCount).toBe(0)
    })
  })

  describe('monitoring', () => {
    it('should store and call status callback on notifyStatusChange', () => {
      const callback = jest.fn()
      service.startMonitoring(callback)
      service.notifyStatusChange(true)
      expect(callback).toHaveBeenCalledWith('online')

      service.notifyStatusChange(false)
      expect(callback).toHaveBeenCalledWith('offline')
    })

    it('should not call callback after stopMonitoring', () => {
      const callback = jest.fn()
      service.startMonitoring(callback)
      service.stopMonitoring()
      service.notifyStatusChange(true)
      expect(callback).not.toHaveBeenCalled()
    })

    it('should do nothing if no callback registered', () => {
      expect(() => service.notifyStatusChange(true)).not.toThrow()
    })
  })
})

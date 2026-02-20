/**
 * Tests for BluetoothService.
 * Validates platform-specific Bluetooth support checks.
 */
import { BluetoothService } from '../../../../src/main/services/bluetooth'

describe('BluetoothService', () => {
  let service: BluetoothService
  const originalPlatform = process.platform

  beforeEach(() => {
    service = new BluetoothService()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('isBluetoothSupported', () => {
    it('should return true on darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      expect(service.isBluetoothSupported()).toBe(true)
    })

    it('should return true on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      expect(service.isBluetoothSupported()).toBe(true)
    })

    it('should return true on linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      expect(service.isBluetoothSupported()).toBe(true)
    })

    it('should return false on unsupported platform', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' })
      expect(service.isBluetoothSupported()).toBe(false)
    })
  })

  describe('getBluetoothPermissionStatus', () => {
    it('should return prompt on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      const status = await service.getBluetoothPermissionStatus()
      expect(status).toBe('prompt')
    })

    it('should return prompt on win32', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const status = await service.getBluetoothPermissionStatus()
      expect(status).toBe('prompt')
    })

    it('should return not-supported on unsupported platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' })
      const status = await service.getBluetoothPermissionStatus()
      expect(status).toBe('not-supported')
    })
  })

  describe('getBluetoothInfo', () => {
    it('should return platform info with supported=true on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const info = service.getBluetoothInfo()
      expect(info).toEqual({
        platform: 'win32',
        supported: true,
        apiAvailable: true
      })
    })

    it('should return platform info with supported=false on unsupported platform', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' })
      const info = service.getBluetoothInfo()
      expect(info.supported).toBe(false)
      expect(info.apiAvailable).toBe(true)
    })
  })
})

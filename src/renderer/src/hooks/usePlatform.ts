import { useState, useEffect } from 'react'

let cachedPlatform: string | null = null
let platformPromise: Promise<string> | null = null

/**
 * Synchronous best-guess from the user-agent string so the very first
 * render already knows the platform (avoids a flash of missing controls).
 */
function detectPlatformSync(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'win32'
  if (ua.includes('Macintosh')) return 'darwin'
  return 'linux'
}

/** Returns the OS platform string, calling the API only once and caching the result. */
export function usePlatform(): string {
  const [platform, setPlatform] = useState<string>(cachedPlatform ?? detectPlatformSync())

  useEffect(() => {
    if (cachedPlatform) {
      setPlatform(cachedPlatform)
      return
    }
    if (!platformPromise) {
      platformPromise = window.api.getPlatform()
    }
    platformPromise.then((p) => {
      cachedPlatform = p
      setPlatform(p)
    })
  }, [])

  return platform
}

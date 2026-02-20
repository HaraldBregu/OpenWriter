import { useState, useEffect } from 'react'

let cachedPlatform: string | null = null
let platformPromise: Promise<string> | null = null

/** Returns the OS platform string, calling the API only once and caching the result. */
export function usePlatform(): string | null {
  const [platform, setPlatform] = useState<string | null>(cachedPlatform)

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

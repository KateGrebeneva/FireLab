import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, getSettings } from '../services/settings'
import type { AppSettings } from '../types'
import { useAuth } from '../lib/auth'

interface Ctx {
  settings: AppSettings
  loaded: boolean
  refresh: () => Promise<void>
}

const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, refresh: async () => undefined })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setSettings(await getSettings())
    } catch {
      /* настройки недоступны без входа — используем значения по умолчанию */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (profile) void refresh()
  }, [profile, refresh])

  return <SettingsCtx.Provider value={{ settings, loaded, refresh }}>{children}</SettingsCtx.Provider>
}

export const useSettings = () => useContext(SettingsCtx)

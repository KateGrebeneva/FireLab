import { useEffect } from 'react'

const BASE = 'FireLab'

export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — тестирование по пожарной безопасности`
  }, [title])
}

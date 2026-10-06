import { useEffect } from 'react'

const BASE = 'FireLab'

export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — тестирование сотрудников пожарной охраны`
  }, [title])
}

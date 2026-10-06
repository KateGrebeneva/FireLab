import { useEffect } from 'react'

/** Плавное появление элементов с классом .reveal при прокрутке */
export function useReveal(dep?: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible')
            io.unobserve(en.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((e) => io.observe(e))
    // страховка: если наблюдатель не сработал (печать, скриншот, старый браузер) — показываем всё
    const t = window.setTimeout(() => els.forEach((e) => e.classList.add('is-visible')), 4000)
    return () => {
      window.clearTimeout(t)
      io.disconnect()
    }
  }, [dep])
}

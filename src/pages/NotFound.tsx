import { ArrowLeft } from 'lucide-react'
import { ButtonLink } from '../components/ui/Button'
import Logo from '../components/Logo'
import { useTitle } from '../hooks/useTitle'

export default function NotFound() {
  useTitle('Страница не найдена')
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-white px-6">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
      <div className="relative animate-fade-up text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-10 font-display text-[96px] font-extrabold leading-none text-grad">404</div>
        <h1 className="mt-3 text-2xl font-extrabold">Страница не найдена</h1>
        <p className="mt-2 text-ink-3">Возможно, ссылка устарела или была введена с ошибкой.</p>
        <ButtonLink to="/" className="mt-8" icon={<ArrowLeft size={16} />}>
          На главную
        </ButtonLink>
      </div>
    </div>
  )
}

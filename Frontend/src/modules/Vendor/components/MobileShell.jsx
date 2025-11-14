import { useEffect, useState } from 'react'
import { cn } from '../../../lib/cn'
import { CloseIcon, MenuIcon, SearchIcon } from './icons'
import iraSathiLogo from '../../../assets/IRA SathiNew.png'
import { MapPinIcon } from './icons'

export function MobileShell({ title, subtitle, children, navigation, menuContent, onSearchClick }) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastScrollY = 0

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          // Use hysteresis: different thresholds for expanding vs collapsing to prevent flickering
          if (currentScrollY > lastScrollY) {
            // Scrolling down - collapse at 30px
            setCompact(currentScrollY > 30)
          } else {
            // Scrolling up - expand at 20px
            setCompact(currentScrollY > 20)
          }
          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="vendor-shell">
      <header className={cn('vendor-shell-header', compact && 'is-compact')}>
        <div className="vendor-shell-header__glow" />
        <div className="vendor-shell-header__controls">
          <div className="vendor-shell-header__brand">
            <img src={iraSathiLogo} alt="IRA Sathi" className="vendor-logo" />
          </div>
          <div className="vendor-shell-header__actions">
            <button
              type="button"
              onClick={onSearchClick}
              className="vendor-icon-button"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="vendor-icon-button"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className={cn('vendor-shell-header__info', compact && 'is-compact')}>
          {title ? <span className="vendor-brand-title">{title}</span> : null}
          <p className="vendor-shell-header__hint">
            <MapPinIcon className="mr-2 inline h-3.5 w-3.5" />
            {subtitle}
          </p>
        </div>
      </header>

      <main className="vendor-shell-content">
        <div className="space-y-6">{children}</div>
      </main>

      <nav className="vendor-shell-bottom-nav">
        <div className="vendor-shell-bottom-nav__inner">{navigation}</div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'fixed bottom-0 right-0 top-0 z-50 flex w-[78%] max-w-xs flex-col bg-white shadow-[-12px_0_36px_-26px_rgba(15,23,42,0.45)] transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-6">
          <p className="text-sm font-semibold text-surface-foreground">Quick Actions</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-muted/60 text-muted-foreground"
            aria-label="Close menu"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-10">
          {typeof menuContent === 'function'
            ? menuContent({
                close: () => setOpen(false),
                onNavigate: () => setOpen(false),
              })
            : menuContent}
        </div>
      </aside>
    </div>
  )
}


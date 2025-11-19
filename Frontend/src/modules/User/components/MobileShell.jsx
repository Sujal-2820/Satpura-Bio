import { useEffect, useState } from 'react'
import { cn } from '../../../lib/cn'
import { CloseIcon, MenuIcon, BellIcon, SearchIcon } from './icons'
import iraSathiLogo from '../../../assets/IRA SathiNew.png'
import { MapPinIcon } from './icons'
import { NotificationsDropdown } from './NotificationsDropdown'

export function MobileShell({ title, subtitle, children, navigation, menuContent, onSearchClick, notificationsCount = 0 }) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastScrollY = 0

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          if (currentScrollY > lastScrollY) {
            setCompact(currentScrollY > 30)
          } else {
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
    <div className="user-shell">
      <header className={cn('user-shell-header', compact && 'is-compact')}>
        <div className="user-shell-header__glow" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 -ml-4">
            <img src={iraSathiLogo} alt="IRA Sathi" className="h-11 w-auto transition-transform duration-200" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center justify-center w-10 h-10 rounded-2xl border-none bg-transparent text-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-85"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative flex items-center justify-center w-10 h-10 rounded-2xl border-none bg-transparent text-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-85"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5 stroke-[2.5]" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[0.65rem] font-bold text-white bg-red-500">
                  {notificationsCount > 99 ? '99+' : notificationsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-2xl border-none bg-transparent text-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-85"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
        {title && (
          <div className={cn('relative z-10 flex flex-col gap-1 opacity-100 transition-all duration-300 pointer-events-auto', compact && 'user-shell-header__info is-compact')}>
            <span className="relative z-10 text-[0.95rem] font-bold text-white tracking-[0.01em]">{title}</span>
            {subtitle && (
              <p className="relative z-10 text-[0.72rem] font-medium text-white/90 tracking-[0.04em] uppercase">
                <MapPinIcon className="mr-2 inline h-3.5 w-3.5" />
                {subtitle}
              </p>
            )}
          </div>
        )}
      </header>

      <main className="user-shell-content">
        <div className="space-y-6">{children}</div>
      </main>

      <nav className="user-shell-bottom-nav">
        <div className="flex items-center justify-between ml-3 gap-3">{navigation}</div>
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
          <p className="text-sm font-semibold text-surface-foreground">Menu</p>
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

      <NotificationsDropdown
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  )
}


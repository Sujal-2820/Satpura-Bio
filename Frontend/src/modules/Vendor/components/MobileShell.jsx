import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { CloseIcon, MenuIcon } from './icons'

export function MobileShell({ title, subtitle, children, navigation, menuContent }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f5f7f3] text-surface-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between rounded-b-3xl bg-white px-4 pb-3 pt-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2 rounded-full border border-muted/40 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IRA Sathi</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-muted/60 bg-white shadow-sm"
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5 text-surface-foreground" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-28">
        <div className="mb-5 pt-4">
          <h1 className="text-xl font-semibold text-surface-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground leading-snug">{subtitle}</p> : null}
        </div>
        <div className="rounded-3xl bg-[#f0f2ed] p-4">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white px-4 py-3">
        <div className="flex justify-between gap-3">{navigation}</div>
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
              })
            : menuContent}
        </div>
      </aside>
    </div>
  )
}


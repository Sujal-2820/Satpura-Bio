import { useState } from 'react'
import { LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function AdminLayout({ sidebar, children, onExit }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100">
      <aside
        className={cn(
          'sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out',
          open ? 'w-64' : 'w-[4.5rem]',
          'hidden lg:block border-r border-gray-200/50 bg-blue-500 backdrop-blur-xl shadow-[2px_0_8px_rgba(0,0,0,0.05)]',
        )}
        style={{
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className={cn(
          'flex h-16 items-center border-b border-white/30 bg-blue-600/50 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.03)]',
          open ? 'justify-between px-4' : 'justify-center px-3'
        )}>
          <div className={cn('flex items-center gap-3 overflow-hidden transition-all', open ? 'opacity-100' : 'opacity-0 w-0')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
              <span className="text-lg font-bold">A</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">IRA Sathi</p>
              <p className="text-xs text-white/80">Administrator</p>
            </div>
          </div>
          <button
            type="button"
            className={cn(
              'flex items-center justify-center rounded-xl bg-white/20 text-white transition-all duration-200 hover:bg-white/30 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              open ? 'h-9 w-9' : 'h-10 w-10',
            )}
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <Menu className={cn('transition-all', open ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>
        </div>
        <div className="p-3">{sidebar({ condensed: !open })}</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 lg:hidden"
                onClick={() => setOpen((prev) => !prev)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onExit ? (
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 lg:inline-flex"
                  onClick={onExit}
                >
                  <LogOut className="h-4 w-4" />
                  Exit Admin
                </button>
              ) : null}
              <button
                type="button"
                className="group flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div className="hidden text-left text-sm leading-tight sm:block">
                  <p className="font-bold text-gray-900">Administrator</p>
                  <p className="text-xs text-gray-500">Account</p>
                </div>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  )
}


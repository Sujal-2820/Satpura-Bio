import { cn } from '../../../lib/cn'

export function BottomNavItem({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center rounded-2xl px-0 py-1 transition-colors',
        active ? 'text-white' : 'text-muted-foreground',
      )}
      aria-label={label}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-all',
          active ? 'bg-[#1f8a5b] text-white shadow-card' : 'bg-[#e7e9e5] text-muted-foreground',
        )}
      >
        {icon}
      </span>
    </button>
  )
}


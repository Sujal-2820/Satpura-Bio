import { cn } from '../../../lib/cn'

export function BottomNavItem({ label, icon, active, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-200 group"
      aria-label={label}
      style={{
        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
      }}
    >
      <span className="relative flex items-center justify-center transition-all duration-200 p-0.5">
        {icon}
        {badge !== undefined && badge !== null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-0.5 rounded-full text-[0.65rem] font-bold text-white bg-red-500 border border-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={`text-[11px] font-medium mt-0.5 leading-none transition-all duration-200 tracking-wider ${active ? 'opacity-100 font-semibold' : 'opacity-80'}`}>
        {label}
      </span>
    </button>
  )
}


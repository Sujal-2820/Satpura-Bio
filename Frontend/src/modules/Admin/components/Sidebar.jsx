import { BarChart3, Building2, Factory, Home, Layers3, ShieldCheck, Users2, Wallet, Settings } from 'lucide-react'
import { cn } from '../../../lib/cn'

const links = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview & important updates', color: 'blue' },
  { id: 'products', label: 'Products', icon: Layers3, description: 'All products list', color: 'purple' },
  { id: 'vendors', label: 'Vendors', icon: Factory, description: 'Payment & how well they are doing', color: 'green' },
  { id: 'sellers', label: 'Sellers', icon: ShieldCheck, description: 'Goals & earnings', color: 'yellow' },
  { id: 'users', label: 'Users', icon: Users2, description: 'User status & help requests', color: 'orange' },
  { id: 'orders', label: 'Orders', icon: Building2, description: 'Approvals & delivery', color: 'red' },
  { id: 'finance', label: 'Credits', icon: Wallet, description: 'Advance payments & pending amounts', color: 'pink' },
  { id: 'operations', label: 'Operations', icon: Settings, description: 'Logistics, escalations & notifications', color: 'teal' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Area & group patterns', color: 'indigo' },
]

const colorStyles = {
  blue: {
    active: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-50 hover:border-blue-300',
  },
  purple: {
    active: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-50 hover:border-purple-300',
  },
  green: {
    active: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:bg-green-50 hover:border-green-300',
  },
  yellow: {
    active: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-50 hover:border-yellow-300',
  },
  orange: {
    active: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-50 hover:border-orange-300',
  },
  red: {
    active: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:bg-red-50 hover:border-red-300',
  },
  pink: {
    active: 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-50 hover:border-pink-300',
  },
  indigo: {
    active: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-50 hover:border-indigo-300',
  },
  teal: {
    active: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-50 hover:border-teal-300',
  },
}

export function Sidebar({ active, onNavigate, condensed = false }) {
  return (
    <nav className="space-y-2">
      {links.map(({ id, label, icon: Icon, description, color }) => {
        const isActive = id === active
        const styles = colorStyles[color] || colorStyles.blue
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={cn(
              'w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? `${styles.border} ${styles.bg} shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]`
                : `border-gray-200 bg-white/50 ${styles.hover} shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]`,
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                  isActive
                    ? styles.active
                    : 'bg-gray-100 text-gray-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className={cn('flex-1 overflow-hidden transition-all', condensed && 'hidden')}>
                <p className={cn('text-sm font-bold', isActive ? styles.text : 'text-gray-900')}>
                  {label}
                </p>
                <p className="truncate text-xs text-gray-500">{description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}


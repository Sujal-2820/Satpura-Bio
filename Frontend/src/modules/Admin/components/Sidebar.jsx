import { useState } from 'react'
import { BarChart3, Building2, Factory, Home, Layers3, ShieldCheck, Users2, Wallet, Settings, ArrowRightLeft, IndianRupee, History, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'

const links = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: Home, 
    description: 'Overview & important updates', 
    color: 'blue',
    suboptions: []
  },
  { 
    id: 'products', 
    label: 'Products', 
    icon: Layers3, 
    description: 'All products list', 
    color: 'purple',
    suboptions: [
      { id: 'products/add', label: 'Add Products' },
      { id: 'products/active', label: 'Active Products' },
      { id: 'products/inactive', label: 'Inactive Products' },
    ]
  },
  { 
    id: 'vendors', 
    label: 'Vendors', 
    icon: Factory, 
    description: 'Payment & how well they are doing', 
    color: 'green',
    suboptions: [
      { id: 'vendors/on-track', label: 'On Track Vendors' },
      { id: 'vendors/out-of-track', label: 'Out of Track Vendors' },
    ]
  },
  { 
    id: 'sellers', 
    label: 'IRA Partners', 
    icon: ShieldCheck, 
    description: 'Goals & earnings', 
    color: 'yellow',
    suboptions: [
      { id: 'sellers/active', label: 'Active IRA Partners' },
      { id: 'sellers/inactive', label: 'Inactive IRA Partners' },
    ]
  },
  { 
    id: 'users', 
    label: 'Users', 
    icon: Users2, 
    description: 'User status & help requests', 
    color: 'orange',
    suboptions: [
      { id: 'users/all', label: 'ALL' },
      { id: 'users/active', label: 'Active' },
      { id: 'users/inactive', label: 'Inactive' },
    ]
  },
  { 
    id: 'orders', 
    label: 'Orders', 
    icon: Building2, 
    description: 'Approvals & delivery', 
    color: 'red',
    suboptions: [
      { id: 'orders/all', label: 'ALL' },
      { id: 'orders/escalated', label: 'Escalated Orders' },
      { id: 'orders/processing', label: 'Processing Orders' },
      { id: 'orders/completed', label: 'Completed' },
    ]
  },
  { 
    id: 'finance', 
    label: 'Credits', 
    icon: Wallet, 
    description: 'Advance payments & pending amounts', 
    color: 'pink',
    suboptions: [
      { id: 'finance/overview', label: 'Overview' },
      { id: 'finance/penalties', label: 'Penalties' },
    ]
  },
  { 
    id: 'vendor-withdrawals', 
    label: 'Vendor Withdrawals', 
    icon: Factory, 
    description: 'Manage vendor withdrawal requests', 
    color: 'green',
    suboptions: []
  },
  { 
    id: 'seller-withdrawals', 
    label: 'IRA Partner Withdrawals', 
    icon: ShieldCheck, 
    description: 'Manage seller withdrawal requests', 
    color: 'yellow',
    suboptions: []
  },
  { 
    id: 'payment-history', 
    label: 'Payment History', 
    icon: History, 
    description: 'Complete audit log of all transactions', 
    color: 'indigo',
    suboptions: []
  },
  { 
    id: 'operations', 
    label: 'Operations', 
    icon: Settings, 
    description: 'Logistics, escalations & notifications', 
    color: 'teal',
    suboptions: [
      { id: 'operations/notifications/add', label: 'Add Notifications' },
      { id: 'operations/delivery-timeline/update', label: 'Update Delivery Timeline' },
    ]
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    icon: BarChart3, 
    description: 'Area & group patterns', 
    color: 'indigo',
    suboptions: [
      { id: 'analytics/overview', label: 'Overview' },
      { id: 'analytics/sales', label: 'Sales Analytics' },
      { id: 'analytics/users', label: 'User Analytics' },
      { id: 'analytics/vendors', label: 'Vendor Analytics' },
      { id: 'analytics/orders', label: 'Order Analytics' },
    ]
  },
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
  const [expandedItems, setExpandedItems] = useState(new Set())

  const toggleExpand = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isParentActive = (id, suboptions) => {
    if (active === id) return true
    if (suboptions && suboptions.length > 0) {
      return suboptions.some((sub) => active === sub.id || active.startsWith(`${id}/`))
    }
    return false
  }

  const isSuboptionActive = (subId) => {
    return active === subId || active.startsWith(subId)
  }

  return (
    <nav className="space-y-2">
      {links.map(({ id, label, icon: Icon, description, color, suboptions = [] }) => {
        const hasSuboptions = suboptions && suboptions.length > 0
        const isExpanded = expandedItems.has(id)
        const isActive = isParentActive(id, suboptions)
        const styles = colorStyles[color] || colorStyles.blue

        return (
          <div key={id} className="space-y-1">
            <button
              type="button"
              onClick={() => {
                if (hasSuboptions) {
                  toggleExpand(id)
                }
                onNavigate(id)
              }}
              className={cn(
                'w-full rounded-2xl border px-3 py-1.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isActive
                  ? `${styles.border} bg-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]`
                  : `border-white/30 bg-white/5 ${styles.hover} shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/10 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]`,
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-white text-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'
                      : 'bg-white/20 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className={cn('flex-1 overflow-hidden transition-all', condensed && 'hidden')}>
                  <p className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-white/90')}>
                    {label}
                  </p>
                </div>
                {hasSuboptions && !condensed && (
                  <span className={cn('transition-transform duration-200', isExpanded && 'rotate-90')}>
                    <ChevronRight className="h-4 w-4 text-white/80" />
                  </span>
                )}
              </div>
            </button>
            {hasSuboptions && isExpanded && !condensed && (
              <div className="ml-4 space-y-1 border-l-2 border-white/30 pl-2">
                {suboptions.map((sub) => {
                  const isSubActive = isSuboptionActive(sub.id)
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate(sub.id)
                      }}
                      className={cn(
                        'w-full rounded-xl border px-3 py-1.5 text-left text-xs transition-all duration-200',
                        isSubActive
                          ? `${styles.border} ${styles.bg} shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]`
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/20 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
                      )}
                    >
                      <p className={cn('font-semibold', isSubActive ? styles.text : 'text-white/90')}>
                        {sub.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}


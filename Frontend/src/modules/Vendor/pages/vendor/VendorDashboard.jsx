import { useEffect, useMemo, useRef, useState } from 'react'
import { useVendorDispatch, useVendorState } from '../../context/VendorContext'
import { useVendorApi } from '../../hooks/useVendorApi'
import { MobileShell } from '../../components/MobileShell'
import { BottomNavItem } from '../../components/BottomNavItem'
import { MenuList } from '../../components/MenuList'
import {
  BoxIcon,
  CartIcon,
  ChartIcon,
  CreditIcon,
  HomeIcon,
  MenuIcon,
  ReportIcon,
  SparkIcon,
  TruckIcon,
  WalletIcon,
} from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { useButtonAction } from '../../hooks/useButtonAction'
import { ButtonActionPanel } from '../../components/ButtonActionPanel'
import { useToast, ToastContainer } from '../../components/ToastNotification'

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Orders, sales, and reminders',
    icon: HomeIcon,
  },
  {
    id: 'inventory',
    label: 'Stock Manager',
    description: 'Current stock status',
    icon: BoxIcon,
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Confirm availability and delivery',
    icon: CartIcon,
  },
  {
    id: 'credit',
    label: 'Loan Status',
    description: 'Loan limit, fines, payment',
    icon: CreditIcon,
  },
  {
    id: 'reports',
    label: 'Summary',
    description: 'Weekly / monthly summary',
    icon: ReportIcon,
  },
]

export function VendorDashboard({ onLogout }) {
  const { profile, dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { acceptOrder, acceptOrderPartially, rejectOrder, updateInventoryStock, requestCreditPurchase, updateOrderStatus, fetchProfile, fetchDashboardData } = useVendorApi()
  const [activeTab, setActiveTab] = useState('overview')
  const welcomeName = (profile?.name || 'Partner').split(' ')[0]
  const { isOpen, isMounted, currentAction, openPanel, closePanel } = useButtonAction()
  const { toasts, dismissToast, success, error, info, warning } = useToast()
  
  // Fetch vendor profile and dashboard data on mount (only if authenticated or has token)
  useEffect(() => {
    const token = localStorage.getItem('vendor_token')
    if (!token) {
      // No token, redirect to login
      if (onLogout) {
        onLogout()
      }
      return
    }
    
    const loadVendorData = async () => {
      try {
        // Only fetch profile if not already authenticated
        if (!profile?.id) {
          const profileResult = await fetchProfile()
          if (profileResult.data?.vendor) {
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                id: profileResult.data.vendor.id,
                name: profileResult.data.vendor.name,
                phone: profileResult.data.vendor.phone,
                email: profileResult.data.vendor.email,
                location: profileResult.data.vendor.location,
                status: profileResult.data.vendor.status,
                isActive: profileResult.data.vendor.isActive,
              },
            })
          } else if (profileResult.error?.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('vendor_token')
            if (onLogout) {
              onLogout()
            }
            return
          }
        }
        
        // Fetch dashboard overview
        const dashboardResult = await fetchDashboardData()
        if (dashboardResult.error?.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('vendor_token')
          if (onLogout) {
            onLogout()
          }
        }
      } catch (err) {
        console.error('Failed to load vendor data:', err)
        if (err.error?.status === 401) {
          localStorage.removeItem('vendor_token')
          if (onLogout) {
            onLogout()
          }
        }
      }
    }
    
    loadVendorData()
  }, []) // Only run once on mount
  const tabLabels = useMemo(() => {
    return NAV_ITEMS.reduce((acc, item) => {
      acc[item.id] = item.label
      return acc
    }, {})
  }, [])
  const searchCatalog = useMemo(
    () =>
      [
        {
          id: 'search-overview-hero',
          label: 'Today\'s summary & available money',
          keywords: ['overview', 'summary', 'wallet', 'balance', 'welcome', 'money'],
          tab: 'overview',
          targetId: 'overview-hero',
        },
        {
          id: 'search-overview-services',
          label: 'Other services shortcuts',
          keywords: ['overview', 'services', 'reorder', 'support', 'pricing'],
          tab: 'overview',
          targetId: 'overview-services',
        },
        {
          id: 'search-overview-activity',
          label: 'Recent activity timeline',
          keywords: ['overview', 'activity', 'transactions', 'updates'],
          tab: 'overview',
          targetId: 'overview-activity',
        },
        {
          id: 'search-overview-snapshot',
          label: 'Quick summary',
          keywords: ['overview', 'snapshot', 'summary', 'highlights'],
          tab: 'overview',
          targetId: 'overview-snapshot',
        },
        {
          id: 'search-overview-quick-actions',
          label: 'Quick actions',
          keywords: ['overview', 'actions', 'tasks', 'shortcuts'],
          tab: 'overview',
          targetId: 'overview-quick-actions',
        },
        {
          id: 'search-inventory-header',
          label: 'Stock status',
          keywords: ['inventory', 'stock', 'products', 'items', 'health'],
          tab: 'inventory',
          targetId: 'inventory-header',
        },
        {
          id: 'search-inventory-restock',
          label: 'Need to order more',
          keywords: ['inventory', 'restock', 'order', 'loan', 'stock'],
          tab: 'inventory',
          targetId: 'inventory-restock',
        },
        {
          id: 'search-orders-header',
          label: 'Orders',
          keywords: ['orders', 'queue', 'availability'],
          tab: 'orders',
          targetId: 'orders-header',
        },
        {
          id: 'search-orders-tracker',
          label: 'Order status',
          keywords: ['orders', 'tracker', 'stages', 'dispatched', 'status'],
          tab: 'orders',
          targetId: 'orders-tracker',
        },
        {
          id: 'search-orders-fallback',
          label: 'Backup delivery',
          keywords: ['orders', 'backup', 'delivery', 'admin', 'send'],
          tab: 'orders',
          targetId: 'orders-fallback',
        },
        {
          id: 'search-credit-summary',
          label: 'Loan summary & usage',
          keywords: ['credit', 'loan', 'limit', 'usage', 'fine'],
          tab: 'credit',
          targetId: 'credit-summary',
        },
        {
          id: 'search-credit-penalty',
          label: 'Fine timeline',
          keywords: ['credit', 'loan', 'penalty', 'fine', 'timeline', 'payment'],
          tab: 'credit',
          targetId: 'credit-penalty',
        },
        {
          id: 'search-reports-overview',
          label: 'Summary overview',
          keywords: ['reports', 'summary', 'insights', 'tips'],
          tab: 'reports',
          targetId: 'reports-overview',
        },
        {
          id: 'search-reports-top-vendors',
          label: 'Top sellers',
          keywords: ['reports', 'summary', 'vendors', 'sellers', 'top'],
          tab: 'reports',
          targetId: 'reports-top-vendors',
        },
      ].map((item) => ({
        ...item,
        tabLabel: tabLabels[item.tab],
      })),
    [tabLabels],
  )
  const [searchMounted, setSearchMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingScroll, setPendingScroll] = useState(null)
  const searchInputRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('vendor_token')
    dispatch({ type: 'AUTH_LOGOUT' })
    onLogout?.()
  }

  const navigateTo = (target) => {
    setActiveTab(target)
  }

  const buildMenuItems = (close) => [
    ...NAV_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      icon: <item.icon className="h-4 w-4" />,
      onSelect: () => {
        setActiveTab(item.id)
        close()
      },
    })),
    {
      id: 'logout',
      label: 'Sign out',
      icon: <MenuIcon className="h-4 w-4" />,
      description: 'Log out from vendor account',
      onSelect: () => {
        handleLogout()
        close()
      },
    },
  ]
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return searchCatalog.slice(0, 7)
    }
    const tokens = query.split(/\s+/).filter(Boolean)
    const results = searchCatalog
      .map((item) => {
        const haystack = `${item.label} ${item.tabLabel} ${item.keywords.join(' ')}`.toLowerCase()
        const directIndex = haystack.indexOf(query)
        const directScore = directIndex >= 0 ? 200 - directIndex : 0
        const tokenScore = tokens.reduce((score, token) => (haystack.includes(token) ? score + 20 : score), 0)
        const score = directScore + tokenScore
        return { ...item, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
    return results.length ? results : searchCatalog.slice(0, 5)
  }, [searchCatalog, searchQuery])

  const openSearch = () => {
    setSearchMounted(true)
    requestAnimationFrame(() => setSearchOpen(true))
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setTimeout(() => {
      setSearchMounted(false)
      setSearchQuery('')
    }, 260)
  }

  const handleSearchNavigate = (item) => {
    if (!item) return
    const delay = item.tab === activeTab ? 150 : 420
    setActiveTab(item.tab)
    setPendingScroll({ id: item.targetId, delay })
    closeSearch()
  }

  const handleSearchSubmit = () => {
    if (searchResults.length) {
      handleSearchNavigate(searchResults[0])
    }
  }

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [searchOpen])

  useEffect(() => {
    if (!pendingScroll) return
    const { id, delay } = pendingScroll
    const timer = setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }
      setPendingScroll(null)
    }, delay)
    return () => clearTimeout(timer)
  }, [pendingScroll, activeTab])

  return (
    <>
      <MobileShell
        title={`Hello ${welcomeName}`}
        subtitle={profile?.location?.city ? `${profile.location.city}${profile.location.state ? `, ${profile.location.state}` : ''}` : 'Location not set'}
        onSearchClick={openSearch}
        navigation={NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.id}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
            icon={<item.icon active={activeTab === item.id} className="h-5 w-5" />}
        />
        ))}
        menuContent={({ close }) => <MenuList items={buildMenuItems(close)} active={activeTab} />}
      >
        <section className="space-y-6">
          {activeTab === 'overview' && <OverviewView onNavigate={navigateTo} welcomeName={welcomeName} openPanel={openPanel} />}
          {activeTab === 'inventory' && <InventoryView onNavigate={navigateTo} openPanel={openPanel} />}
          {activeTab === 'orders' && <OrdersView openPanel={openPanel} />}
          {activeTab === 'credit' && <CreditView openPanel={openPanel} />}
          {activeTab === 'reports' && <ReportsView />}
        </section>
      </MobileShell>

      {searchMounted ? (
        <div className={cn('vendor-search-sheet', searchOpen && 'is-open')}>
          <div className={cn('vendor-search-sheet__overlay', searchOpen && 'is-open')} onClick={closeSearch} />
          <div className={cn('vendor-search-sheet__panel', searchOpen && 'is-open')}>
            <div className="vendor-search-sheet__header">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchSubmit()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeSearch()
                  }
                }}
                placeholder="Search stock, orders, summary..."
                className="vendor-search-input"
                aria-label="Search vendor console"
              />
              <button type="button" className="vendor-search-cancel" onClick={closeSearch}>
                Cancel
              </button>
            </div>
            <div className="vendor-search-sheet__body">
              {searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchNavigate(item)}
                    className="vendor-search-result"
                  >
                    <span className="vendor-search-result__label">{item.label}</span>
                    <span className="vendor-search-result__meta">{item.tabLabel}</span>
                  </button>
                ))
              ) : (
                <p className="vendor-search-empty">No matches yet. Try another keyword.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isMounted && (
        <ButtonActionPanel
          action={currentAction}
          isOpen={isOpen}
          onClose={closePanel}
          onAction={async (actionData) => {
            // Handle actions with API integration
            const { type, data, buttonId } = actionData

            try {
              // Order actions
              if (buttonId === 'order-available' && data.orderId) {
                const result = await acceptOrder(data.orderId)
                if (result.data) {
                  success('Order accepted successfully!')
                } else if (result.error) {
                  error(result.error.message || 'Failed to accept order')
                }
              } else if (buttonId === 'order-not-available' && data.orderId) {
                // Open a panel to get reason for rejection
                openPanel('order-reject-reason', { orderId: data.orderId })
              } else if (buttonId === 'order-reject-confirm' && data.orderId && data.reason) {
                const result = await rejectOrder(data.orderId, { reason: data.reason, notes: data.notes })
                if (result.data) {
                  success('Order rejected and forwarded to Admin')
                } else if (result.error) {
                  error(result.error.message || 'Failed to reject order')
                }
              } else if (buttonId === 'order-partial-accept' && data.orderId && data.orderItems) {
                // Handle partial order acceptance
                const acceptedItems = data.orderItems.filter((item) => item.action === 'accept')
                const rejectedItems = data.orderItems.filter((item) => item.action === 'reject')
                
                if (acceptedItems.length === 0 && rejectedItems.length === 0) {
                  error('Please select at least one item to accept or reject')
                  return
                }
                
                const partialData = {
                  acceptedItems: acceptedItems.map((item) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                  })),
                  rejectedItems: rejectedItems.map((item) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    reason: item.reason || 'Insufficient stock',
                  })),
                  notes: data.notes || '',
                }
                
                const result = await acceptOrderPartially(data.orderId, partialData)
                if (result.data) {
                  const acceptedCount = acceptedItems.length
                  const rejectedCount = rejectedItems.length
                  success(
                    `Order partially accepted. ${acceptedCount} item(s) will be fulfilled by you, ${rejectedCount} item(s) escalated to Admin.`
                  )
                } else if (result.error) {
                  error(result.error.message || 'Failed to accept order partially')
                }
              } else if (buttonId === 'update-order-status' && data.orderId && data.status) {
                const result = await updateOrderStatus(data.orderId, { status: data.status })
                if (result.data) {
                  success('Order status updated successfully!')
                } else if (result.error) {
                  error(result.error.message || 'Failed to update order status')
                }
              }
              // Inventory actions
              else if (buttonId === 'update-stock' && data.itemId && data.newStock !== undefined) {
                const result = await updateInventoryStock(data.itemId, {
                  quantity: parseFloat(data.newStock),
                  notes: data.reason,
                })
                if (result.data) {
                  success('Stock updated successfully!')
                } else if (result.error) {
                  error(result.error.message || 'Failed to update stock')
                }
              }
              // Credit purchase actions
              else if (buttonId === 'place-credit-purchase' && data.amount) {
                const purchaseData = {
                  items: data.items ? [{ description: data.items }] : [],
                  totalAmount: parseFloat(data.amount),
                  notes: data.urgency ? `Urgency: ${data.urgency}` : '',
                }
                const result = await requestCreditPurchase(purchaseData)
                if (result.data) {
                  success('Purchase request submitted successfully. Waiting for Admin approval.')
                } else if (result.error) {
                  error(result.error.message || 'Failed to submit purchase request')
                }
              }
              // Admin request actions
              else if (type === 'update' && data.type === 'admin_request') {
                // Simulate sending request to admin (this would be a separate API endpoint)
                success('Request sent to admin successfully. You will be notified once reviewed.')
              } else {
                // Default success message for other actions
                success('Action completed successfully')
              }
            } catch (err) {
              error(err.message || 'An unexpected error occurred')
            }
          }}
          onShowNotification={(message, type = 'info') => {
            if (type === 'success') success(message)
            else if (type === 'error') error(message)
            else if (type === 'warning') warning(message)
            else info(message)
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}

function OverviewView({ onNavigate, welcomeName, openPanel }) {
  const { profile, dashboard } = useVendorState()
  const { fetchDashboardData } = useVendorApi()
  const [showActivitySheet, setShowActivitySheet] = useState(false)
  const [renderActivitySheet, setRenderActivitySheet] = useState(false)
  const servicesRef = useRef(null)
  const [servicePage, setServicePage] = useState(0)

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData().then((result) => {
      if (result.data) {
        // Data is stored in context via the API hook
      }
    })
  }, [fetchDashboardData])

  const services = [
    { label: 'Stock', note: 'Reorder stock', tone: 'success', target: 'inventory', icon: BoxIcon, action: null },
    { label: 'Pricing', note: 'Update price', tone: 'warn', target: 'inventory', icon: ReportIcon, action: 'update-mrp' },
    { label: 'Send', note: 'Arrange truck', tone: 'success', target: 'orders', icon: TruckIcon, action: null },
    { label: 'Wallet', note: 'View payments', tone: 'success', target: 'credit', icon: WalletIcon, action: 'view-payouts' },
    { label: 'Performance', note: 'Summary', tone: 'success', target: 'reports', icon: ChartIcon, action: null },
    { label: 'Support', note: 'Get help', tone: 'warn', target: 'orders', icon: MenuIcon, action: null },
    { label: 'Network', note: 'Partner list', tone: 'success', target: 'reports', icon: HomeIcon, action: null },
    { label: 'Settings', note: 'Profile & verification', tone: 'success', target: 'credit', icon: CreditIcon, action: 'profile-settings' },
  ]

  // Use data from context or fallback to snapshot
  const overviewData = dashboard.overview || {}
  
  // Transform recent orders from backend to activity format
  const recentOrders = overviewData.recentOrders || []
  const transactions = recentOrders.map((order) => {
    const customerName = order.userId?.name || 'Unknown Customer'
    const initials = customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    return {
      name: customerName,
      action: `Order ${order.status === 'pending' ? 'received' : order.status === 'awaiting' ? 'accepted' : order.status}`,
      amount: `+₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
      status: order.status === 'delivered' ? 'Completed' : order.status === 'pending' ? 'Pending' : 'In Progress',
      avatar: initials,
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
    }
  })
  
  // If no recent orders, use empty array (don't show dummy data)
  const displayTransactions = transactions.length > 0 ? transactions : []

  const walletBalance = overviewData.credit?.remaining
    ? `₹${(overviewData.credit.remaining / 100000).toFixed(1)}L`
    : '₹0'

  const quickActions = [
    {
      label: 'Confirm delivery time',
      description: 'Set delivery time',
      target: 'orders',
      icon: TruckIcon,
      tone: 'green',
      action: 'confirm-delivery-slot',
    },
    {
      label: 'Update stock',
      description: 'Add new stock / update stock',
      target: 'inventory',
      icon: BoxIcon,
      tone: 'orange',
      action: 'update-inventory-batch',
    },
    {
      label: 'Request loan order',
      description: 'Request stock from admin',
      target: 'credit',
      icon: CreditIcon,
      tone: 'teal',
      action: 'raise-credit-order',
    },
  ]

  useEffect(() => {
    const container = servicesRef.current
    if (!container) return

    const handleScroll = () => {
      const max = container.scrollWidth - container.clientWidth
      if (max <= 0) {
        setServicePage(0)
        return
      }
      const progress = container.scrollLeft / max
      const index = Math.min(2, Math.max(0, Math.round(progress * 2)))
      setServicePage(index)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [services.length])

  return (
    <div className="vendor-overview space-y-6">
      <section id="overview-hero" className="overview-hero">
        <div className="overview-hero__card">
          <div className="overview-hero__meta">
            <span className="overview-chip overview-chip--success">
              Active Zone • {profile?.coverageRadius || dashboard?.overview?.coverageRadius || 20} km
            </span>
            <span className="overview-chip overview-chip--warn">Today {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div className="overview-hero__core">
            <div className="overview-hero__identity">
              <span className="overview-hero__greeting">Today's summary</span>
              <h2 className="overview-hero__welcome">{welcomeName}</h2>
            </div>
            <div className="overview-hero__badge">
              <SparkIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="overview-hero__balance">
            <div>
              <p className="overview-hero__label">Available money</p>
              <p className="overview-hero__value">{walletBalance}</p>
            </div>
            <button type="button" onClick={() => openPanel('check-credit')} className="overview-hero__cta">
              Check loan
            </button>
          </div>
          <div className="overview-hero__stats">
            {[
              { label: 'Orders waiting for your reply', value: String(overviewData.orders?.pending || 0) },
              { label: 'Orders in processing', value: String(overviewData.orders?.processing || 0) },
              { label: 'Low stock alerts', value: String(overviewData.inventory?.lowStockCount || 0) },
              { label: 'Credit utilization', value: `${Math.round(overviewData.credit?.utilization || 0)}%` },
            ].map((item) => (
              <div key={item.label} className="overview-stat-card">
                <p>{item.label}</p>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="overview-services" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Shortcuts</h3>
          </div>
        </div>
        <div ref={servicesRef} className="overview-services__rail">
          {services.map((service) => (
            <button
              key={service.label}
              type="button"
              onClick={() => {
                if (service.action) {
                  openPanel(service.action)
                } else if (service.target) {
                  onNavigate(service.target)
                }
              }}
              className="overview-service-card"
            >
              <span className={cn('overview-service-card__icon', service.tone === 'warn' ? 'is-warn' : 'is-success')}>
                <service.icon className="h-5 w-5" />
              </span>
              <span className="overview-service-card__label">{service.label}</span>
              <span className="overview-service-card__note">{service.note}</span>
            </button>
          ))}
        </div>
        <div className="overview-services__dots" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={cn('overview-services__dot', servicePage === dot && 'is-active')}
            />
          ))}
        </div>
      </section>

      <section id="overview-activity" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Recent activity</h3>
          </div>
          <button
            type="button"
            className="overview-section__cta"
            onClick={() => {
              setRenderActivitySheet(true)
              requestAnimationFrame(() => setShowActivitySheet(true))
            }}
          >
            See all
          </button>
        </div>
        <div className="overview-activity__list">
          {displayTransactions.length > 0 ? displayTransactions.map((item) => (
            <div key={item.name} className="overview-activity__item">
              <div className="overview-activity__avatar">{item.avatar}</div>
              <div className="overview-activity__details">
                <div className="overview-activity__row">
                  <span className="overview-activity__name">{item.name}</span>
                  <span
                    className={cn(
                      'overview-activity__amount',
                      item.amount.startsWith('-') ? 'is-negative' : 'is-positive',
                    )}
                  >
                    {item.amount}
                  </span>
                </div>
                <div className="overview-activity__meta">
                  <span>{item.action}</span>
                  <span>{item.status}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="overview-activity__item">
              <div className="overview-activity__details">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {renderActivitySheet ? (
        <div className={cn('vendor-activity-sheet', showActivitySheet && 'is-open')}>
          <div
            className={cn('vendor-activity-sheet__overlay', showActivitySheet && 'is-open')}
            onClick={() => {
              setShowActivitySheet(false)
              setTimeout(() => setRenderActivitySheet(false), 260)
            }}
          />
          <div className={cn('vendor-activity-sheet__panel', showActivitySheet && 'is-open')}>
            <div className="vendor-activity-sheet__header">
              <h4>All activity</h4>
              <button
                type="button"
                onClick={() => {
                  setShowActivitySheet(false)
                  setTimeout(() => setRenderActivitySheet(false), 260)
                }}
              >
                Close
              </button>
            </div>
            <div className="vendor-activity-sheet__body">
              {displayTransactions.length > 0 ? displayTransactions.map((item, index) => (
                <div key={`${item.name}-${index}`} className="overview-activity__item">
                  <div className="overview-activity__avatar">{item.avatar}</div>
                  <div className="overview-activity__details">
                    <div className="overview-activity__row">
                      <span className="overview-activity__name">{item.name}</span>
                      <span
                        className={cn(
                          'overview-activity__amount',
                          item.amount.startsWith('-') ? 'is-negative' : 'is-positive',
                        )}
                      >
                        {item.amount}
                      </span>
                    </div>
                    <div className="overview-activity__meta">
                      <span>{item.action}</span>
                      <span>{item.status}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="overview-activity__item">
                  <div className="overview-activity__details">
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section id="overview-snapshot" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Quick summary</h3>
          </div>
        </div>
        <div className="overview-metric-grid">
          {[
            { id: 'orders', label: 'Total Orders', value: String(overviewData.orders?.total || 0), trend: 'Today' },
            { id: 'inventory', label: 'Products', value: String(overviewData.inventory?.totalProducts || 0), trend: 'Assigned' },
            { id: 'credit', label: 'Credit Used', value: overviewData.credit?.used ? `₹${(overviewData.credit.used / 100000).toFixed(1)}L` : '₹0', trend: `${Math.round(overviewData.credit?.utilization || 0)}%` },
          ].map((item) => (
            <div key={item.id} className="overview-metric-card">
              <div className="overview-metric-card__head">
                <p>{item.label}</p>
                <span>{item.trend}</span>
              </div>
              <h4>{item.value}</h4>
              <div className="overview-metric-card__bar">
                <span style={{ width: item.id === 'orders' ? '78%' : item.id === 'inventory' ? '64%' : '92%' }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="overview-quick-actions" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Quick actions</h3>
          </div>
        </div>
        <div className="overview-callout-grid">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (action.action) {
                  openPanel(action.action)
                } else if (action.target) {
                  onNavigate(action.target)
                }
              }}
              className={cn(
                'overview-callout',
                action.tone === 'orange'
                  ? 'is-warn'
                  : action.tone === 'teal'
                  ? 'is-teal'
                  : 'is-success',
              )}
            >
              <span className="overview-callout__icon">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="overview-callout__label">{action.label}</span>
              <span className="overview-callout__note">{action.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function PurchaseFromAdminView({ products, onBack, onSuccess }) {
  const { dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { requestCreditPurchase, getCreditInfo, fetchDashboardData } = useVendorApi()
  const { success, error: showError } = useToast()
  const MIN_PURCHASE_VALUE = 50000
  
  const [selectedProducts, setSelectedProducts] = useState([]) // Array of { product, quantity }
  const [creditInfo, setCreditInfo] = useState(null)
  const [purchaseReason, setPurchaseReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  const loadCreditInfo = async () => {
    setLoading(true)
    try {
      const result = await getCreditInfo()
      console.log('Credit info API response:', result)
      if (result.data) {
        console.log('Setting credit info:', result.data)
        setCreditInfo(result.data)
      } else {
        console.warn('No credit data in response:', result)
      }
    } catch (err) {
      console.error('Failed to load credit info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCreditInfo()
  }, [getCreditInfo])

  const availableProducts = products.filter(p => (p.adminStock ?? p.stock ?? 0) > 0)

  const handleAddProduct = (product) => {
    const existingIndex = selectedProducts.findIndex(
      sp => (sp.product.id || sp.product._id) === (product.id || product._id)
    )
    
    if (existingIndex >= 0) {
      // Product already in cart, update quantity
      const updated = [...selectedProducts]
      updated[existingIndex].quantity = 1
      setSelectedProducts(updated)
    } else {
      // Add new product
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }])
    }
  }

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(
      sp => (sp.product.id || sp.product._id) !== productId
    ))
  }

  const handleQuantityChange = (productId, value) => {
    // Allow empty string for typing
    if (value === '' || value === null || value === undefined) {
      setSelectedProducts(selectedProducts.map(sp => {
        if ((sp.product.id || sp.product._id) === productId) {
          return { ...sp, quantity: '' }
        }
        return sp
      }))
      return
    }
    
    const qty = parseFloat(value)
    if (isNaN(qty) || qty < 1) {
      // Allow invalid input while typing, will validate on blur
      setSelectedProducts(selectedProducts.map(sp => {
        if ((sp.product.id || sp.product._id) === productId) {
          return { ...sp, quantity: value }
        }
        return sp
      }))
      return
    }
    
    setSelectedProducts(selectedProducts.map(sp => {
      if ((sp.product.id || sp.product._id) === productId) {
        const adminStock = sp.product.adminStock ?? sp.product.stock ?? 0
        const validQty = Math.min(Math.max(1, qty), adminStock)
        return { ...sp, quantity: validQty }
      }
      return sp
    }))
  }

  const handleQuantityBlur = (productId) => {
    // Validate and set minimum on blur
    setSelectedProducts(selectedProducts.map(sp => {
      if ((sp.product.id || sp.product._id) === productId) {
        const currentQty = sp.quantity
        if (currentQty === '' || currentQty === null || currentQty === undefined) {
          return { ...sp, quantity: 1 }
        }
        const qty = parseFloat(currentQty)
        if (isNaN(qty) || qty < 1) {
          return { ...sp, quantity: 1 }
        }
        const adminStock = sp.product.adminStock ?? sp.product.stock ?? 0
        const validQty = Math.min(Math.max(1, qty), adminStock)
        return { ...sp, quantity: validQty }
      }
      return sp
    }))
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((total, sp) => {
      const pricePerUnit = sp.product.pricePerUnit || sp.product.priceToVendor || 0
      const qty = typeof sp.quantity === 'number' ? sp.quantity : (parseFloat(sp.quantity) || 0)
      return total + (qty * pricePerUnit)
    }, 0)
  }

  const totalAmount = calculateTotal()
  
  // Access credit info correctly - backend returns { data: { credit: {...}, status: {...} } }
  const creditData = creditInfo?.credit || {}
  const dashboardCredit = dashboard?.credit || {}
  
  // Get raw values
  const rawCreditRemaining = creditData?.remaining ?? dashboardCredit?.remaining ?? 0
  const creditLimit = creditData?.limit ?? dashboardCredit?.limit ?? 0
  
  // Debug: Log credit info structure
  useEffect(() => {
    if (creditInfo || dashboard?.credit) {
      const debugCreditData = creditInfo?.credit || {}
      const debugDashboardCredit = dashboard?.credit || {}
      const debugRawCreditRemaining = debugCreditData?.remaining ?? debugDashboardCredit?.remaining ?? 0
      const debugCreditLimit = debugCreditData?.limit ?? debugDashboardCredit?.limit ?? 0
      console.log('Credit Info Debug:', {
        creditInfo,
        creditData: debugCreditData,
        dashboardCredit: debugDashboardCredit,
        dashboard: dashboard?.credit,
        rawCreditRemaining: debugRawCreditRemaining,
        creditLimit: debugCreditLimit
      })
    }
  }, [creditInfo, dashboard?.credit])
  
  // Ensure credit remaining is never negative (should be limit - used, but protect against negative)
  // If negative, it means credit has been exceeded, but we'll show 0 for available credit
  const creditRemaining = Math.max(0, rawCreditRemaining) // Ensure it's never negative for display
  const repaymentDays = creditData?.repaymentDays ?? dashboardCredit?.repaymentDays ?? 30
  const penaltyRate = creditData?.penaltyRate ?? dashboardCredit?.penaltyRate ?? 0
  const projectedCredit = Math.max(0, creditRemaining - totalAmount) // Ensure projected is never negative

  // Check if all quantities are valid
  const allQuantitiesValid = selectedProducts.length > 0 && selectedProducts.every(sp => {
    const qty = typeof sp.quantity === 'number' ? sp.quantity : parseFloat(sp.quantity)
    return !isNaN(qty) && qty >= 1
  })

  // Debug logging (can be removed later)
  const debugInfo = {
    selectedProductsCount: selectedProducts.length,
    allQuantitiesValid,
    totalAmount,
    isValidAmount: !isNaN(totalAmount) && totalAmount > 0,
    meetsMinimum: totalAmount >= MIN_PURCHASE_VALUE,
    withinCredit: totalAmount <= creditRemaining,
    hasReason: purchaseReason.trim().length > 0,
    isConfirmed: confirmText.trim().toLowerCase() === 'confirm',
    isSubmitting,
    creditRemaining,
    creditLimit,
  }

  const canSubmit = 
    selectedProducts.length > 0 &&
    allQuantitiesValid &&
    !isNaN(totalAmount) &&
    totalAmount > 0 &&
    totalAmount >= MIN_PURCHASE_VALUE &&
    creditLimit > 0 && // Credit limit must be set
    totalAmount <= creditRemaining &&
    creditRemaining > 0 && // Ensure there's available credit
    purchaseReason.trim().length > 0 &&
    confirmText.trim().toLowerCase() === 'confirm' &&
    !isSubmitting

  // Log for debugging (remove in production)
  useEffect(() => {
    if (selectedProducts.length > 0) {
      console.log('Submit button debug:', debugInfo, 'canSubmit:', canSubmit)
    }
  }, [selectedProducts.length, totalAmount, creditRemaining, purchaseReason, confirmText, isSubmitting])

  const handleSubmit = async () => {
    setError('')

    // Validate all quantities first
    const invalidProducts = selectedProducts.filter(sp => {
      const qty = typeof sp.quantity === 'number' ? sp.quantity : parseFloat(sp.quantity)
      return isNaN(qty) || qty < 1
    })
    
    if (invalidProducts.length > 0) {
      setError('Please enter valid quantities (minimum 1) for all selected products.')
      // Auto-fix invalid quantities
      setSelectedProducts(selectedProducts.map(sp => {
        const qty = typeof sp.quantity === 'number' ? sp.quantity : parseFloat(sp.quantity)
        if (isNaN(qty) || qty < 1) {
          return { ...sp, quantity: 1 }
        }
        return sp
      }))
      return
    }

    if (selectedProducts.length === 0) {
      setError('Please add at least one product to your purchase.')
      return
    }

    if (totalAmount < MIN_PURCHASE_VALUE) {
      setError(`Minimum purchase amount is ₹${MIN_PURCHASE_VALUE.toLocaleString('en-IN')}.`)
      return
    }

    if (totalAmount > creditRemaining) {
      setError('Purchase amount exceeds available credit limit.')
      return
    }

    if (!purchaseReason.trim()) {
      setError('Please provide a reason for this purchase.')
      return
    }

    if (confirmText.trim().toLowerCase() !== 'confirm') {
      setError('Please type "confirm" to proceed with the purchase request.')
      return
    }

    setIsSubmitting(true)
    try {
      // Ensure all quantities are numbers
      const validatedProducts = selectedProducts.map(sp => {
        const qty = typeof sp.quantity === 'number' ? sp.quantity : parseFloat(sp.quantity) || 1
        const adminStock = sp.product.adminStock ?? sp.product.stock ?? 0
        const validQty = Math.min(Math.max(1, qty), adminStock)
        return {
          productId: sp.product.id || sp.product._id,
          productName: sp.product.name,
          quantity: validQty,
          pricePerUnit: sp.product.pricePerUnit || sp.product.priceToVendor || 0,
        }
      })

      const payload = {
        items: validatedProducts,
        notes: notes.trim() ? `${purchaseReason.trim()}\n\n${notes.trim()}` : purchaseReason.trim() || undefined,
      }

      const result = await requestCreditPurchase(payload)
      if (result.data) {
        // Reload credit info and dashboard data to reflect the pending purchase
        await Promise.all([
          loadCreditInfo(),
          fetchDashboardData().then((dashboardResult) => {
            if (dashboardResult.data) {
              dispatch({ type: 'SET_DASHBOARD_OVERVIEW', payload: dashboardResult.data })
              if (dashboardResult.data.credit) {
                dispatch({ type: 'SET_CREDIT_DATA', payload: dashboardResult.data.credit })
              }
            }
          })
        ])
        onSuccess()
        // Reset form
        setSelectedProducts([])
        setPurchaseReason('')
        setConfirmText('')
        setNotes('')
      } else if (result.error) {
        const message = result.error.message || 'Failed to submit purchase request.'
        setError(message)
        showError(message)
      }
    } catch (err) {
      const message = err?.error?.message || err.message || 'Failed to submit purchase request.'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-purple-600 hover:text-purple-800"
          >
            ← Back to Stock Manager
          </button>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Purchase from Admin</h2>
          <p className="text-sm text-gray-500">Select multiple products and submit a purchase request</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPolicy(!showPolicy)}
          className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100"
        >
          {showPolicy ? 'Hide' : 'View'} Policy
        </button>
      </div>

      {/* Credit Policy Display */}
      {showPolicy && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Purchasing Policy</h3>
          {creditLimit === 0 ? (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Credit Limit Not Set</p>
              <p className="text-xs text-yellow-800">
                Your credit limit has not been configured yet. Please contact Admin to set up your credit limit (minimum ₹1,00,000) before making purchase requests.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-blue-800">
              <div>
                <p className="font-semibold">Credit Limit</p>
                <p className="text-sm font-bold text-blue-900">₹{creditLimit.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="font-semibold">Available Credit</p>
                <p className="text-sm font-bold text-blue-900">
                  ₹{creditRemaining.toLocaleString('en-IN')}
                </p>
                {rawCreditRemaining < 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Credit exceeded by ₹{Math.abs(rawCreditRemaining).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            <div>
              <p className="font-semibold">Minimum Purchase</p>
              <p className="text-sm font-bold text-blue-900">₹{MIN_PURCHASE_VALUE.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="font-semibold">Repayment Period</p>
              <p className="text-sm font-bold text-blue-900">{repaymentDays} days</p>
            </div>
            {penaltyRate > 0 && (
              <div>
                <p className="font-semibold">Penalty Rate</p>
                <p className="text-sm font-bold text-blue-900">{penaltyRate}% per day</p>
              </div>
            )}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> All purchase requests require Admin approval. You will be notified once your request is reviewed.
              {creditLimit > 0 && ` Payment is due within ${repaymentDays} days of approval.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Available Products List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Products</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading products...</p>
              </div>
            ) : availableProducts.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {availableProducts.map((product) => {
                  const adminStock = product.adminStock ?? product.stock ?? 0
                  const isSelected = selectedProducts.some(
                    sp => (sp.product.id || sp.product._id) === (product.id || product._id)
                  )
                  
                  return (
                    <div
                      key={product.id || product._id}
                      className={cn(
                        'rounded-lg border p-4 transition-all',
                        isSelected
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-200'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          {product.primaryImage || product.images?.[0]?.url ? (
                            <img
                              src={product.primaryImage || product.images[0].url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <BoxIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {product.description || 'No description'}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            <span className="text-gray-600">
                              Stock: <strong>{adminStock} {product.unit || 'kg'}</strong>
                            </span>
                            <span className="text-purple-600 font-semibold">
                              ₹{product.pricePerUnit || product.priceToVendor || 0} per {product.unit || 'kg'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.id || product._id)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddProduct(product)}
                              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:bg-purple-100"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No products available for purchase</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart and Purchase Form */}
        <div className="space-y-4">
          {/* Selected Products Cart */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-purple-900 mb-4">Selected Products</h3>
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No products selected</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {selectedProducts.map((sp) => {
                  const product = sp.product
                  const adminStock = product.adminStock ?? product.stock ?? 0
                  const pricePerUnit = product.pricePerUnit || product.priceToVendor || 0
                  const qty = typeof sp.quantity === 'number' ? sp.quantity : (parseFloat(sp.quantity) || 0)
                  const itemTotal = qty * pricePerUnit
                  
                  return (
                    <div key={product.id || product._id} className="rounded-lg border border-white bg-white/70 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-gray-600">₹{pricePerUnit.toLocaleString('en-IN')} per {product.unit || 'kg'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id || product._id)}
                          className="flex-shrink-0 text-red-600 hover:text-red-800 text-xs"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-700">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          max={adminStock}
                          value={sp.quantity}
                          onChange={(e) => handleQuantityChange(product.id || product._id, e.target.value)}
                          onBlur={() => handleQuantityBlur(product.id || product._id)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="text-xs text-gray-600">({product.unit || 'kg'})</span>
                        <span className="ml-auto text-xs font-semibold text-purple-700">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Total Summary */}
            {selectedProducts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Available Credit:</span>
                    <span className={cn(
                      'font-semibold',
                      totalAmount <= creditRemaining ? 'text-green-700' : 'text-red-700'
                    )}>
                      ₹{creditRemaining.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">After Purchase:</span>
                    <span className={cn(
                      'font-semibold',
                      projectedCredit >= 0 ? 'text-gray-900' : 'text-red-700'
                    )}>
                      ₹{projectedCredit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {totalAmount < MIN_PURCHASE_VALUE && (
                    <p className="text-xs text-red-600 mt-2">
                      Minimum purchase: ₹{MIN_PURCHASE_VALUE.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Purchase Form */}
          {selectedProducts.length > 0 && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-purple-900 mb-4">Purchase Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Reason for Purchase <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={purchaseReason}
                    onChange={(e) => setPurchaseReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why you need these products..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Urgency, delivery expectations, etc."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Type "confirm" to proceed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type 'confirm' here"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                {creditLimit === 0 && (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Credit Limit Not Configured</p>
                    <p className="text-xs text-yellow-800">
                      Please contact Admin to set up your credit limit (minimum ₹1,00,000) before making purchase requests.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    'w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-all',
                    canSubmit
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-purple-300 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Purchase Request'}
                </button>

                {!canSubmit && creditLimit === 0 && (
                  <p className="text-xs text-center text-yellow-700 mt-2">
                    Cannot submit: Credit limit needs to be set by Admin
                  </p>
                )}

                <p className="text-[11px] text-purple-600 text-center">
                  Your request will be reviewed by Admin. You'll be notified of the approval status.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InventoryView({ openPanel }) {
  const { dashboard, profile } = useVendorState()
  const dispatch = useVendorDispatch()
  const { success, error: showError } = useToast()
  const { getProducts, getProductDetails } = useVendorApi()
  const [productsData, setProductsData] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showPurchaseScreen, setShowPurchaseScreen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('vendor_token')
    if (!token) return
    
    setLoading(true)
    getProducts({ limit: 100 }).then((result) => {
      if (result.data) {
        setProductsData(result.data)
      } else if (result.error?.status === 401) {
        localStorage.removeItem('vendor_token')
      }
    }).catch((err) => {
      console.error('Failed to load products:', err)
      if (err.error?.status === 401) {
        localStorage.removeItem('vendor_token')
      }
    }).finally(() => {
      setLoading(false)
    })
  }, [getProducts])


  const handleProductClick = async (product) => {
    setLoading(true)
    try {
      const result = await getProductDetails(product.id || product._id)
      if (result.data) {
        setSelectedProduct(result.data.product)
      }
    } catch (err) {
      console.error('Failed to load product details:', err)
    } finally {
      setLoading(false)
    }
  }


  // Get products from backend
  const products = productsData?.products || []
  
  const totalProducts = products.length
  const inStockCount = products.filter((p) => (p.adminStock ?? p.stock ?? 0) > 0).length
  const outOfStockCount = totalProducts - inStockCount

  const getVendorStockStatus = (stock) => {
    const value = Number(stock) || 0
    if (value <= 0) {
      return { label: 'No stock', tone: 'critical', helper: 'Order stock to start selling', message: 'You have no stock yet' }
    }
    if (value <= 25) {
      return { label: 'Low stock', tone: 'warn', helper: 'Plan a stock refill soon', message: 'Order more to avoid delays' }
    }
    if (value <= 75) {
      return { label: 'Mid stock', tone: 'teal', helper: 'Stock looks steady', message: 'Keep tracking demand' }
    }
    return { label: 'High stock', tone: 'success', helper: 'You are well stocked', message: 'Ready for incoming orders' }
  }

  const topStats = [
    { label: 'Available products', value: inStockCount, note: 'Ready to order', tone: 'success' },
    { label: 'Out of stock', value: outOfStockCount, note: 'Check back later', tone: 'warn' },
  ]

  const inventoryStats = [
    { label: 'Total products', value: `${totalProducts}`, meta: `${inStockCount} in stock`, tone: 'success' },
    { label: 'Out of stock', value: `${outOfStockCount}`, meta: 'Not available', tone: 'warn' },
  ]

  const metricIcons = [BoxIcon, ChartIcon, SparkIcon, TruckIcon]

  const alerts = [
    {
      title: 'Need to order more',
      body: 'Micro nutrients getting low. Request before deadline.',
      badge: 'Time to get • 3 days',
      tone: 'warn',
      action: 'Raise request',
    },
    {
      title: 'Talk to supplier',
      body: 'Confirm NPK 24:24:0 availability with admin hub.',
      badge: 'Supplier • Admin hub',
      tone: 'teal',
      action: 'Contact admin',
    },
    {
      title: 'Papers to upload',
      body: '2 products waiting for quality certificates before sending.',
      badge: 'Quality check pending',
      tone: 'neutral',
      action: 'Upload docs',
    },
  ]

  const stockProgress = {
    Healthy: 86,
    Low: 48,
    Critical: 22,
  }

  // Show PurchaseFromAdmin screen
  if (showPurchaseScreen) {
    return (
      <PurchaseFromAdminView
        products={products}
        onBack={() => setShowPurchaseScreen(false)}
        onSuccess={() => {
          setShowPurchaseScreen(false)
          success('Purchase request submitted. Admin will review and approve.')
        }}
      />
    )
  }

  // Show Product Details
  if (selectedProduct) {
    const adminStock = selectedProduct.adminStock ?? selectedProduct.displayStock ?? selectedProduct.stock ?? 0
    const vendorStock = selectedProduct.vendorStock ?? 0
    const vendorStockStatus = getVendorStockStatus(vendorStock)
    const ordersCount = selectedProduct.vendorOrdersCount ?? 0

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-sm font-semibold text-purple-600 hover:text-purple-800"
            >
              ← Back to products
            </button>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
            <p className="text-sm text-gray-500">SKU: {selectedProduct.sku || 'N/A'}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
              {selectedProduct.primaryImage || selectedProduct.images?.[0]?.url ? (
                <img
                  src={selectedProduct.primaryImage || selectedProduct.images[0].url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BoxIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Description</h4>
              <p className="text-sm text-gray-600 mt-1">
                {selectedProduct.description || 'No description available'}
              </p>
            </div>

            {/* Arriving Products Note */}
            {selectedProduct.arrivingQuantity > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-900">
                  📦 {selectedProduct.arrivingQuantity} {selectedProduct.unit || 'kg'} arriving in 24 hours
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  This quantity is from your approved purchase request and will be added to your stock soon.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Vendor stock status</p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    vendorStockStatus.tone === 'success'
                      ? 'text-green-700'
                      : vendorStockStatus.tone === 'teal'
                      ? 'text-blue-700'
                      : vendorStockStatus.tone === 'warn'
                      ? 'text-yellow-700'
                      : 'text-red-700',
                  )}
                >
                  {vendorStockStatus.label}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  You currently hold {vendorStock} {selectedProduct.unit || 'kg'}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Admin stock available</p>
                <p className="text-lg font-bold text-gray-900">
                  {adminStock} {selectedProduct.unit || 'kg'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">You can request this much stock from admin</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Price per {selectedProduct.unit || 'kg'}</p>
                <p className="text-lg font-bold text-purple-600">
                  ₹{selectedProduct.pricePerUnit || selectedProduct.priceToVendor || 0}
                </p>
              </div>
              
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Orders fulfilled</p>
                <p className="text-lg font-bold text-gray-900">{ordersCount}</p>
                <p className="text-[11px] text-gray-500 mt-1">Number of orders you handled for this product</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Category</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{selectedProduct.category || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section id="inventory-hero" className="inventory-hero">
        <div className="inventory-hero__shell">
          <div className="inventory-hero__headline">
            <span className="inventory-hero__chip">Stock hub</span>
            <h3 className="inventory-hero__title">{totalProducts} products available</h3>
            <p className="inventory-hero__meta">
              {inStockCount} in stock • {outOfStockCount} out of stock
            </p>
            <div className="inventory-hero__actions">
              {[
                { label: 'Purchase from Admin', icon: TruckIcon, action: 'purchase-from-admin' },
                { label: 'Add product', icon: SparkIcon, action: 'add-sku' },
                { label: 'Reorder', icon: TruckIcon, action: 'reorder' },
                { label: 'Supplier list', icon: HomeIcon, action: 'supplier-list' },
                { label: 'Stock summary', icon: ChartIcon, action: 'stock-report' },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="inventory-hero__action"
                  onClick={() => {
                    if (action.action === 'purchase-from-admin') {
                      setShowPurchaseScreen(true)
                    } else if (action.action) {
                      openPanel(action.action)
                    }
                  }}
                >
                  <span className="inventory-hero__action-icon">
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="inventory-hero__statgrid">
            {topStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'inventory-hero__stat',
                  stat.tone === 'warn' ? 'is-warn' : stat.tone === 'teal' ? 'is-teal' : 'is-success',
                )}
              >
                <p>{stat.label}</p>
                <span>{stat.value}</span>
                <small>{stat.note}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Stock snapshot</h3>
          </div>
        </div>
        <div className="inventory-metric-grid">
          {inventoryStats.map((stat, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <div key={stat.label} className="inventory-metric-card">
                <span className="inventory-metric-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="inventory-metric-body">
                  <p>{stat.label}</p>
                  <span>{stat.value}</span>
                  <small>{stat.meta}</small>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Alerts & follow ups</h3>
          </div>
        </div>
        <div className="inventory-alert-grid">
          {alerts.map((card) => (
            <div
              key={card.title}
              className={cn(
                'inventory-alert-card',
                card.tone === 'warn' ? 'is-warn' : card.tone === 'teal' ? 'is-teal' : 'is-neutral',
              )}
            >
              <header>
                <span className="inventory-alert-card__badge">{card.badge}</span>
                <h4>{card.title}</h4>
              </header>
              <p>{card.body}</p>
              <button
                type="button"
                onClick={() => {
                  if (card.title === 'Restock advisory') {
                    openPanel('raise-request')
                  } else if (card.title === 'Vendor coordination') {
                    openPanel('ping-admin')
                  } else if (card.title === 'Document updates') {
                    openPanel('upload-docs')
                  }
                }}
              >
                {card.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Available Products</h3>
            <p className="text-sm text-gray-600 mt-1">Use the View details button to inspect and order stock</p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const shortDescription = product.description?.substring(0, 100) || 'No description available'
              const adminStock = product.adminStock ?? product.stock ?? 0
              const vendorStock = product.vendorStock ?? 0
              const vendorStockStatus = getVendorStockStatus(vendorStock)
              const adminStockStatus = product.stockStatus || (adminStock > 0 ? 'in_stock' : 'out_of_stock')
              const arrivingQuantity = product.arrivingQuantity || 0
              
              return (
                <div
                  key={product.id || product._id}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                    {product.primaryImage || product.images?.[0]?.url ? (
                      <img
                        src={product.primaryImage || product.images[0].url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BoxIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{product.name}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{shortDescription}...</p>
                    
                    {/* Arriving Products Note */}
                    {arrivingQuantity > 0 && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
                        <p className="text-xs font-semibold text-blue-900">
                          📦 {arrivingQuantity} {product.unit || 'kg'} arriving in 24 hours
                        </p>
                      </div>
                    )}
                    
                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          vendorStockStatus.tone === 'success'
                            ? 'bg-green-100 text-green-700'
                            : vendorStockStatus.tone === 'teal'
                            ? 'bg-blue-100 text-blue-700'
                            : vendorStockStatus.tone === 'warn'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700',
                        )}
                      >
                        Vendor stock • {vendorStockStatus.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {vendorStock} {product.unit || 'kg'} with you
                      </span>
                    </div>
                    
                    {/* Price */}
                    <div className="pt-2 flex flex-col gap-3">
                      <p className="text-sm font-bold text-purple-600">
                        ₹{product.pricePerUnit || product.priceToVendor || 0} per {product.unit || 'kg'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vendorStockStatus.helper}
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleProductClick(product)}
                          className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No products available</p>
          </div>
        )}
      </section>

      <div id="inventory-restock" className="vendor-card border border-brand/20 bg-white px-5 py-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-surface-foreground">Need to order more</p>
            <p className="text-xs text-muted-foreground">
              Micro Nutrients getting low. Submit a loan request within 48h to avoid problems.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="vendor-chip warn">Time to get • 3 days</span>
            <button
              className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-brand-foreground"
              onClick={() => openPanel('raise-request')}
            >
              Raise request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrdersView({ openPanel }) {
  const { dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { getOrders } = useVendorApi()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [ordersData, setOrdersData] = useState(null)

  useEffect(() => {
    getOrders({ status: selectedFilter === 'all' ? undefined : selectedFilter }).then((result) => {
      if (result.data) {
        setOrdersData(result.data)
        dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
      }
    })
  }, [getOrders, selectedFilter, dispatch])

  const STATUS_FLOW = ['awaiting', 'dispatched', 'delivered']
  const STAGES = ['Awaiting', 'Dispatched', 'Delivered']

  const normalizeStatus = (status) => {
    if (!status) return 'pending'
    const normalized = status.toLowerCase()
    // Backend statuses: pending, awaiting, processing, ready_for_delivery, out_for_delivery, delivered
    if (normalized === 'delivered') return 'delivered'
    if (normalized === 'out_for_delivery') return 'dispatched'
    if (normalized === 'ready_for_delivery') return 'dispatched'
    if (normalized === 'processing') return 'awaiting'
    if (normalized === 'awaiting') return 'awaiting'
    if (normalized === 'pending') return 'pending'
    // Fallback
    if (normalized.includes('deliver')) return 'delivered'
    if (normalized.includes('dispatch')) return 'dispatched'
    return 'pending'
  }

  const stageIndex = (status) => {
    const key = normalizeStatus(status)
    if (key === 'delivered') return 2
    if (key === 'dispatched') return 1
    return 0
  }

  // Transform backend orders to frontend format
  const backendOrders = ordersData?.orders || dashboard.orders?.orders || []
  const orders = backendOrders.map((order) => ({
    id: order._id || order.id,
    orderNumber: order.orderNumber,
    farmer: order.userId?.name || 'Unknown Customer',
    value: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
    payment: order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'partial' ? 'Partial' : 'Pending',
    status: order.status || 'pending',
    items: order.items || [],
    customerPhone: order.userId?.phone || '',
    deliveryAddress: order.deliveryAddress || {},
    createdAt: order.createdAt,
    next: order.status === 'pending' ? 'Confirm availability within 1 hour' : 
          order.status === 'awaiting' ? 'Process and dispatch order' :
          order.status === 'processing' ? 'Prepare for delivery' :
          order.status === 'ready_for_delivery' ? 'Mark as out for delivery' :
          order.status === 'out_for_delivery' ? 'Mark as delivered' : null,
  }))
  
  const totals = orders.reduce(
    (acc, order) => {
      const normalizedStatus = normalizeStatus(order.status)
      if (normalizedStatus === 'delivered') acc.delivered += 1
      else if (normalizedStatus === 'dispatched') acc.dispatched += 1
      else acc.awaiting += 1
      return acc
    },
    { awaiting: 0, dispatched: 0, delivered: 0 },
  )
  const totalOrders = orders.length

  const filterChips = [
    { id: 'all', label: 'All orders', value: totalOrders },
    { id: 'awaiting', label: 'Awaiting', value: totals.awaiting },
    { id: 'dispatched', label: 'Dispatched', value: totals.dispatched },
    { id: 'delivered', label: 'Delivered', value: totals.delivered },
  ]

  const getHeroStats = (filter) => {
    switch (filter) {
      case 'all':
        return [
          {
            label: 'Waiting for your reply',
            value: totals.awaiting,
            meta: 'Needs your reply',
            tone: 'warn',
          },
          {
            label: 'Orders in transit',
            value: totals.dispatched,
            meta: 'Delivery in progress',
            tone: 'teal',
          },
          {
            label: 'Ready to deliver',
            value: totals.delivered,
            meta: 'Track delivery',
            tone: 'success',
          },
        ]
      case 'awaiting':
        return [
          {
            label: 'Waiting for your reply',
            value: totals.awaiting,
            meta: 'Action required',
            tone: 'warn',
          },
          {
            label: 'Average wait time',
            value: '2.5h',
            meta: 'Time to reply',
            tone: 'teal',
          },
          {
            label: 'Urgent orders',
            value: Math.max(0, totals.awaiting - 2),
            meta: 'Taking too long',
            tone: 'warn',
          },
        ]
      case 'dispatched':
        return [
          {
            label: 'In transit',
            value: totals.dispatched,
            meta: 'On the way to farmer',
            tone: 'teal',
          },
          {
            label: 'Awaiting delivery',
            value: Math.max(0, totals.dispatched - totals.delivered),
            meta: 'Deliver within 24h SLA',
            tone: 'success',
          },
          {
            label: 'Average dispatch time',
            value: '4.2h',
            meta: 'After confirmation',
            tone: 'teal',
          },
        ]
      case 'delivered':
        return [
          {
            label: 'Completed today',
            value: totals.delivered,
            meta: 'Successfully delivered',
            tone: 'success',
          },
          {
            label: 'Delivered on time',
            value: '94%',
            meta: 'On-time delivery',
            tone: 'success',
          },
          {
            label: 'Average delivery time',
            value: '18.5h',
            meta: 'After order placed',
            tone: 'teal',
          },
        ]
      default:
        return []
    }
  }

  const heroStats = getHeroStats(selectedFilter)

  return (
    <div className="orders-view space-y-6">
      <section id="orders-hero" className="orders-hero">
        <div className="orders-hero__shell">
          <div className="orders-hero__headline">
            <span className="orders-hero__chip">Orders</span>
            <h3 className="orders-hero__title">{totalOrders} active orders</h3>
            <p className="orders-hero__meta">
              {totals.awaiting} awaiting • {totals.dispatched} dispatched • {totals.delivered} delivered
            </p>
          </div>
          <div className="orders-hero__filters" role="group" aria-label="Filter orders">
          {filterChips.map((chip) => (
              <button
              key={chip.id}
                type="button"
                className={cn('orders-hero__filter', selectedFilter === chip.id && 'is-active')}
                aria-pressed={selectedFilter === chip.id}
                onClick={() => setSelectedFilter(chip.id)}
              >
                <span>{chip.label}</span>
                <strong>{chip.value}</strong>
              </button>
            ))}
          </div>
          <div className="orders-hero__stats">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
              className={cn(
                  'orders-hero__stat',
                  stat.tone === 'warn' ? 'is-warn' : stat.tone === 'teal' ? 'is-teal' : 'is-success',
              )}
            >
                <small>{stat.label}</small>
                <span>{stat.value}</span>
                <p>{stat.meta}</p>
              </div>
          ))}
        </div>
                </div>
      </section>

      <section id="orders-tracker" className="orders-section">
        <div className="overview-section__header">
                <div>
            <h3 className="overview-section__title">Orders</h3>
                </div>
          <button type="button" className="orders-section__cta" onClick={() => openPanel('view-sla-policy')}>
            View delivery policy
          </button>
              </div>
        <div className="orders-list">
          {orders.length > 0 ? orders.map((order) => {
            const normalizedStatus = normalizeStatus(order.status)
            // Show accept/reject actions for pending orders
            const showAvailabilityActions = order.status === 'pending' || normalizedStatus === 'pending'
            const nextMessage =
              order.next ||
              (normalizedStatus === 'awaiting'
                ? 'Confirm availability within 1 hour'
                : normalizedStatus === 'dispatched'
                  ? 'Deliver before the 24h SLA'
                  : 'Mark payment as collected')

            return (
            <article key={order.id} className="orders-card">
              <header className="orders-card__header">
                <div className="orders-card__identity">
                  <span className="orders-card__icon">
                    <TruckIcon className="h-5 w-5" />
                  </span>
                  <div className="orders-card__details">
                    <p className="orders-card__name">{order.farmer}</p>
                    <p className="orders-card__value">{order.value}</p>
              </div>
            </div>
                <div className="orders-card__status">
                  <span className="orders-card__payment">{order.payment}</span>
                  <span className="orders-card__stage-label">
                    {normalizedStatus === 'awaiting' ? 'Awaiting' : normalizedStatus === 'dispatched' ? 'Dispatched' : normalizedStatus === 'delivered' ? 'Delivered' : order.status}
                  </span>
            </div>
              </header>
                <div className="orders-card__next">
                  <span className="orders-card__next-label">Next</span>
                  <span className="orders-card__next-value">{nextMessage}</span>
                </div>
              <div className="orders-card__stages">
              {STAGES.map((stage, index) => (
                  <div
                    key={stage}
                    className={cn('orders-card__stage', index <= stageIndex(order.status) && 'is-active')}
                  >
                    <span className="orders-card__stage-index">{index + 1}</span>
                    <span className="orders-card__stage-text">{stage}</span>
                </div>
              ))}
            </div>
              <div className="orders-card__actions">
                <button
                  type="button"
                  className="orders-card__action is-primary"
                  onClick={() =>
                    openPanel('update-order-status', {
                      orderId: order.id,
                      status: normalizedStatus,
                    })
                  }
                >
                  Update status
                </button>
                {showAvailabilityActions && (
                  <>
                    <button
                      type="button"
                      className="orders-card__action is-secondary"
                      onClick={() => openPanel('order-available', { orderId: order.id })}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className="orders-card__action is-secondary"
                      onClick={() => openPanel('order-not-available', { orderId: order.id })}
                    >
                      Not available
                    </button>
                  </>
                )}
              </div>
            </article>
            )
          }) : (
            <div className="orders-card">
              <div className="orders-card__details">
                <p className="text-sm text-gray-500 text-center py-4">No orders found</p>
              </div>
            </div>
          )}
      </div>
      </section>

      <section id="orders-fallback" className="orders-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Backup delivery</h3>
            
          </div>
        </div>
        <div className="orders-fallback-card">
          <p className="orders-fallback-card__body">
              Western hub reporting a mild delay. Send low-priority orders to Admin delivery if it takes more than 24 hours.
            </p>
          <div className="orders-fallback-card__footer">
            <span className="orders-fallback-card__badge">Delay • Western hub</span>
            <button type="button" className="orders-fallback-card__cta" onClick={() => openPanel('escalate-to-admin')}>
            Send to admin
          </button>
        </div>
      </div>
      </section>
    </div>
  )
}

function CreditView({ openPanel }) {
  const { dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { getCreditInfo } = useVendorApi()

  useEffect(() => {
    getCreditInfo().then((result) => {
      if (result.data) {
        dispatch({ type: 'SET_CREDIT_DATA', payload: result.data })
      }
    })
  }, [getCreditInfo, dispatch])

  // Use real credit data from backend
  const creditData = dashboard.credit || {}
  const creditLimit = creditData.limit || 0
  const creditUsed = creditData.used || 0
  const creditRemaining = creditData.remaining || 0
  const penalty = creditData.penalty || 0
  
  const credit = {
    limit: creditLimit > 0 ? `₹${(creditLimit / 100000).toFixed(1)}L` : '₹0',
    used: creditUsed > 0 ? `₹${(creditUsed / 100000).toFixed(1)}L` : '₹0',
    remaining: creditRemaining > 0 ? `₹${(creditRemaining / 100000).toFixed(1)}L` : '₹0',
    penalty: penalty === 0 ? 'No penalty' : `₹${penalty.toLocaleString('en-IN')}`,
    due: creditData.dueDate ? new Date(creditData.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set',
  }

  const usedPercent = creditLimit > 0
    ? Math.min(Math.round((creditUsed / creditLimit) * 100), 100)
    : 0

  const creditMetrics = [
    { label: 'Loan limit', value: credit.limit, icon: CreditIcon, tone: 'success' },
    { label: 'Remaining', value: credit.remaining, icon: WalletIcon, tone: 'success' },
    { label: 'Used', value: credit.used, icon: ChartIcon, tone: 'warn' },
    { label: 'Due date', value: credit.due, icon: ReportIcon, tone: 'teal' },
  ]

  const penaltyTimeline = [
    { period: 'Day 0-5', description: 'Free time with reminders sent automatically.', tone: 'success' },
    { period: 'Day 6-10', description: 'Fine added, finance team notified.', tone: 'warn' },
    { period: 'Day 11+', description: 'New loan blocked until payment done.', tone: 'critical' },
  ]

  return (
    <div className="credit-view space-y-6">

      <section id="credit-status" className="credit-status-section">
        <div className="credit-status-card">
          <div className="credit-status-card__main">
            <div className="credit-status-card__progress-wrapper">
              <div className="credit-status-card__progress-ring">
                <svg className="credit-status-card__progress-svg" viewBox="0 0 120 120">
                  <circle
                    className="credit-status-card__progress-bg"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="8"
                  />
                  <circle
                    className="credit-status-card__progress-fill"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - usedPercent / 100)}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="credit-status-card__progress-content">
                  <span className="credit-status-card__progress-percent">{usedPercent}%</span>
                  <span className="credit-status-card__progress-label">Used</span>
            </div>
          </div>
              <div className="credit-status-card__details">
                <div className="credit-status-card__amount">
                  <span className="credit-status-card__amount-value">{credit.used}</span>
                  <span className="credit-status-card__amount-label">Loan Used</span>
            </div>
                <div className="credit-status-card__quick-info">
                  <div className="credit-status-card__info-item">
                    <span className="credit-status-card__info-label">Available</span>
                    <span className="credit-status-card__info-value">{credit.remaining}</span>
            </div>
                  <div className="credit-status-card__info-item">
                    <span className="credit-status-card__info-label">Total loan limit</span>
                    <span className="credit-status-card__info-value">{credit.limit}</span>
            </div>
            </div>
          </div>
        </div>
          </div>
          <div className="credit-status-card__footer">
            <div className="credit-status-card__status-badge">
              <span className="credit-status-card__status-text">{credit.penalty === 'No penalty' ? 'No fine' : credit.penalty}</span>
            </div>
            <button type="button" className="credit-status-card__action" onClick={() => openPanel('view-details')}>
              View Details
            </button>
          </div>
        </div>
      </section>

      <section id="credit-summary" className="credit-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Loan summary</h3>
          </div>
        </div>
        <div className="credit-metric-grid">
          {creditMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="credit-metric-card">
                <span className={cn('credit-metric-icon', metric.tone === 'warn' ? 'is-warn' : metric.tone === 'teal' ? 'is-teal' : 'is-success')}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="credit-metric-body">
                  <p>{metric.label}</p>
                  <span>{metric.value}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="credit-usage-card">
          <div className="credit-usage-card__header">
            <span className="credit-usage-card__label">Loan usage</span>
            <span className="credit-usage-card__percent">{usedPercent}%</span>
          </div>
          <div className="credit-usage-card__progress">
            <span style={{ width: `${usedPercent}%` }} />
          </div>
          <div className="credit-usage-card__footer">
            <span className="credit-usage-card__badge">{credit.penalty === 'No penalty' ? 'No fine' : credit.penalty}</span>
          </div>
        </div>
      </section>

      <section id="credit-actions" className="credit-section">
        <div className="overview-section__header">
            <div>
            <h3 className="overview-section__title">Loan management</h3>
          </div>
        </div>
        <div className="credit-action-grid">
          <div className="credit-action-card">
            <header>
              <span className="credit-action-card__icon">
                <WalletIcon className="h-5 w-5" />
              </span>
              <h4 className="credit-action-card__title">Need to reorder?</h4>
            </header>
            <p className="credit-action-card__body">
                Minimum order amount ₹50,000. Loan order requests go to Admin for approval before stock updates.
              </p>
            <button type="button" className="credit-action-card__cta" onClick={() => openPanel('place-credit-purchase')}>
              Request loan order
            </button>
          </div>
        </div>
      </section>

      <section id="credit-penalty" className="credit-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Fine timeline</h3>
              </div>
          </div>
        <div className="credit-timeline">
          {penaltyTimeline.map((item) => (
            <div
              key={item.period}
              className={cn(
                'credit-timeline-item',
                item.tone === 'critical' ? 'is-critical' : item.tone === 'warn' ? 'is-warn' : 'is-success',
              )}
            >
              <div className="credit-timeline-item__marker" />
              <div className="credit-timeline-item__content">
                <span className="credit-timeline-item__period">{item.period}</span>
                <p className="credit-timeline-item__description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ReportsView() {
  const { dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { getReports } = useVendorApi()

  useEffect(() => {
    getReports({ period: 'week' }).then((result) => {
      if (result.data) {
        dispatch({ type: 'SET_REPORTS_DATA', payload: result.data })
      }
    })
  }, [getReports, dispatch])
  const topVendors = [
    { name: 'HarvestLink Pvt Ltd', revenue: '₹1.4 Cr', change: '+12%', tone: 'success' },
    { name: 'GreenGrow Supplies', revenue: '₹1.1 Cr', change: '+9%', tone: 'success' },
    { name: 'GrowSure Traders', revenue: '₹82 L', change: '+4%', tone: 'teal' },
  ]

  const reportIcons = [ChartIcon, WalletIcon, CreditIcon, HomeIcon]

  const [activeTab, setActiveTab] = useState('revenue')
  const [timePeriod, setTimePeriod] = useState('week')

  const tabs = [
    { id: 'revenue', label: 'Earnings Summary' },
    { id: 'performance', label: 'Performance' },
    { id: 'trends', label: 'Trends' },
    { id: 'insights', label: 'Tips' },
  ]

  const timePeriods = [
    { id: 'week', label: '1 Week' },
    { id: 'month', label: '1 Month' },
    { id: 'year', label: '1 Year' },
    { id: 'all', label: 'All Time' },
  ]

  // Transform backend reports data to chart format
  const getRevenueData = (period) => {
    // Use real data from backend if available
    if (analyticsData?.dailyTrends && Array.isArray(analyticsData.dailyTrends)) {
      const trends = analyticsData.dailyTrends
        return {
        labels: trends.map(t => {
          // Format date labels based on period
          const date = new Date(t._id)
          if (period === 'week') return date.toLocaleDateString('en-US', { weekday: 'short' })
          if (period === 'month') return `Week ${Math.ceil(date.getDate() / 7)}`
          if (period === 'year') return `Q${Math.ceil((date.getMonth() + 1) / 3)}`
          return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        }),
        revenue: trends.map(t => (t.sales || 0) / 100000), // Convert to Lakhs
        orders: trends.map(t => t.count || 0),
        }
    }
    
    // Fallback to empty data if no backend data
        return {
      labels: [],
      revenue: [],
      orders: [],
    }
  }

  const chartData = getRevenueData(timePeriod)
  
  // Get sales data from backend
  const salesData = analyticsData?.sales || reportsData?.sales || {}
  const totalSales = salesData.totalSales || 0
  const orderCount = salesData.orderCount || 0
  const averageOrderValue = salesData.averageOrderValue || 0
  const maxValue = Math.max(...chartData.revenue, ...chartData.orders)
  const yAxisSteps = 5
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = (maxValue / yAxisSteps) * (yAxisSteps - i)
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
  })

  return (
    <div className="reports-view space-y-6">

      <section id="reports-summary" className="reports-summary-section">
        <div className="reports-summary-card">
          <div className="reports-summary-card__content">
            <div className="reports-summary-card__main">
              <div className="reports-summary-card__icon">
                <ChartIcon className="h-6 w-6" />
            </div>
              <div className="reports-summary-card__stats">
                <div className="reports-summary-card__stat">
                  <span className="reports-summary-card__stat-label">Total Earnings</span>
                  <span className="reports-summary-card__stat-value">
                    {totalSales > 0 ? `₹${(totalSales / 100000).toFixed(1)}L` : '₹0'}
                  </span>
            </div>
                <div className="reports-summary-card__stat">
                  <span className="reports-summary-card__stat-label">Total Orders</span>
                  <span className="reports-summary-card__stat-value">{orderCount}</span>
          </div>
              </div>
            </div>
            <div className="reports-summary-card__insights">
              {orderCount > 0 && (
                <div className="reports-summary-card__insight">
                  <span className="reports-summary-card__insight-icon">⚡</span>
                  <span className="reports-summary-card__insight-text">{orderCount} orders completed this {timePeriod}</span>
                </div>
              )}
              {averageOrderValue > 0 && (
              <div className="reports-summary-card__insight">
                <span className="reports-summary-card__insight-icon">📈</span>
                  <span className="reports-summary-card__insight-text">Average order value: ₹{averageOrderValue.toLocaleString('en-IN')}</span>
              </div>
              )}
              {orderCount === 0 && (
              <div className="reports-summary-card__insight">
                  <span className="reports-summary-card__insight-icon">ℹ️</span>
                  <span className="reports-summary-card__insight-text">No orders data available for this period</span>
              </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="reports-metrics" className="reports-section">
        <div className="overview-section__header">
        <div>
            <h3 className="overview-section__title">Performance metrics</h3>
          </div>
          </div>
        <div className="reports-metric-grid">
          {[
            { label: 'Total Sales', value: totalSales > 0 ? `₹${(totalSales / 100000).toFixed(1)}L` : '₹0', meta: `${orderCount} orders`, icon: ChartIcon },
            { label: 'Avg Order Value', value: averageOrderValue > 0 ? `₹${averageOrderValue.toLocaleString('en-IN')}` : '₹0', meta: 'Per order', icon: WalletIcon },
            { label: 'Orders Completed', value: String(orderCount), meta: 'Delivered orders', icon: CreditIcon },
            { label: 'Performance', value: orderCount > 0 ? 'Active' : 'No activity', meta: 'This period', icon: HomeIcon },
          ].map((metric, index) => {
            const Icon = metric.icon || reportIcons[index % reportIcons.length]
            return (
              <div key={metric.label} className="reports-metric-card">
                <span className="reports-metric-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="reports-metric-body">
                  <p>{metric.label}</p>
                  <span>{metric.value}</span>
                  <small>{metric.meta}</small>
        </div>
              </div>
            )
          })}
        </div>
      </section>

      <section id="reports-analytics" className="reports-tab-section">
        <div className="reports-tab-header">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn('reports-tab-button', activeTab === tab.id && 'is-active')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
          </button>
          ))}
        </div>
        <div className="reports-tab-content">
          {activeTab === 'revenue' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <div className="reports-analytics-card__header-top">
                    <div>
                      <h4 className="reports-analytics-card__title">Earnings from orders</h4>
                      <span className="reports-analytics-card__subtitle">
                        {timePeriod === 'week' && 'Last 7 days'}
                        {timePeriod === 'month' && 'Last 30 days'}
                        {timePeriod === 'year' && 'Last 12 months'}
                        {timePeriod === 'all' && 'From start'}
                      </span>
                    </div>
                    <div className="reports-time-period-selector">
                      {timePeriods.map((period) => (
                        <button
                          key={period.id}
                          type="button"
                          className={cn(
                            'reports-time-period-button',
                            timePeriod === period.id && 'is-active',
                          )}
                          onClick={() => setTimePeriod(period.id)}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-line-chart">
                    <div className="reports-line-chart__legend">
                      <div className="reports-line-chart__legend-item">
                        <span className="reports-line-chart__legend-dot is-revenue" />
                        <span className="reports-line-chart__legend-label">Earnings (₹L)</span>
                      </div>
                      <div className="reports-line-chart__legend-item">
                        <span className="reports-line-chart__legend-dot is-orders" />
                        <span className="reports-line-chart__legend-label">Orders</span>
                      </div>
                    </div>
                    <div className="reports-line-chart__container">
                      <div className="reports-line-chart__y-axis">
                        {yAxisLabels.map((label, index) => (
                          <span key={index} className="reports-line-chart__y-label">
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="reports-line-chart__graph">
                        <svg className="reports-line-chart__svg" viewBox={`0 0 ${(chartData.labels.length - 1) * 100} 200`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(43, 118, 79, 0.3)" />
                              <stop offset="100%" stopColor="rgba(43, 118, 79, 0.05)" />
                            </linearGradient>
                            <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(33, 150, 173, 0.3)" />
                              <stop offset="100%" stopColor="rgba(33, 150, 173, 0.05)" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          {yAxisLabels.map((_, index) => {
                            const y = (index / yAxisSteps) * 200
                            return (
                              <line
                                key={index}
                                x1="0"
                                y1={y}
                                x2={(chartData.labels.length - 1) * 100}
                                y2={y}
                                stroke="rgba(34, 94, 65, 0.08)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                            )
                          })}
                          {/* Revenue area */}
                          <path
                            d={`M 0,${200 - (chartData.revenue[0] / maxValue) * 200} ${chartData.revenue
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')} L ${(chartData.labels.length - 1) * 100},200 L 0,200 Z`}
                            fill="url(#revenueGradient)"
                          />
                          {/* Orders area */}
                          <path
                            d={`M 0,${200 - (chartData.orders[0] / maxValue) * 200} ${chartData.orders
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')} L ${(chartData.labels.length - 1) * 100},200 L 0,200 Z`}
                            fill="url(#ordersGradient)"
                          />
                          {/* Revenue line */}
                          <path
                            d={`M 0,${200 - (chartData.revenue[0] / maxValue) * 200} ${chartData.revenue
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')}`}
                            fill="none"
                            stroke="rgba(43, 118, 79, 0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Orders line */}
                          <path
                            d={`M 0,${200 - (chartData.orders[0] / maxValue) * 200} ${chartData.orders
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')}`}
                            fill="none"
                            stroke="rgba(33, 150, 173, 0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Data points */}
                          {chartData.revenue.map((value, index) => (
                            <circle
                              key={`revenue-${index}`}
                              cx={index * 100}
                              cy={200 - (value / maxValue) * 200}
                              r="4"
                              fill="rgba(43, 118, 79, 0.95)"
                              stroke="rgba(255, 255, 255, 0.9)"
                              strokeWidth="2"
                            />
                          ))}
                          {chartData.orders.map((value, index) => (
                            <circle
                              key={`orders-${index}`}
                              cx={index * 100}
                              cy={200 - (value / maxValue) * 200}
                              r="4"
                              fill="rgba(33, 150, 173, 0.95)"
                              stroke="rgba(255, 255, 255, 0.9)"
                              strokeWidth="2"
                            />
                          ))}
                        </svg>
                        <div className="reports-line-chart__x-axis">
                          {chartData.labels.map((label, index) => (
                            <span key={index} className="reports-line-chart__x-label">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="reports-line-chart__stats">
                      <div className="reports-line-chart__stat">
                        <span className="reports-line-chart__stat-label">Earnings</span>
                        <span className="reports-line-chart__stat-value">
                          {(
                            chartData.revenue.reduce((a, b) => a + b, 0) /
                            chartData.revenue.length
                          ).toFixed(1)}
                          {timePeriod === 'year' || timePeriod === 'all' ? 'k' : ''} ₹L
                        </span>
                        <span className="reports-line-chart__stat-change is-positive">+12.5%</span>
                      </div>
                      <div className="reports-line-chart__stat">
                        <span className="reports-line-chart__stat-label">Orders</span>
                        <span className="reports-line-chart__stat-value">
                          {Math.round(
                            chartData.orders.reduce((a, b) => a + b, 0) / chartData.orders.length,
                          )}
                        </span>
                        <span className="reports-line-chart__stat-change is-positive">+8.3%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'performance' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge">Last 30 days</span>
                  <h4 className="reports-analytics-card__title">Order delivery performance</h4>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-chart">
                    <div className="reports-chart__legend">
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-revenue" />
                        <span className="reports-chart__legend-label">On-time delivery</span>
                      </div>
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-fulfilment" />
                        <span className="reports-chart__legend-label">Average delay</span>
                      </div>
                    </div>
                    <div className="reports-chart__bars">
                      {[
                        { label: 'Week 1', revenue: 92, fulfilment: 8 },
                        { label: 'Week 2', revenue: 88, fulfilment: 12 },
                        { label: 'Week 3', revenue: 95, fulfilment: 5 },
                        { label: 'Week 4', revenue: 90, fulfilment: 10 },
                      ].map((week, index) => (
                        <div key={index} className="reports-chart__bar-group">
                          <div className="reports-chart__bar-container">
                            <div className="reports-chart__bar is-revenue" style={{ height: `${week.revenue}%` }}>
                              <span className="reports-chart__bar-value">{week.revenue}%</span>
                            </div>
                            <div className="reports-chart__bar is-fulfilment" style={{ height: `${week.fulfilment}%` }}>
                              <span className="reports-chart__bar-value">{week.fulfilment}%</span>
                            </div>
                          </div>
                          <span className="reports-chart__bar-label">{week.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-performance-metrics">
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label">Average time to deliver</span>
                    <span className="reports-performance-metric__value">18.5h</span>
                  </div>
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label">Order correctness</span>
                    <span className="reports-performance-metric__value">96.2%</span>
                  </div>
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label">Customer rating</span>
                    <span className="reports-performance-metric__value">4.7/5</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'trends' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge">Last 3 months</span>
                  <h4 className="reports-analytics-card__title">Growth summary</h4>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-chart">
                    <div className="reports-chart__legend">
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-revenue" />
                        <span className="reports-chart__legend-label">Number of orders</span>
                      </div>
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-fulfilment" />
                        <span className="reports-chart__legend-label">Earnings growth</span>
                      </div>
                    </div>
                    <div className="reports-chart__bars">
                      {[
                        { label: 'Month 1', revenue: 68, fulfilment: 72 },
                        { label: 'Month 2', revenue: 75, fulfilment: 78 },
                        { label: 'Month 3', revenue: 82, fulfilment: 85 },
                      ].map((month, index) => (
                        <div key={index} className="reports-chart__bar-group">
                          <div className="reports-chart__bar-container">
                            <div className="reports-chart__bar is-revenue" style={{ height: `${month.revenue}%` }}>
                              <span className="reports-chart__bar-value">{month.revenue}%</span>
                            </div>
                            <div className="reports-chart__bar is-fulfilment" style={{ height: `${month.fulfilment}%` }}>
                              <span className="reports-chart__bar-value">{month.fulfilment}%</span>
                            </div>
                          </div>
                          <span className="reports-chart__bar-label">{month.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-trends-insights">
                  <div className="reports-trend-item">
                    <span className="reports-trend-item__icon">📈</span>
                    <div className="reports-trend-item__content">
                      <span className="reports-trend-item__label">Busy season coming</span>
                      <span className="reports-trend-item__value">+24% expected growth</span>
                    </div>
                  </div>
                  <div className="reports-trend-item">
                    <span className="reports-trend-item__icon">🌾</span>
                    <div className="reports-trend-item__content">
                      <span className="reports-trend-item__label">Top product category</span>
                      <span className="reports-trend-item__value">Organic fertilizers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'insights' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge">Smart suggestions</span>
                  <h4 className="reports-analytics-card__title">Important tips</h4>
                </div>
                <div className="reports-insights-list">
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-success">✓</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title">Manage stock better</h5>
                      <p className="reports-insight-card__description">
                        Your top 3 products show 15% higher demand. Consider increasing stock by 20% to meet busy season.
                      </p>
                    </div>
                  </div>
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-warn">⚠</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title">Faster delivery</h5>
                      <p className="reports-insight-card__description">
                        Western hub routes show 8% delay. Consider other delivery partners for faster delivery.
                      </p>
                    </div>
                  </div>
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-info">💡</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title">Loan usage</h5>
                      <p className="reports-insight-card__description">
                        Your loan usage is good at 68%. You can safely increase number of orders by 25% without risk.
                      </p>
                    </div>
                  </div>
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-success">📊</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title">Repeat customers</h5>
                      <p className="reports-insight-card__description">
                        Repeat orders increased by 12% this month. Focus on maintaining quality standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="reports-top-vendors" className="reports-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Top sellers</h3>
          </div>
        </div>
        <div className="reports-vendors-list">
            {topVendors.map((vendor) => (
              <div
                key={vendor.name}
              className={cn(
                'reports-vendor-card',
                vendor.tone === 'teal' ? 'is-teal' : 'is-success',
              )}
            >
              <div className="reports-vendor-card__info">
                <h4 className="reports-vendor-card__name">{vendor.name}</h4>
                <div className="reports-vendor-card__metrics">
                  <span className="reports-vendor-card__revenue">{vendor.revenue}</span>
                  <span className="reports-vendor-card__change">{vendor.change}</span>
                </div>
              </div>
              <div className="reports-vendor-card__indicator" />
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}


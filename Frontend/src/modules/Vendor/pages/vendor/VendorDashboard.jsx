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
import { vendorSnapshot } from '../../services/vendorDashboard'
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
  const { profile } = useVendorState()
  const dispatch = useVendorDispatch()
  const { acceptOrder, acceptOrderPartially, rejectOrder, updateInventoryStock, requestCreditPurchase, updateOrderStatus } = useVendorApi()
  const [activeTab, setActiveTab] = useState('overview')
  const welcomeName = (profile?.name || vendorSnapshot.welcome.name || 'Partner').split(' ')[0]
  const { isOpen, isMounted, currentAction, openPanel, closePanel } = useButtonAction()
  const { toasts, dismissToast, success, error, info, warning } = useToast()
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
        subtitle="Kolhapur, Maharashtra"
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
  const { dashboard } = useVendorState()
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
  const overviewData = dashboard.overview || vendorSnapshot
  const transactions = overviewData.recentActivity || [
    { name: 'Farm Fresh Traders', action: 'Order accepted', amount: '+₹86,200', status: 'Completed', avatar: 'FF' },
    { name: 'Green Valley Hub', action: 'Loan repayment', amount: '-₹40,000', status: 'Pending', avatar: 'GV' },
    { name: 'HarvestLink Pvt Ltd', action: 'Delivery scheduled', amount: '+₹21,500', status: 'Scheduled', avatar: 'HL' },
  ]

  const walletBalance = dashboard.credit?.remaining
    ? `₹${(dashboard.credit.remaining / 100000).toFixed(1)}L`
    : vendorSnapshot.credit.remaining || '₹0'

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
              Active Zone • {dashboard.profile?.coverageRadius || vendorSnapshot.welcome.coverageKm} km
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
              { label: 'Orders waiting for your reply', value: '02' },
              { label: 'Loan reminder today', value: '₹1.2L' },
              { label: 'Average delivery time', value: '21h' },
              { label: 'Reviews waiting', value: '05' },
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
          {transactions.map((item) => (
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
          ))}
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
              {[...transactions, ...transactions].map((item, index) => (
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
              ))}
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
          {(overviewData.highlights || vendorSnapshot.highlights).map((item) => (
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

function InventoryView({ openPanel }) {
  const { dashboard } = useVendorState()
  const dispatch = useVendorDispatch()
  const { getInventory } = useVendorApi()
  const [inventoryData, setInventoryData] = useState(null)

  useEffect(() => {
    getInventory().then((result) => {
      if (result.data) {
        setInventoryData(result.data)
        dispatch({ type: 'SET_INVENTORY_DATA', payload: result.data })
      }
    })
  }, [getInventory, dispatch])

  const inventory = inventoryData?.items || dashboard.inventory?.items || vendorSnapshot.inventory
  const totalSkus = inventory.length
  const criticalCount = inventory.filter((item) => item.status === 'Critical').length
  const lowCount = inventory.filter((item) => item.status === 'Low').length
  const healthyCount = totalSkus - criticalCount - lowCount

  const topStats = [
    { label: 'Urgent alerts', value: criticalCount, note: 'Need to buy more', tone: 'warn' },
    { label: 'Low stock items', value: lowCount, note: 'Keep an eye on', tone: 'teal' },
  ]

  const inventoryStats = [
    { label: 'Total products', value: `${totalSkus}`, meta: `${healthyCount} healthy`, tone: 'success' },
    { label: 'Urgent products', value: `${criticalCount}`, meta: 'Take action in 24 hours', tone: 'warn' },
    { label: 'Overall stock level', value: '74%', meta: 'Compared to safe levels', tone: 'success' },
    { label: 'Need to order more', value: `${lowCount}`, meta: 'Keep an eye on', tone: 'teal' },
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

  return (
    <div className="space-y-6">
      <section id="inventory-hero" className="inventory-hero">
        <div className="inventory-hero__shell">
          <div className="inventory-hero__headline">
            <span className="inventory-hero__chip">Stock hub</span>
            <h3 className="inventory-hero__title">{totalSkus} active products</h3>
            <p className="inventory-hero__meta">
              {criticalCount} urgent • {lowCount} low stock • {healthyCount} healthy
            </p>
            <div className="inventory-hero__actions">
              {[
                { label: 'Add product', icon: SparkIcon, action: 'add-sku' },
                { label: 'Reorder', icon: TruckIcon, action: 'reorder' },
                { label: 'Supplier list', icon: HomeIcon, action: 'supplier-list' },
                { label: 'Stock summary', icon: ChartIcon, action: 'stock-report' },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="inventory-hero__action"
                  onClick={() => action.action && openPanel(action.action)}
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

      <div className="space-y-4">
        {vendorSnapshot.inventory.map((item) => (
          <article key={item.id} className="inventory-sku-card">
            <header className="inventory-sku-card__header">
              <div className="inventory-sku-card__icon">
                <BoxIcon className="h-4 w-4" />
              </div>
                <div className="inventory-sku-card__title">
                <h4>{item.name}</h4>
                <p>Available • {item.stock}</p>
              </div>
              <span
                className={cn(
                  'inventory-sku-card__status',
                  item.status === 'Healthy'
                    ? 'is-healthy'
                    : item.status === 'Low'
                    ? 'is-low'
                    : 'is-critical',
                )}
              >
                {item.status === 'Critical' ? 'Urgent' : item.status}
              </span>
            </header>
            <div className="inventory-sku-card__metrics">
              <div>
                <span>Cost price</span>
                <strong>{item.purchase}</strong>
              </div>
              <div>
                <span>Sale price</span>
                <strong>{item.selling}</strong>
              </div>
            </div>
            <footer className="inventory-sku-card__footer">
              <div className="vendor-progress inventory-sku-card__progress">
                <span style={{ width: `${stockProgress[item.status] ?? 40}%` }} />
              </div>
              <button type="button" className="inventory-sku-card__cta" onClick={() => openPanel('update-stock', { itemId: item.id, currentStock: item.stock })}>
                Update stock
              </button>
            </footer>
          </article>
        ))}
      </div>

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
    if (!status) return 'awaiting'
    const normalized = status.toLowerCase()
    if (normalized.includes('deliver')) return 'delivered'
    if (normalized.includes('dispatch')) return 'dispatched'
    return 'awaiting'
  }

  const stageIndex = (status) => {
    const key = normalizeStatus(status)
    if (key === 'delivered') return 2
    if (key === 'dispatched') return 1
    return 0
  }

  const orders = dashboard.orders?.orders || ordersData?.orders || vendorSnapshot.orders
  const totals = orders.reduce(
    (acc, order) => {
      const index = stageIndex(order.status)
      if (index === 2) acc.delivered += 1
      else if (index === 1) acc.dispatched += 1
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
          {orders.map((order) => {
            const normalizedStatus = normalizeStatus(order.status)
            const showAvailabilityActions = normalizedStatus === 'awaiting'
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
          )})}
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

  const creditData = dashboard.credit || {}
  const credit = {
    limit: creditData.limit ? `₹${(creditData.limit / 100000).toFixed(1)}L` : vendorSnapshot.credit.limit || '₹35L',
    used: creditData.used ? `₹${(creditData.used / 100000).toFixed(1)}L` : vendorSnapshot.credit.used || '₹22.6L',
    remaining: creditData.remaining ? `₹${(creditData.remaining / 100000).toFixed(1)}L` : vendorSnapshot.credit.remaining || '₹12.4L',
    penalty: creditData.penalty === 0 ? 'No penalty' : creditData.penalty || vendorSnapshot.credit.penalty || 'No penalty',
    due: creditData.dueDate || vendorSnapshot.credit.due || '08 Dec 2025',
  }

  const usedPercent = creditData.limit && creditData.used
    ? Math.min(Math.round((creditData.used / creditData.limit) * 100), 100)
    : Math.min(
        Math.round(
          (parseInt(credit.used.replace(/[^0-9]/g, ''), 10) / parseInt(credit.limit.replace(/[^0-9]/g, ''), 10)) * 100,
        ),
        100,
      )

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

  const getRevenueData = (period) => {
    switch (period) {
      case 'week':
        return {
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          revenue: [28.5, 32.8, 29.2, 35.6, 38.4, 34.1, 31.2],
          orders: [42, 48, 45, 52, 58, 50, 46],
        }
      case 'month':
        return {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          revenue: [125.6, 142.3, 138.9, 156.2],
          orders: [185, 210, 205, 232],
        }
      case 'year':
        return {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          revenue: [485.2, 562.8, 598.4, 642.1],
          orders: [720, 835, 890, 955],
        }
      case 'all':
        return {
          labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
          revenue: [1850.5, 2156.8, 2489.2, 2856.4],
          orders: [2750, 3200, 3690, 4240],
        }
      default:
        return {
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          revenue: [28.5, 32.8, 29.2, 35.6, 38.4, 34.1, 31.2],
          orders: [42, 48, 45, 52, 58, 50, 46],
        }
    }
  }

  const chartData = getRevenueData(timePeriod)
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
                  <span className="reports-summary-card__stat-value">₹28.6L</span>
            </div>
                <div className="reports-summary-card__stat">
                  <span className="reports-summary-card__stat-label">Growth</span>
                  <span className="reports-summary-card__stat-value is-positive">+15.2%</span>
          </div>
              </div>
            </div>
            <div className="reports-summary-card__insights">
              <div className="reports-summary-card__insight">
                <span className="reports-summary-card__insight-icon">📈</span>
                <span className="reports-summary-card__insight-text">Earnings up 15% from last month</span>
              </div>
              <div className="reports-summary-card__insight">
                <span className="reports-summary-card__insight-icon">⚡</span>
                <span className="reports-summary-card__insight-text">84 orders completed this week</span>
              </div>
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
          {vendorSnapshot.reports.map((report, index) => {
            const Icon = reportIcons[index % reportIcons.length]
            return (
              <div key={report.label} className="reports-metric-card">
                <span className="reports-metric-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="reports-metric-body">
                  <p>{report.label}</p>
                  <span>{report.value}</span>
                  <small>{report.meta}</small>
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


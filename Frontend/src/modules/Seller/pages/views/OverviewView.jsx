import { useState, useRef, useEffect } from 'react'
import { useSellerState } from '../../context/SellerContext'
import { useSellerApi } from '../../hooks/useSellerApi'
import { cn } from '../../../../lib/cn'
import { UsersIcon, WalletIcon, ChartIcon, SparkIcon, ShareIcon, TrendingUpIcon } from '../../components/icons'
import * as sellerApi from '../../services/sellerApi'

export function OverviewView({ onNavigate, openPanel }) {
  const { profile, dashboard } = useSellerState()
  const { fetchDashboardOverview, fetchWalletData } = useSellerApi()
  const servicesRef = useRef(null)
  const [servicePage, setServicePage] = useState(0)
  const [recentActivity, setRecentActivity] = useState([])
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch dashboard overview
        const overviewResult = await fetchDashboardOverview()
        if (overviewResult.data) {
          // Overview data is stored in context via dispatch
        }

        // Fetch wallet data
        const walletResult = await fetchWalletData()
        if (walletResult.data) {
          // Wallet data is stored in context via dispatch
        }

        // Fetch recent activity
        const activityResult = await sellerApi.getRecentActivity({ limit: 15 })
        if (activityResult.success && activityResult.data?.activities) {
          // Transform backend activity data to frontend format
          const transformedActivities = activityResult.data.activities.map((activity) => ({
            id: activity.id || activity._id,
            type: activity.type || 'commission',
            action: activity.title || activity.message || 'Activity',
            amount: activity.amount || 0,
            date: activity.timestamp || activity.createdAt,
            createdAt: activity.timestamp || activity.createdAt,
            userName: activity.userName || activity.user?.name || 'User',
            user: activity.userName || activity.user?.name || 'User',
            orderId: activity.orderId,
            orderNumber: activity.orderNumber,
            status: activity.status,
          }))
          setRecentActivity(transformedActivities)
        }

        // Fetch highlights
        const highlightsResult = await sellerApi.getDashboardHighlights()
        if (highlightsResult.success && highlightsResult.data) {
          const highlightsData = highlightsResult.data.highlights || highlightsResult.data || []
          setHighlights(Array.isArray(highlightsData) ? highlightsData : [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [fetchDashboardOverview, fetchWalletData])

  // Get data from context or use defaults
  const overview = dashboard.overview || {}
  const wallet = dashboard.wallet || {}
  
  // Format wallet balance
  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return amount >= 100000 ? `₹${(amount / 100000).toFixed(1)} L` : `₹${amount.toLocaleString('en-IN')}`
    }
    return amount || '₹0'
  }

  // Format overview data - use actual values from backend
  // Calculate total commission from sales (average 2.5% commission rate)
  const totalCommission = overview.totalCommission || (overview.currentMonthSales || 0) * 0.025
  
  const overviewData = {
    walletBalance: formatCurrency(wallet.balance || 0),
    totalReferrals: overview.totalReferrals || 0,
    thisMonthSales: formatCurrency(overview.currentMonthSales || 0),
    activeReferrals: overview.activeReferrals || 0,
    totalCommission: formatCurrency(totalCommission),
  }

  const services = [
    { label: 'Share ID', note: 'Share your Seller ID', tone: 'success', icon: ShareIcon, action: 'share-seller-id' },
    { label: 'Referrals', note: 'View all referrals', tone: 'success', target: 'referrals', icon: UsersIcon, action: null },
    { label: 'Wallet', note: 'View balance', tone: 'success', target: 'wallet', icon: WalletIcon, action: null },
    { label: 'Performance', note: 'View analytics', tone: 'success', icon: ChartIcon, action: 'view-performance' },
  ]

  const quickActions = [
    {
      label: 'Share Seller ID',
      description: 'Copy your unique Seller ID',
      icon: ShareIcon,
      tone: 'green',
      action: 'share-seller-id',
    },
    {
      label: 'View Referrals',
      description: 'See all your referrals',
      target: 'referrals',
      icon: UsersIcon,
      tone: 'green',
      action: null,
    },
    {
      label: 'Request Withdrawal',
      description: 'Withdraw from wallet',
      target: 'wallet',
      icon: WalletIcon,
      tone: 'teal',
      action: 'request-withdrawal',
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
    <div className="seller-overview space-y-6">
      {/* Hero Card Section */}
      <section id="seller-overview-hero" className="seller-hero">
        <div className="seller-hero__card">
          <div className="seller-hero__meta">
            <span className="seller-chip seller-chip--success">
              Seller ID • {profile.sellerId || 'N/A'}
            </span>
            <span className="seller-chip seller-chip--warn">Today {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div className="seller-hero__core">
            <div className="seller-hero__identity">
              <span className="seller-hero__greeting">Your performance</span>
              <h2 className="seller-hero__welcome">{(profile.name || 'Seller').split(' ')[0]}</h2>
            </div>
            <div className="seller-hero__badge">
              <SparkIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="seller-hero__balance">
            <div>
              <p className="seller-hero__label">Wallet Balance</p>
              <p className="seller-hero__value">{overviewData.walletBalance}</p>
            </div>
            <button type="button" onClick={() => onNavigate('wallet')} className="seller-hero__cta">
              View wallet
            </button>
          </div>
          <div className="seller-hero__stats">
            {[
              { label: 'Total Referrals', value: overviewData.totalReferrals.toString() },
              { label: 'Active Users', value: overviewData.activeReferrals.toString() },
              { label: 'This Month Sales', value: overviewData.thisMonthSales },
              { label: 'Total Commission', value: overviewData.totalCommission },
            ].map((item) => (
              <div key={item.label} className="seller-stat-card">
                <p>{item.label}</p>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shortcuts Section */}
      <section id="seller-overview-services" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Shortcuts</h3>
          </div>
        </div>
        <div ref={servicesRef} className="seller-services__rail">
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
              className="seller-service-card"
            >
              <span className={cn('seller-service-card__icon', service.tone === 'warn' ? 'is-warn' : 'is-success')}>
                <service.icon className="h-5 w-5" />
              </span>
              <span className="seller-service-card__label">{service.label}</span>
              <span className="seller-service-card__note">{service.note}</span>
            </button>
          ))}
        </div>
        <div className="seller-services__dots" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={cn('seller-services__dot', servicePage === dot && 'is-active')}
            />
          ))}
        </div>
      </section>

      {/* Recent Activity Section */}
      <section id="seller-overview-activity" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Recent activity</h3>
          </div>
        </div>
        <div className="seller-activity__list">
          {loading ? (
            <div className="seller-activity__item">
              <p className="text-sm text-gray-500">Loading activity...</p>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="seller-activity__item">
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentActivity.slice(0, 3).map((item) => {
              const avatar = item.userName ? item.userName.substring(0, 2).toUpperCase() : 'U'
              const amount = item.amount ? (item.amount > 0 ? `+₹${item.amount.toLocaleString('en-IN')}` : `₹${Math.abs(item.amount).toLocaleString('en-IN')}`) : '₹0'
              const date = item.date || item.createdAt ? new Date(item.date || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently'
              
              return (
                <div key={item.id || item._id} className="seller-activity__item">
                  <div className="seller-activity__avatar">{avatar}</div>
                  <div className="seller-activity__details">
                    <div className="seller-activity__row">
                      <span className="seller-activity__name">{item.userName || item.user || 'User'}</span>
                      <span
                        className={cn(
                          'seller-activity__amount',
                          amount.startsWith('-') ? 'is-negative' : 'is-positive',
                        )}
                      >
                        {amount}
                      </span>
                    </div>
                    <div className="seller-activity__meta">
                      <span>{item.action || item.type || 'Activity'}</span>
                      <span>{date}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Quick Summary Section */}
      <section id="seller-overview-snapshot" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Quick summary</h3>
          </div>
        </div>
        <div className="seller-metric-grid">
          {highlights.length === 0 ? (
            <div className="seller-metric-card">
              <p className="text-sm text-gray-500">No highlights available</p>
            </div>
          ) : (
            highlights.map((item) => {
              const progress = item.id === 'referrals' 
                ? Math.min((overviewData.totalReferrals / 100) * 100, 100)
                : item.id === 'sales'
                ? Math.min((overviewData.totalReferrals * 0.7), 100)
                : item.progress || 0
              
              return (
                <div key={item.id || item.label} className="seller-metric-card">
                  <div className="seller-metric-card__head">
                    <p>{item.label}</p>
                    <span>{item.trend || item.meta || ''}</span>
                  </div>
                  <h4>{item.value || formatCurrency(item.amount || 0)}</h4>
                  <div className="seller-metric-card__bar">
                    <span style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>


      {/* Commission Policy Section */}
      <section id="seller-overview-commission" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Commission Structure</h3>
            <p className="seller-section__subtitle">Understand how you earn commissions</p>
          </div>
        </div>
        <div className="seller-commission-policy">
          <div className="seller-commission-policy__card">
            <div className="seller-commission-policy__header">
              <WalletIcon className="h-5 w-5 text-[#1b8f5b]" />
              <h4 className="seller-commission-policy__title">Your Commission Rates</h4>
            </div>
            <div className="seller-commission-policy__content">
              <div className="seller-commission-policy__slab">
                <div className="seller-commission-policy__slab-header">
                  <span className="seller-commission-policy__slab-rate">2%</span>
                  <span className="seller-commission-policy__slab-label">Standard Rate</span>
                </div>
                <p className="seller-commission-policy__slab-desc">
                  Applied when a user's monthly purchases are up to ₹50,000
                </p>
                <div className="seller-commission-policy__slab-example">
                  <span className="text-xs text-[rgba(26,42,34,0.6)]">Example: ₹30,000 purchase = ₹600 commission</span>
                </div>
              </div>
              <div className="seller-commission-policy__divider" />
              <div className="seller-commission-policy__slab seller-commission-policy__slab--premium">
                <div className="seller-commission-policy__slab-header">
                  <span className="seller-commission-policy__slab-rate seller-commission-policy__slab-rate--premium">3%</span>
                  <span className="seller-commission-policy__slab-label">Premium Rate</span>
                </div>
                <p className="seller-commission-policy__slab-desc">
                  Applied when a user's monthly purchases exceed ₹50,000
                </p>
                <div className="seller-commission-policy__slab-example">
                  <span className="text-xs text-[rgba(26,42,34,0.6)]">Example: ₹75,000 purchase = ₹2,250 commission</span>
                </div>
              </div>
            </div>
            <div className="seller-commission-policy__footer">
              <p className="seller-commission-policy__note">
                <span className="font-semibold">Note:</span> Commission rates are calculated per user, per month. 
                The rate resets on the 1st of each month based on that user's purchase amount.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section id="seller-overview-quick-actions" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Quick actions</h3>
          </div>
        </div>
        <div className="seller-callout-grid">
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
                'seller-callout',
                action.tone === 'orange'
                  ? 'is-warn'
                  : action.tone === 'teal'
                  ? 'is-teal'
                  : 'is-success',
              )}
            >
              <span className="seller-callout__icon">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="seller-callout__label">{action.label}</span>
              <span className="seller-callout__note">{action.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}


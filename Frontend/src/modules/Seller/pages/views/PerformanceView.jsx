import { useMemo, useEffect, useState } from 'react'
import { useSellerState } from '../../context/SellerContext'
import { useSellerApi } from '../../hooks/useSellerApi'
import { cn } from '../../../../lib/cn'
import { TrendingUpIcon, UsersIcon, WalletIcon, CloseIcon } from '../../components/icons'
import * as sellerApi from '../../services/sellerApi'

export function PerformanceView({ onBack }) {
  const { dashboard, profile } = useSellerState()
  const { fetchPerformance } = useSellerApi()
  const [performanceAnalytics, setPerformanceAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const overview = dashboard.overview || {}

  // Fetch performance analytics on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await sellerApi.getPerformanceAnalytics({ period: '30' })
        if (result.success && result.data?.analytics) {
          setPerformanceAnalytics(result.data.analytics)
        }
      } catch (error) {
        console.error('Failed to fetch performance analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate performance metrics from real data
  // Priority: Use backend analytics if available, otherwise calculate from overview
  const performanceData = useMemo(() => {
    // If backend analytics are available, use them
    if (performanceAnalytics) {
      return {
        totalSales: performanceAnalytics.totalSales || overview.currentMonthSales || 0,
        thisMonthSales: performanceAnalytics.currentMonthSales || overview.currentMonthSales || 0,
        totalReferrals: performanceAnalytics.totalReferrals || overview.totalReferrals || 0,
        activeReferrals: performanceAnalytics.activeReferrals || overview.activeReferrals || 0,
        avgCommissionPerSale: performanceAnalytics.avgCommissionPerSale || 0,
        conversionRate: performanceAnalytics.conversionRate || 0,
        orderCount: performanceAnalytics.orderCount || overview.currentMonthOrders || 0,
        averageOrderValue: performanceAnalytics.averageOrderValue || overview.averageOrderValue || 0,
        totalCommission: performanceAnalytics.totalCommission || 0,
        commissionRate2Percent: performanceAnalytics.commissionRate2Percent || 0,
        commissionRate3Percent: performanceAnalytics.commissionRate3Percent || 0,
        topUsers: performanceAnalytics.topUsers || [],
        weeklyTrend: performanceAnalytics.weeklyTrend || [],
      }
    }

    // Fallback: Calculate from overview data
    const totalSales = overview.currentMonthSales || 0
    const thisMonthSales = overview.currentMonthSales || 0
    const totalReferrals = overview.totalReferrals || 0
    const activeReferrals = overview.activeReferrals || 0

    // Calculate average commission per sale (assuming 2-3% commission)
    const avgCommissionRate = 0.025 // Average of 2% and 3%
    const avgCommissionPerSale = totalSales > 0 && overview.currentMonthOrders > 0
      ? (totalSales * avgCommissionRate) / overview.currentMonthOrders
      : 0

    // Calculate conversion rate (active referrals / total referrals)
    const conversionRate = totalReferrals > 0
      ? (activeReferrals / totalReferrals) * 100
      : 0

    return {
      totalSales,
      thisMonthSales,
      totalReferrals,
      activeReferrals,
      avgCommissionPerSale: Math.round(avgCommissionPerSale * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      orderCount: overview.currentMonthOrders || 0,
      averageOrderValue: overview.averageOrderValue || 0,
      totalCommission: totalSales * avgCommissionRate,
      commissionRate2Percent: 0,
      commissionRate3Percent: 0,
      topUsers: [],
      weeklyTrend: [],
    }
  }, [overview, performanceAnalytics])

  const formatCurrency = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  return (
    <div className="seller-performance space-y-6">
      {/* Hero Section */}
      <section id="seller-performance-hero" className="seller-performance-hero">
        <div className="seller-performance-hero__card">
          <div className="seller-performance-hero__header">
            <div>
              <h2 className="seller-performance-hero__title">Performance Analytics</h2>
              <p className="seller-performance-hero__subtitle">Detailed insights into your sales performance</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="seller-performance-hero__back"
                  aria-label="Back to overview"
                >
                  <CloseIcon className="h-5 w-5 text-white rotate-45" />
                </button>
              )}
              <div className="seller-performance-hero__badge">
                <TrendingUpIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics - Enhanced with better visuals */}
      <section id="seller-performance-metrics" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Key Metrics</h3>
            <p className="seller-section__subtitle">Your performance at a glance</p>
          </div>
        </div>
        <div className="seller-performance-grid">
          <div className="seller-performance-card seller-performance-card--highlight">
            <div className="seller-performance-card__icon seller-performance-card__icon--sales">
              <TrendingUpIcon className="h-5 w-5" />
            </div>
            <div className="seller-performance-card__content">
              <p className="seller-performance-card__label">Total Sales</p>
              <h4 className="seller-performance-card__value">{formatCurrency(performanceData.totalSales)}</h4>
              <div className="seller-performance-card__trend-group">
                <span className="seller-performance-card__trend">{performanceData.orderCount} orders this month</span>
                {performanceData.averageOrderValue > 0 && (
                  <span className="seller-performance-card__trend-secondary">
                    Avg: {formatCurrency(performanceData.averageOrderValue)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="seller-performance-card seller-performance-card--referrals">
            <div className="seller-performance-card__icon seller-performance-card__icon--referrals">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div className="seller-performance-card__content">
              <p className="seller-performance-card__label">Total Referrals</p>
              <h4 className="seller-performance-card__value">{performanceData.totalReferrals}</h4>
              <div className="seller-performance-card__trend-group">
                <span className="seller-performance-card__trend seller-performance-card__trend--active">
                  {performanceData.activeReferrals} active
                </span>
                {performanceData.conversionRate > 0 && (
                  <span className="seller-performance-card__trend-secondary">
                    {performanceData.conversionRate.toFixed(1)}% conversion
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="seller-performance-card seller-performance-card--commission">
            <div className="seller-performance-card__icon seller-performance-card__icon--commission">
              <WalletIcon className="h-5 w-5" />
            </div>
            <div className="seller-performance-card__content">
              <p className="seller-performance-card__label">Total Commission</p>
              <h4 className="seller-performance-card__value">
                {formatCurrency(performanceData.totalCommission || (performanceData.totalSales * 0.025))}
              </h4>
              <div className="seller-performance-card__trend-group">
                <span className="seller-performance-card__trend">
                  Avg: ₹{performanceData.avgCommissionPerSale.toLocaleString('en-IN')}/order
                </span>
                {(performanceData.commissionRate2Percent > 0 || performanceData.commissionRate3Percent > 0) && (
                  <span className="seller-performance-card__trend-secondary">
                    {performanceData.commissionRate2Percent > 0 && `${performanceData.commissionRate2Percent} @ 2%`}
                    {performanceData.commissionRate2Percent > 0 && performanceData.commissionRate3Percent > 0 && ' • '}
                    {performanceData.commissionRate3Percent > 0 && `${performanceData.commissionRate3Percent} @ 3%`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sales Summary - Enhanced Visual */}
      <section id="seller-performance-breakdown" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Sales Summary</h3>
            <p className="seller-section__subtitle">This month's sales overview</p>
          </div>
        </div>
        <div className="seller-performance-breakdown-card">
          <div className="seller-performance-breakdown-card__header">
            <div className="seller-performance-breakdown-card__target">
              <TrendingUpIcon className="h-5 w-5 text-[#1b8f5b]" />
              <div>
                <p className="seller-performance-breakdown-card__target-label">Total Sales</p>
                <p className="seller-performance-breakdown-card__target-value">{formatCurrency(performanceData.thisMonthSales)}</p>
              </div>
            </div>
            <div className="seller-performance-breakdown-card__progress-badge">
              <span className="seller-performance-breakdown-card__progress-percent">{performanceData.orderCount}</span>
              <span className="seller-performance-breakdown-card__progress-label">Orders</span>
            </div>
          </div>
          <div className="seller-performance-breakdown-card__details">
            <div className="seller-performance-breakdown-card__detail-item seller-performance-breakdown-card__detail-item--achieved">
              <div className="seller-performance-breakdown-card__detail-icon" style={{ background: 'rgba(27,143,91,0.1)' }}>
                <WalletIcon className="h-4 w-4 text-[#1b8f5b]" />
              </div>
              <div className="seller-performance-breakdown-card__detail-content">
                <p className="seller-performance-breakdown-card__detail-label">Total Commission</p>
                <p className="seller-performance-breakdown-card__detail-value">
                  {formatCurrency(performanceData.totalCommission || (performanceData.totalSales * 0.025))}
                </p>
              </div>
            </div>
            <div className="seller-performance-breakdown-card__detail-item seller-performance-breakdown-card__detail-item--remaining">
              <div className="seller-performance-breakdown-card__detail-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <TrendingUpIcon className="h-4 w-4 text-[#3b82f6]" />
              </div>
              <div className="seller-performance-breakdown-card__detail-content">
                <p className="seller-performance-breakdown-card__detail-label">Avg Order Value</p>
                <p className="seller-performance-breakdown-card__detail-value">
                  {formatCurrency(performanceData.averageOrderValue || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Breakdown */}
      {(performanceData.commissionRate2Percent > 0 || performanceData.commissionRate3Percent > 0 || performanceData.totalCommission > 0) && (
        <section id="seller-performance-commission" className="seller-section">
          <div className="seller-section__header">
            <div>
              <h3 className="seller-section__title">Commission Breakdown</h3>
              <p className="seller-section__subtitle">Earnings by commission rate</p>
            </div>
          </div>
          <div className="seller-performance-commission-grid">
            <div className="seller-performance-commission-card seller-performance-commission-card--standard">
              <div className="seller-performance-commission-card__header">
                <WalletIcon className="h-5 w-5 text-[#1b8f5b]" />
                <span className="seller-performance-commission-card__rate">2% Rate</span>
              </div>
              <div className="seller-performance-commission-card__content">
                <p className="seller-performance-commission-card__label">Users at 2%</p>
                <p className="seller-performance-commission-card__value">{performanceData.commissionRate2Percent || 0}</p>
                <p className="seller-performance-commission-card__note">Up to ₹50,000/month</p>
              </div>
            </div>
            <div className="seller-performance-commission-card seller-performance-commission-card--premium">
              <div className="seller-performance-commission-card__header">
                <WalletIcon className="h-5 w-5 text-[#f97316]" />
                <span className="seller-performance-commission-card__rate">3% Rate</span>
              </div>
              <div className="seller-performance-commission-card__content">
                <p className="seller-performance-commission-card__label">Users at 3%</p>
                <p className="seller-performance-commission-card__value">{performanceData.commissionRate3Percent || 0}</p>
                <p className="seller-performance-commission-card__note">Above ₹50,000/month</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Statistics - Enhanced Grid */}
      <section id="seller-performance-stats" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Performance Statistics</h3>
            <p className="seller-section__subtitle">Key performance indicators</p>
          </div>
        </div>
        <div className="seller-performance-stats-grid">
          <div className="seller-stat-card-enhanced">
            <div className="seller-stat-card-enhanced__icon" style={{ background: 'rgba(27,143,91,0.1)' }}>
              <UsersIcon className="h-5 w-5 text-[#1b8f5b]" />
            </div>
            <div className="seller-stat-card-enhanced__content">
              <p className="seller-stat-card-enhanced__label">Conversion Rate</p>
              <p className="seller-stat-card-enhanced__value">{performanceData.conversionRate.toFixed(1)}%</p>
              <p className="seller-stat-card-enhanced__note">Active vs Total Referrals</p>
            </div>
          </div>
          <div className="seller-stat-card-enhanced">
            <div className="seller-stat-card-enhanced__icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <UsersIcon className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div className="seller-stat-card-enhanced__content">
              <p className="seller-stat-card-enhanced__label">Active Users</p>
              <p className="seller-stat-card-enhanced__value">{performanceData.activeReferrals}</p>
              <p className="seller-stat-card-enhanced__note">Made purchases this month</p>
            </div>
          </div>
          <div className="seller-stat-card-enhanced">
            <div className="seller-stat-card-enhanced__icon" style={{ background: 'rgba(234,179,8,0.1)' }}>
              <TrendingUpIcon className="h-5 w-5 text-[#eab308]" />
            </div>
            <div className="seller-stat-card-enhanced__content">
              <p className="seller-stat-card-enhanced__label">Avg Purchase Value</p>
              <p className="seller-stat-card-enhanced__value">₹{Math.round(performanceData.averageOrderValue).toLocaleString('en-IN')}</p>
              <p className="seller-stat-card-enhanced__note">Per order average</p>
            </div>
          </div>
          <div className="seller-stat-card-enhanced">
            <div className="seller-stat-card-enhanced__icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <TrendingUpIcon className="h-5 w-5 text-[#8b5cf6]" />
            </div>
            <div className="seller-stat-card-enhanced__content">
              <p className="seller-stat-card-enhanced__label">Orders This Month</p>
              <p className="seller-stat-card-enhanced__value">{performanceData.orderCount}</p>
              <p className="seller-stat-card-enhanced__note">Total orders processed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Performers (if available from backend) */}
      {performanceData.topUsers && performanceData.topUsers.length > 0 && (
        <section id="seller-performance-top-users" className="seller-section">
          <div className="seller-section__header">
            <div>
              <h3 className="seller-section__title">Top Performing Users</h3>
              <p className="seller-section__subtitle">Your highest value referrals this month</p>
            </div>
          </div>
          <div className="seller-performance-top-users">
            {performanceData.topUsers.slice(0, 5).map((user, index) => (
              <div key={user.id || index} className="seller-performance-top-user-card">
                <div className="seller-performance-top-user-card__rank">
                  <span>#{index + 1}</span>
                </div>
                <div className="seller-performance-top-user-card__avatar">
                  {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="seller-performance-top-user-card__content">
                  <p className="seller-performance-top-user-card__name">{user.name || 'User'}</p>
                  <p className="seller-performance-top-user-card__purchase">{formatCurrency(user.monthlyPurchases || 0)}</p>
                  <p className="seller-performance-top-user-card__commission">
                    Commission: {formatCurrency(user.commission || 0)} @ {user.commissionRate ? `${user.commissionRate * 100}%` : '2-3%'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}


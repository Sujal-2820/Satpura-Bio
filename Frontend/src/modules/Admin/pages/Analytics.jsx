import { ArrowUpRight, BarChart3, Download, PieChart, ArrowLeft, TrendingUp, Users, Building2, Package } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Timeline } from '../components/Timeline'
import { analyticsSummary } from '../services/adminData'

export function AnalyticsPage({ subRoute = null, navigate }) {
  // Show Overview (default when subRoute is null or 'overview')
  if (!subRoute || subRoute === 'overview') {
    return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
          <h2 className="text-2xl font-bold text-gray-900">Insights & Export Hub</h2>
          <p className="text-sm text-gray-600">
            Slice daily, weekly, and monthly performance metrics with export-ready reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <PieChart className="h-4 w-4" />
            Custom Cohort
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
            <Download className="h-4 w-4" />
            Export Excel / PDF
          </button>
        </div>
      </header>

      <FilterBar
        filters={[
          { id: 'period', label: analyticsSummary.period, active: true },
          { id: 'region', label: 'All regions' },
          { id: 'vendor', label: 'Top vendors' },
          { id: 'seller', label: 'Top sellers' },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {analyticsSummary.highlights.map((item, index) => {
          const colors = [
            { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', text: 'text-blue-700' },
            { border: 'border-purple-200', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', text: 'text-purple-700' },
            { border: 'border-green-200', bg: 'bg-gradient-to-br from-green-50 to-green-100/50', text: 'text-green-700' },
            { border: 'border-yellow-200', bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', text: 'text-yellow-700' },
          ]
          const color = colors[index % colors.length]
          return (
            <div key={item.label} className={`rounded-3xl border ${color.border} ${color.bg} p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${color.text} font-bold`}>{item.label}</p>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{item.value}</p>
                  <StatusBadge tone="success" className="mt-3">{item.change}</StatusBadge>
                </div>
                <ArrowUpRight className={`h-5 w-5 ${color.text}`} />
              </div>
              <p className="mt-4 text-xs text-gray-600">
                Quick snapshot across the last 30 days with contextual insights layered for the admin.
              </p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Timeline events={analyticsSummary.timeline} />
        <div className="space-y-4 rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-indigo-700">Region-wise Performance</h3>
              <p className="text-sm text-gray-600">Heatmap of growth rates across key regions and channels.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { region: 'Gujarat', revenue: '₹2.1 Cr', change: '+14%', color: 'blue' },
              { region: 'Maharashtra', revenue: '₹1.6 Cr', change: '+9%', color: 'purple' },
              { region: 'Rajasthan', revenue: '₹1.1 Cr', change: '+6%', color: 'green' },
              { region: 'Punjab', revenue: '₹92 L', change: '+4%', color: 'yellow' },
            ].map((item) => {
              const colorMap = {
                blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
                purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50',
                green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50',
                yellow: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50',
              }
              return (
                <div key={item.region} className={`rounded-2xl border ${colorMap[item.color]} p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]`}>
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                    <span>{item.region}</span>
                    <span>{item.change}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Revenue contribution {item.revenue}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
    )
  }

  // Show Sales Analytics
  if (subRoute === 'sales') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics/overview')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics Overview
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Sales Analytics</h2>
            <p className="text-sm text-gray-600">
              Comprehensive sales performance metrics and revenue insights.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-700">Sales Performance</h3>
          </div>
          <p className="text-sm text-gray-600">Sales analytics data will be displayed here.</p>
        </div>
      </div>
    )
  }

  // Show User Analytics
  if (subRoute === 'users') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics/overview')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics Overview
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">User Analytics</h2>
            <p className="text-sm text-gray-600">
              User engagement, growth, and behavior analytics.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-700">User Performance</h3>
          </div>
          <p className="text-sm text-gray-600">User analytics data will be displayed here.</p>
        </div>
      </div>
    )
  }

  // Show Vendor Analytics
  if (subRoute === 'vendors') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics/overview')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics Overview
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Vendor Analytics</h2>
            <p className="text-sm text-gray-600">
              Vendor performance, order fulfillment, and revenue metrics.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-700">Vendor Performance</h3>
          </div>
          <p className="text-sm text-gray-600">Vendor analytics data will be displayed here.</p>
        </div>
      </div>
    )
  }

  // Show Order Analytics
  if (subRoute === 'orders') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics/overview')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics Overview
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Order Analytics</h2>
            <p className="text-sm text-gray-600">
              Order trends, fulfillment rates, and delivery performance.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-700">Order Performance</h3>
          </div>
          <p className="text-sm text-gray-600">Order analytics data will be displayed here.</p>
        </div>
      </div>
    )
  }

  // Default fallback
  return null
}


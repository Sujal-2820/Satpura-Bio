import { AlertTriangle, BarChart3, PieChart, Users } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { ProgressList } from '../components/ProgressList'
import { Timeline } from '../components/Timeline'
import { dashboardSummary, analyticsSummary } from '../services/adminData'
import { cn } from '../../../lib/cn'

export function DashboardPage() {
  const { headline, payables } = dashboardSummary

  return (
    <div className="space-y-8">
      <FilterBar
        filters={[
          { id: 'period', label: 'Last 30 days', active: true },
          { id: 'region', label: 'All regions' },
          { id: 'channel', label: 'All channels' },
        ]}
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {headline.map((metric, index) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            trend={metric.trend}
            icon={metric.id === 'users' ? Users : metric.id === 'revenue' ? BarChart3 : PieChart}
            tone={metric.id === 'orders' ? 'warning' : metric.id === 'revenue' ? 'success' : 'default'}
            colorIndex={index}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] lg:col-span-2">
          <header className="flex items-center justify-between border-b border-blue-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-blue-700">Payment Status</h2>
              <p className="text-sm text-gray-600">See advance and pending payments quickly.</p>
            </div>
            <StatusBadge tone="warning">Review Period Active</StatusBadge>
          </header>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-4 transition-all duration-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-wide text-green-700 font-bold">Advance (30%)</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{payables.advance}</p>
              <p className="text-xs text-green-600">Received this month</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-4 transition-all duration-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-wide text-yellow-700 font-bold">Pending (70%)</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{payables.pending}</p>
              <p className="text-xs text-yellow-600">Follow-up required before 18 Nov</p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 transition-all duration-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-wide text-purple-700 font-bold">Unpaid Amounts</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{payables.outstanding}</p>
              <p className="text-xs text-purple-600">From 14 vendors</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-4 text-sm text-red-700 transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]">
            <AlertTriangle className="h-5 w-5 flex-none" />
            <p className="font-medium">
              6 vendors have crossed payment limits. Payment review scheduled at 5:00 PM with escalation process
              started.
            </p>
          </div>
        </div>
        <ProgressList items={analyticsSummary.highlights.map((item) => ({ label: item.label, progress: 100, meta: `${item.value} (${item.change})`, tone: 'success' }))} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Timeline events={analyticsSummary.timeline} />
        <div className="space-y-4 rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]">
          <header className="border-b border-orange-200 pb-3">
            <h3 className="text-lg font-bold text-orange-700">Important Tasks</h3>
            <p className="text-sm text-gray-600">
              Quick access to important tasks that need your attention.
            </p>
          </header>
          <div className="space-y-3">
            {[
              {
                title: 'Approve new vendors',
                description: '14 vendors waiting for approval. Check documents and set payment terms.',
                color: 'blue',
              },
              {
                title: 'Update product information',
                description: 'Products expiring soon for Micro Nutrient Mix stock. Check and update prices.',
                color: 'yellow',
              },
              {
                title: 'Seller rewards plan',
                description: 'Monthly rewards and earnings need approval before sending.',
                color: 'green',
              },
            ].map((item) => (
              <div
                key={item.title}
                className={cn(
                  'rounded-2xl border p-4 transition-all duration-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
                  item.color === 'blue' && 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50',
                  item.color === 'yellow' && 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 hover:from-yellow-100 hover:to-yellow-200/50',
                  item.color === 'green' && 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-200/50',
                )}
              >
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


import { Award, Gift, Users } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressList } from '../components/ProgressList'
import { sellers } from '../services/adminData'

const columns = [
  { Header: 'Seller', accessor: 'name' },
  { Header: 'Seller ID', accessor: 'id' },
  { Header: 'Cashback %', accessor: 'cashback' },
  { Header: 'Commission %', accessor: 'commission' },
  { Header: 'Monthly Target', accessor: 'target' },
  { Header: 'Progress', accessor: 'achieved' },
  { Header: 'Referred Users', accessor: 'referrals' },
  { Header: 'Total Sales', accessor: 'sales' },
  { Header: 'Status', accessor: 'status' },
]

export function SellersPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 4 • Seller Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Sales Network HQ</h2>
          <p className="text-sm text-gray-600">
            Incentivise performance, track targets, and manage wallet payouts with clarity.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
          <Award className="h-4 w-4" />
          Create Seller Profile
        </button>
      </header>

      <DataTable
        columns={columns.map((column) => ({
          ...column,
          Cell:
            column.accessor === 'achieved'
              ? (row) => (
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{row.achieved}%</span>
                      <span>{row.sales}</span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_2px_8px_rgba(234,179,8,0.3)]" style={{ width: `${row.achieved}%` }} />
                    </div>
                  </div>
                )
              : column.accessor === 'status'
              ? (row) => (
                  <StatusBadge tone={row.status === 'On Track' ? 'success' : 'warning'}>
                    {row.status}
                  </StatusBadge>
                )
              : undefined,
        }))}
        rows={sellers}
        emptyState="No sellers found in the network"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-yellow-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-yellow-700">Incentive Engine</h3>
          <p className="text-sm text-gray-600">
            Configure cashback tiers, commission slabs, and performance accelerators for each cohort.
          </p>
          <div className="space-y-3">
            {[
              {
                title: 'Cashback Tier Review',
                description:
                  'Upcoming payout cycle. Validate cashback % for top performing sellers before transfer.',
                meta: '₹12.6 L to be credited',
                icon: Gift,
              },
              {
                title: 'Commission Accelerator',
                description:
                  'Approve additional 2% commission for sellers achieving 120% of monthly target.',
                meta: 'Applies to 38 sellers',
                icon: Award,
              },
              {
                title: 'Seller Onboarding',
                description:
                  'Standardise KYC, training modules and assign unique seller IDs instantly.',
                meta: '7 applicants pending KYC',
                icon: Users,
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_4px_15px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  <p className="mt-2 text-xs font-bold text-yellow-700">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ProgressList
          items={[
            { label: 'Seller Wallet Requests', progress: 42, tone: 'warning', meta: '₹8.2 L awaiting admin approval' },
            { label: 'Monthly Target Achievement', progress: 68, tone: 'success', meta: 'Average across all sellers' },
            { label: 'Top Performer Retention', progress: 92, tone: 'success', meta: 'Proactive incentives reduce attrition' },
          ]}
        />
      </section>
    </div>
  )
}


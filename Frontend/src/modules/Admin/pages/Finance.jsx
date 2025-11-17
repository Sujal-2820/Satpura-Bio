import { BadgeIndianRupee, Sparkles } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressList } from '../components/ProgressList'
import { Timeline } from '../components/Timeline'
import { finance } from '../services/adminData'

export function FinancePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 7 • Credit & Finance</p>
          <h2 className="text-2xl font-bold text-gray-900">Recoveries & Policy Control</h2>
          <p className="text-sm text-gray-600">
            Track credit utilisation, configure repayment guardrails, and deploy automatic penalty workflows.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(236,72,153,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(236,72,153,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
          <BadgeIndianRupee className="h-4 w-4" />
          Update Credit Settings
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-pink-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-pink-700">Global Parameters</h3>
          <p className="text-sm text-gray-600">
            Set default advances, minimum order values, and vendor purchase thresholds for the platform.
          </p>
          <div className="space-y-3">
            {finance.creditPolicies.map((policy) => (
              <div key={policy.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{policy.label}</p>
                  <StatusBadge tone="success">{policy.value}</StatusBadge>
                </div>
                <p className="mt-2 text-xs text-gray-600">{policy.meta}</p>
              </div>
            ))}
          </div>
        </div>
        <ProgressList items={finance.outstandingCredits} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-indigo-700">Automated Penalties</h3>
              <p className="text-sm text-gray-600">
                Penalties triggered by repayment delays are auto-applied with configurable grace periods.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              {
                title: 'Grace Period',
                detail: '5 day grace period before penalty kicks in. Update for festive cycles if needed.',
              },
              {
                title: 'Penalty Computation',
                detail: 'Daily penalty applied post grace period. Compounded weekly with automated alerts.',
              },
              {
                title: 'Collections Workflow',
                detail: 'Escalate to finance after 14 days overdue. Trigger legal notices automatically.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                <p className="mt-2 text-xs text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <Timeline
          events={[
            {
              id: 'finance-1',
              title: 'Outstanding Credits Review',
              timestamp: 'Today • 08:30',
              description: '₹1.92 Cr flagged for recovery. Weekly sync scheduled with collections team.',
              status: 'completed',
            },
            {
              id: 'finance-2',
              title: 'Penalty Applied',
              timestamp: 'Today • 10:45',
              description: 'Penalty of ₹82,300 applied to 4 vendors exceeding grace period.',
              status: 'completed',
            },
            {
              id: 'finance-3',
              title: 'Recovery Follow-up',
              timestamp: 'Today • 14:00',
              description: 'Auto reminders scheduled. Finance to confirm repayment plans.',
              status: 'pending',
            },
          ]}
        />
      </section>
    </div>
  )
}


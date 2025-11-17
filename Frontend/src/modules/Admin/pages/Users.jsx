import { Ban, Search, UserCheck } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { users } from '../services/adminData'

const columns = [
  { Header: 'User', accessor: 'name' },
  { Header: 'User ID', accessor: 'id' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Linked Seller', accessor: 'sellerId' },
  { Header: 'Orders', accessor: 'orders' },
  { Header: 'Payments', accessor: 'payments' },
  { Header: 'Support Tickets', accessor: 'supportTickets' },
  { Header: 'Status', accessor: 'status' },
]

export function UsersPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 5 • User Management</p>
          <h2 className="text-2xl font-bold text-gray-900">User Trust & Compliance</h2>
          <p className="text-sm text-gray-600">
            Monitor orders, payments, and support escalations. Disable risky accounts with a single action.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Search className="h-4 w-4" />
            Advanced Search
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
            <UserCheck className="h-4 w-4" />
            Verify Account
          </button>
        </div>
      </header>

      <DataTable
        columns={columns.map((column) => ({
          ...column,
          Cell:
            column.accessor === 'payments'
              ? (row) => (
                  <StatusBadge tone={row.payments === 'On Time' ? 'success' : 'warning'}>
                    {row.payments}
                  </StatusBadge>
                )
              : column.accessor === 'status'
              ? (row) => (
                  <StatusBadge tone={row.status === 'Active' ? 'success' : 'warning'}>
                    {row.status}
                  </StatusBadge>
                )
              : undefined,
        }))}
        rows={users}
        emptyState="No user accounts found"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-orange-700">User Verification Workflow</h3>
          <p className="text-sm text-gray-600">
            Ensure every user is mapped to a seller, with payment visibility and support ticket insights.
          </p>
          <div className="space-y-3">
            {[
              {
                title: 'KYC Review',
                description: 'Auto fetch KYC docs and ensure mapping to seller IDs before activation.',
                status: 'Completed',
              },
              {
                title: 'Risk Scoring',
                description: 'Flag users with repeated payment delays or support escalations over SLA.',
                status: 'In Progress',
              },
              {
                title: 'Escalation Pipeline',
                description: 'Route flagged accounts to fraud prevention with timeline tracking.',
                status: 'Pending',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{item.title}</p>
                  <StatusBadge tone={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'neutral'}>
                    {item.status}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <Ban className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Suspicious Accounts</h3>
              <p className="text-sm text-red-700">
                Pattern-based alerts combining payment delays, refund rate, and support escalations.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              {
                user: 'USR-7841 • SLR-552',
                detail: 'Refund frequency above threshold. Review manual overrides and block if required.',
              },
              {
                user: 'USR-9922 • SLR-713',
                detail: 'Multiple support tickets unresolved. Investigate quality of service delivered.',
              },
              {
                user: 'USR-8841 • SLR-883',
                detail: 'Payment lapsed twice in 45 days. Credit risk flagged.',
              },
            ].map((item) => (
              <div key={item.user} className="rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-sm font-bold text-gray-900">{item.user}</p>
                <p className="text-xs text-red-700">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


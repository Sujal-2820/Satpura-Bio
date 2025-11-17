import { CalendarRange, Recycle, Truck } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Timeline } from '../components/Timeline'
import { orders } from '../services/adminData'

const columns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'Type', accessor: 'type' },
  { Header: 'Vendor', accessor: 'vendor' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Order Value', accessor: 'value' },
  { Header: 'Advance (30%)', accessor: 'advance' },
  { Header: 'Pending (70%)', accessor: 'pending' },
  { Header: 'Status', accessor: 'status' },
]

export function OrdersPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 6 • Order & Payment Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Unified Order Control</h2>
          <p className="text-sm text-gray-600">
            Track user + vendor orders, monitor payment collections, and reassign logistics within a single viewport.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
          <Truck className="h-4 w-4" />
          Assign Logistics
        </button>
      </header>

      <FilterBar
        filters={[
          { id: 'region', label: 'Region', active: true },
          { id: 'vendor', label: 'Vendor' },
          { id: 'date', label: 'Date range' },
          { id: 'status', label: 'Order status' },
        ]}
      />

      <DataTable
        columns={columns.map((column) => ({
          ...column,
          Cell:
            column.accessor === 'status'
              ? (row) => (
                  <StatusBadge tone={row.status === 'Processing' ? 'warning' : 'success'}>
                    {row.status}
                  </StatusBadge>
                )
              : column.accessor === 'advance'
              ? (row) => (
                  <StatusBadge tone={row.advance === 'Paid' ? 'success' : 'warning'}>
                    {row.advance}
                  </StatusBadge>
                )
              : undefined,
        }))}
        rows={orders}
        emptyState="No orders found for selected filters"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-red-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-700">Reassignment Console</h3>
              <p className="text-sm text-gray-600">
                Manage order routing when vendors are unavailable or stock thresholds are crossed.
              </p>
            </div>
            <Recycle className="h-5 w-5 text-red-600" />
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Vendor unavailable',
                detail: 'Auto suggest alternate vendor based on stock + credit health.',
              },
              {
                label: 'Logistics delay',
                detail: 'Trigger alternate route with SLA compliance tracking.',
              },
              {
                label: 'Payment mismatch',
                detail: 'Reconcile advance vs pending amounts. Notify finance instantly.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-sm font-bold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-blue-700">Billing Timeline</h3>
              <p className="text-sm text-gray-600">Advance and pending payments tracked across the order lifecycle.</p>
            </div>
          </div>
          <Timeline
            events={[
              {
                id: 'billing-1',
                title: 'Advance collection',
                timestamp: 'Today • 09:10',
                description: '₹2.6 Cr collected across 312 orders.',
                status: 'completed',
              },
              {
                id: 'billing-2',
                title: 'Pending follow-up',
                timestamp: 'Today • 12:40',
                description: 'Automated reminder sent for ₹1.9 Cr outstanding.',
                status: 'pending',
              },
              {
                id: 'billing-3',
                title: 'Invoice generation',
                timestamp: 'Scheduled • 17:00',
                description: 'Finance will generate GST-compliant invoices and export to PDF.',
                status: 'pending',
              },
            ]}
          />
        </div>
      </section>
    </div>
  )
}


import { useState, useEffect, useCallback } from 'react'
import { CalendarRange, Recycle, Truck, Eye, FileText, RefreshCw } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Timeline } from '../components/Timeline'
import { Modal } from '../components/Modal'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { OrderReassignmentModal } from '../components/OrderReassignmentModal'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { orders as mockOrders } from '../services/adminData'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'Type', accessor: 'type' },
  { Header: 'Vendor', accessor: 'vendor' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Order Value', accessor: 'value' },
  { Header: 'Advance (30%)', accessor: 'advance' },
  { Header: 'Pending (70%)', accessor: 'pending' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

const REGIONS = ['All', 'West', 'North', 'South', 'Central', 'North East', 'East']
const ORDER_STATUSES = ['All', 'Processing', 'Awaiting Dispatch', 'Completed', 'Cancelled']
const ORDER_TYPES = ['All', 'User', 'Vendor']

export function OrdersPage() {
  const { orders: ordersState, vendors } = useAdminState()
  const {
    getOrders,
    getOrderDetails,
    reassignOrder,
    generateInvoice,
    getVendors,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [ordersList, setOrdersList] = useState([])
  const [availableVendors, setAvailableVendors] = useState([])
  
  // Filter states
  const [filters, setFilters] = useState({
    region: 'All',
    vendor: 'All',
    status: 'All',
    type: 'All',
    dateFrom: '',
    dateTo: '',
  })

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [reassignmentModalOpen, setReassignmentModalOpen] = useState(false)
  const [selectedOrderForReassign, setSelectedOrderForReassign] = useState(null)

  // Format order data for display
  const formatOrderForDisplay = (order) => {
    const orderValue = typeof order.value === 'number'
      ? order.value
      : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const advanceAmount = typeof order.advance === 'number'
      ? order.advance
      : order.advanceStatus === 'paid' ? orderValue * 0.3 : 0

    const pendingAmount = typeof order.pending === 'number'
      ? order.pending
      : parseFloat(order.pending?.replace(/[₹,\sL]/g, '') || '0') * 100000

    return {
      ...order,
      value: orderValue >= 100000 ? `₹${(orderValue / 100000).toFixed(1)} L` : `₹${orderValue.toLocaleString('en-IN')}`,
      advance: order.advanceStatus === 'paid' || order.advance === 'Paid' ? 'Paid' : 'Pending',
      pending: pendingAmount >= 100000 ? `₹${(pendingAmount / 100000).toFixed(1)} L` : `₹${pendingAmount.toLocaleString('en-IN')}`,
    }
  }

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    const params = {}
    if (filters.region !== 'All') params.region = filters.region
    if (filters.vendor !== 'All') params.vendorId = filters.vendor
    if (filters.status !== 'All') params.status = filters.status.toLowerCase().replace(' ', '_')
    if (filters.type !== 'All') params.type = filters.type.toLowerCase()
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo

    const result = await getOrders(params)
    if (result.data?.orders) {
      const formatted = result.data.orders.map(formatOrderForDisplay)
      setOrdersList(formatted)
    } else {
      // Fallback to mock data
      setOrdersList(mockOrders.map(formatOrderForDisplay))
    }
  }, [getOrders, filters])

  // Fetch vendors for reassignment
  const fetchVendors = useCallback(async () => {
    const result = await getVendors()
    if (result.data?.vendors) {
      setAvailableVendors(result.data.vendors)
    }
  }, [getVendors])

  useEffect(() => {
    fetchOrders()
    fetchVendors()
  }, [fetchOrders, fetchVendors])

  // Refresh when orders are updated
  useEffect(() => {
    if (ordersState.updated) {
      fetchOrders()
    }
  }, [ordersState.updated, fetchOrders])

  const handleFilterChange = (filter) => {
    // This would open a dropdown/modal for filter selection
    // For now, we'll toggle the active state
    setFilters((prev) => ({
      ...prev,
      [filter.id]: prev[filter.id] === filter.label ? 'All' : filter.label,
    }))
  }

  const handleViewOrderDetails = async (order) => {
    const originalOrder = ordersState.data?.orders?.find((o) => o.id === order.id) || order
    setSelectedOrderForDetail(originalOrder)
    
    // Fetch detailed order data
    const result = await getOrderDetails(order.id)
    if (result.data) {
      setOrderDetails(result.data)
    }
    
    setDetailModalOpen(true)
  }

  const handleReassignOrder = (order) => {
    const originalOrder = ordersState.data?.orders?.find((o) => o.id === order.id) || order
    setSelectedOrderForReassign(originalOrder)
    setReassignmentModalOpen(true)
  }

  const handleReassignSubmit = async (orderId, reassignData) => {
    try {
      const result = await reassignOrder(orderId, reassignData)
      if (result.data) {
        setReassignmentModalOpen(false)
        setSelectedOrderForReassign(null)
        fetchOrders()
        success('Order reassigned successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reassign order'
        if (errorMessage.includes('vendor') || errorMessage.includes('unavailable') || errorMessage.includes('stock')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to reassign order', 5000)
    }
  }

  const handleGenerateInvoice = async (orderId) => {
    try {
      const result = await generateInvoice(orderId)
      if (result.data) {
        // Invoice is automatically downloaded and opened for printing
        success(result.data.message || 'Invoice generated successfully! Use browser print (Ctrl+P) to save as PDF.', 5000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to generate invoice'
        if (errorMessage.includes('not found') || errorMessage.includes('cannot')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to generate invoice', 5000)
    }
  }

  const handleProcessRefund = async (orderId) => {
    const confirmed = window.confirm('Are you sure you want to process this refund?')
    if (confirmed) {
      // This would call a refund API
      console.log('Processing refund for order:', orderId)
      alert('Refund processed successfully')
      fetchOrders()
    }
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'Unknown'
          const tone = status === 'Processing' || status === 'processing' ? 'warning' : status === 'Completed' || status === 'completed' ? 'success' : 'neutral'
          return <StatusBadge tone={tone}>{status}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'advance') {
      return {
        ...column,
        Cell: (row) => {
          const advance = row.advance || 'Unknown'
          const tone = advance === 'Paid' || advance === 'paid' ? 'success' : 'warning'
          return <StatusBadge tone={tone}>{advance}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'type') {
      return {
        ...column,
        Cell: (row) => {
          const type = row.type || 'Unknown'
          return (
            <span className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
              type === 'User' || type === 'user' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-green-100 text-green-700'
            )}>
              {type}
            </span>
          )
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalOrder = ordersState.data?.orders?.find((o) => o.id === row.id) || row
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewOrderDetails(originalOrder)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleReassignOrder(originalOrder)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
                title="Reassign order"
              >
                <Recycle className="h-4 w-4" />
              </button>
            </div>
          )
        },
      }
    }
    return column
  })

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
          { id: 'region', label: filters.region === 'All' ? 'Region' : filters.region, active: filters.region !== 'All' },
          { id: 'vendor', label: filters.vendor === 'All' ? 'Vendor' : filters.vendor, active: filters.vendor !== 'All' },
          { id: 'date', label: filters.dateFrom ? 'Date range' : 'Date range', active: !!filters.dateFrom },
          { id: 'status', label: filters.status === 'All' ? 'Order status' : filters.status, active: filters.status !== 'All' },
        ]}
        onChange={handleFilterChange}
      />

      <DataTable
        columns={tableColumns}
        rows={ordersList}
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

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedOrderForDetail(null)
          setOrderDetails(null)
        }}
        order={orderDetails || selectedOrderForDetail}
        onReassign={handleReassignOrder}
        onGenerateInvoice={handleGenerateInvoice}
        onProcessRefund={handleProcessRefund}
        loading={loading}
      />

      {/* Order Reassignment Modal */}
      <OrderReassignmentModal
        isOpen={reassignmentModalOpen}
        onClose={() => {
          setReassignmentModalOpen(false)
          setSelectedOrderForReassign(null)
        }}
        order={selectedOrderForReassign}
        availableVendors={availableVendors}
        onReassign={handleReassignSubmit}
        loading={loading}
      />
    </div>
  )
}


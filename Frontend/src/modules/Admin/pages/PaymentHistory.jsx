import { useState, useEffect, useCallback } from 'react'
import { History, IndianRupee, Filter, Search, Calendar, TrendingUp, TrendingDown, Wallet, Factory, ShieldCheck, Users } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Date', accessor: 'date' },
  { Header: 'Activity Type', accessor: 'activityType' },
  { Header: 'Entity', accessor: 'entity' },
  { Header: 'Amount', accessor: 'amount' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Description', accessor: 'description' },
]

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'user_payment_advance', label: 'User Advance Payments' },
  { value: 'user_payment_remaining', label: 'User Remaining Payments' },
  { value: 'vendor_earning', label: 'Vendor Earnings' },
  { value: 'seller_commission', label: 'Seller Commissions' },
  { value: 'vendor_withdrawal_request', label: 'Vendor Withdrawal Requests' },
  { value: 'vendor_withdrawal_approved', label: 'Vendor Withdrawals Approved' },
  { value: 'vendor_withdrawal_completed', label: 'Vendor Withdrawals Completed' },
  { value: 'seller_withdrawal_request', label: 'Seller Withdrawal Requests' },
  { value: 'seller_withdrawal_approved', label: 'Seller Withdrawals Approved' },
  { value: 'seller_withdrawal_completed', label: 'Seller Withdrawals Completed' },
]

export function PaymentHistoryPage() {
  const { getPaymentHistory, getPaymentHistoryStats, loading } = useAdminApi()
  const { error: showError } = useToast()

  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({
    totalUserPayments: 0,
    totalVendorEarnings: 0,
    totalSellerCommissions: 0,
    totalVendorWithdrawals: 0,
    totalSellerWithdrawals: 0,
    totalActivities: 0,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    activityType: 'all',
    status: 'all',
    search: '',
    startDate: '',
    endDate: '',
  })

  const fetchHistory = useCallback(async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.activityType !== 'all' && { activityType: filters.activityType }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      }
      const result = await getPaymentHistory(params)
      if (result.success && result.data) {
        setHistory(result.data.history || [])
        setPagination((prev) => ({
          ...prev,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.totalPages || 0,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
      showError('Failed to fetch payment history')
    }
  }, [getPaymentHistory, pagination.page, pagination.limit, filters, showError])

  const fetchStats = useCallback(async () => {
    try {
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      }
      const result = await getPaymentHistoryStats(params)
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch payment history stats:', error)
    }
  }, [getPaymentHistoryStats, filters.startDate, filters.endDate])

  useEffect(() => {
    fetchHistory()
    fetchStats()
  }, [fetchHistory, fetchStats])

  const formatCurrency = (value) => {
    if (typeof value === 'string') return value
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
    return `₹${value.toLocaleString('en-IN')}`
  }

  const formatActivityType = (type) => {
    const typeMap = {
      user_payment_advance: 'User Advance Payment',
      user_payment_remaining: 'User Remaining Payment',
      vendor_earning: 'Vendor Earning',
      seller_commission: 'Seller Commission',
      vendor_withdrawal_request: 'Vendor Withdrawal Request',
      vendor_withdrawal_approved: 'Vendor Withdrawal Approved',
      vendor_withdrawal_rejected: 'Vendor Withdrawal Rejected',
      vendor_withdrawal_completed: 'Vendor Withdrawal Completed',
      seller_withdrawal_request: 'Seller Withdrawal Request',
      seller_withdrawal_approved: 'Seller Withdrawal Approved',
      seller_withdrawal_rejected: 'Seller Withdrawal Rejected',
      seller_withdrawal_completed: 'Seller Withdrawal Completed',
      bank_account_added: 'Bank Account Added',
      bank_account_updated: 'Bank Account Updated',
      bank_account_deleted: 'Bank Account Deleted',
    }
    return typeMap[type] || type
  }

  const getActivityIcon = (type) => {
    if (type.includes('user_payment')) return Users
    if (type.includes('vendor')) return Factory
    if (type.includes('seller')) return ShieldCheck
    return Wallet
  }

  const getActivityColor = (type) => {
    if (type.includes('user_payment')) return 'blue'
    if (type.includes('vendor_earning')) return 'green'
    if (type.includes('seller_commission')) return 'yellow'
    if (type.includes('withdrawal')) return 'orange'
    return 'gray'
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'date') {
      return {
        ...column,
        Cell: (row) => {
          const date = row.createdAt || row.processedAt
          return date ? new Date(date).toLocaleString('en-IN') : 'N/A'
        },
      }
    }
    if (column.accessor === 'activityType') {
      return {
        ...column,
        Cell: (row) => {
          const Icon = getActivityIcon(row.activityType)
          const color = getActivityColor(row.activityType)
          return (
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', {
                'bg-blue-100 text-blue-600': color === 'blue',
                'bg-green-100 text-green-600': color === 'green',
                'bg-yellow-100 text-yellow-600': color === 'yellow',
                'bg-orange-100 text-orange-600': color === 'orange',
                'bg-gray-100 text-gray-600': color === 'gray',
              })}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{formatActivityType(row.activityType)}</span>
            </div>
          )
        },
      }
    }
    if (column.accessor === 'entity') {
      return {
        ...column,
        Cell: (row) => {
          if (row.vendor?.name) {
            return <span className="text-sm">Vendor: {row.vendor.name}</span>
          }
          if (row.seller?.name) {
            return <span className="text-sm">Seller: {row.seller.name} ({row.seller.sellerId})</span>
          }
          if (row.user?.name) {
            return <span className="text-sm">User: {row.user.name}</span>
          }
          return <span className="text-sm text-gray-400">N/A</span>
        },
      }
    }
    if (column.accessor === 'amount') {
      return {
        ...column,
        Cell: (row) => (
          <span className={cn('text-sm font-bold', {
            'text-green-600': row.activityType.includes('earning') || row.activityType.includes('commission'),
            'text-red-600': row.activityType.includes('withdrawal'),
            'text-blue-600': row.activityType.includes('payment'),
            'text-gray-900': !row.activityType,
          })}>
            {formatCurrency(row.amount || 0)}
          </span>
        ),
      }
    }
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'completed'
          const tone = status === 'completed' ? 'success' : status === 'pending' ? 'warning' : status === 'rejected' ? 'neutral' : 'default'
          return <StatusBadge tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'description') {
      return {
        ...column,
        Cell: (row) => (
          <span className="text-sm text-gray-600">{row.description || row.formattedDescription || 'N/A'}</span>
        ),
      }
    }
    return column
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Finance • History</p>
          <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
          <p className="text-sm text-gray-600">Complete audit log of all payment, earnings, and withdrawal activities</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-3xl border border-blue-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-gray-600">User Payments</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalUserPayments || 0)}</p>
        </div>
        <div className="rounded-3xl border border-green-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-green-600" />
            <p className="text-xs text-gray-600">Vendor Earnings</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalVendorEarnings || 0)}</p>
        </div>
        <div className="rounded-3xl border border-yellow-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-yellow-600" />
            <p className="text-xs text-gray-600">Seller Commissions</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalSellerCommissions || 0)}</p>
        </div>
        <div className="rounded-3xl border border-orange-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-gray-600">Vendor Withdrawals</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalVendorWithdrawals || 0)}</p>
        </div>
        <div className="rounded-3xl border border-orange-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-gray-600">Seller Withdrawals</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalSellerWithdrawals || 0)}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-gray-600" />
            <p className="text-xs text-gray-600">Total Activities</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.totalActivities || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filters.activityType}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, activityType: e.target.value }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="border-none bg-transparent text-sm outline-none"
              placeholder="Start Date"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="border-none bg-transparent text-sm outline-none"
              placeholder="End Date"
            />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by description, vendor, seller, order..."
              value={filters.search}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, search: e.target.value }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="flex-1 border-none bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
        <DataTable
          columns={tableColumns}
          rows={history}
          emptyState="No payment history found"
          loading={loading}
        />
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


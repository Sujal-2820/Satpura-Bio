import { useState, useEffect, useCallback } from 'react'
import { Award, Gift, Users, Edit2, Eye, Wallet, CheckCircle, XCircle, ArrowLeft, User, Hash, Percent, Target, IndianRupee, TrendingUp, Calendar } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressList } from '../components/ProgressList'
import { SellerForm } from '../components/SellerForm'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { sellers as mockSellers } from '../services/adminData'
import { cn } from '../../../lib/cn'
import { getMaskedBankDetails } from '../../../utils/maskSensitiveData'

const columns = [
  { Header: 'IRA Partner', accessor: 'name' },
  { Header: 'IRA Partner ID', accessor: 'id' },
  { Header: 'Cashback %', accessor: 'cashback' },
  { Header: 'Commission %', accessor: 'commission' },
  { Header: 'Monthly Target', accessor: 'target' },
  { Header: 'Progress', accessor: 'achieved' },
  { Header: 'Referred Users', accessor: 'referrals' },
  { Header: 'Total Sales', accessor: 'sales' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function SellersPage({ subRoute = null, navigate }) {
  const { sellers: sellersState } = useAdminState()
  const {
    getSellers,
    createSeller,
    updateSeller,
    approveSeller,
    rejectSeller,
    deleteSeller,
    getSellerWithdrawalRequests,
    approveSellerWithdrawal,
    rejectSellerWithdrawal,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [sellersList, setSellersList] = useState([])
  const [allSellersList, setAllSellersList] = useState([])
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  
  // View states (replacing modals with full-screen views)
  const [currentView, setCurrentView] = useState(null) // 'sellerForm', 'sellerDetail', 'withdrawalRequest', 'approveSeller', 'rejectSeller'
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedSellerForDetail, setSelectedSellerForDetail] = useState(null)
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState(null)
  const [selectedSellerForAction, setSelectedSellerForAction] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState(null) // null = not showing, '' = showing input

  // Format seller data for display
  const formatSellerForDisplay = (seller) => {
    const monthlyTarget = typeof seller.monthlyTarget === 'number'
      ? seller.monthlyTarget
      : parseFloat(seller.target?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const totalSales = typeof seller.totalSales === 'number'
      ? seller.totalSales
      : parseFloat(seller.sales?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const achieved = typeof seller.achieved === 'number'
      ? seller.achieved
      : typeof seller.progress === 'number'
      ? seller.progress
      : monthlyTarget > 0 ? ((totalSales / monthlyTarget) * 100).toFixed(1) : 0

    const cashbackRate = typeof seller.cashbackRate === 'number'
      ? seller.cashbackRate
      : parseFloat(seller.cashback?.replace(/[%\s]/g, '') || '0')

    const commissionRate = typeof seller.commissionRate === 'number'
      ? seller.commissionRate
      : parseFloat(seller.commission?.replace(/[%\s]/g, '') || '0')

    return {
      ...seller,
      cashback: `${cashbackRate}%`,
      commission: `${commissionRate}%`,
      target: monthlyTarget >= 100000 ? `₹${(monthlyTarget / 100000).toFixed(1)} L` : `₹${monthlyTarget.toLocaleString('en-IN')}`,
      achieved: parseFloat(achieved),
      sales: totalSales >= 100000 ? `₹${(totalSales / 100000).toFixed(1)} L` : `₹${totalSales.toLocaleString('en-IN')}`,
      referrals: seller.referrals || seller.referredUsers || 0,
    }
  }

  // Fetch sellers
  const fetchSellers = useCallback(async () => {
    const result = await getSellers()
    if (result.data?.sellers) {
      const formatted = result.data.sellers.map(formatSellerForDisplay)
      setAllSellersList(formatted)
    } else {
      // Fallback to mock data
      const formatted = mockSellers.map(formatSellerForDisplay)
      setAllSellersList(formatted)
    }
  }, [getSellers])

  // Filter sellers based on subRoute
  useEffect(() => {
    if (subRoute === 'active') {
      // Active IRA Partners: those with sales and commissions
      setSellersList(allSellersList.filter((s) => {
        const sales = typeof s.totalSales === 'number' ? s.totalSales : parseFloat(s.sales?.replace(/[₹,\sL]/g, '') || '0') * 100000
        return sales > 0 && (s.status === 'approved' || s.status === 'On Track' || s.status === 'on_track')
      }))
    } else if (subRoute === 'inactive') {
      // Inactive IRA Partners: those not getting sales and commissions
      setSellersList(allSellersList.filter((s) => {
        const sales = typeof s.totalSales === 'number' ? s.totalSales : parseFloat(s.sales?.replace(/[₹,\sL]/g, '') || '0') * 100000
        return sales === 0 || (s.status !== 'approved' && s.status !== 'On Track' && s.status !== 'on_track')
      }))
    } else {
      setSellersList(allSellersList)
    }
  }, [subRoute, allSellersList])

  // Fetch withdrawal requests
  const fetchWithdrawalRequests = useCallback(async () => {
    const result = await getSellerWithdrawalRequests({ status: 'pending' })
    if (result.data?.withdrawals) {
      setWithdrawalRequests(result.data.withdrawals)
    }
  }, [getSellerWithdrawalRequests])

  useEffect(() => {
    fetchSellers()
    fetchWithdrawalRequests()
  }, [fetchSellers, fetchWithdrawalRequests])

  // Refresh when sellers are updated
  useEffect(() => {
    if (sellersState.updated) {
      fetchSellers()
      fetchWithdrawalRequests()
    }
  }, [sellersState.updated, fetchSellers, fetchWithdrawalRequests])

  const handleCreateSeller = () => {
    setSelectedSeller(null)
    setCurrentView('sellerForm')
  }

  const handleEditSeller = (seller) => {
    const originalSeller = sellersState.data?.sellers?.find((s) => s.id === seller.id) || seller
    setSelectedSeller(originalSeller)
    setCurrentView('sellerForm')
  }

  const handleViewSellerDetails = (seller) => {
    const originalSeller = sellersState.data?.sellers?.find((s) => s.id === seller.id) || seller
    setSelectedSellerForDetail(originalSeller)
    setCurrentView('sellerDetail')
  }

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedSeller(null)
    setSelectedSellerForDetail(null)
    setSelectedWithdrawalRequest(null)
    setSelectedSellerForAction(null)
    setRejectReason('')
    setWithdrawalRejectReason(null)
    if (navigate) navigate('sellers')
  }

  const handleDeleteSeller = async (sellerId) => {
    if (window.confirm('Are you sure you want to delete this seller? This action cannot be undone.')) {
      try {
        const result = await deleteSeller(sellerId)
        if (result.data) {
          fetchSellers()
          success('Seller deleted successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to delete seller'
          if (errorMessage.includes('active') || errorMessage.includes('cannot')) {
            showWarning(errorMessage, 6000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      } catch (error) {
        showError(error.message || 'Failed to delete seller', 5000)
      }
    }
  }

  const handleFormSubmit = async (formData) => {
    try {
      if (selectedSeller) {
        // Update existing seller
        const result = await updateSeller(selectedSeller.id, formData)
        if (result.data) {
          setCurrentView(null)
          setSelectedSeller(null)
          fetchSellers()
          success('Seller updated successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to update seller'
          if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('duplicate')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      } else {
        // Create new seller
        const result = await createSeller(formData)
        if (result.data) {
          setCurrentView(null)
          fetchSellers()
          success('Seller created successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to create seller'
          if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('duplicate')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to save seller', 5000)
    }
  }

  const handleApproveWithdrawal = async (requestId) => {
    try {
      const result = await approveSellerWithdrawal(requestId)
      if (result.data) {
        setCurrentView(null)
        setSelectedWithdrawalRequest(null)
        setWithdrawalRejectReason(null)
        fetchWithdrawalRequests()
        success('Withdrawal request approved successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to approve withdrawal'
        if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to approve withdrawal', 5000)
    }
  }

  const handleRejectWithdrawal = async (requestId, rejectionData) => {
    try {
      const result = await rejectSellerWithdrawal(requestId, rejectionData)
      if (result.data) {
        setCurrentView(null)
        setSelectedWithdrawalRequest(null)
        setWithdrawalRejectReason(null)
        fetchWithdrawalRequests()
        success('Withdrawal request rejected.', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reject withdrawal'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject withdrawal', 5000)
    }
  }

  const handleApproveSeller = async (sellerId) => {
    try {
      const result = await approveSeller(sellerId)
      if (result.data) {
        setCurrentView(null)
        setSelectedSellerForAction(null)
        fetchSellers()
        success('Seller approved successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to approve seller'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to approve seller', 5000)
    }
  }

  const handleRejectSeller = async (sellerId, rejectionData) => {
    try {
      const result = await rejectSeller(sellerId, rejectionData)
      if (result.data) {
        setCurrentView(null)
        setSelectedSellerForAction(null)
        setRejectReason('')
        fetchSellers()
        success('Seller rejected successfully.', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reject seller'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject seller', 5000)
    }
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'achieved') {
      return {
        ...column,
        Cell: (row) => (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{row.achieved}%</span>
              <span>{row.sales}</span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
              <div
                className={cn(
                  'h-full rounded-full shadow-[0_2px_8px_rgba(234,179,8,0.3)]',
                  row.achieved >= 100
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : row.achieved >= 80
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600',
                )}
                style={{ width: `${Math.min(row.achieved, 100)}%` }}
              />
            </div>
          </div>
        ),
      }
    }
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'Unknown'
          let tone = 'warning'
          if (status === 'approved' || status === 'On Track' || status === 'on_track') {
            tone = 'success'
          } else if (status === 'pending') {
            tone = 'warning'
          } else if (status === 'rejected') {
            tone = 'error'
          }
          return <StatusBadge tone={tone}>{status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending' : status === 'rejected' ? 'Rejected' : status}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalSeller = sellersState.data?.sellers?.find((s) => s.id === row.id) || row
          const sellerStatus = originalSeller.status || row.status || 'unknown'
          const isPending = sellerStatus === 'pending'
          
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewSellerDetails(originalSeller)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSellerForAction(originalSeller)
                      setCurrentView('approveSeller')
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-300 bg-green-50 text-green-700 transition-all hover:border-green-500 hover:bg-green-100"
                    title="Approve seller"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSellerForAction(originalSeller)
                      setRejectReason('')
                      setCurrentView('rejectSeller')
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition-all hover:border-red-500 hover:bg-red-100"
                    title="Reject seller"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              )}
              {!isPending && (
                <button
                  type="button"
                  onClick={() => handleEditSeller(originalSeller)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                  title="Edit seller"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        },
      }
    }
    return column
  })

  const totalPendingWithdrawals = withdrawalRequests.reduce((sum, req) => sum + (req.amount || 0), 0)

  // Helper functions for seller detail view
  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  // Helper functions for withdrawal request view
  const getRequestId = (request) => {
    if (!request) return null
    if (typeof request.id === 'string') {
      return request.id
    }
    if (request._id) {
      return typeof request._id === 'string' ? request._id : String(request._id)
    }
    if (request.requestId) {
      return typeof request.requestId === 'string' ? request.requestId : String(request.requestId)
    }
    if (request.id && typeof request.id === 'object' && request.id._id) {
      return String(request.id._id)
    }
    return null
  }

  const getSellerId = (request) => {
    if (!request) return null
    if (typeof request.sellerId === 'string') {
      return request.sellerId
    }
    if (request.sellerId && typeof request.sellerId === 'object') {
      return request.sellerId.sellerId || request.sellerId._id || request.sellerId.id
    }
    if (request.seller && typeof request.seller === 'object') {
      return request.seller.sellerId || request.seller._id || request.seller.id
    }
    return null
  }

  const getSellerName = (request) => {
    if (!request) return 'Unknown IRA Partner'
    if (request.sellerName) {
      return request.sellerName
    }
    if (request.sellerId && typeof request.sellerId === 'object') {
      return request.sellerId.name
    }
    if (request.seller && typeof request.seller === 'object') {
      return request.seller.name
    }
    return 'Unknown IRA Partner'
  }

  // If a full-screen view is active, render it instead of the main list
  if (currentView === 'sellerForm') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
            title="Back to IRA Partners"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedSeller ? 'Edit IRA Partner Profile' : 'Create New IRA Partner Profile'}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <SellerForm
            seller={selectedSeller}
            onSubmit={handleFormSubmit}
            onCancel={handleBackToList}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'sellerDetail' && selectedSellerForDetail) {
    const seller = selectedSellerForDetail
    const monthlyTarget = typeof seller.monthlyTarget === 'number'
      ? seller.monthlyTarget
      : parseFloat(seller.target?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const totalSales = typeof seller.totalSales === 'number'
      ? seller.totalSales
      : parseFloat(seller.sales?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const achieved = typeof seller.achieved === 'number'
      ? seller.achieved
      : typeof seller.progress === 'number'
      ? seller.progress
      : monthlyTarget > 0 ? ((totalSales / monthlyTarget) * 100).toFixed(1) : 0

    const cashbackRate = typeof seller.cashbackRate === 'number'
      ? seller.cashbackRate
      : parseFloat(seller.cashback?.replace(/[%\s]/g, '') || '0')

    const commissionRate = typeof seller.commissionRate === 'number'
      ? seller.commissionRate
      : parseFloat(seller.commission?.replace(/[%\s]/g, '') || '0')

    const referrals = seller.referrals || seller.referredUsers || 0

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
            title="Back to IRA Partners"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">IRA Partner Performance Details</h2>
        </div>
        <div className="space-y-6">
          {/* IRA Partner Header */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{seller.name}</h3>
                  <p className="text-sm text-gray-600">IRA Partner ID: {seller.sellerId || seller.id}</p>
                  {seller.area && (
                    <p className="mt-1 text-xs text-gray-500">{seller.area}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={seller.status === 'On Track' || seller.status === 'on_track' ? 'success' : 'warning'}>
                  {seller.status || 'Unknown'}
                </StatusBadge>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeller(seller)
                    setCurrentView('sellerForm')
                  }}
                  className="rounded-lg border border-yellow-300 bg-white px-4 py-2 text-xs font-bold text-yellow-700 transition-all hover:bg-yellow-50"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Target className="h-4 w-4" />
                <span>Monthly Target</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(monthlyTarget)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>Total Sales</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users className="h-4 w-4" />
                <span>Referred Users</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {referrals.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Award className="h-4 w-4" />
                <span>Progress</span>
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {parseFloat(achieved).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">Target Achievement</span>
              <span className="font-bold text-yellow-700">{parseFloat(achieved).toFixed(1)}%</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all shadow-[0_2px_8px_rgba(234,179,8,0.3)]',
                  parseFloat(achieved) >= 100
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : parseFloat(achieved) >= 80
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600',
                )}
                style={{ width: `${Math.min(achieved, 100)}%` }}
              />
            </div>
          </div>

          {/* Incentive Settings */}
          <div className="rounded-xl border border-yellow-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Incentive Settings</h4>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500">Cashback Rate: </span>
                    <span className="font-bold text-gray-900">{cashbackRate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Commission Rate: </span>
                    <span className="font-bold text-gray-900">{commissionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {(seller.email || seller.phone) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-3 text-sm font-bold text-gray-900">Contact Information</h4>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {seller.email && (
                  <div>
                    <span className="text-gray-500">Email: </span>
                    <span className="text-gray-900">{seller.email}</span>
                  </div>
                )}
                {seller.phone && (
                  <div>
                    <span className="text-gray-500">Phone: </span>
                    <span className="text-gray-900">{seller.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (currentView === 'withdrawalRequest' && selectedWithdrawalRequest) {
    const request = selectedWithdrawalRequest
    const requestId = getRequestId(request)
    const sellerId = getSellerId(request)
    const sellerName = getSellerName(request)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
            title="Back to IRA Partners"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">IRA Partner Withdrawal Request Review</h2>
        </div>
        <div className="space-y-6">
          {/* Request Header */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Request #{requestId || 'N/A'}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{sellerName}</span>
                  </div>
                  {sellerId && (
                    <p className="mt-1 text-xs text-gray-500">IRA Partner ID: {sellerId}</p>
                  )}
                  {(request.date || request.createdAt) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {request.date 
                          ? (typeof request.date === 'string' ? request.date : new Date(request.date).toLocaleDateString('en-IN'))
                          : request.createdAt 
                          ? (typeof request.createdAt === 'string' ? request.createdAt : new Date(request.createdAt).toLocaleDateString('en-IN'))
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <StatusBadge tone={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'neutral'}>
                {request.status || 'Pending'}
              </StatusBadge>
            </div>
          </div>

          {/* Withdrawal Details */}
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <IndianRupee className="h-4 w-4" />
                <span>Withdrawal Amount</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(request.amount || 0)}
              </p>
            </div>

            {request.bankDetails && (() => {
              const maskedDetails = getMaskedBankDetails({
                ...request.bankDetails,
                ifscCode: request.bankDetails.ifsc || request.bankDetails.ifscCode,
              })
              return (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-bold text-gray-500">Bank Account Details (Masked for Privacy)</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    {maskedDetails.accountHolderName && (
                      <p>Account Holder: {maskedDetails.accountHolderName}</p>
                    )}
                    {maskedDetails.accountNumber && (
                      <p>Account: {maskedDetails.accountNumber}</p>
                    )}
                    {maskedDetails.ifscCode && (
                      <p>IFSC: {maskedDetails.ifscCode}</p>
                    )}
                    {maskedDetails.bankName && (
                      <p>Bank: {maskedDetails.bankName}</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    Note: Account details are masked for security. Full details are available in payment history for processed transactions.
                  </p>
                </div>
              )
            })()}

            {request.reason && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-bold text-gray-500">Reason for Withdrawal</p>
                <p className="text-sm text-gray-700">{request.reason}</p>
              </div>
            )}

            {request.sellerPerformance && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-2 text-xs font-bold text-blue-900">IRA Partner Performance Summary</p>
                <div className="grid gap-2 text-xs text-blue-800 sm:grid-cols-2">
                  {request.sellerPerformance.totalSales && (
                    <div>
                      <span className="font-semibold">Total Sales: </span>
                      <span>{formatCurrency(request.sellerPerformance.totalSales)}</span>
                    </div>
                  )}
                  {request.sellerPerformance.pendingEarnings && (
                    <div>
                      <span className="font-semibold">Pending Earnings: </span>
                      <span>{formatCurrency(request.sellerPerformance.pendingEarnings)}</span>
                    </div>
                  )}
                  {request.sellerPerformance.targetAchievement && (
                    <div>
                      <span className="font-semibold">Target Achievement: </span>
                      <span>{request.sellerPerformance.targetAchievement}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {withdrawalRejectReason !== null && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <label className="mb-2 block text-xs font-bold text-gray-700">Rejection Reason</label>
                <textarea
                  value={withdrawalRejectReason}
                  onChange={(e) => setWithdrawalRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full rounded-lg border border-red-300 bg-white p-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBackToList}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              {withdrawalRejectReason === null ? (
                <button
                  type="button"
                  onClick={() => setWithdrawalRejectReason('')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (requestId) {
                      handleRejectWithdrawal(requestId, { reason: withdrawalRejectReason || undefined })
                    }
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Confirm Rejection
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (requestId) {
                    handleApproveWithdrawal(requestId)
                  }
                }}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? 'Processing...' : 'Approve Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'approveSeller' && selectedSellerForAction) {
    const seller = selectedSellerForAction
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
            title="Back to IRA Partners"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Approve IRA Partner</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{seller.name}</h3>
                  <p className="text-sm text-gray-600">IRA Partner ID: {seller.sellerId || seller.id}</p>
                  {seller.email && (
                    <p className="mt-1 text-xs text-gray-500">Email: {seller.email}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to approve this IRA Partner? This action will activate their account and allow them to start earning commissions.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBackToList}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveSeller(seller.id || seller._id)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? 'Processing...' : 'Approve IRA Partner'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'rejectSeller' && selectedSellerForAction) {
    const seller = selectedSellerForAction
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
            title="Back to IRA Partners"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Reject IRA Partner</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{seller.name}</h3>
                  <p className="text-sm text-gray-600">IRA Partner ID: {seller.sellerId || seller.id}</p>
                  {seller.email && (
                    <p className="mt-1 text-xs text-gray-500">Email: {seller.email}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <label className="mb-2 block text-sm font-bold text-gray-700">Rejection Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection (optional)..."
                className="w-full rounded-lg border border-red-300 bg-white p-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                rows={4}
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBackToList}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectSeller(seller.id || seller._id, { reason: rejectReason || undefined })}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {loading ? 'Processing...' : 'Reject IRA Partner'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getPageTitle = () => {
    if (subRoute === 'active') return 'Active IRA Partners'
    if (subRoute === 'inactive') return 'Inactive IRA Partners'
    return 'Sales Network HQ'
  }

  const getPageDescription = () => {
    if (subRoute === 'active') return 'View and manage IRA Partners who are actively getting sales and commissions.'
    if (subRoute === 'inactive') return 'View and manage IRA Partners who are not getting sales and commissions.'
    return 'Incentivise performance, track targets, and manage wallet payouts with clarity.'
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 4 • IRA Partner Management</p>
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-600">
            {getPageDescription()}
          </p>
        </div>
        <div className="flex gap-2">
          {withdrawalRequests.length > 0 && (
            <button
              onClick={() => {
                setSelectedWithdrawalRequest(withdrawalRequests[0])
                setCurrentView('withdrawalRequest')
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105"
            >
              <Wallet className="h-4 w-4" />
              Withdrawals ({withdrawalRequests.length})
            </button>
          )}
          <button
            onClick={handleCreateSeller}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
          >
          <Award className="h-4 w-4" />
          Create IRA Partner Profile
        </button>
        </div>
      </header>

      <DataTable
        columns={tableColumns}
        rows={sellersList}
        emptyState="No IRA Partners found in the network"
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
            { 
              label: 'Seller Wallet Requests', 
              progress: withdrawalRequests.length > 0 ? Math.min((withdrawalRequests.length / 10) * 100, 100) : 42, 
              tone: 'warning', 
              meta: withdrawalRequests.length > 0 
                ? `${withdrawalRequests.length} requests (${totalPendingWithdrawals >= 100000 ? `₹${(totalPendingWithdrawals / 100000).toFixed(1)} L` : `₹${totalPendingWithdrawals.toLocaleString('en-IN')}`} pending)` 
                : '₹8.2 L awaiting admin approval' 
            },
            { label: 'Monthly Target Achievement', progress: 68, tone: 'success', meta: 'Average across all sellers' },
            { label: 'Top Performer Retention', progress: 92, tone: 'success', meta: 'Proactive incentives reduce attrition' },
          ]}
        />
      </section>
    </div>
  )
}


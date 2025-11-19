import { useState, useEffect, useCallback } from 'react'
import { Award, Gift, Users, Edit2, Eye, Wallet } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressList } from '../components/ProgressList'
import { Modal } from '../components/Modal'
import { SellerForm } from '../components/SellerForm'
import { SellerDetailModal } from '../components/SellerDetailModal'
import { WithdrawalRequestModal } from '../components/WithdrawalRequestModal'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { sellers as mockSellers } from '../services/adminData'
import { cn } from '../../../lib/cn'

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

export function SellersPage() {
  const { sellers: sellersState } = useAdminState()
  const {
    getSellers,
    createSeller,
    updateSeller,
    deleteSeller,
    getSellerWithdrawalRequests,
    approveSellerWithdrawal,
    rejectSellerWithdrawal,
    loading,
  } = useAdminApi()

  const [sellersList, setSellersList] = useState([])
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  
  // Modal states
  const [sellerModalOpen, setSellerModalOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSellerForDetail, setSelectedSellerForDetail] = useState(null)
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState(null)

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
      setSellersList(formatted)
    } else {
      // Fallback to mock data
      setSellersList(mockSellers.map(formatSellerForDisplay))
    }
  }, [getSellers])

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
    setSellerModalOpen(true)
  }

  const handleEditSeller = (seller) => {
    const originalSeller = sellersState.data?.sellers?.find((s) => s.id === seller.id) || seller
    setSelectedSeller(originalSeller)
    setSellerModalOpen(true)
  }

  const handleViewSellerDetails = (seller) => {
    const originalSeller = sellersState.data?.sellers?.find((s) => s.id === seller.id) || seller
    setSelectedSellerForDetail(originalSeller)
    setDetailModalOpen(true)
  }

  const handleDeleteSeller = async (sellerId) => {
    if (window.confirm('Are you sure you want to delete this seller? This action cannot be undone.')) {
      const result = await deleteSeller(sellerId)
      if (result.data) {
        fetchSellers()
      }
    }
  }

  const handleFormSubmit = async (formData) => {
    if (selectedSeller) {
      // Update existing seller
      const result = await updateSeller(selectedSeller.id, formData)
      if (result.data) {
        setSellerModalOpen(false)
        setSelectedSeller(null)
        fetchSellers()
      }
    } else {
      // Create new seller
      const result = await createSeller(formData)
      if (result.data) {
        setSellerModalOpen(false)
        fetchSellers()
      }
    }
  }

  const handleApproveWithdrawal = async (requestId) => {
    const result = await approveSellerWithdrawal(requestId)
    if (result.data) {
      setWithdrawalModalOpen(false)
      setSelectedWithdrawalRequest(null)
      fetchWithdrawalRequests()
    }
  }

  const handleRejectWithdrawal = async (requestId, rejectionData) => {
    const result = await rejectSellerWithdrawal(requestId, rejectionData)
    if (result.data) {
      setWithdrawalModalOpen(false)
      setSelectedWithdrawalRequest(null)
      fetchWithdrawalRequests()
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
          const tone = status === 'On Track' || status === 'on_track' ? 'success' : 'warning'
          return <StatusBadge tone={tone}>{status}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalSeller = sellersState.data?.sellers?.find((s) => s.id === row.id) || row
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
              <button
                type="button"
                onClick={() => handleEditSeller(originalSeller)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                title="Edit seller"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )
        },
      }
    }
    return column
  })

  const totalPendingWithdrawals = withdrawalRequests.reduce((sum, req) => sum + (req.amount || 0), 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 4 • IRA Partner Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Sales Network HQ</h2>
          <p className="text-sm text-gray-600">
            Incentivise performance, track targets, and manage wallet payouts with clarity.
          </p>
        </div>
        <div className="flex gap-2">
          {withdrawalRequests.length > 0 && (
            <button
              onClick={() => {
                setSelectedWithdrawalRequest(withdrawalRequests[0])
                setWithdrawalModalOpen(true)
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

      {/* Seller Form Modal */}
      <Modal
        isOpen={sellerModalOpen}
        onClose={() => {
          setSellerModalOpen(false)
          setSelectedSeller(null)
        }}
        title={selectedSeller ? 'Edit Seller Profile' : 'Create New Seller'}
        size="md"
      >
        <SellerForm
          seller={selectedSeller}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setSellerModalOpen(false)
            setSelectedSeller(null)
          }}
          loading={loading}
        />
      </Modal>

      {/* Seller Detail Modal */}
      <SellerDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedSellerForDetail(null)
        }}
        seller={selectedSellerForDetail}
        onEdit={(seller) => {
          setDetailModalOpen(false)
          setSelectedSeller(seller)
          setSellerModalOpen(true)
        }}
      />

      {/* Withdrawal Request Modal */}
      <WithdrawalRequestModal
        isOpen={withdrawalModalOpen}
        onClose={() => {
          setWithdrawalModalOpen(false)
          setSelectedWithdrawalRequest(null)
        }}
        request={selectedWithdrawalRequest}
        onApprove={handleApproveWithdrawal}
        onReject={handleRejectWithdrawal}
        loading={loading}
      />
    </div>
  )
}


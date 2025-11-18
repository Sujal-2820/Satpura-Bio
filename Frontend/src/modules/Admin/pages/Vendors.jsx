import { useState, useEffect, useCallback } from 'react'
import { Building2, CreditCard, MapPin, ShieldAlert, Edit2, Eye, CheckCircle, Package } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Timeline } from '../components/Timeline'
import { Modal } from '../components/Modal'
import { VendorMap } from '../components/VendorMap'
import { VendorApprovalModal } from '../components/VendorApprovalModal'
import { CreditPolicyForm } from '../components/CreditPolicyForm'
import { PurchaseRequestModal } from '../components/PurchaseRequestModal'
import { VendorDetailModal } from '../components/VendorDetailModal'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { vendors as mockVendors } from '../services/adminData'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Vendor', accessor: 'name' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Credit Limit', accessor: 'creditLimit' },
  { Header: 'Repayment', accessor: 'repayment' },
  { Header: 'Penalty Rate', accessor: 'penalty' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Outstanding Dues', accessor: 'dues' },
  { Header: 'Actions', accessor: 'actions' },
]

export function VendorsPage() {
  const { vendors: vendorsState } = useAdminState()
  const {
    getVendors,
    approveVendor,
    rejectVendor,
    updateVendorCreditPolicy,
    getVendorPurchaseRequests,
    approveVendorPurchase,
    rejectVendorPurchase,
    loading,
  } = useAdminApi()

  const [vendorsList, setVendorsList] = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [pendingVendors, setPendingVendors] = useState([])
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedVendorForApproval, setSelectedVendorForApproval] = useState(null)
  const [creditPolicyModalOpen, setCreditPolicyModalOpen] = useState(false)
  const [selectedVendorForPolicy, setSelectedVendorForPolicy] = useState(null)
  const [purchaseRequestModalOpen, setPurchaseRequestModalOpen] = useState(false)
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null)
  const [vendorDetailModalOpen, setVendorDetailModalOpen] = useState(false)
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState(null)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [selectedVendorForMap, setSelectedVendorForMap] = useState(null)

  // Format vendor data for display
  const formatVendorForDisplay = (vendor) => {
    const creditLimit = typeof vendor.creditLimit === 'number'
      ? vendor.creditLimit
      : parseFloat(vendor.creditLimit?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const dues = typeof vendor.dues === 'number'
      ? vendor.dues
      : parseFloat(vendor.dues?.replace(/[₹,\sL]/g, '') || '0') * 100000

    return {
      ...vendor,
      creditLimit: creditLimit >= 100000 ? `₹${(creditLimit / 100000).toFixed(1)} L` : `₹${creditLimit.toLocaleString('en-IN')}`,
      dues: dues >= 100000 ? `₹${(dues / 100000).toFixed(1)} L` : `₹${dues.toLocaleString('en-IN')}`,
      repayment: vendor.repaymentDays ? `${vendor.repaymentDays} days` : vendor.repayment || 'N/A',
      penalty: vendor.penaltyRate ? `${vendor.penaltyRate}%` : vendor.penalty || 'N/A',
    }
  }

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    const result = await getVendors()
    if (result.data?.vendors) {
      const formatted = result.data.vendors.map(formatVendorForDisplay)
      setVendorsList(formatted)
      
      // Separate pending vendors
      const pending = result.data.vendors.filter((v) => v.status === 'pending' || v.status === 'review')
      setPendingVendors(pending)
    } else {
      // Fallback to mock data
      setVendorsList(mockVendors.map(formatVendorForDisplay))
    }
  }, [getVendors])

  // Fetch purchase requests
  const fetchPurchaseRequests = useCallback(async () => {
    const result = await getVendorPurchaseRequests({ status: 'pending' })
    if (result.data?.purchases) {
      setPurchaseRequests(result.data.purchases)
    }
  }, [getVendorPurchaseRequests])

  useEffect(() => {
    fetchVendors()
    fetchPurchaseRequests()
  }, [fetchVendors, fetchPurchaseRequests])

  // Refresh when vendors are updated
  useEffect(() => {
    if (vendorsState.updated) {
      fetchVendors()
      fetchPurchaseRequests()
    }
  }, [vendorsState.updated, fetchVendors, fetchPurchaseRequests])

  const handleApproveVendor = async (vendorId) => {
    const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === vendorId) || selectedVendorForApproval
    const result = await approveVendor(vendorId, {
      creditLimit: originalVendor.creditLimit || 1000000,
      repaymentDays: originalVendor.repaymentDays || 21,
      penaltyRate: originalVendor.penaltyRate || 1.5,
    })
    if (result.data) {
      setApprovalModalOpen(false)
      setSelectedVendorForApproval(null)
      fetchVendors()
    }
  }

  const handleRejectVendor = async (vendorId, rejectionData) => {
    const result = await rejectVendor(vendorId, rejectionData)
    if (result.data) {
      setApprovalModalOpen(false)
      setSelectedVendorForApproval(null)
      fetchVendors()
    }
  }

  const handleUpdateCreditPolicy = async (policyData) => {
    const result = await updateVendorCreditPolicy(selectedVendorForPolicy.id, policyData)
    if (result.data) {
      setCreditPolicyModalOpen(false)
      setSelectedVendorForPolicy(null)
      fetchVendors()
    }
  }

  const handleApprovePurchase = async (requestId) => {
    const result = await approveVendorPurchase(requestId)
    if (result.data) {
      setPurchaseRequestModalOpen(false)
      setSelectedPurchaseRequest(null)
      fetchPurchaseRequests()
      fetchVendors()
    }
  }

  const handleRejectPurchase = async (requestId, rejectionData) => {
    const result = await rejectVendorPurchase(requestId, rejectionData)
    if (result.data) {
      setPurchaseRequestModalOpen(false)
      setSelectedPurchaseRequest(null)
      fetchPurchaseRequests()
    }
  }

  const handleViewVendorDetails = (vendor) => {
    const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === vendor.id) || vendor
    setSelectedVendorForDetail(originalVendor)
    setVendorDetailModalOpen(true)
  }

  const handleViewVendorMap = (vendor) => {
    const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === vendor.id) || vendor
    setSelectedVendorForMap(originalVendor)
    setMapModalOpen(true)
  }

  const handleOpenApprovalModal = () => {
    if (pendingVendors.length > 0) {
      setSelectedVendorForApproval(pendingVendors[0])
      setApprovalModalOpen(true)
    } else {
      alert('No pending vendor applications at the moment.')
    }
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'Unknown'
          const tone = status === 'On Track' || status === 'on_track' ? 'success' : status === 'Delayed' || status === 'delayed' ? 'warning' : 'neutral'
          return <StatusBadge tone={tone}>{status}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'region') {
      return {
        ...column,
        Cell: (row) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-3 py-1 text-xs text-blue-700 font-bold shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <MapPin className="h-3.5 w-3.5" />
            {row.region}
          </span>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === row.id) || row
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewVendorMap(originalVendor)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                title="View location"
              >
                <MapPin className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewVendorDetails(originalVendor)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVendorForPolicy(originalVendor)
                  setCreditPolicyModalOpen(true)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                title="Update credit policy"
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Credit Performance Dashboard</h2>
          <p className="text-sm text-gray-600">
            Control approvals, credit policies, and vendor risk in real time with proactive alerts.
          </p>
        </div>
        <div className="flex gap-2">
          {purchaseRequests.length > 0 && (
            <button
              onClick={() => {
                setSelectedPurchaseRequest(purchaseRequests[0])
                setPurchaseRequestModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105"
            >
              <Package className="h-4 w-4" />
              Purchase Requests ({purchaseRequests.length})
            </button>
          )}
          <button
            onClick={handleOpenApprovalModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
          >
          <Building2 className="h-4 w-4" />
            Approve Vendors {pendingVendors.length > 0 && `(${pendingVendors.length})`}
        </button>
        </div>
      </header>

      <DataTable
        columns={tableColumns}
        rows={vendorsList}
        emptyState="No vendor records found"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-green-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-green-700">Credit Policy Playbook</h3>
          <p className="text-sm text-gray-600">
            Configure region-wise credit strategies, repayment cycles, and penalty protocols.
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Credit Limit Review',
                description:
                  'Identify vendors nearing 80% credit utilization. Initiate auto alerts and escalate to finance for manual override.',
                meta: 'Updated daily at 09:00',
              },
              {
                title: 'Repayment Monitoring',
                description:
                  'Flag repayments that exceed threshold by >7 days. Auto-calculate penalties and generate repayment reminders.',
                meta: 'SLA: 24h resolution',
              },
              {
                title: 'Purchase Approval (≥₹50,000)',
                description:
                  'Streamline manual approvals with supporting documents. Auto populate vendor performance insights before approval.',
                meta: `Pending approvals: ${purchaseRequests.length}`,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                  <span>{item.title}</span>
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.description}</p>
                <p className="mt-3 text-xs font-bold text-green-700">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">High Risk Alerts</h3>
              <p className="text-sm text-red-700">
                Automatic penalty application and collections follow-up. Review overdue repayments immediately.
              </p>
            </div>
          </div>
          <Timeline
            events={[
              {
                id: 'risk-1',
                title: 'HarvestLink Pvt Ltd',
                timestamp: 'Due in 2 days',
                description: '₹19.6 L pending. Escalated to finance with penalty rate 2%.',
                status: 'pending',
              },
              {
                id: 'risk-2',
                title: 'GrowSure Traders',
                timestamp: 'Settled today',
                description: 'Repayment received. Credit reinstated with new limit ₹28 L.',
                status: 'completed',
              },
              {
                id: 'risk-3',
                title: 'AgroSphere Logistics',
                timestamp: 'Overdue by 5 days',
                description: 'Penalty 1.5% applied. Legal notice scheduled.',
                status: 'pending',
              },
            ]}
          />
        </div>
      </section>

      {/* Vendor Approval Modal */}
      <VendorApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false)
          setSelectedVendorForApproval(null)
        }}
        vendor={selectedVendorForApproval}
        onApprove={handleApproveVendor}
        onReject={handleRejectVendor}
        loading={loading}
      />

      {/* Credit Policy Modal */}
      <Modal
        isOpen={creditPolicyModalOpen}
        onClose={() => {
          setCreditPolicyModalOpen(false)
          setSelectedVendorForPolicy(null)
        }}
        title="Update Credit Policy"
        size="md"
      >
        <CreditPolicyForm
          vendor={selectedVendorForPolicy}
          onSubmit={handleUpdateCreditPolicy}
          onCancel={() => {
            setCreditPolicyModalOpen(false)
            setSelectedVendorForPolicy(null)
          }}
          loading={loading}
        />
      </Modal>

      {/* Purchase Request Modal */}
      <PurchaseRequestModal
        isOpen={purchaseRequestModalOpen}
        onClose={() => {
          setPurchaseRequestModalOpen(false)
          setSelectedPurchaseRequest(null)
        }}
        request={selectedPurchaseRequest}
        onApprove={handleApprovePurchase}
        onReject={handleRejectPurchase}
        loading={loading}
      />

      {/* Vendor Detail Modal */}
      <VendorDetailModal
        isOpen={vendorDetailModalOpen}
        onClose={() => {
          setVendorDetailModalOpen(false)
          setSelectedVendorForDetail(null)
        }}
        vendor={selectedVendorForDetail}
        onUpdateCreditPolicy={(vendor) => {
          setVendorDetailModalOpen(false)
          setSelectedVendorForPolicy(vendor)
          setCreditPolicyModalOpen(true)
        }}
      />

      {/* Vendor Map Modal */}
      <Modal
        isOpen={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false)
          setSelectedVendorForMap(null)
        }}
        title={`${selectedVendorForMap?.name || 'Vendor'} Location`}
        size="lg"
      >
        <VendorMap vendor={selectedVendorForMap} className="h-[400px]" />
      </Modal>
    </div>
  )
}


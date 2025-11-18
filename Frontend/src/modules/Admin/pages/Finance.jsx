import { useState, useEffect, useCallback } from 'react'
import { BadgeIndianRupee, Sparkles, Building2, Eye, AlertCircle } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressList } from '../components/ProgressList'
import { Timeline } from '../components/Timeline'
import { Modal } from '../components/Modal'
import { VendorCreditBalanceModal } from '../components/VendorCreditBalanceModal'
import { FinancialParametersModal } from '../components/FinancialParametersModal'
import { OutstandingCreditsView } from '../components/OutstandingCreditsView'
import { RecoveryStatusView } from '../components/RecoveryStatusView'
import { DataTable } from '../components/DataTable'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { finance as mockFinance } from '../services/adminData'

const vendorColumns = [
  { Header: 'Vendor', accessor: 'name' },
  { Header: 'Credit Limit', accessor: 'creditLimit' },
  { Header: 'Used Credit', accessor: 'usedCredit' },
  { Header: 'Overdue', accessor: 'overdue' },
  { Header: 'Penalty', accessor: 'penalty' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function FinancePage() {
  const { finance: financeState, vendors } = useAdminState()
  const {
    getVendorCreditBalances,
    getFinancialParameters,
    updateFinancialParameters,
    applyPenalty,
    getOutstandingCredits,
    getRecoveryStatus,
    getVendors,
    loading,
  } = useAdminApi()

  const [vendorCredits, setVendorCredits] = useState([])
  const [financialParameters, setFinancialParameters] = useState(null)
  const [outstandingCredits, setOutstandingCredits] = useState([])
  const [recoveryStatus, setRecoveryStatus] = useState([])
  
  // Modal states
  const [parametersModalOpen, setParametersModalOpen] = useState(false)
  const [creditBalanceModalOpen, setCreditBalanceModalOpen] = useState(false)
  const [selectedVendorForCredit, setSelectedVendorForCredit] = useState(null)
  const [selectedVendorCreditData, setSelectedVendorCreditData] = useState(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    // Fetch vendor credit balances
    const creditsResult = await getVendorCreditBalances()
    if (creditsResult.data?.credits) {
      setVendorCredits(creditsResult.data.credits)
    }

    // Fetch financial parameters
    const paramsResult = await getFinancialParameters()
    if (paramsResult.data) {
      setFinancialParameters(paramsResult.data)
    }

    // Fetch outstanding credits
    const outstandingResult = await getOutstandingCredits()
    if (outstandingResult.data?.credits) {
      setOutstandingCredits(outstandingResult.data.credits)
    } else {
      // Fallback to mock data
      setOutstandingCredits(mockFinance.outstandingCredits)
    }

    // Fetch recovery status
    const recoveryResult = await getRecoveryStatus()
    if (recoveryResult.data?.recoveries) {
      setRecoveryStatus(recoveryResult.data.recoveries)
    }
  }, [getVendorCreditBalances, getFinancialParameters, getOutstandingCredits, getRecoveryStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh when finance is updated
  useEffect(() => {
    if (financeState.updated) {
      fetchData()
    }
  }, [financeState.updated, fetchData])

  const handleViewCreditBalance = async (vendor) => {
    setSelectedVendorForCredit(vendor)
    
    // Fetch detailed credit data
    const result = await getVendorCreditBalances({ vendorId: vendor.id || vendor.vendorId })
    if (result.data?.creditData) {
      setSelectedVendorCreditData(result.data.creditData)
    }
    
    setCreditBalanceModalOpen(true)
  }

  const handleSaveParameters = async (params) => {
    const result = await updateFinancialParameters(params)
    if (result.data) {
      setParametersModalOpen(false)
      fetchData()
    }
  }

  const handleApplyPenalty = async (vendorId) => {
    const confirmed = window.confirm('Are you sure you want to apply penalty for this vendor?')
    if (confirmed) {
      const result = await applyPenalty(vendorId)
      if (result.data) {
        fetchData()
        setCreditBalanceModalOpen(false)
        setSelectedVendorForCredit(null)
        setSelectedVendorCreditData(null)
      }
    }
  }

  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)} Cr`
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  const tableColumns = vendorColumns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const utilization = row.creditLimit > 0 ? (row.usedCredit / row.creditLimit) * 100 : 0
          const tone = utilization > 80 ? 'warning' : utilization > 50 ? 'neutral' : 'success'
          return <StatusBadge tone={tone}>{utilization.toFixed(0)}%</StatusBadge>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalVendor = vendors.data?.vendors?.find((v) => v.id === row.id) || row
          return (
            <button
              type="button"
              onClick={() => handleViewCreditBalance(originalVendor)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-pink-500 hover:bg-pink-50 hover:text-pink-700"
              title="View credit balance"
            >
              <Eye className="h-4 w-4" />
            </button>
          )
        },
      }
    }
    if (['creditLimit', 'usedCredit', 'overdue', 'penalty'].includes(column.accessor)) {
      return {
        ...column,
        Cell: (row) => {
          const value = row[column.accessor] || 0
          return <span className="text-sm font-bold text-gray-900">{formatCurrency(value)}</span>
        },
      }
    }
    return column
  })

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
        <button
          onClick={() => setParametersModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(236,72,153,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(236,72,153,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
        >
          <BadgeIndianRupee className="h-4 w-4" />
          Update Credit Settings
        </button>
      </header>

      {/* Vendor Credit Balances Table */}
      {vendorCredits.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="mb-4 text-lg font-bold text-gray-900">Vendor Credit Balances</h3>
          <DataTable
            columns={tableColumns}
            rows={vendorCredits}
            emptyState="No vendor credit data available"
          />
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-pink-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-pink-700">Global Parameters</h3>
          <p className="text-sm text-gray-600">
            Set default advances, minimum order values, and vendor purchase thresholds for the platform.
          </p>
          <div className="space-y-3">
            {financialParameters ? (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">User Advance Payment %</p>
                    <StatusBadge tone="success">{financialParameters.userAdvancePaymentPercent || 30}%</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Default advance for all user orders</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Minimum User Order</p>
                    <StatusBadge tone="success">₹{financialParameters.minimumUserOrder?.toLocaleString('en-IN') || '2,000'}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Minimum order value for user purchases</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Minimum Vendor Purchase</p>
                    <StatusBadge tone="success">₹{financialParameters.minimumVendorPurchase?.toLocaleString('en-IN') || '50,000'}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Minimum purchase value for vendor orders</p>
                </div>
              </>
            ) : (
              mockFinance.creditPolicies.map((policy) => (
              <div key={policy.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{policy.label}</p>
                  <StatusBadge tone="success">{policy.value}</StatusBadge>
                </div>
                <p className="mt-2 text-xs text-gray-600">{policy.meta}</p>
              </div>
              ))
            )}
          </div>
        </div>
        <OutstandingCreditsView credits={outstandingCredits} />
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

      {/* Recovery Status */}
      {recoveryStatus.length > 0 && (
        <RecoveryStatusView recoveryData={recoveryStatus} />
      )}

      {/* Financial Parameters Modal */}
      <FinancialParametersModal
        isOpen={parametersModalOpen}
        onClose={() => setParametersModalOpen(false)}
        parameters={financialParameters}
        onSave={handleSaveParameters}
        loading={loading}
      />

      {/* Vendor Credit Balance Modal */}
      <VendorCreditBalanceModal
        isOpen={creditBalanceModalOpen}
        onClose={() => {
          setCreditBalanceModalOpen(false)
          setSelectedVendorForCredit(null)
          setSelectedVendorCreditData(null)
        }}
        vendor={selectedVendorForCredit}
        creditData={selectedVendorCreditData}
        onApplyPenalty={handleApplyPenalty}
        loading={loading}
      />
    </div>
  )
}


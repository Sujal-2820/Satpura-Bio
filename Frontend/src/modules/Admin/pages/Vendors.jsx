import { useState, useEffect, useCallback } from 'react'
import { Building2, CreditCard, MapPin, ShieldAlert, Edit2, Eye, Package, Ban, Unlock, CheckCircle, XCircle, ArrowLeft, Calendar } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Timeline } from '../components/Timeline'
import { VendorMap } from '../components/VendorMap'
import { CreditPolicyForm } from '../components/CreditPolicyForm'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { vendors as mockVendors } from '../services/adminData'
import { cn } from '../../../lib/cn'

const EARTH_RADIUS_KM = 6371
const COVERAGE_RADIUS_KM = 20

const calculateDistanceKm = (pointA, pointB) => {
  if (!pointA?.lat || !pointA?.lng || !pointB?.lat || !pointB?.lng) {
    return Infinity
  }
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(pointB.lat - pointA.lat)
  const dLng = toRad(pointB.lng - pointA.lng)
  const lat1 = toRad(pointA.lat)
  const lat2 = toRad(pointB.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

const computeCoverageReport = (vendors = []) => {
  const geoVendors = vendors.filter((vendor) => vendor.location?.lat && vendor.location?.lng)
  const conflicts = []
  const flagged = new Set()

  for (let i = 0; i < geoVendors.length; i += 1) {
    for (let j = i + 1; j < geoVendors.length; j += 1) {
      const vendorA = geoVendors[i]
      const vendorB = geoVendors[j]
      const distanceKm = calculateDistanceKm(vendorA.location, vendorB.location)
      if (distanceKm < COVERAGE_RADIUS_KM) {
        flagged.add(vendorA.id)
        flagged.add(vendorB.id)
        conflicts.push({
          id: `${vendorA.id}-${vendorB.id}`,
          vendorA,
          vendorB,
          distanceKm: Number(distanceKm.toFixed(2)),
          overlapKm: Number(Math.max(COVERAGE_RADIUS_KM - distanceKm, 0).toFixed(2)),
        })
      }
    }
  }

  return {
    total: geoVendors.length,
    coverageRadius: COVERAGE_RADIUS_KM,
    conflicts,
    flaggedVendors: Array.from(flagged),
    compliantCount: Math.max(geoVendors.length - flagged.size, 0),
  }
}

const columns = [
  { Header: 'Vendor', accessor: 'name' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Coverage', accessor: 'coverageRadius' },
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
    banVendor,
    unbanVendor,
    updateVendorCreditPolicy,
    getVendorPurchaseRequests,
    approveVendorPurchase,
    rejectVendorPurchase,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [vendorsList, setVendorsList] = useState([])
  const [rawVendors, setRawVendors] = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [coverageReport, setCoverageReport] = useState(null)
  
  // View states (replacing modals with full-screen views)
  const [currentView, setCurrentView] = useState(null) // 'creditPolicy', 'vendorDetail', 'vendorMap', 'purchaseRequest', 'approveVendor', 'rejectVendor', 'banVendor', 'unbanVendor'
  const [selectedVendorForPolicy, setSelectedVendorForPolicy] = useState(null)
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null)
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState(null)
  const [selectedVendorForMap, setSelectedVendorForMap] = useState(null)
  const [selectedVendorForAction, setSelectedVendorForAction] = useState(null)
  const [actionData, setActionData] = useState(null) // For storing form data for actions like reject/ban
  const [rejectReason, setRejectReason] = useState('')
  const [banType, setBanType] = useState('temporary')
  const [banReason, setBanReason] = useState('')
  const [revocationReason, setRevocationReason] = useState('')
  const [purchaseRejectReason, setPurchaseRejectReason] = useState(null) // null = not showing, '' = showing input

  // Format vendor data for display
  const formatVendorForDisplay = (vendor, flaggedVendorIds = new Set()) => {
    const creditLimit = typeof vendor.creditLimit === 'number'
      ? vendor.creditLimit
      : parseFloat(vendor.creditLimit?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const dues = typeof vendor.dues === 'number'
      ? vendor.dues
      : parseFloat(vendor.dues?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const isFlagged = flaggedVendorIds.has(vendor.id)

    return {
      ...vendor,
      creditLimit: creditLimit >= 100000 ? `₹${(creditLimit / 100000).toFixed(1)} L` : `₹${creditLimit.toLocaleString('en-IN')}`,
      dues: dues >= 100000 ? `₹${(dues / 100000).toFixed(1)} L` : `₹${dues.toLocaleString('en-IN')}`,
      repayment: vendor.repaymentDays ? `${vendor.repaymentDays} days` : vendor.repayment || 'N/A',
      penalty: vendor.penaltyRate ? `${vendor.penaltyRate}%` : vendor.penalty || 'N/A',
      coverageRadius: vendor.coverageRadius ? `${vendor.coverageRadius} km` : 'N/A',
      coverageCompliance: isFlagged ? 'Conflict' : 'Compliant',
    }
  }

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    const result = await getVendors()
    const sourceVendors = result.data?.vendors || mockVendors
    setRawVendors(sourceVendors)
    const coverageInfo = computeCoverageReport(sourceVendors)
    setCoverageReport(coverageInfo)
    const flaggedSet = new Set(coverageInfo.flaggedVendors || [])
    const formatted = sourceVendors.map((vendor) => formatVendorForDisplay(vendor, flaggedSet))
    setVendorsList(formatted)
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

  const getVendorCoverageConflicts = (vendorId) => {
    if (!coverageReport?.conflicts) {
      return []
    }
    return coverageReport.conflicts.filter(
      (conflict) => conflict.vendorA.id === vendorId || conflict.vendorB.id === vendorId,
    )
  }

  const getRawVendorById = (vendorId) =>
    rawVendors.find((vendor) => vendor.id === vendorId) ||
    vendorsState.data?.vendors?.find((vendor) => vendor.id === vendorId)

  const withCoverageMeta = (vendor) => {
    if (!vendor) return vendor
    return {
      ...vendor,
      coverageRadius: vendor.coverageRadius || COVERAGE_RADIUS_KM,
      coverageConflicts: getVendorCoverageConflicts(vendor.id),
    }
  }

  const handleBanVendor = async (vendorId, banData) => {
    try {
      const result = await banVendor(vendorId, banData)
      if (result.data) {
        setCurrentView(null)
        setSelectedVendorForAction(null)
        setActionData(null)
        fetchVendors()
        success(`Vendor ${banData.banType === 'permanent' ? 'permanently' : 'temporarily'} banned successfully!`, 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to ban vendor'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to ban vendor', 5000)
    }
  }

  const handleUnbanVendor = async (vendorId, unbanData) => {
    try {
      const result = await unbanVendor(vendorId, unbanData)
      if (result.data) {
        fetchVendors()
        success('Vendor ban revoked successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to unban vendor'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to unban vendor', 5000)
    }
  }

  const handleUpdateCreditPolicy = async (policyData) => {
    try {
      const result = await updateVendorCreditPolicy(selectedVendorForPolicy.id, policyData)
      if (result.data) {
        setCurrentView(null)
        setSelectedVendorForPolicy(null)
        fetchVendors()
        success('Credit policy updated successfully!', 4000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update credit policy'
        // Check if it's a warning about vendor not being approved
        if (errorMessage.includes('approved') || errorMessage.includes('status')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update credit policy'
      showError(errorMessage, 5000)
    }
  }

  const handleApproveVendor = async (vendorId) => {
    try {
      const result = await approveVendor(vendorId)
      if (result.success || result.data) {
        setCurrentView(null)
        setSelectedVendorForAction(null)
        success('Vendor approved successfully!', 3000)
        // Refresh vendors list
        const vendorsResult = await getVendors({})
        if (vendorsResult.data) {
          setRawVendors(vendorsResult.data.vendors || [])
        }
        fetchVendors()
      } else {
        const errorMessage = result.error?.message || 'Failed to approve vendor'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to approve vendor', 5000)
    }
  }

  const handleRejectVendor = async (vendorId, rejectionData) => {
    try {
      const result = await rejectVendor(vendorId, rejectionData)
      if (result.success || result.data) {
        setCurrentView(null)
        setSelectedVendorForAction(null)
        setActionData(null)
        success('Vendor application rejected.', 3000)
        // Refresh vendors list
        const vendorsResult = await getVendors({})
        if (vendorsResult.data) {
          setRawVendors(vendorsResult.data.vendors || [])
        }
        fetchVendors()
      } else {
        const errorMessage = result.error?.message || 'Failed to reject vendor'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject vendor', 5000)
    }
  }

  const handleApprovePurchase = async (requestId) => {
    try {
      const result = await approveVendorPurchase(requestId)
      if (result.data) {
        setCurrentView(null)
        setSelectedPurchaseRequest(null)
        fetchPurchaseRequests()
        fetchVendors()
        success('Vendor purchase request approved successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to approve purchase request'
        if (errorMessage.includes('credit') || errorMessage.includes('limit') || errorMessage.includes('insufficient')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to approve purchase request', 5000)
    }
  }

  const handleRejectPurchase = async (requestId, rejectionData) => {
    try {
      const result = await rejectVendorPurchase(requestId, rejectionData)
      if (result.data) {
        setCurrentView(null)
        setSelectedPurchaseRequest(null)
        setActionData(null)
        fetchPurchaseRequests()
        fetchVendors()
        success('Vendor purchase request rejected.', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reject purchase request'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject purchase request', 5000)
    }
  }

  const handleViewVendorDetails = (vendor) => {
    const originalVendor = withCoverageMeta(getRawVendorById(vendor.id) || vendor)
    setSelectedVendorForDetail(originalVendor)
    setCurrentView('vendorDetail')
  }

  const handleViewVendorMap = (vendor) => {
    const originalVendor = withCoverageMeta(getRawVendorById(vendor.id) || vendor)
    setSelectedVendorForMap(originalVendor)
    setCurrentView('vendorMap')
  }

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedVendorForPolicy(null)
    setSelectedPurchaseRequest(null)
    setSelectedVendorForDetail(null)
    setSelectedVendorForMap(null)
    setSelectedVendorForAction(null)
    setRejectReason('')
    setBanType('temporary')
    setBanReason('')
    setRevocationReason('')
    setPurchaseRejectReason(null)
  }


  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === row.id) || row
          const isBanned = originalVendor.banInfo?.isBanned || originalVendor.status === 'temporarily_banned' || originalVendor.status === 'permanently_banned'
          const banType = originalVendor.banInfo?.banType || (originalVendor.status === 'permanently_banned' ? 'permanent' : 'temporary')
          const status = isBanned ? (banType === 'permanent' ? 'Permanently Banned' : 'Temporarily Banned') : (row.status || 'Active')
          let tone = 'neutral'
          if (isBanned) {
            tone = 'error'
          } else if (status === 'approved' || status === 'active' || status === 'On Track' || status === 'on_track') {
            tone = 'success'
          } else if (status === 'Delayed' || status === 'delayed') {
            tone = 'warning'
          } else if (status === 'inactive' || status === 'blocked') {
            tone = 'error'
          }
          // Capitalize first letter for display
          const displayStatus = status.charAt(0).toUpperCase() + status.slice(1)
          return <StatusBadge tone={tone}>{displayStatus}</StatusBadge>
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
    if (column.accessor === 'coverageRadius') {
      return {
        ...column,
        Cell: (row) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-gray-900">{row.coverageRadius || 'N/A'}</span>
            <StatusBadge tone={row.coverageCompliance === 'Conflict' ? 'warning' : 'success'}>
              {row.coverageCompliance || 'Unknown'}
            </StatusBadge>
          </div>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalVendor = vendorsState.data?.vendors?.find((v) => v.id === row.id) || row
          const vendorStatus = originalVendor.status?.toLowerCase() || 'active'
          const isPending = vendorStatus === 'pending'
          const isRejected = vendorStatus === 'rejected'
          const isBanned = originalVendor.banInfo?.isBanned || originalVendor.status === 'temporarily_banned' || originalVendor.status === 'permanently_banned'
          const banType = originalVendor.banInfo?.banType || (originalVendor.status === 'permanently_banned' ? 'permanent' : 'temporary')
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
              
              {/* Approve/Reject buttons for pending vendors */}
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendorForAction(originalVendor)
                      setCurrentView('approveVendor')
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-300 bg-green-50 text-green-700 transition-all hover:border-green-500 hover:bg-green-100 hover:text-green-800"
                    title="Approve vendor"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                  onClick={() => {
                    setSelectedVendorForAction(originalVendor)
                    setRejectReason('')
                    setCurrentView('rejectVendor')
                  }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition-all hover:border-red-500 hover:bg-red-100 hover:text-red-800"
                    title="Reject vendor"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Actions for approved vendors (not banned) */}
              {!isBanned && !isPending && !isRejected && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendorForPolicy(originalVendor)
                      setCurrentView('creditPolicy')
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                    title="Update credit policy"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                  onClick={() => {
                    setSelectedVendorForAction(originalVendor)
                    setBanType('temporary')
                    setBanReason('')
                    setCurrentView('banVendor')
                  }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition-all hover:border-red-500 hover:bg-red-100 hover:text-red-800"
                    title="Ban vendor"
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                </>
              )}
              {isBanned && banType === 'temporary' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendorForAction(originalVendor)
                    setRevocationReason('')
                    setCurrentView('unbanVendor')
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-300 bg-green-50 text-green-700 transition-all hover:border-green-500 hover:bg-green-100 hover:text-green-800"
                  title="Unban vendor"
                >
                  <Unlock className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        },
      }
    }
    return column
  })

  // Render full-screen views
  if (currentView === 'creditPolicy' && selectedVendorForPolicy) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Update Credit Policy</h2>
            <p className="text-sm text-gray-600">
              Configure credit limit, repayment terms, and penalty rates for {selectedVendorForPolicy.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <CreditPolicyForm
            vendor={selectedVendorForPolicy}
            onSubmit={handleUpdateCreditPolicy}
            onCancel={handleBackToList}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'vendorDetail' && selectedVendorForDetail) {
    const vendor = selectedVendorForDetail
    const formatCurrency = (value) => {
      if (typeof value === 'string') return value
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
      return `₹${value.toLocaleString('en-IN')}`
    }
    const creditLimit = typeof vendor.creditLimit === 'number' 
      ? vendor.creditLimit 
      : parseFloat(vendor.creditLimit?.replace(/[₹,\sL]/g, '') || '0') * 100000
    const dues = typeof vendor.dues === 'number'
      ? vendor.dues
      : parseFloat(vendor.dues?.replace(/[₹,\sL]/g, '') || '0') * 100000
    const creditUtilization = creditLimit > 0 ? ((dues / creditLimit) * 100).toFixed(1) : 0

    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Vendor Details & Performance</h2>
            <p className="text-sm text-gray-600">
              Comprehensive view of vendor information, credit status, and performance metrics.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            {/* Vendor Header */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                    <p className="text-sm text-gray-600">Vendor ID: {vendor.id}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{vendor.region}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge tone={vendor.status === 'On Track' || vendor.status === 'on_track' ? 'success' : vendor.status === 'Delayed' || vendor.status === 'delayed' ? 'warning' : 'neutral'}>
                  {vendor.status || 'Unknown'}
                </StatusBadge>
              </div>
            </div>

            {/* Credit Performance Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Credit Limit</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(creditLimit)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Outstanding Dues</p>
                <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(dues)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Credit Utilization</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{creditUtilization}%</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      parseFloat(creditUtilization) > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' : parseFloat(creditUtilization) > 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-green-500 to-green-600',
                    )}
                    style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Repayment Days</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{vendor.repaymentDays || vendor.repayment || 'N/A'}</p>
              </div>
            </div>

            {/* Coverage & Policy */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Coverage Radius</h4>
                    <p className="mt-2 text-2xl font-bold text-blue-900">
                      {vendor.coverageRadius ? `${vendor.coverageRadius} km` : 'N/A'}
                    </p>
                    {vendor.serviceArea && <p className="text-xs text-blue-700">{vendor.serviceArea}</p>}
                  </div>
                  <StatusBadge tone={vendor.coverageConflicts?.length ? 'warning' : 'success'}>
                    {vendor.coverageConflicts?.length ? 'Conflict' : 'Compliant'}
                  </StatusBadge>
                </div>
                {vendor.coverageConflicts?.length ? (
                  <ul className="mt-4 space-y-2 text-xs text-blue-900">
                    {vendor.coverageConflicts.map((conflict) => {
                      const otherVendor = conflict.vendorA.id === vendor.id ? conflict.vendorB : conflict.vendorA
                      return (
                        <li key={`${vendor.id}-${otherVendor.id}`} className="rounded-lg border border-blue-200 bg-white/80 px-3 py-2">
                          <p className="font-semibold">{otherVendor.name}</p>
                          <p className="text-[0.7rem] text-blue-700">
                            Distance: {conflict.distanceKm} km • Overlap: {conflict.overlapKm} km
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-blue-800">
                    No overlapping vendors detected within the 20 km exclusivity rule.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-green-900">Credit Policy</h4>
                    <div className="mt-2 grid gap-2 text-xs text-green-800 sm:grid-cols-3">
                      <div>
                        <span className="font-semibold">Limit: </span>
                        <span>{formatCurrency(creditLimit)}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Repayment: </span>
                        <span>{vendor.repaymentDays || vendor.repayment || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Penalty: </span>
                        <span>{vendor.penaltyRate || vendor.penalty || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendorForPolicy(vendor)
                      setCurrentView('creditPolicy')
                    }}
                    className="rounded-lg border border-green-300 bg-white px-4 py-2 text-xs font-bold text-green-700 transition-all hover:bg-green-100"
                  >
                    Update Policy
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Alerts */}
            {parseFloat(creditUtilization) > 80 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-900">High Credit Utilization Alert</p>
                    <p className="mt-1 text-xs text-red-700">
                      This vendor has exceeded 80% credit utilization. Consider reviewing their credit limit or requesting immediate repayment.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'vendorMap' && selectedVendorForMap) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">{selectedVendorForMap.name} Location</h2>
            <p className="text-sm text-gray-600">
              View vendor location and coverage area on the map.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <VendorMap vendor={selectedVendorForMap} className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (currentView === 'purchaseRequest' && selectedPurchaseRequest) {
    const request = selectedPurchaseRequest
    const formatCurrency = (value) => {
      if (typeof value === 'string') return value
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
      return `₹${value.toLocaleString('en-IN')}`
    }

    const handleRejectWithReason = () => {
      handleRejectPurchase(request.id, { reason: purchaseRejectReason || 'Purchase request rejected by admin' })
    }

    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Vendor Purchase Request Review</h2>
            <p className="text-sm text-gray-600">
              Review and approve or reject vendor purchase requests (minimum ₹50,000).
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            {/* Request Header */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Request #{request.id?.slice(-8) || request.requestId?.slice(-8) || 'N/A'}
                    </h3>
                    <p className="text-sm text-gray-600">Vendor: {request.vendorName || request.vendor}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {request.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(request.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge tone={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'neutral'}>
                  {request.status || 'Pending'}
                </StatusBadge>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Purchase Details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Request Amount</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {formatCurrency(request.amount || request.value || 0)}
                  </p>
                </div>
                {request.advance && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Advance Payment (30%)</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(request.advance)}</p>
                  </div>
                )}
              </div>

              {request.products && request.products.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-xs font-bold text-gray-500">Products Requested</p>
                  <div className="space-y-2">
                    {request.products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-white p-3">
                        <span className="text-sm text-gray-700">{product.name || product}</span>
                        {product.quantity && <span className="text-xs text-gray-500">Qty: {product.quantity}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.description && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-700">{request.description}</p>
                </div>
              )}
            </div>

            {/* Rejection Reason Input (shown when rejecting) */}
            {purchaseRejectReason !== null && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-sm font-bold text-gray-900">
                  Rejection Reason <span className="text-xs font-normal text-gray-500">(Required for rejection)</span>
                </label>
                <textarea
                  value={purchaseRejectReason}
                  onChange={(e) => setPurchaseRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            )}

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
                <button
                  type="button"
                  onClick={() => {
                    if (purchaseRejectReason === null) {
                      setPurchaseRejectReason('')
                    } else {
                      handleRejectWithReason()
                    }
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {purchaseRejectReason === null ? 'Reject' : 'Confirm Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePurchase(request.id)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Processing...' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Action views (Approve, Reject, Ban, Unban)
  if (currentView === 'approveVendor' && selectedVendorForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Approve Vendor</h2>
            <p className="text-sm text-gray-600">
              Approve vendor application for {selectedVendorForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedVendorForAction.name}</h3>
                  <p className="text-sm text-gray-600">Vendor ID: {selectedVendorForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedVendorForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-bold text-gray-900 mb-4">Are you sure you want to approve this vendor?</p>
              <p className="text-sm text-gray-600 mb-6">
                Once approved, the vendor will be able to access their dashboard and start receiving orders.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveVendor(selectedVendorForAction.id)}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'rejectVendor' && selectedVendorForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Reject Vendor</h2>
            <p className="text-sm text-gray-600">
              Reject vendor application for {selectedVendorForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <XCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedVendorForAction.name}</h3>
                  <p className="text-sm text-gray-600">Vendor ID: {selectedVendorForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedVendorForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (optional)"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectVendor(selectedVendorForAction.id, { reason: rejectReason || 'Application rejected by admin' })}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Reject Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'banVendor' && selectedVendorForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Ban Vendor</h2>
            <p className="text-sm text-gray-600">
              Ban vendor {selectedVendorForAction.name} temporarily or permanently.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <Ban className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedVendorForAction.name}</h3>
                  <p className="text-sm text-gray-600">Vendor ID: {selectedVendorForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedVendorForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Ban Type <span className="text-red-500">*</span>
              </label>
              <div className="mb-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBanType('temporary')}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                    banType === 'temporary'
                      ? 'border-yellow-500 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300 hover:bg-yellow-50',
                  )}
                >
                  Temporary
                </button>
                <button
                  type="button"
                  onClick={() => setBanType('permanent')}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                    banType === 'permanent'
                      ? 'border-red-500 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50',
                  )}
                >
                  Permanent
                </button>
              </div>
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Ban Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning this vendor"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBanVendor(selectedVendorForAction.id, { banType, banReason: banReason || 'Banned by admin' })}
                  disabled={loading || !banReason.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Banning...' : `Ban Vendor (${banType})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'unbanVendor' && selectedVendorForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • Vendor Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Unban Vendor</h2>
            <p className="text-sm text-gray-600">
              Revoke ban for vendor {selectedVendorForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                  <Unlock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedVendorForAction.name}</h3>
                  <p className="text-sm text-gray-600">Vendor ID: {selectedVendorForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedVendorForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Revocation Reason <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Enter reason for revoking ban (optional)"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUnbanVendor(selectedVendorForAction.id, { revocationReason: revocationReason || 'Ban revoked by admin' })}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Unbanning...' : 'Unban Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main vendors list view
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
                setCurrentView('purchaseRequest')
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105"
            >
              <Package className="h-4 w-4" />
              Purchase Requests ({purchaseRequests.length})
            </button>
          )}
        </div>
      </header>

      <DataTable
        columns={tableColumns}
        rows={vendorsList}
        emptyState="No vendor records found"
      />

      {coverageReport && (
        <section className="space-y-5 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/30 p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-blue-900">Coverage Compliance (20 km rule)</h3>
              <p className="text-sm text-blue-700">
                Ensure exclusive vendor coverage per 20 km radius. Automated monitoring across all mapped vendors.
              </p>
            </div>
            <StatusBadge tone={coverageReport.conflicts.length ? 'warning' : 'success'}>
              {coverageReport.conflicts.length ? `${coverageReport.conflicts.length} conflict(s)` : 'All zones compliant'}
            </StatusBadge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-white p-4">
              <p className="text-xs text-blue-500">Vendors with Geo Coverage</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{coverageReport.total}</p>
              <p className="text-[0.7rem] text-blue-700">Mapped with latitude & longitude</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600">Conflict Zones</p>
              <p className="mt-1 text-2xl font-bold text-yellow-800">{coverageReport.flaggedVendors?.length || 0}</p>
              <p className="text-[0.7rem] text-yellow-700">Vendors requiring reassignment</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-600">Compliant Zones</p>
              <p className="mt-1 text-2xl font-bold text-green-800">{coverageReport.compliantCount}</p>
              <p className="text-[0.7rem] text-green-700">Operating within exclusive radius</p>
            </div>
          </div>

          {coverageReport.conflicts.length > 0 ? (
            <div className="space-y-3">
              {coverageReport.conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-red-900">
                      {conflict.vendorA.name} ↔ {conflict.vendorB.name}
                    </p>
                    <p className="text-xs text-red-700">
                      Distance: {conflict.distanceKm} km • Overlap risk: {conflict.overlapKm} km inside 20 km rule
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewVendorMap(conflict.vendorA)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      View {conflict.vendorA.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewVendorMap(conflict.vendorB)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      View {conflict.vendorB.name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-white p-4 text-xs text-green-700">
              All vendor coverage areas comply with the 20 km exclusivity policy.
            </div>
          )}
        </section>
      )}

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


    </div>
  )
}


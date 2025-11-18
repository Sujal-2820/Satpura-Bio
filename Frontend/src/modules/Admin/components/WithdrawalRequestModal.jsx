import { Wallet, CheckCircle, XCircle, IndianRupee, Calendar, User } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { cn } from '../../../lib/cn'

export function WithdrawalRequestModal({ isOpen, onClose, request, onApprove, onReject, loading }) {
  if (!request) return null

  const handleApprove = () => {
    onApprove(request.id)
  }

  const handleReject = () => {
    const reason = window.prompt('Please provide a reason for rejection:')
    if (reason) {
      onReject(request.id, { reason })
    }
  }

  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seller Withdrawal Request Review" size="md">
      <div className="space-y-6">
        {/* Request Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Request #{request.id || request.requestId}</h3>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{request.sellerName || request.seller?.name || 'Unknown Seller'}</span>
                </div>
                {request.sellerId && (
                  <p className="mt-1 text-xs text-gray-500">Seller ID: {request.sellerId || request.seller?.sellerId}</p>
                )}
                {request.date && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{request.date}</span>
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

          {request.bankDetails && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-bold text-gray-500">Bank Account Details</p>
              <div className="space-y-1 text-sm text-gray-700">
                {request.bankDetails.accountNumber && (
                  <p>Account: {request.bankDetails.accountNumber}</p>
                )}
                {request.bankDetails.ifsc && (
                  <p>IFSC: {request.bankDetails.ifsc}</p>
                )}
                {request.bankDetails.bankName && (
                  <p>Bank: {request.bankDetails.bankName}</p>
                )}
              </div>
            </div>
          )}

          {request.reason && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-bold text-gray-500">Reason for Withdrawal</p>
              <p className="text-sm text-gray-700">{request.reason}</p>
            </div>
          )}

          {request.sellerPerformance && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-bold text-blue-900">Seller Performance Summary</p>
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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Processing...' : 'Approve Withdrawal'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}


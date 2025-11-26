import { useState, useEffect } from 'react'
import { AlertCircle, Package, X, CheckCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useVendorApi } from '../hooks/useVendorApi'
import { useToast } from '../components/ToastNotification'

/**
 * Order Escalation Modal
 * Handles full order escalation (Scenario 1 & 4)
 */
export function OrderEscalationModal({ isOpen, onClose, order, onSuccess }) {
  const { rejectOrder, loading } = useVendorApi()
  const { success, error: showError } = useToast()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedReason, setSelectedReason] = useState('')

  const escalationReasons = [
    { value: 'insufficient_stock', label: 'Insufficient Stock Available' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'quality_concerns', label: 'Quality Concerns' },
    { value: 'logistics_issue', label: 'Logistics/Delivery Issue' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setNotes('')
      setSelectedReason('')
    }
  }, [isOpen])

  const handleEscalate = async () => {
    if (!selectedReason && !reason.trim()) {
      showError('Please select or provide an escalation reason')
      return
    }

    const escalationReason = selectedReason === 'other' ? reason : escalationReasons.find(r => r.value === selectedReason)?.label || reason

    if (!escalationReason.trim()) {
      showError('Please provide an escalation reason')
      return
    }

    try {
      const result = await rejectOrder(order.id, {
        reason: escalationReason,
        notes: notes.trim() || undefined,
      })

      if (result.data) {
        success('Order escalated to admin successfully')
        onSuccess?.(result.data)
        onClose()
      } else if (result.error) {
        showError(result.error.message || 'Failed to escalate order')
      }
    } catch (err) {
      showError(err.message || 'Failed to escalate order')
    }
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-bold text-gray-900">Escalate Order to Admin</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Order Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-900">Order #{order.orderNumber || order.id}</p>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Customer: {order.farmer || 'Unknown'}</p>
              <p>Order Value: {order.value || 'N/A'}</p>
            </div>
          </div>

          {/* Items & Vendor Stock */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Items & your stock</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {order.items.map((item) => {
                  const productName = item.productId?.name || item.productName || 'Unknown product'
                  const requestedQty = item.quantity || 0
                  const vendorStock = item.vendorStock ?? 0
                  const unit = item.unit || 'units'

                  return (
                    <div key={item._id || item.id} className="rounded-lg border border-gray-200 p-2">
                      <p className="text-sm font-semibold text-gray-900">{productName}</p>
                      <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
                        <span>Requested: {requestedQty} {unit}</span>
                        <span
                          className={cn(
                            'font-semibold',
                            vendorStock > 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          Your stock: {vendorStock} {unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Escalation Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Escalation Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {escalationReasons.map((reasonOption) => (
                <label
                  key={reasonOption.value}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    selectedReason === reasonOption.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="escalationReason"
                    value={reasonOption.value}
                    checked={selectedReason === reasonOption.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm text-gray-900">{reasonOption.label}</span>
                </label>
              ))}
            </div>
            {selectedReason === 'other' && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide the escalation reason..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-900">
                This order will be escalated to Admin for fulfillment. You will no longer be responsible for this order.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEscalate}
            disabled={loading || (!selectedReason && !reason.trim())}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Escalating...'
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Escalate to Admin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


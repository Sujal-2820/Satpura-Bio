import { useState, useEffect } from 'react'
import { Package, X, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useVendorApi } from '../hooks/useVendorApi'
import { useToast } from '../components/ToastNotification'

/**
 * Order Partial Escalation Modal
 * Handles partial item escalation (Scenario 2) and partial quantity escalation (Scenario 3)
 */
export function OrderPartialEscalationModal({ isOpen, onClose, order, escalationType = 'items', onSuccess }) {
  const { acceptOrderPartially, escalateOrderPartial, getOrderDetails, loading } = useVendorApi()
  const { success, error: showError } = useToast()
  const [orderDetails, setOrderDetails] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [escalatedQuantities, setEscalatedQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')

  // escalationType: 'items' (Scenario 2) or 'quantities' (Scenario 3)

  useEffect(() => {
    if (isOpen && order?.id) {
      loadOrderDetails()
    }
  }, [isOpen, order?.id])

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems({})
      setEscalatedQuantities({})
      setNotes('')
      setReason('')
      setOrderDetails(null)
    }
  }, [isOpen])

  const loadOrderDetails = async () => {
    try {
      const result = await getOrderDetails(order.id)
      if (result.data?.order) {
        setOrderDetails(result.data.order)
        // Initialize selected items
        const items = result.data.order.items || []
        const initialSelected = {}
        items.forEach((item) => {
          initialSelected[item._id || item.id] = {
            accept: true,
            quantity: item.quantity,
          }
        })
        setSelectedItems(initialSelected)
      }
    } catch (err) {
      showError('Failed to load order details')
    }
  }

  const handleItemToggle = (itemId, action) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        accept: action === 'accept',
      },
    }))
  }

  const handleQuantityChange = (itemId, escalatedQty) => {
    const item = orderDetails?.items?.find((i) => (i._id || i.id) === itemId)
    const requestedQty = item?.quantity || 0
    const escalated = Math.max(0, Math.min(escalatedQty, requestedQty))
    
    setEscalatedQuantities((prev) => ({
      ...prev,
      [itemId]: escalated,
    }))
  }

  const handleSubmit = async () => {
    if (escalationType === 'items') {
      // Scenario 2: Partial item escalation
      const acceptedItems = []
      const rejectedItems = []

      orderDetails?.items?.forEach((item) => {
        const itemId = item._id || item.id
        const selection = selectedItems[itemId]
        
        if (selection?.accept) {
          acceptedItems.push({
            itemId,
            quantity: item.quantity,
          })
        } else {
          rejectedItems.push({
            itemId,
            quantity: item.quantity,
            reason: reason || 'Item not available',
          })
        }
      })

      if (acceptedItems.length === 0) {
        showError('Please accept at least one item')
        return
      }

      if (rejectedItems.length === 0) {
        showError('Please reject at least one item to escalate')
        return
      }

      try {
        const result = await acceptOrderPartially(order.id, {
          acceptedItems,
          rejectedItems,
          notes: notes.trim() || undefined,
        })

        if (result.data) {
          success('Order partially accepted. Rejected items escalated to admin.')
          onSuccess?.(result.data)
          onClose()
        } else if (result.error) {
          showError(result.error.message || 'Failed to process partial acceptance')
        }
      } catch (err) {
        showError(err.message || 'Failed to process partial acceptance')
      }
    } else {
      // Scenario 3: Partial quantity escalation
      const escalatedItems = []

      orderDetails?.items?.forEach((item) => {
        const itemId = item._id || item.id
        const escalatedQty = escalatedQuantities[itemId] || 0
        
        if (escalatedQty > 0 && escalatedQty < item.quantity) {
          escalatedItems.push({
            itemId,
            escalatedQuantity: escalatedQty,
            reason: reason || 'Partial quantity not available',
          })
        }
      })

      if (escalatedItems.length === 0) {
        showError('Please specify quantities to escalate for at least one item')
        return
      }

      if (!reason.trim()) {
        showError('Please provide an escalation reason')
        return
      }

      try {
        const result = await escalateOrderPartial(order.id, {
          escalatedItems,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        })

        if (result.data) {
          success('Order partially escalated. Remaining quantities will be fulfilled by you.')
          onSuccess?.(result.data)
          onClose()
        } else if (result.error) {
          showError(result.error.message || 'Failed to escalate order')
        }
      } catch (err) {
        showError(err.message || 'Failed to escalate order')
      }
    }
  }

  if (!isOpen || !order) return null

  const items = orderDetails?.items || order.items || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">
              {escalationType === 'items' ? 'Partial Item Escalation' : 'Partial Quantity Escalation'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Order Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900">Order #{order.orderNumber || order.id}</p>
            <p className="text-xs text-gray-600">Customer: {order.farmer || 'Unknown'}</p>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Order Items</h4>
            {items.map((item) => {
              const itemId = item._id || item.id
              const selection = selectedItems[itemId] || { accept: true, quantity: item.quantity }
              const escalatedQty = escalatedQuantities[itemId] || 0
              const requestedQty = item.quantity || 0
              const vendorStock = item.vendorStock ?? 0
              const unit = item.unit || 'units'

              return (
                <div key={itemId} className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.productId?.name || item.productName || 'Unknown Product'}
                      </p>
                      <div className="text-xs text-gray-600 flex flex-col gap-0.5">
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
                  </div>

                  {escalationType === 'items' ? (
                    // Scenario 2: Accept/Reject items
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemToggle(itemId, 'accept')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all',
                          selection.accept
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        )}
                      >
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemToggle(itemId, 'reject')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all',
                          !selection.accept
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        )}
                      >
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Escalate
                      </button>
                    </div>
                  ) : (
                    // Scenario 3: Partial quantity escalation
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-700">Quantity to Escalate:</label>
                        <input
                          type="number"
                          min="0"
                          max={requestedQty}
                          value={escalatedQty}
                          onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <span className="text-xs text-gray-600">of {requestedQty} {unit}</span>
                      </div>
                      {escalatedQty > 0 && escalatedQty < requestedQty && (
                        <p className="text-xs text-green-600">
                          You will fulfill: {requestedQty - escalatedQty} {unit}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Escalation Reason (for quantity escalation) */}
          {escalationType === 'quantities' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Escalation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you escalating these quantities?"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900">
                {escalationType === 'items'
                  ? 'Accepted items will be fulfilled by you. Rejected items will be escalated to Admin.'
                  : 'Specified quantities will be escalated to Admin. Remaining quantities will be fulfilled by you.'}
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
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {escalationType === 'items' ? 'Accept & Escalate' : 'Escalate Quantities'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


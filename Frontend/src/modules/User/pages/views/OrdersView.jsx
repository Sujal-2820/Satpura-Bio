import { useState, useMemo } from 'react'
import { useUserState } from '../../context/UserContext'
import { useUserApi } from '../../hooks/useUserApi'
import { PackageIcon, TruckIcon, ClockIcon, CheckCircleIcon, CreditCardIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { useToast } from '../../components/ToastNotification'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'Awaiting' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'added_to_cart', label: 'In Cart' },
]

const USER_ORDER_STATUSES = ['awaiting', 'dispatched', 'delivered']
const STATUS_LABELS = {
  awaiting: 'Awaiting',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}
const STATUS_DESCRIPTIONS = {
  awaiting: 'Vendor is confirming stock and assigning a delivery partner.',
  dispatched: 'Order handed over for delivery. Track updates in real time.',
  delivered: 'Order delivered. Complete remaining payment if pending.',
}

const getStatusKey = (status) => {
  if (!status) return 'awaiting'
  const normalized = status.toLowerCase()
  if (normalized.includes('deliver')) return 'delivered'
  if (normalized.includes('dispatch')) return 'dispatched'
  if (normalized.includes('await')) return 'awaiting'
  return normalized
}

const getDisplayStatus = (status) => {
  if (status === 'added_to_cart') return 'In Cart'
  const key = getStatusKey(status)
  return STATUS_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

const formatTimelineTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

export function OrdersView() {
  const { orders, cart } = useUserState()
  const { createRemainingPaymentIntent, confirmRemainingPayment, loading } = useUserApi()
  const { success, error: showError } = useToast()
  const [activeFilter, setActiveFilter] = useState('all')
  const [processingPayment, setProcessingPayment] = useState(null)

  // Combine orders and cart items
  const allItems = useMemo(() => {
    const orderItems = orders.map((order) => {
      const normalizedStatus = getStatusKey(order.status)
      return {
        ...order,
        type: 'order',
        status: normalizedStatus,
        statusTimeline: order.statusTimeline || [],
      }
    })

    // Add cart items as "added_to_cart" status
    const cartItems = cart.length > 0
      ? [
          {
            id: 'cart',
            type: 'cart',
            status: 'added_to_cart',
            date: new Date().toISOString(),
            items: cart,
            total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            paymentStatus: 'pending',
          },
        ]
      : []

    return [...cartItems, ...orderItems]
  }, [orders, cart])

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return allItems
    }
    if (activeFilter === 'added_to_cart') {
      return allItems.filter((item) => item.status === 'added_to_cart')
    }
    return allItems.filter((item) => item.status === activeFilter)
  }, [allItems, activeFilter])

  const getStatusIcon = (status) => {
    if (status === 'added_to_cart') return <PackageIcon className="h-4 w-4" />
    const key = getStatusKey(status)
    if (key === 'awaiting') return <ClockIcon className="h-4 w-4" />
    if (key === 'dispatched') return <TruckIcon className="h-4 w-4" />
    if (key === 'delivered') return <CheckCircleIcon className="h-4 w-4" />
    return <PackageIcon className="h-4 w-4" />
  }

  const getStatusColor = (status) => {
    if (status === 'added_to_cart') return 'bg-blue-100 text-blue-700'
    const key = getStatusKey(status)
    if (key === 'awaiting') return 'bg-yellow-100 text-yellow-700'
    if (key === 'dispatched') return 'bg-indigo-100 text-indigo-700'
    if (key === 'delivered') return 'bg-green-100 text-[#1b8f5b]'
    return 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const handlePayRemaining = async (order) => {
    if (!order || !order.id) {
      showError('Invalid order')
      return
    }

    setProcessingPayment(order.id)

    try {
      // Create remaining payment intent
      const paymentIntentResult = await createRemainingPaymentIntent(order.id, 'razorpay')

      if (paymentIntentResult.error) {
        showError(paymentIntentResult.error.message || 'Failed to initialize payment')
        setProcessingPayment(null)
        return
      }

      const { paymentIntentId, clientSecret, amount } = paymentIntentResult.data

      // In a real app, this would integrate with Razorpay/Paytm/Stripe SDK
      // TODO: Integrate actual payment gateway SDK here
      
      // Simulate payment confirmation (replace with actual gateway integration)
      const paymentDetails = {
        paymentIntentId,
        clientSecret,
        // Add actual payment gateway response here
      }

      const confirmResult = await confirmRemainingPayment(
        order.id,
        paymentIntentId,
        'razorpay',
        paymentDetails
      )

      if (confirmResult.error) {
        showError(confirmResult.error.message || 'Payment failed')
        setProcessingPayment(null)
        return
      }

      success(`Remaining payment of ₹${amount.toLocaleString('en-IN')} completed successfully!`)
      setProcessingPayment(null)
      
      // Order status will be updated via real-time notification or refresh
    } catch (err) {
      showError('Payment processing failed. Please try again.')
      setProcessingPayment(null)
    }
  }

  const renderStatusTracker = (item) => {
    if (item.type !== 'order') return null
    const currentStatus = getStatusKey(item.status)
    const currentIndex = USER_ORDER_STATUSES.indexOf(currentStatus)
    return (
      <div className="user-orders-view__tracker">
        {USER_ORDER_STATUSES.map((status, index) => {
          const timelineEntry = item.statusTimeline?.find((entry) => entry.status === status)
          return (
            <div
              key={`${item.id}-${status}`}
              className={cn(
                'user-orders-view__tracker-step',
                index <= currentIndex && 'user-orders-view__tracker-step--active',
              )}
            >
              <span className="user-orders-view__tracker-step-index">{index + 1}</span>
              <div className="user-orders-view__tracker-step-body">
                <p className="user-orders-view__tracker-step-title">{STATUS_LABELS[status]}</p>
                <p className="user-orders-view__tracker-step-desc">{STATUS_DESCRIPTIONS[status]}</p>
                {timelineEntry?.timestamp && (
                  <p className="user-orders-view__tracker-step-time">
                    {formatTimelineTimestamp(timelineEntry.timestamp)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="user-orders-view space-y-6">
      <div className="user-orders-view__header">
        <h2 className="user-orders-view__title">My Orders</h2>
      </div>

      {/* Filter Tabs */}
      <div className="user-orders-view__filters">
        <div className="user-orders-view__filters-rail">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'user-orders-view__filter-tab',
                activeFilter === tab.id && 'user-orders-view__filter-tab--active'
              )}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="user-orders-view__list">
        {filteredItems.length === 0 ? (
          <div className="user-orders-view__empty">
            <PackageIcon className="user-orders-view__empty-icon" />
            <h3 className="user-orders-view__empty-title">No orders found</h3>
            <p className="user-orders-view__empty-text">
              {activeFilter === 'all'
                ? "You haven't placed any orders yet"
                : `No ${FILTER_TABS.find((t) => t.id === activeFilter)?.label.toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="user-orders-view__card">
              <div className="user-orders-view__card-header">
                <div className="user-orders-view__card-header-left">
                  <div className="user-orders-view__card-id">
                    {item.type === 'cart' ? 'Cart' : `Order #${item.id?.slice(-8) || 'N/A'}`}
                  </div>
                  <div className="user-orders-view__card-date">{formatDate(item.date)}</div>
                </div>
                <div className={cn('user-orders-view__card-status', getStatusColor(item.status))}>
                  {getStatusIcon(item.status)}
                  <span className="user-orders-view__card-status-text">
                    {getDisplayStatus(item.status)}
                  </span>
                </div>
              </div>

              {renderStatusTracker(item)}

              <div className="user-orders-view__card-items">
                {item.items?.map((orderItem, index) => (
                  <div key={index} className="user-orders-view__card-item">
                    <div className="user-orders-view__card-item-image">
                      <img
                        src={orderItem.image || 'https://via.placeholder.com/60'}
                        alt={orderItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="user-orders-view__card-item-details">
                      <h4 className="user-orders-view__card-item-name">{orderItem.name}</h4>
                      <div className="user-orders-view__card-item-meta">
                        <span className="user-orders-view__card-item-quantity">
                          Qty: {orderItem.quantity}
                        </span>
                        <span className="user-orders-view__card-item-price">
                          ₹{orderItem.price?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="user-orders-view__card-footer">
                <div className="user-orders-view__card-total">
                  <span className="user-orders-view__card-total-label">Total:</span>
                  <span className="user-orders-view__card-total-amount">
                    ₹{item.total?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
                {item.paymentStatus && item.paymentStatus !== 'fully_paid' && (
                  <div className="user-orders-view__card-payment">
                    <span className="user-orders-view__card-payment-label">Payment:</span>
                    <span
                      className={cn(
                        'user-orders-view__card-payment-status',
                        item.paymentStatus === 'partial_paid' && 'text-orange-600',
                        item.paymentStatus === 'pending' && 'text-red-600'
                      )}
                    >
                      {item.paymentStatus === 'partial_paid'
                        ? `Partial Paid (30%) - ₹${item.remaining?.toLocaleString('en-IN') || '0'} remaining`
                        : item.paymentStatus === 'pending'
                          ? 'Pending'
                          : item.paymentStatus}
                    </span>
                  </div>
                )}
                {/* Pay Remaining Button - Show when order is delivered and partially paid */}
                {item.status === 'delivered' && item.paymentStatus === 'partial_paid' && item.remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePayRemaining(item)}
                    disabled={processingPayment === item.id || loading}
                    className="mt-3 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CreditCardIcon className="h-4 w-4" />
                    {processingPayment === item.id || loading
                      ? 'Processing...'
                      : `Pay Remaining ₹${item.remaining.toLocaleString('en-IN')}`}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


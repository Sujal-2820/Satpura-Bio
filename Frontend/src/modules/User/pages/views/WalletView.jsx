import { useState } from 'react'
import { useUserState } from '../../context/UserContext'
import { useUserApi } from '../../hooks/useUserApi'
import { WalletIcon, ClockIcon, CheckCircleIcon, PackageIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { useToast } from '../../components/ToastNotification'
import { openRazorpayCheckout } from '../../../../utils/razorpay'
import { Trans } from '../../../../components/Trans'
import { TransText } from '../../../../components/TransText'

export function WalletView() {
  const { orders, profile } = useUserState()
  const { createRemainingPaymentIntent, confirmRemainingPayment } = useUserApi()
  const { showError, showSuccess } = useToast()
  const [processingPayment, setProcessingPayment] = useState(null)

  // Filter for orders with remaining amount
  const pendingOrders = orders.filter(order => 
    order.remainingAmount > 0 && 
    order.status !== 'cancelled' && 
    order.status !== 'rejected'
  )

  const totalOutstanding = pendingOrders.reduce((sum, order) => sum + (order.remainingAmount || 0), 0)

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
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

      const { paymentIntent } = paymentIntentResult.data
      const { razorpayOrderId, keyId, amount } = paymentIntent

      // Open Razorpay Checkout for remaining payment
      try {
        const razorpayResponse = await openRazorpayCheckout({
          key: keyId,
          amount: amount,
          currency: 'INR',
          order_id: razorpayOrderId,
          name: 'Satpura Bio',
          description: `Remaining payment for Order ${order.orderNumber || order.id}`,
          prefill: {
            name: profile?.name || '',
            email: profile?.email || '',
            contact: profile?.phone || '',
          },
          theme: {
            color: '#1b8f5b',
          },
        })

        // Confirm remaining payment with Razorpay response
        const confirmResult = await confirmRemainingPayment({
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          gatewayPaymentId: razorpayResponse.paymentId,
          gatewayOrderId: razorpayResponse.orderId,
          gatewaySignature: razorpayResponse.signature,
          paymentMethod: 'razorpay',
        })

        if (confirmResult.error) {
          showError(confirmResult.error.message || 'Payment verification failed')
        } else {
          showSuccess('Payment successful! Your order has been updated.')
          // The context should auto-update via socket or manual refresh if needed
          // For now, we rely on the context to eventually refresh or the user to reload
        }
      } catch (err) {
        console.error('Razorpay Error:', err)
        // User closed popup or payment failed
        if (err.description !== 'Payment cancelled') {
            showError('Payment failed or cancelled')
        }
      }
    } catch (err) {
      console.error('Payment Flow Error:', err)
      showError('An error occurred during payment processing')
    } finally {
      setProcessingPayment(null)
    }
  }

  return (
    <div className="flex flex-col gap-0 pb-24">
      <header className="px-3 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#172022]">
          <Trans>My Wallet</Trans>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
            <Trans>Manage your payments and credits</Trans>
        </p>
      </header>

      <div className="px-3 pt-4">
        {/* Wallet Summary Card */}
        <div className="bg-gradient-to-br from-[#1b8f5b] to-[#2a9d61] rounded-2xl p-6 text-white shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-2">
                <WalletIcon className="h-6 w-6 opacity-80" />
                <span className="text-sm font-medium opacity-90"><Trans>Total Outstanding</Trans></span>
            </div>
            <div className="text-3xl font-bold mb-4">
                ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="flex justify-between items-center text-sm bg-white/10 rounded-lg p-3">
                <span className="opacity-90"><Trans>Pending Orders</Trans></span>
                <span className="font-bold bg-white text-[#1b8f5b] px-2 py-0.5 rounded-full text-xs">
                    {pendingOrders.length}
                </span>
            </div>
        </div>

        {/* Pending Payments List */}
        <div>
            <h2 className="text-lg font-bold text-[#172022] mb-4">
                <Trans>Pending Payments</Trans>
            </h2>

            {pendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <CheckCircleIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium"><Trans>No pending payments</Trans></p>
                    <p className="text-xs text-gray-400 mt-1"><Trans>You're all caught up!</Trans></p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {pendingOrders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1">
                                        <Trans>ORDER</Trans> #{order.orderNumber}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {formatDate(order.createdAt)}
                                    </div>
                                </div>
                                <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-md uppercase tracking-wide">
                                    <Trans>Payment Pending</Trans>
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                            <PackageIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[#172022]">
                                                {order.items?.length > 0 ? (
                                                    <TransText>{order.items[0].productName}</TransText>
                                                ) : <Trans>Unknown Item</Trans>}
                                            </div>
                                            {order.items?.length > 1 && (
                                                <div className="text-xs text-gray-500">
                                                    + {order.items.length - 1} <Trans>more items</Trans>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500"><Trans>Total Amount</Trans></span>
                                        <span className="font-medium text-gray-700">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500"><Trans>Paid Amount</Trans></span>
                                        <span className="font-medium text-green-600">₹{(order.totalAmount - order.remainingAmount)?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-200">
                                        <span className="font-bold text-[#172022]"><Trans>Remaining to Pay</Trans></span>
                                        <span className="font-bold text-[#1b8f5b]">₹{order.remainingAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePayRemaining(order)}
                                    disabled={processingPayment === order.id}
                                    className="w-full py-3 bg-[#1b8f5b] hover:bg-[#2a9d61] text-white font-bold rounded-xl shadow-lg shadow-green-900/10 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingPayment === order.id ? (
                                        <>
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span><Trans>Processing...</Trans></span>
                                        </>
                                    ) : (
                                        <>
                                            <WalletIcon className="h-4 w-4" />
                                            <span><Trans>Pay Remaining</Trans> ₹{order.remainingAmount?.toLocaleString('en-IN')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}

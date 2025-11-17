import { useState, useMemo, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../context/UserContext'
import { userSnapshot, ADVANCE_PAYMENT_PERCENTAGE, REMAINING_PAYMENT_PERCENTAGE } from '../../services/userData'
import { MapPinIcon, CreditCardIcon, TruckIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, PackageIcon, EditIcon, TrashIcon, XIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'

const STEPS = [
  { id: 1, label: 'Summary', icon: PackageIcon },
  { id: 2, label: 'Address & Shipping', icon: MapPinIcon },
  { id: 3, label: 'Payment', icon: CreditCardIcon },
]

export function CheckoutView({ onBack, onOrderPlaced }) {
  const { cart, addresses, profile } = useUserState()
  const dispatch = useUserDispatch()
  const [currentStep, setCurrentStep] = useState(1)
  const [summaryExpanded, setSummaryExpanded] = useState(true)
  const [selectedAddress, setSelectedAddress] = useState(
    addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || null,
  )
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [promoCode, setPromoCode] = useState('')
  const [showAddressPanel, setShowAddressPanel] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    name: 'Home',
    address: '',
    city: profile.location?.city || '',
    state: profile.location?.state || '',
    pincode: profile.location?.pincode || '',
    phone: profile.phone || '',
  })
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)

  // Remove duplicates from addresses
  const uniqueAddresses = useMemo(() => {
    const seen = new Set()
    return addresses.filter((addr) => {
      const key = `${addr.name}-${addr.address}-${addr.city}-${addr.pincode}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }, [addresses])

  // Update selected address when addresses change
  useEffect(() => {
    if (uniqueAddresses.length > 0 && !uniqueAddresses.find((a) => a.id === selectedAddress)) {
      setSelectedAddress(uniqueAddresses.find((a) => a.isDefault)?.id || uniqueAddresses[0]?.id || null)
    } else if (uniqueAddresses.length === 0) {
      setSelectedAddress(null)
    }
  }, [uniqueAddresses, selectedAddress])

  const handleOpenAddressPanel = (address = null) => {
    if (address) {
      setEditingAddress(address.id)
      setAddressForm({
        name: address.name,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      })
    } else {
      setEditingAddress(null)
      setAddressForm({
        name: 'Home',
        address: '',
        city: profile.location?.city || '',
        state: profile.location?.state || '',
        pincode: profile.location?.pincode || '',
        phone: profile.phone || '',
      })
    }
    setShowAddressPanel(true)
  }

  const handleCloseAddressPanel = () => {
    setShowAddressPanel(false)
    setTimeout(() => {
      setEditingAddress(null)
      setAddressForm({
        name: 'Home',
        address: '',
        city: profile.location?.city || '',
        state: profile.location?.state || '',
        pincode: profile.location?.pincode || '',
        phone: profile.phone || '',
      })
    }, 300)
  }

  const handleSaveAddress = () => {
    if (!addressForm.name || !addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode || !addressForm.phone) {
      alert('Please fill in all fields')
      return
    }

    if (editingAddress) {
      dispatch({
        type: 'UPDATE_ADDRESS',
        payload: {
          id: editingAddress,
          ...addressForm,
        },
      })
    } else {
      const newAddress = {
        id: `addr-${Date.now()}`,
        ...addressForm,
        isDefault: uniqueAddresses.length === 0,
      }
      dispatch({ type: 'ADD_ADDRESS', payload: newAddress })
      setSelectedAddress(newAddress.id)
    }
    handleCloseAddressPanel()
  }

  const handleDeleteAddress = (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      dispatch({ type: 'DELETE_ADDRESS', payload: { id: addressId } })
      if (selectedAddress === addressId) {
        const remaining = uniqueAddresses.filter((a) => a.id !== addressId)
        setSelectedAddress(remaining.length > 0 ? (remaining.find((a) => a.isDefault)?.id || remaining[0]?.id) : null)
      }
    }
  }

  const cartItems = useMemo(() => {
    return cart.map((item) => {
      const product = userSnapshot.products.find((p) => p.id === item.productId)
      return {
        ...item,
        product,
      }
    })
  }, [cart])

  const shippingOptions = [
    { id: 'standard', label: 'Standard Delivery', cost: 50, time: '3-5 days' },
    { id: 'express', label: 'Express Delivery', cost: 100, time: '1-2 days' },
    { id: 'free', label: 'Free Delivery', cost: 0, time: '5-7 days', minOrder: 5000 },
  ]

  const selectedShipping = shippingOptions.find((s) => s.id === shippingMethod) || shippingOptions[0]

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const delivery = subtotal >= (selectedShipping.minOrder || Infinity) ? 0 : selectedShipping.cost
    const discount = 0 // Promo code discount would be calculated here
    const total = subtotal + delivery - discount
    const advance = Math.round((total * ADVANCE_PAYMENT_PERCENTAGE) / 100)
    const remaining = total - advance

    return {
      subtotal,
      delivery,
      discount,
      total,
      advance,
      remaining,
    }
  }, [cartItems, selectedShipping])

  // Find assigned vendor based on location
  const assignedVendor = useMemo(() => {
    const vendorId = cartItems[0]?.vendor?.id
    if (vendorId) {
      return userSnapshot.products.find((p) => p.vendor?.id === vendorId)?.vendor
    }
    return null
  }, [cartItems])

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      onBack()
    }
  }

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      alert('Please select a delivery address')
      return
    }

    const order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      paymentStatus: 'partial_paid',
      items: cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: totals.total,
      advancePaid: totals.advance,
      remaining: totals.remaining,
      vendor: assignedVendor,
      deliveryTime: selectedShipping.time,
      deliveryDate: null,
      addressId: selectedAddress,
      shippingMethod: selectedShipping.id,
    }

    setPendingOrder(order)
    setShowPaymentConfirm(true)
  }

  // Collapsible Summary Component
  const OrderSummary = ({ compact = false }) => (
    <div className={cn(
      "user-checkout-summary",
      compact && "user-checkout-summary--compact"
    )}>
      <button
        type="button"
        onClick={() => setSummaryExpanded(!summaryExpanded)}
        className="user-checkout-summary__header"
      >
        <div className="flex items-center gap-2">
          <PackageIcon className="h-4 w-4 text-[#1b8f5b]" />
          <span className="text-sm font-semibold text-[#172022]">
            {compact ? `₹${totals.total.toLocaleString('en-IN')}` : 'Order Summary'}
          </span>
          {compact && (
            <span className="text-xs text-[rgba(26,42,34,0.6)]">
              ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
            </span>
          )}
        </div>
        <ChevronDownIcon className={cn(
          "h-4 w-4 text-[rgba(26,42,34,0.6)] transition-transform",
          summaryExpanded && "rotate-180"
        )} />
      </button>

      {summaryExpanded && (
        <div className="user-checkout-summary__content">
          <div className="space-y-2 mb-3">
            {cartItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#172022] line-clamp-1">{item.name}</p>
                  <p className="text-xs text-[rgba(26,42,34,0.6)]">Qty: {item.quantity}</p>
                </div>
                <p className="text-xs font-bold text-[#1b8f5b] flex-shrink-0">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-2 border-t border-[rgba(34,94,65,0.1)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[rgba(26,42,34,0.65)]">Subtotal</span>
              <span className="font-semibold text-[#172022]">₹{totals.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[rgba(26,42,34,0.65)]">Delivery</span>
              <span className="font-semibold text-[#172022]">
                {totals.delivery === 0 ? 'Free' : `₹${totals.delivery}`}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[rgba(26,42,34,0.65)]">Discount</span>
                <span className="font-semibold text-green-600">-₹{totals.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(34,94,65,0.1)]">
              <span className="text-sm font-bold text-[#172022]">Total</span>
              <span className="text-base font-bold text-[#1b8f5b]">₹{totals.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="user-checkout-view">
      {/* Back Button */}
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-semibold text-[#1b8f5b] mb-3"
        onClick={handleBack}
      >
        <ChevronRightIcon className="h-5 w-5 rotate-180" />
        {currentStep === 1 ? 'Back to Cart' : 'Back'}
      </button>

      {/* Progress Indicator */}
      <div className="user-checkout-progress mb-6">
        <div className="user-checkout-progress__steps">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            const isLast = index === STEPS.length - 1
            // Connector should be completed if we've passed this step (currentStep > step.id)
            const connectorCompleted = currentStep > step.id

            return (
              <div 
                key={step.id} 
                className={cn(
                  "user-checkout-progress__step-wrapper",
                  !isLast && connectorCompleted && "user-checkout-progress__step-wrapper--connector-completed"
                )}
              >
                <div className="user-checkout-progress__step">
                  <div className={cn(
                    "user-checkout-progress__step-circle",
                    isActive && "user-checkout-progress__step-circle--active",
                    isCompleted && "user-checkout-progress__step-circle--completed"
                  )}>
                    {isCompleted ? (
                      <CheckIcon className="h-4 w-4 text-white" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(
                    "user-checkout-progress__step-label",
                    isActive && "user-checkout-progress__step-label--active"
                  )}>
                    {step.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Summary (Compact) */}
      {currentStep > 1 && (
        <div className="sticky top-0 z-10 bg-white border-b border-[rgba(34,94,65,0.1)] -mx-5 px-5 pb-3 mb-4">
          <OrderSummary compact />
        </div>
      )}

      {/* Step 1: Summary */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#172022] mb-2">Order Summary</h2>

          {/* Expandable Summary */}
          <OrderSummary />

          {/* Promo Code */}
          <div className="p-4 rounded-xl border border-[rgba(34,94,65,0.12)] bg-[rgba(240,245,242,0.3)]">
            <label className="block text-sm font-semibold text-[#172022] mb-2">Promo Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter promo code"
                className="flex-1 px-3 py-2 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
              />
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="p-4 rounded-xl border border-[rgba(34,94,65,0.12)] bg-white">
            <h3 className="text-sm font-semibold text-[#172022] mb-3">Payment Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[rgba(240,245,242,0.5)] border border-[rgba(34,94,65,0.15)]">
                <p className="text-xs font-semibold text-[rgba(26,42,34,0.65)] uppercase tracking-wide mb-1">
                  Advance (30%)
                </p>
                <p className="text-lg font-bold text-[#1b8f5b]">₹{totals.advance.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(240,245,242,0.5)] border border-[rgba(34,94,65,0.15)]">
                <p className="text-xs font-semibold text-[rgba(26,42,34,0.65)] uppercase tracking-wide mb-1">
                  Remaining (70%)
                </p>
                <p className="text-lg font-bold text-[#1b8f5b]">₹{totals.remaining.toLocaleString('en-IN')}</p>
                <p className="text-xs text-[rgba(26,42,34,0.6)] mt-1">Pay after delivery</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Address & Shipping */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#172022] mb-2">Delivery Address</h2>

          {/* Address Selection */}
          <div className="space-y-3">
            {uniqueAddresses.length > 0 ? (
              uniqueAddresses.map((address) => (
                <div
                  key={address.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 transition-all',
                    selectedAddress === address.id
                      ? 'border-[#1b8f5b] bg-[rgba(240,245,242,0.5)]'
                      : 'border-[rgba(34,94,65,0.15)] bg-white'
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={selectedAddress === address.id}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    className="mt-1 w-4 h-4 accent-[#1b8f5b] cursor-pointer"
                  />
                  <label className="flex-1 cursor-pointer" onClick={() => setSelectedAddress(address.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#172022]">{address.name}</span>
                      {address.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-[#1b8f5b]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-1">
                      {address.address}, {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-xs text-[rgba(26,42,34,0.6)]">{address.phone}</p>
                  </label>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenAddressPanel(address)
                      }}
                      className="p-2 text-[#1b8f5b] hover:bg-[rgba(240,245,242,0.5)] rounded-lg transition-colors"
                      aria-label="Edit address"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAddress(address.id)
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete address"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 p-4 rounded-xl border border-[rgba(34,94,65,0.15)] bg-white">
                <p className="text-sm text-[rgba(26,42,34,0.65)] mb-3">No addresses saved. Please add an address to continue.</p>
                <button
                  type="button"
                  onClick={() => handleOpenAddressPanel()}
                  className="px-4 py-2 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
                >
                  + Add Address
                </button>
              </div>
            )}
          </div>

          {uniqueAddresses.length > 0 && (
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
              onClick={() => handleOpenAddressPanel()}
            >
              + Add New Address
            </button>
          )}

          {/* Shipping Methods */}
          <div className="mt-6">
            <h3 className="text-base font-semibold text-[#172022] mb-3 flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-[#1b8f5b]" />
              Shipping Method
            </h3>
            <div className="space-y-2">
              {shippingOptions.map((option) => {
                const isAvailable = !option.minOrder || totals.subtotal >= option.minOrder
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      !isAvailable && 'opacity-50 cursor-not-allowed',
                      shippingMethod === option.id && isAvailable
                        ? 'border-[#1b8f5b] bg-[rgba(240,245,242,0.5)]'
                        : 'border-[rgba(34,94,65,0.15)] bg-white hover:border-[rgba(34,94,65,0.25)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={shippingMethod === option.id}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      disabled={!isAvailable}
                      className="w-4 h-4 accent-[#1b8f5b]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-[#172022]">{option.label}</span>
                        <span className="text-sm font-bold text-[#1b8f5b]">
                          {option.cost === 0 ? 'Free' : `₹${option.cost}`}
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(26,42,34,0.6)]">
                        Estimated delivery: {option.time}
                        {option.minOrder && !isAvailable && ` (Min order: ₹${option.minOrder.toLocaleString('en-IN')})`}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {assignedVendor && (
            <div className="p-3 rounded-xl bg-[rgba(240,245,242,0.5)] border border-[rgba(34,94,65,0.15)]">
              <p className="text-xs font-semibold text-[rgba(26,42,34,0.65)] uppercase tracking-wide mb-1">Assigned Vendor</p>
              <p className="text-sm font-semibold text-[#172022]">{assignedVendor.name}</p>
              <p className="text-xs text-[rgba(26,42,34,0.6)]">{assignedVendor.location}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Payment */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#172022] mb-2">Payment Method</h2>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-[rgba(34,94,65,0.15)] bg-white hover:border-[rgba(34,94,65,0.25)]">
              <input
                type="radio"
                name="payment"
                value="razorpay"
                checked={paymentMethod === 'razorpay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4 accent-[#1b8f5b]"
              />
              <CreditCardIcon className="h-5 w-5 text-[#1b8f5b]" />
              <span className="text-sm font-semibold text-[#172022]">Razorpay</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-[rgba(34,94,65,0.15)] bg-white hover:border-[rgba(34,94,65,0.25)]">
              <input
                type="radio"
                name="payment"
                value="paytm"
                checked={paymentMethod === 'paytm'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4 accent-[#1b8f5b]"
              />
              <CreditCardIcon className="h-5 w-5 text-[#1b8f5b]" />
              <span className="text-sm font-semibold text-[#172022]">Paytm</span>
            </label>
          </div>

          {/* Final Summary */}
          <div className="p-4 rounded-xl border border-[rgba(34,94,65,0.12)] bg-[rgba(240,245,242,0.3)]">
            <h3 className="text-sm font-semibold text-[#172022] mb-3">Final Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(26,42,34,0.65)]">Subtotal</span>
                <span className="font-semibold text-[#172022]">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(26,42,34,0.65)]">Delivery</span>
                <span className="font-semibold text-[#172022]">
                  {totals.delivery === 0 ? 'Free' : `₹${totals.delivery}`}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[rgba(34,94,65,0.1)]">
                <span className="text-base font-bold text-[#172022]">Total</span>
                <span className="text-xl font-bold text-[#1b8f5b]">₹{totals.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgba(34,94,65,0.1)]">
                <div className="p-2 rounded-lg bg-white border border-[rgba(34,94,65,0.15)]">
                  <p className="text-xs font-semibold text-[rgba(26,42,34,0.65)] uppercase tracking-wide mb-1">
                    Advance (30%)
                  </p>
                  <p className="text-base font-bold text-[#1b8f5b]">₹{totals.advance.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[rgba(34,94,65,0.15)]">
                  <p className="text-xs font-semibold text-[rgba(26,42,34,0.65)] uppercase tracking-wide mb-1">
                    Remaining (70%)
                  </p>
                  <p className="text-base font-bold text-[#1b8f5b]">₹{totals.remaining.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-[rgba(34,94,65,0.1)] -mx-5 mt-6 space-y-2">
        {currentStep < 3 ? (
          <button
            type="button"
            className={cn(
              'w-full py-3.5 px-6 rounded-xl text-base font-bold transition-all',
              currentStep === 2 && (!selectedAddress || uniqueAddresses.length === 0)
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white shadow-md hover:shadow-lg'
            )}
            onClick={handleNext}
            disabled={currentStep === 2 && (!selectedAddress || uniqueAddresses.length === 0)}
          >
            {currentStep === 1 ? 'Continue to Address & Shipping' : 'Continue to Payment'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={cn(
                'w-full py-3.5 px-6 rounded-xl text-base font-bold transition-all',
                !selectedAddress
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white shadow-md hover:shadow-lg'
              )}
              onClick={handlePlaceOrder}
              disabled={!selectedAddress}
            >
              Pay ₹{totals.advance.toLocaleString('en-IN')} & Place Order
            </button>
            <p className="text-xs text-center text-[rgba(26,42,34,0.65)]">
              You will pay the remaining ₹{totals.remaining.toLocaleString('en-IN')} after delivery
            </p>
          </>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && pendingOrder && (
        <div
          className="user-payment-confirm-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentConfirm(false)
              setPendingOrder(null)
            }
          }}
        >
          <div className="user-payment-confirm-modal__content">
            <button
              type="button"
              onClick={() => {
                setShowPaymentConfirm(false)
                setPendingOrder(null)
              }}
              className="user-payment-confirm-modal__close"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>

            <div className="user-payment-confirm-modal__icon">
              <CreditCardIcon className="h-12 w-12 text-[#1b8f5b]" />
            </div>

            <h3 className="user-payment-confirm-modal__title">Confirm Payment</h3>
            <p className="user-payment-confirm-modal__subtitle">
              Please confirm to proceed with your order
            </p>

            <div className="user-payment-confirm-modal__details">
              <div className="user-payment-confirm-modal__detail-row">
                <span className="user-payment-confirm-modal__detail-label">Order Total</span>
                <span className="user-payment-confirm-modal__detail-value">₹{pendingOrder.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="user-payment-confirm-modal__detail-row">
                <span className="user-payment-confirm-modal__detail-label">Advance Payment (30%)</span>
                <span className="user-payment-confirm-modal__detail-value user-payment-confirm-modal__detail-value--highlight">
                  ₹{pendingOrder.advancePaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="user-payment-confirm-modal__detail-row">
                <span className="user-payment-confirm-modal__detail-label">Remaining (Pay on Delivery)</span>
                <span className="user-payment-confirm-modal__detail-value">₹{pendingOrder.remaining.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="user-payment-confirm-modal__info">
              <div className="user-payment-confirm-modal__info-item">
                <CheckIcon className="h-5 w-5 text-[#1b8f5b]" />
                <span>Secure payment via Razorpay</span>
              </div>
              <div className="user-payment-confirm-modal__info-item">
                <CheckIcon className="h-5 w-5 text-[#1b8f5b]" />
                <span>Remaining amount payable on delivery</span>
              </div>
            </div>

            <div className="user-payment-confirm-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentConfirm(false)
                  setPendingOrder(null)
                }}
                className="user-payment-confirm-modal__btn user-payment-confirm-modal__btn--cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onOrderPlaced(pendingOrder)
                  setShowPaymentConfirm(false)
                  setPendingOrder(null)
                }}
                className="user-payment-confirm-modal__btn user-payment-confirm-modal__btn--confirm"
              >
                Pay ₹{pendingOrder.advancePaid.toLocaleString('en-IN')} & Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Form Panel */}
      <div
        className={cn(
          'user-address-panel',
          showAddressPanel && 'user-address-panel--open'
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseAddressPanel()
          }
        }}
      >
        <div className="user-address-panel__content">
          <div className="user-address-panel__header">
            <h3 className="user-address-panel__title">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            <button
              type="button"
              onClick={handleCloseAddressPanel}
              className="user-address-panel__close"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="user-address-panel__form">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                  Address Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  placeholder="Home, Office, etc."
                  className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="Enter your street address"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="Pincode"
                    maxLength={6}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="Phone number"
                    maxLength={10}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="user-address-panel__footer">
            <button
              type="button"
              onClick={handleCloseAddressPanel}
              className="user-address-panel__cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAddress}
              className="user-address-panel__save-btn"
            >
              {editingAddress ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

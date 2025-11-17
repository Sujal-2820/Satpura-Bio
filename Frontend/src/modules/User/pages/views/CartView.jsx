import { useMemo } from 'react'
import { useUserState } from '../../context/UserContext'
import { userSnapshot, MIN_ORDER_VALUE } from '../../services/userData'
import { PlusIcon, MinusIcon, TrashIcon, TruckIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'

export function CartView({ onUpdateQuantity, onRemove, onCheckout, onAddToCart }) {
  const { cart } = useUserState()

  // Get suggested products (exclude items already in cart)
  const suggestedProducts = useMemo(() => {
    const cartProductIds = cart.map((item) => item.productId)
    const available = userSnapshot.products.filter((p) => !cartProductIds.includes(p.id))
    // Shuffle and take 8
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 8)
  }, [cart])

  const cartItems = useMemo(() => {
    return cart.map((item) => {
      const product = userSnapshot.products.find((p) => p.id === item.productId)
      return {
        ...item,
        product,
      }
    })
  }, [cart])

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const delivery = subtotal >= 5000 ? 0 : 50 // Free delivery above ₹5,000
    const total = subtotal + delivery
    const meetsMinimum = total >= MIN_ORDER_VALUE

    return {
      subtotal,
      delivery,
      total,
      meetsMinimum,
      shortfall: meetsMinimum ? 0 : MIN_ORDER_VALUE - total,
    }
  }, [cartItems])

  if (cartItems.length === 0) {
    return (
      <div className="user-cart-view space-y-4">
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-[rgba(26,42,34,0.75)] mb-2">Your cart is empty</p>
          <p className="text-sm text-[rgba(26,42,34,0.55)]">Add some products to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-cart-view space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#172022] mb-1">Shopping Cart</h2>
        <p className="text-sm text-[rgba(26,42,34,0.65)]">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
      </div>

      <div className="space-y-3">
        {cartItems.map((item) => (
          <div
            key={item.productId}
            className="flex gap-3 p-4 rounded-2xl border border-[rgba(34,94,65,0.16)] bg-gradient-to-br from-white to-[rgba(239,246,240,0.92)] shadow-[0_20px_42px_-30px_rgba(16,44,30,0.36)]"
          >
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#172022] mb-1 line-clamp-2">{item.name}</h3>
              {item.vendor && (
                <p className="text-xs text-[rgba(26,42,34,0.6)] mb-1">{item.vendor.name}</p>
              )}
              {item.deliveryTime && (
                <div className="flex items-center gap-1 text-xs text-[rgba(26,42,34,0.6)] mb-2">
                  <TruckIcon className="h-3.5 w-3.5" />
                  <span>{item.deliveryTime}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm font-bold text-[#1b8f5b]">₹{item.price.toLocaleString('en-IN')}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-[rgba(34,94,65,0.2)] rounded-xl bg-white">
                    <button
                      type="button"
                      className="p-1.5 hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="px-2 text-sm font-semibold text-[#172022] min-w-[2rem] text-center">{item.quantity}</span>
                    <button
                      type="button"
                      className="p-1.5 hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    onClick={() => onRemove(item.productId)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right mt-2">
                <span className="text-base font-bold text-[#172022]">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-[rgba(34,94,65,0.16)] bg-gradient-to-br from-white to-[rgba(241,244,236,0.9)] shadow-[0_18px_38px_-28px_rgba(13,38,24,0.35)] space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,42,34,0.65)]">Subtotal</span>
          <span className="font-semibold text-[#172022]">₹{totals.subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,42,34,0.65)]">Delivery</span>
          <span className="font-semibold text-[#172022]">{totals.delivery === 0 ? 'Free' : `₹${totals.delivery}`}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(34,94,65,0.1)]">
          <span className="text-base font-bold text-[#172022]">Total</span>
          <span className="text-xl font-bold text-[#1b8f5b]">₹{totals.total.toLocaleString('en-IN')}</span>
        </div>
        {!totals.meetsMinimum && (
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-xs font-semibold text-orange-700 text-center">
              Add ₹{totals.shortfall.toLocaleString('en-IN')} more to reach minimum order value of ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      {/* Suggested Items Section */}
      {suggestedProducts.length > 0 && (
        <div className="user-cart-suggested">
          <h3 className="text-base font-bold text-[#172022] mb-3">You might also like</h3>
          <div className="user-cart-suggested__rail">
            {suggestedProducts.map((product) => (
              <div key={product.id} className="user-cart-suggested__card">
                <div className="user-cart-suggested__image-wrapper">
                  <img src={product.image} alt={product.name} className="user-cart-suggested__image" />
                </div>
                <div className="user-cart-suggested__content">
                  <h4 className="user-cart-suggested__title">{product.name}</h4>
                  <div className="user-cart-suggested__price">₹{product.price.toLocaleString('en-IN')}</div>
                  <button
                    type="button"
                    className="user-cart-suggested__add-btn"
                    onClick={() => onAddToCart?.(product.id, 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-[rgba(34,94,65,0.1)] -mx-5">
        <button
          type="button"
          className={cn(
            'w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-200',
            totals.meetsMinimum
              ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
          onClick={onCheckout}
          disabled={!totals.meetsMinimum}
        >
          {totals.meetsMinimum ? 'Proceed to Checkout' : `Add ₹${totals.shortfall.toLocaleString('en-IN')} more`}
        </button>
      </div>
    </div>
  )
}


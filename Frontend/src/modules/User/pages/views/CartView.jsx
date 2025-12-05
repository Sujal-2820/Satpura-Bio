import { useMemo, useState, useEffect, useRef } from 'react'
import { useUserState } from '../../context/UserContext'
import { MIN_ORDER_VALUE } from '../../services/userData'
import { PlusIcon, MinusIcon, TrashIcon, TruckIcon, ChevronRightIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import * as userApi from '../../services/userApi'
import { getPrimaryImageUrl } from '../../utils/productImages'
import { Trans } from '../../../../components/Trans'

export function CartView({ onUpdateQuantity, onRemove, onCheckout, onAddToCart }) {
  const { cart } = useUserState()
  const [suggestedProducts, setSuggestedProducts] = useState([])
  const [cartProducts, setCartProducts] = useState({})
  const [expandedVariants, setExpandedVariants] = useState({}) // Track expanded state: { variantId: true/false }
  const fetchingProductsRef = useRef(new Set()) // Track which products are currently being fetched

  // Fetch suggested products (exclude items already in cart)
  useEffect(() => {
    const loadSuggested = async () => {
      try {
        const cartProductIds = cart.map((item) => item.productId)
        const result = await userApi.getProducts({ limit: 20 })
        if (result.success && result.data?.products) {
          const available = result.data.products.filter(
            (p) => !cartProductIds.includes(p._id || p.id)
          )
          // Shuffle and take 8
          const shuffled = [...available].sort(() => Math.random() - 0.5)
          setSuggestedProducts(shuffled.slice(0, 8))
        }
      } catch (error) {
        console.error('Error loading suggested products:', error)
      }
    }
    
    if (cart.length > 0) {
      loadSuggested()
    }
  }, [cart])

  // Fetch product details for cart items
  useEffect(() => {
    const loadCartProducts = async () => {
      // Use functional update to check current state without adding to dependencies
      setCartProducts(currentProducts => {
        // Only fetch products that aren't already loaded and aren't currently being fetched
        const productsToFetch = cart.filter(item => 
          !currentProducts[item.productId] && !fetchingProductsRef.current.has(item.productId)
        )
        
        if (productsToFetch.length === 0) {
          return currentProducts // All products already loaded or being fetched
        }
        
        // Mark products as being fetched
        productsToFetch.forEach(item => fetchingProductsRef.current.add(item.productId))
        
        // Fetch missing products and update incrementally (async, doesn't block return)
        productsToFetch.forEach(async (item) => {
          try {
            const result = await userApi.getProductDetails(item.productId)
            if (result.success && result.data?.product) {
              // Update state incrementally for each product as it loads
              setCartProducts(prev => ({
                ...prev,
                [item.productId]: result.data.product
              }))
            }
          } catch (error) {
            console.error(`Error loading product ${item.productId}:`, error)
          } finally {
            // Remove from fetching set
            fetchingProductsRef.current.delete(item.productId)
          }
        })
        
        // Return current products immediately (new products will be added via setState above)
        return currentProducts
      })
    }
    
    if (cart.length > 0) {
      loadCartProducts()
    } else {
      // Clear cartProducts when cart is empty
      setCartProducts({})
      fetchingProductsRef.current.clear()
    }
  }, [cart])

  // Group items by productId, and if variants exist, group variants together
  const groupedCartItems = useMemo(() => {
    console.log('🛒 Cart Data:', cart)
    console.log('🛒 Cart Products:', cartProducts)
    
    const grouped = {}
    
    cart.forEach((item, index) => {
      console.log(`\n📦 Cart Item ${index + 1}:`, {
        id: item.id,
        cartItemId: item.cartItemId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        unitPrice: item.unitPrice,
        variantAttributes: item.variantAttributes,
        quantity: item.quantity,
        fullItem: item
      })
      
      const product = cartProducts[item.productId]
      console.log(`📦 Product for ${item.productId}:`, product)
      
      // Use variant-specific price (unitPrice) if available, otherwise fallback
      const unitPrice = item.unitPrice || item.price || (product ? (product.priceToUser || product.price || 0) : 0)
      console.log(`💰 Unit Price calculated:`, unitPrice, {
        'item.unitPrice': item.unitPrice,
        'item.price': item.price,
        'product.priceToUser': product?.priceToUser,
        'product.price': product?.price
      })
      
      // Check if item has variant attributes
      const variantAttrs = item.variantAttributes || {}
      const hasVariants = variantAttrs && typeof variantAttrs === 'object' && Object.keys(variantAttrs).length > 0
      console.log(`🔖 Variant Attributes:`, variantAttrs, 'Has Variants:', hasVariants)
      const key = item.productId
      
      if (!grouped[key]) {
        grouped[key] = {
          productId: item.productId,
          product,
          name: item.name || product?.name || 'Product',
          image: product ? getPrimaryImageUrl(product) : (item.image || 'https://via.placeholder.com/400'),
          variants: [], // Array of variant items
          hasVariants: false,
        }
      }
      
      // Add this item as a variant - ensure we have proper ID and variant attributes
      const variantItem = {
        ...item,
        id: item.id || item._id || item.cartItemId, // Ensure ID is available
        cartItemId: item.id || item._id || item.cartItemId, // For API calls
        product,
        unitPrice, // Variant-specific price from backend
        variantAttributes: variantAttrs, // Ensure variant attributes are included
        hasVariants,
      }
      
      console.log(`✅ Adding variant to group ${key}:`, variantItem)
      
      grouped[key].variants.push(variantItem)
      
      // Mark as having variants if any variant exists
      if (hasVariants) {
        grouped[key].hasVariants = true
      }
    })
    
    const groupedArray = Object.values(grouped)
    console.log('\n📊 Final Grouped Cart Items:', groupedArray)
    console.log('📊 Grouped Items Summary:', groupedArray.map(g => ({
      productId: g.productId,
      name: g.name,
      variantCount: g.variants.length,
      hasVariants: g.hasVariants,
      variants: g.variants.map((v, idx) => ({
        index: idx,
        id: v.id,
        cartItemId: v.cartItemId,
        unitPrice: v.unitPrice,
        variantAttributes: v.variantAttributes,
        quantity: v.quantity,
        hasVariantAttrs: v.variantAttributes && Object.keys(v.variantAttributes).length > 0
      }))
    })))
    
    // Verify all cart items are included
    const totalCartItems = cart.length
    const totalGroupedVariants = groupedArray.reduce((sum, g) => sum + g.variants.length, 0)
    console.log(`\n✅ Cart Items Check: ${totalCartItems} cart items → ${totalGroupedVariants} grouped variants`)
    if (totalCartItems !== totalGroupedVariants) {
      console.warn('⚠️ WARNING: Cart items count mismatch! Some items may be missing.')
    }
    
    return groupedArray
  }, [cart, cartProducts])

  const totals = useMemo(() => {
    const subtotal = groupedCartItems.reduce((sum, group) => {
      return sum + group.variants.reduce((variantSum, variant) => {
        return variantSum + (variant.unitPrice * variant.quantity)
      }, 0)
    }, 0)
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
  }, [groupedCartItems])

  const totalItemsCount = useMemo(() => {
    return groupedCartItems.reduce((sum, group) => sum + group.variants.length, 0)
  }, [groupedCartItems])

  if (groupedCartItems.length === 0) {
    return (
      <div className="user-cart-view space-y-4">
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-[rgba(26,42,34,0.75)] mb-2"><Trans>Your cart is empty</Trans></p>
          <p className="text-sm text-[rgba(26,42,34,0.55)]"><Trans>Add some products to get started</Trans></p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-cart-view space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#172022] mb-1"><Trans>Shopping Cart</Trans></h2>
        <p className="text-sm text-[rgba(26,42,34,0.65)]">{totalItemsCount} {totalItemsCount === 1 ? <Trans>item</Trans> : <Trans>items</Trans>}</p>
      </div>

      <div className="space-y-4">
        {groupedCartItems.map((group) => (
          <div
            key={group.productId}
            className="rounded-2xl border border-[rgba(34,94,65,0.16)] bg-gradient-to-br from-white to-[rgba(239,246,240,0.92)] shadow-[0_20px_42px_-30px_rgba(16,44,30,0.36)] overflow-hidden"
          >
            {/* Product Header */}
            <div className="flex gap-3 p-4 border-b border-[rgba(34,94,65,0.1)]">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
                <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#172022] mb-1 line-clamp-2"><TransText>{group.name}</TransText></h3>
                {group.vendor && (
                  <p className="text-xs text-[rgba(26,42,34,0.6)] mb-1"><TransText>{group.vendor.name}</TransText></p>
                )}
              </div>
            </div>

            {/* Variants List */}
            <div className="p-4 space-y-3">
              {group.variants.map((variant, variantIdx) => {
                const variantId = variant.id || variant._id || variant.cartItemId
                const cartItemId = variant.cartItemId || variant.id || variant._id
                const isExpanded = expandedVariants[variantId] || false
                
                return (
                  <div key={variantId} className="rounded-xl bg-white border border-[rgba(34,94,65,0.1)] overflow-hidden">
                    {/* Variant Header - Collapsible */}
                    <button
                      type="button"
                      onClick={() => setExpandedVariants(prev => ({ ...prev, [variantId]: !prev[variantId] }))}
                      className="w-full flex items-start justify-between gap-3 p-3 hover:bg-[rgba(240,245,242,0.3)] transition-colors"
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#172022]"><Trans>Variant</Trans> {variantIdx + 1}</span>
                          {variant.variantAttributes && Object.keys(variant.variantAttributes).length > 0 && (
                            <span className="text-[0.65rem] text-[rgba(26,42,34,0.6)]">
                              ({Object.keys(variant.variantAttributes).length} <Trans>properties</Trans>)
                            </span>
                          )}
                        </div>
                        {/* Show first property as preview */}
                        {(() => {
                          console.log(`🔍 Checking variant attributes for variant ${variantIdx + 1}:`, {
                            variantAttributes: variant.variantAttributes,
                            type: typeof variant.variantAttributes,
                            isObject: variant.variantAttributes && typeof variant.variantAttributes === 'object',
                            keys: variant.variantAttributes ? Object.keys(variant.variantAttributes) : [],
                            length: variant.variantAttributes ? Object.keys(variant.variantAttributes).length : 0
                          })
                          return null
                        })()}
                        {variant.variantAttributes && Object.keys(variant.variantAttributes).length > 0 ? (
                          <div className="text-xs text-[rgba(26,42,34,0.7)]">
                            {Object.entries(variant.variantAttributes).slice(0, 1).map(([key, value]) => (
                              <span key={key}>
                                <span className="font-medium">{key}:</span> {value}
                                {Object.keys(variant.variantAttributes).length > 1 && ' + more'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[rgba(26,42,34,0.6)]"><Trans>Standard variant</Trans></p>
                        )}
                        {/* Variant Price - Always visible */}
                        <div className="text-sm font-bold text-[#1b8f5b] mt-1">
                          ₹{(variant.unitPrice || 0).toLocaleString('en-IN')} <Trans>per unit</Trans>
                          {(() => {
                            console.log(`💰 Variant ${variantIdx + 1} Price Display:`, {
                              unitPrice: variant.unitPrice,
                              price: variant.price,
                              calculated: variant.unitPrice || 0
                            })
                            return null
                          })()}
                        </div>
                      </div>
                      <ChevronRightIcon 
                        className={cn(
                          "h-4 w-4 text-[rgba(26,42,34,0.5)] transition-transform shrink-0",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                    
                    {/* Expanded Variant Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-[rgba(34,94,65,0.1)] bg-[rgba(240,245,242,0.2)]">
                        {variant.variantAttributes && Object.keys(variant.variantAttributes).length > 0 ? (
                          <div className="pt-2 space-y-1">
                            <p className="text-xs font-bold text-[rgba(26,42,34,0.7)] mb-2"><Trans>Variant Properties:</Trans></p>
                            {Object.entries(variant.variantAttributes).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between text-xs py-1">
                                <span className="text-[rgba(26,42,34,0.5)] font-medium">{key}:</span>
                                <span className="text-[rgba(26,42,34,0.7)] font-semibold">{value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pt-2">
                            <p className="text-xs text-[rgba(26,42,34,0.6)]"><Trans>No variant properties available</Trans></p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Variant Controls - Always visible */}
                    <div className="flex items-center justify-between gap-3 p-3 border-t border-[rgba(34,94,65,0.1)] bg-[rgba(240,245,242,0.1)]">
                      <div className="flex items-center gap-2 border border-[rgba(34,94,65,0.2)] rounded-xl bg-white">
                        <button
                          type="button"
                          className="p-1.5 hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateQuantity(variantId, variant.quantity - 1)
                          }}
                          disabled={variant.quantity <= 1}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="px-2 text-sm font-semibold text-[#172022] min-w-[2rem] text-center">{variant.quantity}</span>
                        <button
                          type="button"
                          className="p-1.5 hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateQuantity(variantId, variant.quantity + 1)
                          }}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Variant Total */}
                      <div className="text-right min-w-[80px]">
                        <div className="text-base font-bold text-[#172022]">
                          ₹{((variant.unitPrice || 0) * variant.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemove(cartItemId)
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-[rgba(34,94,65,0.16)] bg-gradient-to-br from-white to-[rgba(241,244,236,0.9)] shadow-[0_18px_38px_-28px_rgba(13,38,24,0.35)] space-y-3 user-cart-summary">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,42,34,0.65)]"><Trans>Subtotal</Trans></span>
          <span className="font-semibold text-[#172022]">₹{totals.subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,42,34,0.65)]"><Trans>Delivery</Trans></span>
          <span className="font-semibold text-[#172022]">{totals.delivery === 0 ? <Trans>Free</Trans> : `₹${totals.delivery}`}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(34,94,65,0.1)]">
          <span className="text-base font-bold text-[#172022]"><Trans>Total</Trans></span>
          <span className="text-xl font-bold text-[#1b8f5b]">₹{totals.total.toLocaleString('en-IN')}</span>
        </div>
        {!totals.meetsMinimum && (
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-xs font-semibold text-orange-700 text-center">
              <Trans>Add ₹{totals.shortfall.toLocaleString('en-IN')} more to reach minimum order value of ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}</Trans>
            </p>
          </div>
        )}
        <button
          type="button"
          className={cn(
            'w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-200 mt-4 user-cart-checkout-btn',
            totals.meetsMinimum
              ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
          onClick={onCheckout}
          disabled={!totals.meetsMinimum}
        >
          {totals.meetsMinimum ? <Trans>Proceed to Checkout</Trans> : <Trans>Add ₹{totals.shortfall.toLocaleString('en-IN')} more</Trans>}
        </button>
      </div>

      {/* Suggested Items Section */}
      {suggestedProducts.length > 0 && (
        <div className="user-cart-suggested">
          <h3 className="text-base font-bold text-[#172022] mb-3"><Trans>You might also like</Trans></h3>
          <div className="user-cart-suggested__rail">
            {suggestedProducts.map((product) => (
              <div key={product._id || product.id} className="user-cart-suggested__card">
                <div className="user-cart-suggested__image-wrapper">
                  <img src={getPrimaryImageUrl(product)} alt={product.name} className="user-cart-suggested__image" />
                </div>
                <div className="user-cart-suggested__content">
                  <h4 className="user-cart-suggested__title"><TransText>{product.name}</TransText></h4>
                  <div className="user-cart-suggested__price">₹{(product.priceToUser || product.price || 0).toLocaleString('en-IN')}</div>
                  <button
                    type="button"
                    className="user-cart-suggested__add-btn"
                    onClick={() => onAddToCart?.(product._id || product.id, 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span><Trans>Add</Trans></span>
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
          {totals.meetsMinimum ? <Trans>Proceed to Checkout</Trans> : <Trans>Add ₹{totals.shortfall.toLocaleString('en-IN')} more</Trans>}
        </button>
      </div>
    </div>
  )
}


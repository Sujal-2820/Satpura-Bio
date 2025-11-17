import { useState, useMemo, useEffect, useRef } from 'react'
import { userSnapshot } from '../../services/userData'
import { StarIcon, HeartIcon, TruckIcon, MapPinIcon, ChevronRightIcon, PlusIcon, MinusIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'

export function ProductDetailView({ productId, onAddToCart, onBack, onProductClick }) {
  const product = userSnapshot.products.find((p) => p.id === productId)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(product?.isWishlisted || false)
  const containerRef = useRef(null)

  // Get similar products (same category, excluding current product)
  const similarProducts = useMemo(() => {
    if (!product) return []
    return userSnapshot.products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 10)
  }, [product])

  // Get suggested products (random products, excluding current product and similar products)
  const suggestedProducts = useMemo(() => {
    if (!product) return []
    const excludeIds = [product.id, ...similarProducts.map((p) => p.id)]
    const available = userSnapshot.products.filter((p) => !excludeIds.includes(p.id))
    // Shuffle and take 10
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 10)
  }, [product, similarProducts])

  // Reset quantity and image when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1)
      setSelectedImage(0)
      setIsWishlisted(product.isWishlisted || false)
      // Scroll to top when product changes
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [productId, product])

  if (!product) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <p className="text-base font-semibold text-[rgba(26,42,34,0.75)] mb-4">Product not found</p>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white text-sm font-semibold"
            onClick={onBack}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const inStock = product.stock > 0
  const stockStatus = product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'

  const handleAddToCart = () => {
    if (inStock) {
      onAddToCart(productId, quantity)
    }
  }

  const images = [product.image, product.image, product.image] // In real app, use product.images

  const handleProductClick = (clickedProductId) => {
    if (onProductClick) {
      onProductClick(clickedProductId)
      // Scroll to top when navigating to a new product
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div ref={containerRef} className="user-product-detail-view space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-semibold text-[#1b8f5b] mb-2"
        onClick={onBack}
      >
        <ChevronRightIcon className="h-5 w-5 rotate-180" />
        Back
      </button>

      {/* Image Gallery */}
      <div className="space-y-3">
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gray-100">
          <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  'flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all',
                  selectedImage === index
                    ? 'border-[#1b8f5b] scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
                onClick={() => setSelectedImage(index)}
              >
                <img src={img} alt={`${product.name} view ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="user-product-info">
        {/* Title and Wishlist */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-bold text-[#172022] flex-1 leading-tight">{product.name}</h1>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl border border-[rgba(34,94,65,0.15)] bg-white transition-colors",
              isWishlisted && "bg-red-50 border-red-200"
            )}
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <HeartIcon className="h-5 w-5" filled={isWishlisted} />
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className="h-4 w-4 text-yellow-400"
                filled={star <= Math.round(product.rating || 0)}
              />
            ))}
          </div>
          <span className="text-sm text-[rgba(26,42,34,0.65)]">
            {product.rating} ({product.reviews} reviews)
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-[#1b8f5b]">₹{product.price.toLocaleString('en-IN')}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <>
              <span className="text-lg text-[rgba(26,42,34,0.5)] line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold text-white bg-red-500">-{product.discount}%</span>
            </>
          )}
        </div>

        {/* Vendor, Delivery, Stock Info */}
        <div className="space-y-2.5 mb-4">
          {product.vendor && (
            <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl border-l-4 border-[#1b8f5b] bg-[rgba(240,245,242,0.4)]">
              <MapPinIcon className="h-5 w-5 text-[#1b8f5b] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Vendor</p>
                <p className="text-sm font-semibold text-[#172022] mb-0.5">{product.vendor.name}</p>
                <p className="text-xs text-[rgba(26,42,34,0.65)]">{product.vendor.location}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl border-l-4 border-blue-500 bg-[rgba(239,246,255,0.4)]">
            <TruckIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Delivery</p>
              <p className="text-sm font-semibold text-[#172022]">{product.deliveryTime}</p>
            </div>
          </div>

          <div className={cn(
            "flex items-start gap-3 py-2.5 px-3 rounded-xl border-l-4",
            inStock 
              ? "border-[#1b8f5b] bg-[rgba(240,245,242,0.4)]" 
              : "border-red-500 bg-[rgba(254,242,242,0.4)]"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full shrink-0 mt-1.5",
              inStock ? "bg-[#1b8f5b]" : "bg-red-500"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Status</p>
              <p className="text-sm font-semibold text-[#172022]">{stockStatus}</p>
              {inStock && product.stock <= 10 && (
                <p className="text-xs text-orange-600 font-medium mt-0.5">Only {product.stock} left!</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 p-4 rounded-xl bg-[rgba(240,245,242,0.3)] border border-[rgba(34,94,65,0.08)]">
          <h3 className="text-base font-semibold text-[#172022] mb-2.5">About this product</h3>
          <p className="text-sm text-[rgba(26,42,34,0.7)] leading-relaxed">{product.description}</p>
        </div>

        {/* Quantity Selector */}
        {inStock && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[rgba(26,42,34,0.75)] uppercase tracking-wide mb-2">Select Quantity</label>
            <div className="flex items-center justify-center gap-3 p-2.5 bg-white rounded-lg border border-[rgba(34,94,65,0.1)] max-w-[200px]">
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
                <span className="text-lg font-bold text-[#172022]">{quantity}</span>
                <span className="text-[0.6rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide">units</span>
              </div>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Add to Cart Button - Fixed at bottom on mobile */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-[rgba(34,94,65,0.1)] -mx-5 mt-6">
          <button
            type="button"
            className={cn(
              'w-full py-3.5 px-6 rounded-xl text-base font-bold transition-all',
              inStock
                ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
            onClick={handleAddToCart}
            disabled={!inStock}
          >
            {inStock ? `Add to Cart • ₹${(product.price * quantity).toLocaleString('en-IN')}` : 'Out of Stock'}
          </button>
        </div>
      </div>

      {/* Similar Products Section */}
      {similarProducts.length > 0 && (
        <section className="user-product-detail-view__similar-section">
          <div className="user-product-detail-view__similar-header">
            <h3 className="user-product-detail-view__similar-title">Similar Products</h3>
            <p className="user-product-detail-view__similar-subtitle">Products you might like</p>
          </div>
          <div className="user-product-detail-view__similar-rail">
            {similarProducts.map((similarProduct) => (
              <div key={similarProduct.id} className="user-product-detail-view__similar-card-wrapper">
                <div
                  className="user-product-detail-view__similar-card"
                  onClick={() => handleProductClick(similarProduct.id)}
                >
                  <div className="user-product-detail-view__similar-card-image">
                    <img src={similarProduct.image} alt={similarProduct.name} />
                  </div>
                  <div className="user-product-detail-view__similar-card-content">
                    <h4 className="user-product-detail-view__similar-card-title">{similarProduct.name}</h4>
                    <div className="user-product-detail-view__similar-card-price">
                      <span className="user-product-detail-view__similar-card-price-main">
                        ₹{similarProduct.price.toLocaleString('en-IN')}
                      </span>
                      {similarProduct.originalPrice && similarProduct.originalPrice > similarProduct.price && (
                        <span className="user-product-detail-view__similar-card-price-original">
                          ₹{similarProduct.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="user-product-detail-view__similar-card-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProductClick(similarProduct.id)
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested Products Section */}
      {suggestedProducts.length > 0 && (
        <section className="user-product-detail-view__suggested-section">
          <div className="user-product-detail-view__suggested-header">
            <h3 className="user-product-detail-view__suggested-title">Suggested for You</h3>
            <p className="user-product-detail-view__suggested-subtitle">Discover more products</p>
          </div>
          <div className="user-product-detail-view__suggested-rail">
            {suggestedProducts.map((suggestedProduct) => (
              <div key={suggestedProduct.id} className="user-product-detail-view__suggested-card-wrapper">
                <div
                  className="user-product-detail-view__suggested-card"
                  onClick={() => handleProductClick(suggestedProduct.id)}
                >
                  <div className="user-product-detail-view__suggested-card-image">
                    <img src={suggestedProduct.image} alt={suggestedProduct.name} />
                  </div>
                  <div className="user-product-detail-view__suggested-card-content">
                    <h4 className="user-product-detail-view__suggested-card-title">{suggestedProduct.name}</h4>
                    <div className="user-product-detail-view__suggested-card-price">
                      <span className="user-product-detail-view__suggested-card-price-main">
                        ₹{suggestedProduct.price.toLocaleString('en-IN')}
                      </span>
                      {suggestedProduct.originalPrice && suggestedProduct.originalPrice > suggestedProduct.price && (
                        <span className="user-product-detail-view__suggested-card-price-original">
                          ₹{suggestedProduct.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="user-product-detail-view__suggested-card-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProductClick(suggestedProduct.id)
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}


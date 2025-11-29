import { useState, useMemo, useEffect, useRef } from 'react'
import { StarIcon, HeartIcon, TruckIcon, MapPinIcon, ChevronRightIcon, PlusIcon, MinusIcon, PackageIcon, CheckCircleIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import * as userApi from '../../services/userApi'
import { getPrimaryImageUrl } from '../../utils/productImages'

export function ProductDetailView({ productId, onAddToCart, onBack, onProductClick }) {
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [suggestedProducts, setSuggestedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState({}) // Selected attribute combination
  const [selectedAttributeStock, setSelectedAttributeStock] = useState(null) // The matching attributeStock entry
  const containerRef = useRef(null)

  // Fetch product details and related products
  useEffect(() => {
    const loadProduct = async () => {
      // Don't fetch if productId is 'all' or invalid
      if (!productId || productId === 'all') {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        // Fetch product details
        const result = await userApi.getProductDetails(productId)
        if (result.success && result.data?.product) {
          const productData = result.data.product
          setProduct(productData)
          setIsWishlisted(productData.isWishlisted || false)
          
          // Fetch similar products (same category)
          if (productData.category) {
            const similarResult = await userApi.getProducts({ 
              category: productData.category, 
              limit: 10 
            })
            if (similarResult.success && similarResult.data?.products) {
              const similar = similarResult.data.products
                .filter((p) => (p._id || p.id) !== productId)
                .slice(0, 10)
              setSimilarProducts(similar)
              
              // Fetch suggested products (different category)
              const suggestedResult = await userApi.getProducts({ limit: 20 })
              if (suggestedResult.success && suggestedResult.data?.products) {
                const excludeIds = [productId, ...similar.map((p) => p._id || p.id)]
                const suggested = suggestedResult.data.products
                  .filter((p) => !excludeIds.includes(p._id || p.id))
                  .slice(0, 10)
                setSuggestedProducts(suggested)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading product:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (productId) {
      loadProduct()
    }
  }, [productId])

  // Extract unique attribute keys and values from attributeStocks
  const attributeOptions = useMemo(() => {
    if (!product?.attributeStocks || product.attributeStocks.length === 0) {
      return {}
    }

    const options = {}
    product.attributeStocks.forEach(stock => {
      if (stock.attributes) {
        Object.keys(stock.attributes).forEach(key => {
          if (!options[key]) {
            options[key] = new Set()
          }
          const value = stock.attributes[key]
          if (value) {
            options[key].add(value)
          }
        })
      }
    })

    // Convert Sets to Arrays and format labels
    const formatted = {}
    Object.keys(options).forEach(key => {
      formatted[key] = Array.from(options[key]).sort()
    })
    return formatted
  }, [product])

  // Find matching attributeStock entry based on selected attributes
  const findMatchingAttributeStock = useMemo(() => {
    if (!product?.attributeStocks || product.attributeStocks.length === 0) {
      return null
    }

    if (Object.keys(selectedAttributes).length === 0) {
      return null
    }

    // Find the attributeStock entry that matches all selected attributes
    return product.attributeStocks.find(stock => {
      if (!stock.attributes) return false
      return Object.keys(selectedAttributes).every(key => {
        return stock.attributes[key] === selectedAttributes[key]
      })
    }) || null
  }, [product, selectedAttributes])

  // Update selectedAttributeStock when match changes
  useEffect(() => {
    setSelectedAttributeStock(findMatchingAttributeStock)
    // Reset quantity when attribute selection changes
    if (findMatchingAttributeStock) {
      setQuantity(1)
    }
  }, [findMatchingAttributeStock])

  // Reset quantity and image when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1)
      setSelectedImage(0)
      setSelectedAttributes({})
      setSelectedAttributeStock(null)
      setIsWishlisted(product.isWishlisted || false)
      // Scroll to top when product changes
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [productId, product])

  // Get images array - handle both new format (images array) and legacy formats
  // This hook must be called before any conditional returns
  const images = useMemo(() => {
    if (!product) {
      return ['https://via.placeholder.com/400']
    }
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images
        .map(img => typeof img === 'string' ? img : (img.url || ''))
        .filter(url => url && url !== '')
        .sort((a, b) => {
          // Sort by order if available
          const aIndex = product.images.findIndex(i => 
            (typeof i === 'string' ? i === a : i.url === a)
          )
          const bIndex = product.images.findIndex(i => 
            (typeof i === 'string' ? i === b : i.url === b)
          )
          const aOrder = typeof product.images[aIndex] === 'object' ? (product.images[aIndex].order ?? aIndex) : aIndex
          const bOrder = typeof product.images[bIndex] === 'object' ? (product.images[bIndex].order ?? bIndex) : bIndex
          return aOrder - bOrder
        })
    }
    if (product.primaryImage) {
      return [product.primaryImage]
    }
    if (product.image) {
      return [product.image]
    }
    return ['https://via.placeholder.com/400']
  }, [product])

  // Determine current stock, price, and status based on selected attribute or default
  // These hooks MUST be called before any conditional returns
  const currentStock = useMemo(() => {
    if (!product) return 0
    if (selectedAttributeStock) {
      return selectedAttributeStock.displayStock || 0
    }
    return product.displayStock || product.stock || 0
  }, [product, selectedAttributeStock])

  const currentPrice = useMemo(() => {
    if (!product) return 0
    if (selectedAttributeStock) {
      return selectedAttributeStock.userPrice || 0
    }
    return product.priceToUser || product.price || 0
  }, [product, selectedAttributeStock])

  const currentStockUnit = useMemo(() => {
    if (!product) return 'kg'
    if (selectedAttributeStock) {
      return selectedAttributeStock.stockUnit || 'kg'
    }
    return product.stockUnit || 'kg'
  }, [product, selectedAttributeStock])

  // Check if product has attributes (flexible check)
  const hasAttributes = useMemo(() => {
    if (!product) return false
    // Check if attributeStocks exists and has valid entries with attributes
    if (product.attributeStocks && Array.isArray(product.attributeStocks) && product.attributeStocks.length > 0) {
      // Check if at least one entry has valid attributes
      return product.attributeStocks.some(stock => 
        stock && 
        stock.attributes && 
        typeof stock.attributes === 'object' && 
        Object.keys(stock.attributes).length > 0
      )
    }
    return false
  }, [product])

  const inStock = currentStock > 0
  const stockStatus = currentStock > 10 ? 'In Stock' : currentStock > 0 ? 'Low Stock' : 'Out of Stock'
  const maxQuantity = currentStock

  const handleProductClick = (clickedProductId) => {
    if (onProductClick) {
      onProductClick(clickedProductId)
      // Scroll to top when navigating to a new product
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Conditional returns must come after all hooks
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <p className="text-base font-semibold text-[rgba(26,42,34,0.75)] mb-4">Loading product...</p>
        </div>
      </div>
    )
  }

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

  // Handle attribute selection
  const handleAttributeChange = (attributeKey, value) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeKey]: value,
    }))
  }

  // Format attribute key to readable label
  const formatAttributeLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const handleAddToCart = () => {
    if (inStock) {
      // Note: Attribute information will be handled by backend when adding to cart
      // The backend can identify the variant from the productId and attribute combination
      onAddToCart(productId, quantity)
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

      {/* Product Info - Redesigned Layout */}
      <div className="user-product-info space-y-5">
        {/* Title and Wishlist */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#172022] leading-tight mb-2">{product.name}</h1>
            {/* Rating */}
            <div className="flex items-center gap-2">
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
                {product.rating || 0} ({product.reviews || 0} reviews)
              </span>
            </div>
          </div>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all shadow-sm",
              isWishlisted 
                ? "border-red-300 bg-red-50 text-red-600" 
                : "border-[rgba(34,94,65,0.15)] bg-white text-gray-600 hover:border-red-200 hover:bg-red-50"
            )}
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <HeartIcon className="h-5 w-5" filled={isWishlisted} />
          </button>
        </div>

        {/* Price - Prominent Display */}
        <div className="bg-gradient-to-br from-[#1b8f5b]/10 to-[#2a9d61]/5 rounded-2xl p-4 border border-[#1b8f5b]/20">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#1b8f5b]">₹{currentPrice.toLocaleString('en-IN')}</span>
            {product.originalPrice && product.originalPrice > currentPrice && (
              <>
                <span className="text-lg text-[rgba(26,42,34,0.5)] line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                {product.discount && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-red-500 shadow-sm">
                    -{product.discount}% OFF
                  </span>
                )}
              </>
            )}
          </div>
          {selectedAttributeStock && (
            <p className="text-xs text-[rgba(26,42,34,0.6)] mt-2 font-medium">
              Price for selected variant
            </p>
          )}
        </div>

        {/* Dynamic Attribute Selection - Only show if attributes are actually present */}
        {hasAttributes && Object.keys(attributeOptions).length > 0 && (
          <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-purple-50/30 border border-blue-200/50">
            <div className="flex items-center gap-2 mb-3">
              <PackageIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-[#172022]">Select Variant</h3>
            </div>
            <div className="space-y-4">
              {Object.keys(attributeOptions).map((attrKey) => (
                <div key={attrKey}>
                  <label className="block text-sm font-semibold text-[#172022] mb-2">
                    {formatAttributeLabel(attrKey)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attributeOptions[attrKey].map((value) => {
                      const isSelected = selectedAttributes[attrKey] === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAttributeChange(attrKey, value)}
                          className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2',
                            isSelected
                              ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-md scale-105'
                              : 'bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]'
                          )}
                        >
                          {isSelected && <CheckCircleIcon className="inline h-4 w-4 mr-1.5" />}
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show selected variant details */}
            {selectedAttributeStock && (
              <div className="mt-4 p-4 rounded-xl bg-white border-2 border-[#1b8f5b]/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon className="h-5 w-5 text-[#1b8f5b]" />
                  <span className="text-sm font-bold text-[#172022]">Selected Variant Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[rgba(26,42,34,0.6)]">Available Stock:</span>
                    <span className="ml-2 font-bold text-[#172022]">
                      {currentStock.toLocaleString('en-IN')} {currentStockUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[rgba(26,42,34,0.6)]">Price:</span>
                    <span className="ml-2 font-bold text-[#1b8f5b]">
                      ₹{currentPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {selectedAttributeStock.batchNumber && (
                    <div>
                      <span className="text-[rgba(26,42,34,0.6)]">Batch:</span>
                      <span className="ml-2 font-semibold text-[#172022]">
                        {selectedAttributeStock.batchNumber}
                      </span>
                    </div>
                  )}
                  {selectedAttributeStock.expiry && (
                    <div>
                      <span className="text-[rgba(26,42,34,0.6)]">Expiry:</span>
                      <span className="ml-2 font-semibold text-[#172022]">
                        {new Date(selectedAttributeStock.expiry).toLocaleDateString('en-IN', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vendor, Delivery, Stock Info - Redesigned Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {product.vendor && (
            <div className="flex items-start gap-3 p-3 rounded-xl border-l-4 border-[#1b8f5b] bg-gradient-to-r from-[rgba(240,245,242,0.6)] to-[rgba(240,245,242,0.3)]">
              <MapPinIcon className="h-5 w-5 text-[#1b8f5b] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Vendor</p>
                <p className="text-sm font-bold text-[#172022] mb-0.5">{product.vendor.name}</p>
                <p className="text-xs text-[rgba(26,42,34,0.65)]">{product.vendor.location}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3 p-3 rounded-xl border-l-4 border-blue-500 bg-gradient-to-r from-[rgba(239,246,255,0.6)] to-[rgba(239,246,255,0.3)]">
            <TruckIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Delivery</p>
              <p className="text-sm font-bold text-[#172022]">{product.deliveryTime || 'Within 24 hours'}</p>
            </div>
          </div>

          <div className={cn(
            "flex items-start gap-3 p-3 rounded-xl border-l-4 col-span-1 sm:col-span-2",
            inStock 
              ? "border-[#1b8f5b] bg-gradient-to-r from-[rgba(240,245,242,0.6)] to-[rgba(240,245,242,0.3)]" 
              : "border-red-500 bg-gradient-to-r from-[rgba(254,242,242,0.6)] to-[rgba(254,242,242,0.3)]"
          )}>
            <div className={cn(
              "w-4 h-4 rounded-full shrink-0 mt-1 shadow-sm",
              inStock ? "bg-[#1b8f5b]" : "bg-red-500"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5">Availability</p>
              <p className="text-sm font-bold text-[#172022]">{stockStatus}</p>
              {inStock && (
                <p className="text-xs text-[rgba(26,42,34,0.7)] mt-1">
                  {currentStock.toLocaleString('en-IN')} {currentStockUnit} available
                  {currentStock <= 10 && (
                    <span className="ml-2 text-orange-600 font-semibold">• Only {currentStock} left!</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Description - Redesigned */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[rgba(240,245,242,0.4)] to-[rgba(240,245,242,0.2)] border border-[rgba(34,94,65,0.12)] shadow-sm">
          <h3 className="text-lg font-bold text-[#172022] mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-[#1b8f5b] to-[#2a9d61] rounded-full"></div>
            About this product
          </h3>
          <p className="text-sm text-[rgba(26,42,34,0.75)] leading-relaxed">{product.description}</p>
        </div>

        {/* Quantity Selector - Enhanced */}
        {inStock && (
          <div className="p-4 rounded-2xl bg-white border-2 border-[rgba(34,94,65,0.15)] shadow-sm">
            <label className="block text-sm font-bold text-[#172022] mb-3">Select Quantity</label>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 p-2.5 bg-[rgba(240,245,242,0.3)] rounded-xl border border-[rgba(34,94,65,0.15)]">
                <button
                  type="button"
                  className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.8)] transition-all hover:scale-105"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                  <span className="text-xl font-bold text-[#172022]">{quantity}</span>
                  <span className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide">units</span>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.8)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xs text-[rgba(26,42,34,0.6)] mb-1">Available</p>
                <p className="text-sm font-bold text-[#1b8f5b]">
                  {maxQuantity.toLocaleString('en-IN')} {currentStockUnit}
                </p>
              </div>
            </div>
            {quantity >= maxQuantity && (
              <p className="text-xs text-orange-600 font-medium mt-2 text-center">
                ⚠️ Maximum available quantity reached
              </p>
            )}
          </div>
        )}

        {/* Add to Cart Button - Enhanced */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-[rgba(34,94,65,0.15)] -mx-5 mt-6 shadow-lg backdrop-blur-sm bg-white/95">
          <button
            type="button"
            className={cn(
              'w-full py-4 px-6 rounded-2xl text-base font-bold transition-all shadow-lg',
              inStock
                ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
            onClick={handleAddToCart}
            disabled={!inStock || (product.attributeStocks && product.attributeStocks.length > 0 && !selectedAttributeStock)}
          >
            {!inStock ? (
              'Out of Stock'
            ) : hasAttributes && !selectedAttributeStock ? (
              'Please select a variant'
            ) : (
              <>
                Add to Cart • ₹{(currentPrice * quantity).toLocaleString('en-IN')}
              </>
            )}
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
                  onClick={() => handleProductClick(similarProduct._id || similarProduct.id)}
                >
                  <div className="user-product-detail-view__similar-card-image">
                    <img src={getPrimaryImageUrl(similarProduct)} alt={similarProduct.name} />
                  </div>
                  <div className="user-product-detail-view__similar-card-content">
                    <h4 className="user-product-detail-view__similar-card-title">{similarProduct.name}</h4>
                    <div className="user-product-detail-view__similar-card-price">
                      <span className="user-product-detail-view__similar-card-price-main">
                        ₹{(similarProduct.priceToUser || similarProduct.price || 0).toLocaleString('en-IN')}
                      </span>
                      {similarProduct.originalPrice && similarProduct.originalPrice > (similarProduct.priceToUser || similarProduct.price) && (
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
                        handleProductClick(similarProduct._id || similarProduct.id)
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
                  onClick={() => handleProductClick(suggestedProduct._id || suggestedProduct.id)}
                >
                  <div className="user-product-detail-view__suggested-card-image">
                    <img src={getPrimaryImageUrl(suggestedProduct)} alt={suggestedProduct.name} />
                  </div>
                  <div className="user-product-detail-view__suggested-card-content">
                    <h4 className="user-product-detail-view__suggested-card-title">{suggestedProduct.name}</h4>
                    <div className="user-product-detail-view__suggested-card-price">
                      <span className="user-product-detail-view__suggested-card-price-main">
                        ₹{(suggestedProduct.priceToUser || suggestedProduct.price || 0).toLocaleString('en-IN')}
                      </span>
                      {suggestedProduct.originalPrice && suggestedProduct.originalPrice > (suggestedProduct.priceToUser || suggestedProduct.price) && (
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
                        handleProductClick(suggestedProduct._id || suggestedProduct.id)
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


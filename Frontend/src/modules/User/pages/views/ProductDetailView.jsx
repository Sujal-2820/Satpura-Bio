import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { StarIcon, HeartIcon, TruckIcon, MapPinIcon, ChevronRightIcon, PlusIcon, MinusIcon, PackageIcon, CheckCircleIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import * as userApi from '../../services/userApi'
import { getPrimaryImageUrl } from '../../utils/productImages'
import { TransText } from '../../../../components/TransText'
import { Trans } from '../../../../components/Trans'

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
  const [selectedVariants, setSelectedVariants] = useState([]) // Array of selected variant combinations
  const [variantQuantities, setVariantQuantities] = useState({}) // Track quantity per variant: { variantKey: quantity }
  const [activeTab, setActiveTab] = useState('description') // Tab state: 'description', 'stock', 'delivery'
  const [variantError, setVariantError] = useState('') // Error message for variant selection
  const variantSectionRef = useRef(null) // Ref for variant selection section
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

  // Smart attribute mapping: Group by attribute name, then show properties
  const attributeStructure = useMemo(() => {
    if (!product?.attributeStocks || product.attributeStocks.length === 0) {
      return { attributeNames: [], attributeProperties: {} }
    }

    // First, identify the "Attribute Name" field (usually the first key or a key containing "name" or "attribute")
    const allKeys = new Set()
    product.attributeStocks.forEach(stock => {
      if (stock.attributes) {
        Object.keys(stock.attributes).forEach(key => allKeys.add(key))
      }
    })

    // Try to find attribute name field (case-insensitive check)
    let attributeNameKey = null
    const possibleNameKeys = Array.from(allKeys).filter(key => 
      key.toLowerCase().includes('name') || 
      key.toLowerCase().includes('attribute') ||
      key.toLowerCase() === 'type' && Array.from(allKeys).length > 2
    )

    // If we find a likely attribute name field, use it; otherwise use first key
    if (possibleNameKeys.length > 0) {
      attributeNameKey = possibleNameKeys[0]
    } else {
      // Use the key that has the most unique values (likely the main attribute)
      const keyValueCounts = {}
      Array.from(allKeys).forEach(key => {
        const uniqueValues = new Set()
        product.attributeStocks.forEach(stock => {
          if (stock.attributes && stock.attributes[key]) {
            uniqueValues.add(stock.attributes[key])
          }
        })
        keyValueCounts[key] = uniqueValues.size
      })
      // Find key with most unique values (but not all unique, that would be properties)
      const sortedKeys = Object.entries(keyValueCounts)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count < product.attributeStocks.length) // Exclude keys where every entry is unique
      
      attributeNameKey = sortedKeys.length > 0 ? sortedKeys[0][0] : Array.from(allKeys)[0]
    }

    // Extract unique attribute names
    const attributeNames = new Set()
    product.attributeStocks.forEach(stock => {
      if (stock.attributes && stock.attributes[attributeNameKey]) {
        attributeNames.add(stock.attributes[attributeNameKey])
      }
    })

    // For each attribute name, extract its properties and values
    const attributeProperties = {}
    Array.from(attributeNames).forEach(attrName => {
      attributeProperties[attrName] = {}
      
      // Get all stocks for this attribute name
      const relevantStocks = product.attributeStocks.filter(stock => 
        stock.attributes && stock.attributes[attributeNameKey] === attrName
      )

      // Extract properties (all keys except attribute name key)
      relevantStocks.forEach(stock => {
        Object.keys(stock.attributes).forEach(key => {
          if (key !== attributeNameKey) {
            if (!attributeProperties[attrName][key]) {
              attributeProperties[attrName][key] = new Set()
            }
            const value = stock.attributes[key]
            if (value) {
              // Handle array values (multiple subvalues)
              if (Array.isArray(value)) {
                value.forEach(v => attributeProperties[attrName][key].add(v))
              } else {
                attributeProperties[attrName][key].add(value)
              }
            }
          }
        })
      })

      // Convert Sets to Arrays
      Object.keys(attributeProperties[attrName]).forEach(propKey => {
        attributeProperties[attrName][propKey] = Array.from(attributeProperties[attrName][propKey]).sort()
      })
    })

    return {
      attributeNameKey,
      attributeNames: Array.from(attributeNames).sort(),
      attributeProperties
    }
  }, [product])

  // Get available properties for currently selected attribute name
  const availableProperties = useMemo(() => {
    if (!selectedAttributes[attributeStructure.attributeNameKey]) {
      return {}
    }
    const selectedAttrName = selectedAttributes[attributeStructure.attributeNameKey]
    return attributeStructure.attributeProperties[selectedAttrName] || {}
  }, [selectedAttributes, attributeStructure])

  // Find matching attributeStock entry based on selected attributes
  const findMatchingAttributeStock = useMemo(() => {
    if (!product?.attributeStocks || product.attributeStocks.length === 0) {
      return null
    }

    if (Object.keys(selectedAttributes).length === 0) {
      return null
    }

    // Find the attributeStock entry that matches all selected attributes
    // Handle array values in attributes (multiple subvalues)
    return product.attributeStocks.find(stock => {
      if (!stock.attributes) return false
      return Object.keys(selectedAttributes).every(key => {
        const stockValue = stock.attributes[key]
        const selectedValue = selectedAttributes[key]
        
        // If stock has array value, check if selected value is in array
        if (Array.isArray(stockValue)) {
          return stockValue.includes(selectedValue)
        }
        // If selected is array, check if stock value is in selected array
        if (Array.isArray(selectedValue)) {
          return selectedValue.includes(stockValue)
        }
        // Direct comparison
        return stockValue === selectedValue
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
      setSelectedVariants([])
      setVariantError('')
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

  // Get variant key for quantity tracking - MUST be before conditional returns
  const getVariantKey = useCallback((variantStock) => {
    const stockAttrs = variantStock.attributes instanceof Map 
      ? Object.fromEntries(variantStock.attributes)
      : variantStock.attributes || {}
    return JSON.stringify(stockAttrs)
  }, [])

  // Calculate total price for all selected variants - MUST be before conditional returns
  const totalVariantPrice = useMemo(() => {
    return selectedVariants.reduce((total, variant) => {
      const variantKey = getVariantKey(variant)
      const variantQty = variantQuantities[variantKey] || 1
      return total + ((variant.userPrice || 0) * variantQty)
    }, 0)
  }, [selectedVariants, variantQuantities, getVariantKey])

  // Update selectedAttributeStock when a single variant is selected - MUST be before conditional returns
  useEffect(() => {
    if (selectedVariants.length === 1) {
      setSelectedAttributeStock(selectedVariants[0])
    } else {
      setSelectedAttributeStock(null)
    }
  }, [selectedVariants])

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

  // Handle attribute selection - allow multiple selections
  const handleAttributeChange = (attributeKey, value) => {
    setSelectedAttributes(prev => {
      const newSelection = { ...prev, [attributeKey]: value }
      
      // If attribute name is changed, clear all property selections
      if (attributeKey === attributeStructure.attributeNameKey) {
        // Keep only the attribute name selection
        return { [attributeKey]: value }
      }
      
      return newSelection
    })
    // Clear error when user makes a selection
    setVariantError('')
  }

  // Handle variant selection - toggle variant in/out of selection
  const handleVariantToggle = (variantStock) => {
    const variantKey = getVariantKey(variantStock)
    
    setSelectedVariants(prev => {
      // Normalize attributes for comparison
      const stockAttrs = variantStock.attributes instanceof Map 
        ? Object.fromEntries(variantStock.attributes)
        : variantStock.attributes || {}
      
      const exists = prev.find(v => {
        const vAttrs = v.attributes instanceof Map 
          ? Object.fromEntries(v.attributes)
          : v.attributes || {}
        return JSON.stringify(vAttrs) === JSON.stringify(stockAttrs)
      })
      
      if (exists) {
        // Remove variant and its quantity
        setVariantQuantities(prevQty => {
          const newQty = { ...prevQty }
          delete newQty[variantKey]
          return newQty
        })
        return prev.filter(v => {
          const vAttrs = v.attributes instanceof Map 
            ? Object.fromEntries(v.attributes)
            : v.attributes || {}
          return JSON.stringify(vAttrs) !== JSON.stringify(stockAttrs)
        })
      } else {
        // Add variant with initial quantity of 1
        setVariantQuantities(prevQty => ({
          ...prevQty,
          [variantKey]: 1
        }))
        return [...prev, variantStock]
      }
    })
    setVariantError('')
  }

  // Handle variant quantity change
  const handleVariantQuantityChange = (variantStock, delta) => {
    const variantKey = getVariantKey(variantStock)
    const currentQty = variantQuantities[variantKey] || 1
    const maxQty = variantStock.displayStock || variantStock.actualStock || 999
    
    const newQty = Math.max(1, Math.min(maxQty, currentQty + delta))
    setVariantQuantities(prev => ({
      ...prev,
      [variantKey]: newQty
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
    if (!inStock) {
      return
    }

    // Validate variant selection if product has attributes
    if (hasAttributes && attributeStructure.attributeNames.length > 0) {
      if (selectedVariants.length === 0) {
        setVariantError('Please select at least one variant to proceed')
        // Scroll to variant section
        setTimeout(() => {
          if (variantSectionRef.current) {
            variantSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
        return
      }
    }

    // Clear error if validation passes
    setVariantError('')
    
    // Add each selected variant to cart separately with variant-specific quantities
    if (selectedVariants.length > 0) {
      // Handle multiple variants - add each variant separately with its own quantity
      selectedVariants.forEach(variant => {
        // Convert variant attributes to plain object
        const variantAttrs = variant.attributes instanceof Map
          ? Object.fromEntries(variant.attributes)
          : variant.attributes || {}
        const variantKey = getVariantKey(variant)
        const variantQty = variantQuantities[variantKey] || 1
        onAddToCart(productId, variantQty, variantAttrs)
      })
    } else {
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
         <div className="flex items-start justify-between gap-3">
           <div className="flex-1">
             <h1 className="text-xl font-bold text-[#172022] leading-tight mb-1.5"><TransText>{product.name}</TransText></h1>
             {/* Rating */}
             <div className="flex items-center gap-2">
               <div className="flex items-center gap-0.5">
                 {[1, 2, 3, 4, 5].map((star) => (
                   <StarIcon
                     key={star}
                     className="h-3.5 w-3.5 text-yellow-400"
                     filled={star <= Math.round(product.rating || 0)}
                   />
                 ))}
               </div>
               <span className="text-xs text-[rgba(26,42,34,0.65)]">
                 {product.rating || 0} ({product.reviews || 0} reviews)
               </span>
             </div>
           </div>
           <button
             type="button"
             className={cn(
               "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all shadow-sm",
               isWishlisted 
                 ? "border-red-300 bg-red-50 text-red-600" 
                 : "border-[rgba(34,94,65,0.15)] bg-white text-gray-600 hover:border-red-200 hover:bg-red-50"
             )}
             onClick={() => setIsWishlisted(!isWishlisted)}
           >
             <HeartIcon className="h-4 w-4" filled={isWishlisted} />
           </button>
         </div>

         {/* Price - Prominent Display */}
         <div className="bg-gradient-to-br from-[#1b8f5b]/10 to-[#2a9d61]/5 rounded-xl p-3 border border-[#1b8f5b]/20">
           <div className="flex items-baseline gap-2.5">
             <span className="text-2xl font-bold text-[#1b8f5b]">₹{currentPrice.toLocaleString('en-IN')}</span>
             {product.originalPrice && product.originalPrice > currentPrice && (
               <>
                 <span className="text-base text-[rgba(26,42,34,0.5)] line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                 {product.discount && (
                   <span className="px-2 py-0.5 rounded-lg text-[0.65rem] font-bold text-white bg-red-500 shadow-sm">
                     -{product.discount}% OFF
                   </span>
                 )}
               </>
             )}
           </div>
           {selectedAttributeStock && (
             <p className="text-[0.65rem] text-[rgba(26,42,34,0.6)] mt-1.5 font-medium">
               Price for selected variant
             </p>
           )}
         </div>

         {/* Dynamic Attribute Selection - Smart hierarchical display */}
         {hasAttributes && attributeStructure.attributeNames.length > 0 && (
           <div 
             ref={variantSectionRef}
             className="space-y-3 p-3 rounded-xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-purple-50/30"
           >
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <PackageIcon className="h-4 w-4 text-blue-600" />
                 <h3 className="text-sm font-bold text-[#172022]">Select Variant</h3>
               </div>
               {selectedVariants.length === 0 && (
                 <span className="text-xs font-bold text-red-500 animate-pulse" style={{ animationDuration: '2s' }}>
                   Required
                 </span>
               )}
             </div>
             {variantError && (
               <div className="p-2.5 rounded-lg bg-red-50 border-2 border-red-300">
                 <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                   <span>⚠️</span>
                   {variantError}
                 </p>
               </div>
             )}
             <div className="space-y-3">
               {/* Step 1: Select Attribute Name */}
               <div>
                 <label className="block text-xs font-semibold text-[#172022] mb-1.5">
                   {formatAttributeLabel(attributeStructure.attributeNameKey || 'Attribute Name')}
                 </label>
                 <div className="flex flex-wrap gap-1.5">
                   {attributeStructure.attributeNames.map((attrName) => {
                     const isSelected = selectedAttributes[attributeStructure.attributeNameKey] === attrName
                     return (
                       <button
                         key={attrName}
                         type="button"
                         onClick={() => handleAttributeChange(attributeStructure.attributeNameKey, attrName)}
                         className={cn(
                           'px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2',
                           isSelected
                             ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-md scale-105'
                             : 'bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]'
                         )}
                       >
                         {isSelected && <CheckCircleIcon className="inline h-3 w-3 mr-1" />}
                         {attrName}
                       </button>
                     )
                   })}
                 </div>
               </div>

               {/* Step 2: Show Properties only for selected Attribute Name */}
               {selectedAttributes[attributeStructure.attributeNameKey] && Object.keys(availableProperties).length > 0 && (
                 <div className="space-y-3 pt-2 border-t border-blue-200">
                   {Object.keys(availableProperties).map((propKey) => (
                     <div key={propKey}>
                       <label className="block text-xs font-semibold text-[#172022] mb-1.5">
                         {formatAttributeLabel(propKey)}
                       </label>
                       <div className="flex flex-wrap gap-1.5">
                         {availableProperties[propKey].map((value) => {
                           const isSelected = selectedAttributes[propKey] === value
                           return (
                             <button
                               key={value}
                               type="button"
                               onClick={() => handleAttributeChange(propKey, value)}
                               className={cn(
                                 'px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2',
                                 isSelected
                                   ? 'bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-md scale-105'
                                   : 'bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]'
                               )}
                             >
                               {isSelected && <CheckCircleIcon className="inline h-3 w-3 mr-1" />}
                               {value}
                             </button>
                           )
                         })}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             
             {/* Show all available variants for selection */}
             {selectedAttributes[attributeStructure.attributeNameKey] && (
               <div className="mt-3 space-y-2">
                 <p className="text-xs font-semibold text-[#172022] mb-2">
                   Available Variants (Select one or more):
                 </p>
                 {product.attributeStocks
                   .filter(stock => {
                     // Filter stocks that match the selected attribute name
                     if (!stock.attributes || !stock.attributes[attributeStructure.attributeNameKey]) return false
                     const stockAttrs = stock.attributes instanceof Map 
                       ? Object.fromEntries(stock.attributes)
                       : stock.attributes
                     return stockAttrs[attributeStructure.attributeNameKey] === selectedAttributes[attributeStructure.attributeNameKey]
                   })
                   .map((variantStock, idx) => {
                     const stockAttrs = variantStock.attributes instanceof Map 
                       ? Object.fromEntries(variantStock.attributes)
                       : variantStock.attributes || {}
                     
                     const isSelected = selectedVariants.some(v => {
                       const vAttrs = v.attributes instanceof Map 
                         ? Object.fromEntries(v.attributes)
                         : v.attributes || {}
                       return JSON.stringify(vAttrs) === JSON.stringify(stockAttrs)
                     })
                     
                     const variantAttributes = Object.entries(stockAttrs)
                       .filter(([key]) => key !== attributeStructure.attributeNameKey)
                       .map(([key, value]) => `${key}: ${value}`)
                       .join(', ')
                     
                     const variantKey = getVariantKey(variantStock)
                     const variantQty = variantQuantities[variantKey] || 1
                     const maxQty = variantStock.displayStock || variantStock.actualStock || 999
                     
                     return (
                       <div
                         key={idx}
                         className={cn(
                           "w-full p-3 rounded-lg border-2 transition-all",
                           isSelected
                             ? "bg-gradient-to-r from-[#1b8f5b]/10 to-[#2a9d61]/10 border-[#1b8f5b] shadow-md"
                             : "bg-white border-gray-200"
                         )}
                       >
                         <div className="flex items-start justify-between gap-2 mb-3">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               {isSelected && <CheckCircleIcon className="h-4 w-4 text-[#1b8f5b]" />}
                               <span className="text-xs font-bold text-[#172022]">
                                 {stockAttrs[attributeStructure.attributeNameKey] || `Variant ${idx + 1}`}
                               </span>
                             </div>
                             <p className="text-xs text-[rgba(26,42,34,0.7)] mb-2">{variantAttributes || 'No additional attributes'}</p>
                             <div className="grid grid-cols-2 gap-2 text-xs">
                               <div>
                                 <span className="text-[rgba(26,42,34,0.6)]">Stock:</span>
                                 <span className="ml-1 font-semibold text-[#172022]">
                                   {variantStock.displayStock || 0} {variantStock.stockUnit || 'kg'}
                                 </span>
                               </div>
                               <div>
                                 <span className="text-[rgba(26,42,34,0.6)]">Price:</span>
                                 <span className="ml-1 font-bold text-[#1b8f5b]">
                                   ₹{(variantStock.userPrice || 0).toLocaleString('en-IN')}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <button
                             type="button"
                             onClick={() => handleVariantToggle(variantStock)}
                             className={cn(
                               "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                               isSelected
                                 ? "bg-[#1b8f5b] border-[#1b8f5b]"
                                 : "bg-white border-gray-300 hover:border-[#1b8f5b]"
                             )}
                           >
                             {isSelected && <CheckCircleIcon className="h-3 w-3 text-white" />}
                           </button>
                         </div>
                         
                         {/* Variant-specific Quantity Control - Only show if selected */}
                         {isSelected && (
                           <div className="mt-3 pt-3 border-t border-[rgba(34,94,65,0.2)]">
                             <label className="block text-xs font-semibold text-[#172022] mb-2">Quantity</label>
                             <div className="flex items-center justify-between gap-3">
                               <div className="flex items-center gap-2 border border-[rgba(34,94,65,0.2)] rounded-lg bg-white p-1.5">
                                 <button
                                   type="button"
                                   className="flex items-center justify-center w-7 h-7 rounded-md border border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.8)] transition-all"
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     handleVariantQuantityChange(variantStock, -1)
                                   }}
                                   disabled={variantQty <= 1}
                                 >
                                   <MinusIcon className="h-3.5 w-3.5" />
                                 </button>
                                 <span className="px-2 text-sm font-semibold text-[#172022] min-w-[2rem] text-center">{variantQty}</span>
                                 <button
                                   type="button"
                                   className="flex items-center justify-center w-7 h-7 rounded-md border border-[rgba(34,94,65,0.2)] bg-white hover:bg-[rgba(240,245,242,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     handleVariantQuantityChange(variantStock, 1)
                                   }}
                                   disabled={variantQty >= maxQty}
                                 >
                                   <PlusIcon className="h-3.5 w-3.5" />
                                 </button>
                               </div>
                               <div className="text-right">
                                 <p className="text-[0.65rem] text-[rgba(26,42,34,0.6)]">Available: {maxQty}</p>
                                 <p className="text-xs font-bold text-[#1b8f5b]">
                                   Total: ₹{((variantStock.userPrice || 0) * variantQty).toLocaleString('en-IN')}
                                 </p>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     )
                   })}
               </div>
             )}
          </div>
        )}

         {/* Vendor Info - Keep separate */}
         {product.vendor && (
           <div className="flex items-start gap-2.5 p-2.5 rounded-lg border-l-4 border-[#1b8f5b] bg-gradient-to-r from-[rgba(240,245,242,0.6)] to-[rgba(240,245,242,0.3)]">
             <MapPinIcon className="h-4 w-4 text-[#1b8f5b] shrink-0 mt-0.5" />
             <div className="flex-1 min-w-0">
               <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.5)] uppercase tracking-wide mb-0.5"><Trans>Vendor</Trans></p>
               <p className="text-xs font-bold text-[#172022] mb-0.5"><TransText>{product.vendor.name}</TransText></p>
               <p className="text-[0.65rem] text-[rgba(26,42,34,0.65)]"><TransText>{product.vendor.location}</TransText></p>
             </div>
           </div>
         )}

        {/* Tabbed Content: Description, Stock, Delivery Time */}
        <div className="space-y-4">
          {/* Horizontal Scrollable Tab Menu */}
          <div>
            <style>{`
              .tab-scroll-container::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div 
              className="overflow-x-auto pb-2 tab-scroll-container" 
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none'
              }}
            >
              <div className="flex gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 min-w-[120px] flex items-center justify-center gap-2",
                    activeTab === 'description'
                      ? "bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-lg scale-105"
                      : "bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]"
                  )}
                >
                  <PackageIcon className="h-3.5 w-3.5" />
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 min-w-[120px] flex items-center justify-center gap-2",
                    activeTab === 'stock'
                      ? "bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-lg scale-105"
                      : "bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]"
                  )}
                >
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    inStock ? "bg-[#1b8f5b]" : "bg-red-500"
                  )} />
                  Stock
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('delivery')}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 min-w-[120px] flex items-center justify-center gap-2",
                    activeTab === 'delivery'
                      ? "bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] text-white border-[#1b8f5b] shadow-lg scale-105"
                      : "bg-white text-[#172022] border-gray-200 hover:border-[#1b8f5b]/50 hover:bg-[rgba(27,143,91,0.05)]"
                  )}
                >
                  <TruckIcon className="h-3.5 w-3.5" />
                  Delivery Time
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
             {/* Description Tab */}
             {activeTab === 'description' && (
               <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#f0f9f4] via-[#e8f5ed] to-[#d4ede0] border-2 border-[#1b8f5b]/30 shadow-xl overflow-hidden">
                 {/* Decorative background elements */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1b8f5b]/10 to-transparent rounded-full blur-3xl"></div>
                 <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#2a9d61]/10 to-transparent rounded-full blur-3xl"></div>
                 
                 <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-5">
                     <div className="w-1.5 h-8 bg-gradient-to-b from-[#1b8f5b] to-[#2a9d61] rounded-full shadow-md"></div>
                     <div>
                       <h3 className="text-lg font-bold text-[#172022] mb-1">About this Product</h3>
                       <div className="h-0.5 w-16 bg-gradient-to-r from-[#1b8f5b] to-[#2a9d61] rounded-full"></div>
                     </div>
                   </div>
                   
                   <div className="pl-4 space-y-4">
                     {(product.longDescription || product.description) ? (
                       <div className="prose prose-sm max-w-none">
                         {(() => {
                           const description = product.longDescription || product.description
                           // Split by double line breaks first, then by single line breaks
                           const paragraphs = description
                             .split(/\n\n+/)
                             .flatMap(p => p.split(/\n/))
                             .map(p => p.trim())
                             .filter(p => p.length > 0)
                           
                           return paragraphs.map((paragraph, idx) => {
                             // Check if paragraph looks like a heading (short and bold)
                             const isHeading = paragraph.length < 80 && !paragraph.includes('.') && paragraph.split(' ').length < 10
                             
                             // Check if paragraph contains usage instructions
                             const isUsage = paragraph.toLowerCase().includes('usage:') || paragraph.toLowerCase().includes('how to use') || paragraph.toLowerCase().startsWith('usage')
                             
                             // Check if paragraph contains benefits/features
                             const isFeature = paragraph.toLowerCase().includes('suitable') || paragraph.toLowerCase().includes('contains') || paragraph.toLowerCase().includes('enhance') || paragraph.toLowerCase().includes('designed')
                             
                             return (
                               <div
                                 key={idx}
                                 className={cn(
                                   "mb-4 p-4 rounded-xl border-l-4 transition-all hover:shadow-md",
                                   isHeading
                                     ? "bg-white border-[#1b8f5b] shadow-sm"
                                     : isUsage
                                     ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border-blue-500 shadow-sm"
                                     : isFeature
                                     ? "bg-white border-[#1b8f5b] shadow-sm"
                                     : "bg-white border-[#1b8f5b]/40 shadow-sm"
                                 )}
                               >
                                 {isHeading ? (
                                   <h4 className="text-base font-bold text-[#1b8f5b] mb-2 flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-[#1b8f5b]"></div>
                                     <TransText>{paragraph}</TransText>
                                   </h4>
                                 ) : isUsage ? (
                                   <div>
                                     <div className="flex items-center gap-2 mb-2">
                                       <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                         <span className="text-white text-xs font-bold">!</span>
                                       </div>
                                       <span className="text-sm font-bold text-blue-700 uppercase tracking-wide"><Trans>Usage Instructions</Trans></span>
                                     </div>
                                     <p className="text-sm text-[rgba(26,42,34,0.85)] leading-relaxed ml-8">
                                       <TransText>{paragraph.replace(/^(usage|how to use):\s*/i, '').trim()}</TransText>
                                     </p>
                                   </div>
                                 ) : (
                                   <p className="text-sm text-[rgba(26,42,34,0.85)] leading-relaxed">
                                     <TransText>{paragraph}</TransText>
                                   </p>
                                 )}
                               </div>
                             )
                           })
                         })()}
                       </div>
                     ) : (
                       <div className="p-6 bg-white/60 rounded-xl border-2 border-dashed border-[#1b8f5b]/30 text-center">
                         <p className="text-sm text-[rgba(26,42,34,0.6)]">No description available for this product.</p>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {/* Stock Tab */}
             {activeTab === 'stock' && (
               <div className={cn(
                 "p-5 rounded-2xl border-2 shadow-lg",
                 inStock 
                   ? "bg-gradient-to-br from-[rgba(240,245,242,0.6)] to-[rgba(240,245,242,0.3)] border-[#1b8f5b]" 
                   : "bg-gradient-to-br from-[rgba(254,242,242,0.6)] to-[rgba(254,242,242,0.3)] border-red-500"
               )}>
                 <div className="flex items-center gap-2.5 mb-3">
                   <div className={cn(
                     "w-4 h-4 rounded-full shadow-md",
                     inStock ? "bg-[#1b8f5b]" : "bg-red-500"
                   )} />
                   <h3 className="text-base font-bold text-[#172022]">Stock Availability</h3>
                 </div>
                 <div className="pl-3 space-y-3">
                   <div className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-[rgba(34,94,65,0.1)]">
                     <div>
                       <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.6)] uppercase tracking-wide mb-0.5">Status</p>
                       <p className={cn(
                         "text-base font-bold",
                         inStock ? "text-[#1b8f5b]" : "text-red-600"
                       )}>
                         {stockStatus}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.6)] uppercase tracking-wide mb-0.5">Available Quantity</p>
                       <p className="text-base font-bold text-[#172022]">
                         {currentStock.toLocaleString('en-IN')} {currentStockUnit}
                       </p>
                     </div>
                   </div>
                   {inStock && (
                     <div className="p-3 bg-white rounded-xl border-2 border-[rgba(34,94,65,0.1)]">
                       {currentStock > 10 ? (
                         <div className="flex items-center gap-2">
                           <CheckCircleIcon className="h-4 w-4 text-[#1b8f5b]" />
                           <p className="text-xs font-semibold text-[#172022]">
                             Product is in stock and ready for delivery
                           </p>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2">
                           <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                           <p className="text-xs font-semibold text-orange-600">
                             Limited stock available • Only {currentStock} {currentStockUnit} left!
                           </p>
                         </div>
                       )}
                     </div>
                   )}
                   {!inStock && (
                     <div className="p-3 bg-white rounded-xl border-2 border-red-200">
                       <p className="text-xs font-semibold text-red-600">
                         This product is currently out of stock. Please check back later.
                       </p>
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Delivery Time Tab */}
             {activeTab === 'delivery' && (
               <div className="p-5 rounded-2xl bg-gradient-to-br from-[rgba(239,246,255,0.6)] to-[rgba(239,246,255,0.3)] border-2 border-blue-500 shadow-lg">
                 <div className="flex items-center gap-2.5 mb-3">
                   <TruckIcon className="h-5 w-5 text-blue-500" />
                   <h3 className="text-base font-bold text-[#172022]">Delivery Information</h3>
                 </div>
                 <div className="pl-3 space-y-3">
                   <div className="p-4 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
                     <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                         <TruckIcon className="h-5 w-5 text-blue-600" />
                       </div>
                       <div className="flex-1">
                         <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.6)] uppercase tracking-wide mb-1.5">Estimated Delivery Time</p>
                         <p className="text-xl font-bold text-[#172022] mb-1.5">
                           {product.deliveryTime || 'Within 24 hours'}
                         </p>
                         <p className="text-xs text-[rgba(26,42,34,0.7)]">
                           Fast and reliable delivery to your doorstep
                         </p>
                       </div>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2.5">
                     <div className="p-3 bg-white rounded-xl border border-blue-200">
                       <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.6)] mb-0.5">Delivery Type</p>
                       <p className="text-xs font-bold text-[#172022]">Standard</p>
                     </div>
                     <div className="p-3 bg-white rounded-xl border border-blue-200">
                       <p className="text-[0.65rem] font-semibold text-[rgba(26,42,34,0.6)] mb-0.5">Tracking</p>
                       <p className="text-xs font-bold text-[#172022]">Available</p>
                     </div>
                   </div>
                 </div>
               </div>
             )}
          </div>
        </div>


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
             disabled={!inStock || (hasAttributes && selectedVariants.length === 0)}
           >
             {!inStock ? (
               'Out of Stock'
             ) : hasAttributes && selectedVariants.length === 0 ? (
               'Please select at least one variant'
             ) : hasAttributes && selectedVariants.length > 0 ? (
               <>
                 Add {selectedVariants.length} Variant{selectedVariants.length > 1 ? 's' : ''} to Cart • ₹{totalVariantPrice.toLocaleString('en-IN')}
               </>
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
                    <h4 className="user-product-detail-view__similar-card-title"><TransText>{similarProduct.name}</TransText></h4>
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
                    <h4 className="user-product-detail-view__suggested-card-title"><TransText>{suggestedProduct.name}</TransText></h4>
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


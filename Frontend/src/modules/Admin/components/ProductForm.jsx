import { useState, useEffect } from 'react'
import { Calendar, Package, IndianRupee, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../../lib/cn'

const STOCK_UNITS = ['kg', 'L', 'bags', 'units']

// Fertilizer Categories (This platform is for fertilizers only)
const FERTILIZER_CATEGORIES = [
  { value: 'npk', label: 'NPK Fertilizers', description: 'Balanced NPK fertilizers' },
  { value: 'nitrogen', label: 'Nitrogen Fertilizers', description: 'High nitrogen content' },
  { value: 'phosphorus', label: 'Phosphorus Fertilizers', description: 'Phosphorus-rich fertilizers' },
  { value: 'potassium', label: 'Potassium Fertilizers', description: 'Potassium fertilizers' },
  { value: 'organic', label: 'Organic Fertilizers', description: 'Natural and organic fertilizers' },
  { value: 'biofertilizer', label: 'Biofertilizers', description: 'Microbial fertilizers' },
  { value: 'micronutrient', label: 'Micronutrient Fertilizers', description: 'Essential trace elements' },
  { value: 'liquid', label: 'Liquid Fertilizers', description: 'Water-soluble fertilizers' },
  { value: 'granular', label: 'Granular Fertilizers', description: 'Solid granular fertilizers' },
  { value: 'foliar', label: 'Foliar Fertilizers', description: 'Applied to plant leaves' },
  { value: 'soil-conditioner', label: 'Soil Conditioners', description: 'Improve soil structure' },
  { value: 'specialty', label: 'Specialty Fertilizers', description: 'Specialized fertilizers' },
]

export function ProductForm({ product, onSubmit, onCancel, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'npk', // Default to NPK
    description: '',
    actualStock: '',
    displayStock: '',
    stockUnit: 'kg',
    vendorPrice: '',
    userPrice: '',
    expiry: '',
    visibility: 'active',
    batchNumber: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      // Parse existing product data
      // Handle stock: check for actualStock and displayStock first, fallback to legacy stock
      let actualStockValue = ''
      let displayStockValue = ''
      let stockUnit = 'kg'
      
      // Check for actualStock and displayStock first
      if (product.actualStock != null && product.actualStock !== undefined) {
        actualStockValue = String(product.actualStock)
      }
      if (product.displayStock != null && product.displayStock !== undefined) {
        displayStockValue = String(product.displayStock)
      }
      
      // Fallback to legacy stock field if new fields not available
      if (!actualStockValue && product.stock != null && product.stock !== undefined) {
        if (typeof product.stock === 'number') {
          actualStockValue = String(product.stock)
        } else {
          const stockString = String(product.stock)
          const stockMatch = stockString.match(/^([\d,]+)\s*(kg|L|bags|units)?$/i)
          if (stockMatch) {
            actualStockValue = stockMatch[1].replace(/,/g, '')
            stockUnit = stockMatch[2]?.toLowerCase() || product.stockUnit || 'kg'
          }
        }
      }
      if (!displayStockValue && product.stock != null && product.stock !== undefined) {
        if (typeof product.stock === 'number') {
          displayStockValue = String(product.stock)
        } else {
          const stockString = String(product.stock)
          const stockMatch = stockString.match(/^([\d,]+)\s*(kg|L|bags|units)?$/i)
          if (stockMatch) {
            displayStockValue = stockMatch[1].replace(/,/g, '')
            if (!stockUnit) stockUnit = stockMatch[2]?.toLowerCase() || product.stockUnit || 'kg'
          }
        }
      }
      
      if (product.stockUnit) {
        stockUnit = product.stockUnit
      }
      
      // Also check weight.unit as fallback
      if (product.weight?.unit) {
        stockUnit = product.weight.unit
      }
      
      // Convert prices to string if they're numbers
      const vendorPriceString = product.vendorPrice != null ? String(product.vendorPrice) : ''
      const userPriceString = product.userPrice != null ? String(product.userPrice) : ''
      const vendorPriceValue = vendorPriceString.replace(/[₹,]/g, '') || ''
      const userPriceValue = userPriceString.replace(/[₹,]/g, '') || ''
      
      // Parse expiry date (assuming format like "Aug 2026" or ISO date)
      let expiryDate = ''
      if (product.expiry) {
        const expiryString = String(product.expiry)
        if (expiryString.includes('-')) {
          expiryDate = expiryString.split('T')[0] // ISO date
        } else {
          // Try to parse "Aug 2026" format
          const months = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          }
          const parts = expiryString.split(' ')
          if (parts.length === 2) {
            const month = months[parts[0]]
            const year = parts[1]
            if (month && year) {
              expiryDate = `${year}-${month}-15` // Default to 15th of month
            }
          }
        }
      }

      setFormData({
        name: product.name || '',
        category: product.category || 'npk',
        description: product.description || '',
        actualStock: actualStockValue,
        displayStock: displayStockValue,
        stockUnit: stockUnit,
        vendorPrice: vendorPriceValue,
        userPrice: userPriceValue,
        expiry: expiryDate,
        visibility: product.isActive !== false ? 'active' : 'inactive',
        batchNumber: product.batchNumber || '',
      })
    }
  }, [product])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Sync displayStock unit when stockUnit changes
  useEffect(() => {
    // When stockUnit changes, we don't need to do anything special
    // The disabled select will show the same unit automatically
  }, [formData.stockUnit])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required'
    }

    if (!formData.actualStock || parseFloat(formData.actualStock) < 0) {
      newErrors.actualStock = 'Actual quantity is required and cannot be negative'
    }
    if (!formData.displayStock || parseFloat(formData.displayStock) < 0) {
      newErrors.displayStock = 'Display quantity is required and cannot be negative'
    }
    if (parseFloat(formData.displayStock) > parseFloat(formData.actualStock)) {
      newErrors.displayStock = 'Display quantity cannot exceed actual quantity'
    }

    if (!formData.vendorPrice || parseFloat(formData.vendorPrice) <= 0) {
      newErrors.vendorPrice = 'Vendor price must be greater than 0'
    }

    if (!formData.userPrice || parseFloat(formData.userPrice) <= 0) {
      newErrors.userPrice = 'User price must be greater than 0'
    }

    if (parseFloat(formData.userPrice) <= parseFloat(formData.vendorPrice)) {
      newErrors.userPrice = 'User price must be greater than vendor price'
    }

    if (!formData.expiry) {
      newErrors.expiry = 'Expiry date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    // Ensure prices are valid numbers (validation already checked they're > 0)
    const vendorPrice = parseFloat(formData.vendorPrice)
    const userPrice = parseFloat(formData.userPrice)

    const submitData = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim(),
      actualStock: parseFloat(formData.actualStock) || 0,
      displayStock: parseFloat(formData.displayStock) || 0,
      stockUnit: formData.stockUnit,
      priceToVendor: !isNaN(vendorPrice) && vendorPrice > 0 ? vendorPrice : undefined,
      priceToUser: !isNaN(userPrice) && userPrice > 0 ? userPrice : undefined,
      expiry: formData.expiry,
      isActive: formData.visibility === 'active',
      ...(formData.batchNumber && { batchNumber: formData.batchNumber.trim() }),
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Name */}
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-bold text-gray-900">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., NPK 24:24:0 Fertilizer"
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
            errors.name
              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
          )}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Category Selection */}
      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-bold text-gray-900">
          Fertilizer Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
            errors.category
              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
          )}
        >
          {FERTILIZER_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label} - {cat.description}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      {/* Product Description */}
      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-bold text-gray-900">
          Product Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the fertilizer, its composition, benefits, and usage instructions..."
          rows={3}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 resize-none',
            errors.description
              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
          )}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* Stock Quantity & Unit */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="actualStock" className="mb-2 block text-sm font-bold text-gray-900">
            Actual Quantity <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-gray-500 ml-2">(Internal/Admin use)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="actualStock"
              name="actualStock"
              value={formData.actualStock}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                errors.actualStock
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
              )}
            />
            <select
              name="stockUnit"
              value={formData.stockUnit}
              onChange={handleChange}
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {STOCK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          {errors.actualStock && <p className="mt-1 text-xs text-red-600">{errors.actualStock}</p>}
        </div>

        <div>
          <label htmlFor="displayStock" className="mb-2 block text-sm font-bold text-gray-900">
            Quantity to Show to Vendors <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-gray-500 ml-2">(Visible to vendors)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="displayStock"
              name="displayStock"
              value={formData.displayStock}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                errors.displayStock
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
              )}
            />
            <select
              value={formData.stockUnit}
              disabled
              className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              {STOCK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          {errors.displayStock && <p className="mt-1 text-xs text-red-600">{errors.displayStock}</p>}
          {formData.displayStock && parseFloat(formData.displayStock) > parseFloat(formData.actualStock || 0) && (
            <p className="mt-1 text-xs text-yellow-600">⚠️ Display quantity exceeds actual quantity</p>
          )}
        </div>
      </div>

      {/* Expiry Date */}
        <div>
          <label htmlFor="expiry" className="mb-2 block text-sm font-bold text-gray-900">
            Expiry Date / Batch <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              id="expiry"
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              className={cn(
                'w-full rounded-xl border pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                errors.expiry
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
              )}
            />
          </div>
          {errors.expiry && <p className="mt-1 text-xs text-red-600">{errors.expiry}</p>}
      </div>

      {/* Batch Number (Optional) */}
      <div>
        <label htmlFor="batchNumber" className="mb-2 block text-sm font-bold text-gray-900">
          Batch Number <span className="text-xs font-normal text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          id="batchNumber"
          name="batchNumber"
          value={formData.batchNumber}
          onChange={handleChange}
          placeholder="e.g., BATCH-2024-001"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Pricing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vendorPrice" className="mb-2 block text-sm font-bold text-gray-900">
            <IndianRupee className="mr-1 inline h-4 w-4" />
            Vendor Price <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="vendorPrice"
            name="vendorPrice"
            value={formData.vendorPrice}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
              errors.vendorPrice
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
            )}
          />
          {errors.vendorPrice && <p className="mt-1 text-xs text-red-600">{errors.vendorPrice}</p>}
        </div>

        <div>
          <label htmlFor="userPrice" className="mb-2 block text-sm font-bold text-gray-900">
            <IndianRupee className="mr-1 inline h-4 w-4" />
            User Price <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="userPrice"
            name="userPrice"
            value={formData.userPrice}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
              errors.userPrice
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
            )}
          />
          {errors.userPrice && <p className="mt-1 text-xs text-red-600">{errors.userPrice}</p>}
        </div>
      </div>

      {/* Visibility Toggle */}
      <div>
        <label className="mb-2 block text-sm font-bold text-gray-900">
          <Eye className="mr-1 inline h-4 w-4" />
          Product Visibility <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, visibility: 'active' }))}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
              formData.visibility === 'active'
                ? 'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50',
            )}
          >
            <Eye className="h-4 w-4" />
            Active
          </button>
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, visibility: 'inactive' }))}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
              formData.visibility === 'inactive'
                ? 'border-gray-500 bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
            )}
          >
            <EyeOff className="h-4 w-4" />
            Inactive
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(168,85,247,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}


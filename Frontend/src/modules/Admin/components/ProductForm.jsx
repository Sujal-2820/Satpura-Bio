import { useState, useEffect } from 'react'
import { MapPin, Calendar, Package, IndianRupee, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../../lib/cn'

const REGIONS = ['West', 'North', 'South', 'Central', 'North East', 'East']
const STOCK_UNITS = ['kg', 'L', 'bags', 'units']

export function ProductForm({ product, onSubmit, onCancel, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    stockUnit: 'kg',
    vendorPrice: '',
    userPrice: '',
    expiry: '',
    region: 'West',
    visibility: 'active',
    batchNumber: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      // Parse existing product data
      // Handle stock: can be a number or a string like "1000 kg"
      let stockValue = ''
      let stockUnit = 'kg'
      
      if (product.stock != null) {
        if (typeof product.stock === 'number') {
          // If stock is a number, use it directly
          stockValue = String(product.stock)
          stockUnit = product.stockUnit || 'kg'
        } else {
          // If stock is a string, parse it with regex
          const stockString = String(product.stock)
          const stockMatch = stockString.match(/^([\d,]+)\s*(kg|L|bags|units)?$/i)
          if (stockMatch) {
            stockValue = stockMatch[1].replace(/,/g, '')
            stockUnit = stockMatch[2]?.toLowerCase() || product.stockUnit || 'kg'
          }
        }
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
        stock: stockValue,
        stockUnit: stockUnit,
        vendorPrice: vendorPriceValue,
        userPrice: userPriceValue,
        expiry: expiryDate,
        region: product.region || 'West',
        visibility: product.visibility?.toLowerCase() === 'active' ? 'active' : 'inactive',
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

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.stock || parseFloat(formData.stock) <= 0) {
      newErrors.stock = 'Stock quantity must be greater than 0'
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

    if (!formData.region) {
      newErrors.region = 'Region is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const submitData = {
      name: formData.name.trim(),
      stock: parseFloat(formData.stock),
      stockUnit: formData.stockUnit,
      vendorPrice: parseFloat(formData.vendorPrice),
      userPrice: parseFloat(formData.userPrice),
      expiry: formData.expiry,
      region: formData.region,
      visibility: formData.visibility,
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

      {/* Stock Quantity & Unit */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="stock" className="mb-2 block text-sm font-bold text-gray-900">
            Stock Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                errors.stock
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
          {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock}</p>}
        </div>

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

      {/* Region Assignment */}
      <div>
        <label htmlFor="region" className="mb-2 block text-sm font-bold text-gray-900">
          <MapPin className="mr-1 inline h-4 w-4" />
          Assign to Region <span className="text-red-500">*</span>
        </label>
        <select
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
            errors.region
              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
          )}
        >
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
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


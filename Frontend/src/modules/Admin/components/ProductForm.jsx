import { useState, useEffect } from 'react'
import { Calendar, Package, IndianRupee, Eye, EyeOff, Tag, X } from 'lucide-react'
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

// Category-specific attributes configuration
const CATEGORY_ATTRIBUTES = {
  npk: [
    { key: 'npkRatio', label: 'NPK Ratio (N-P-K)', type: 'text', placeholder: 'e.g., 19:19:19', required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Granular', 'Liquid', 'Powder'], required: false },
    { key: 'grade', label: 'Grade', type: 'text', placeholder: 'e.g., Premium, Standard', required: false },
  ],
  nitrogen: [
    { key: 'nitrogenContent', label: 'Nitrogen Content (%)', type: 'number', placeholder: 'e.g., 46', required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Urea', 'Ammonium', 'Nitrate', 'Liquid'], required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Soil', 'Foliar', 'Drip'], required: false },
  ],
  phosphorus: [
    { key: 'phosphorusContent', label: 'Phosphorus Content (%)', type: 'number', placeholder: 'e.g., 20', required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Granular', 'Liquid', 'Powder'], required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Soil', 'Foliar', 'Drip'], required: false },
  ],
  potassium: [
    { key: 'potassiumContent', label: 'Potassium Content (%)', type: 'number', placeholder: 'e.g., 60', required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Granular', 'Liquid', 'Powder'], required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Soil', 'Foliar', 'Drip'], required: false },
  ],
  organic: [
    { key: 'organicCertified', label: 'Organic Certified', type: 'select', options: ['Yes', 'No'], required: false },
    { key: 'source', label: 'Source', type: 'select', options: ['Plant-based', 'Animal-based', 'Mixed'], required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Compost', 'Manure', 'Liquid', 'Granular'], required: false },
  ],
  biofertilizer: [
    { key: 'microorganismType', label: 'Microorganism Type', type: 'text', placeholder: 'e.g., Rhizobium, Azotobacter', required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Seed Treatment', 'Soil Application', 'Foliar'], required: false },
    { key: 'shelfLife', label: 'Shelf Life (months)', type: 'number', placeholder: 'e.g., 12', required: false },
  ],
  micronutrient: [
    { key: 'micronutrientType', label: 'Micronutrient Type', type: 'select', options: ['Zinc', 'Iron', 'Boron', 'Manganese', 'Copper', 'Molybdenum'], required: false },
    { key: 'concentration', label: 'Concentration (%)', type: 'number', placeholder: 'e.g., 12', required: false },
    { key: 'form', label: 'Form', type: 'select', options: ['Chelated', 'Sulfate', 'Liquid'], required: false },
  ],
  liquid: [
    { key: 'concentration', label: 'Concentration (%)', type: 'number', placeholder: 'e.g., 20', required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Foliar', 'Drip', 'Soil Drench'], required: false },
    { key: 'dilutionRatio', label: 'Dilution Ratio', type: 'text', placeholder: 'e.g., 1:100', required: false },
  ],
  granular: [
    { key: 'granuleSize', label: 'Granule Size', type: 'select', options: ['Fine', 'Medium', 'Coarse'], required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Broadcast', 'Band Placement', 'Side Dressing'], required: false },
    { key: 'releaseType', label: 'Release Type', type: 'select', options: ['Immediate', 'Slow Release', 'Controlled Release'], required: false },
  ],
  foliar: [
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Spray', 'Mist', 'Drip'], required: false },
    { key: 'dilutionRatio', label: 'Dilution Ratio', type: 'text', placeholder: 'e.g., 1:200', required: false },
    { key: 'cropCompatibility', label: 'Crop Compatibility', type: 'text', placeholder: 'e.g., All crops, Vegetables', required: false },
  ],
  'soil-conditioner': [
    { key: 'phAdjustment', label: 'pH Adjustment', type: 'select', options: ['Acidic', 'Alkaline', 'Neutral'], required: false },
    { key: 'organicMatter', label: 'Organic Matter (%)', type: 'number', placeholder: 'e.g., 30', required: false },
    { key: 'applicationRate', label: 'Application Rate (kg/acre)', type: 'number', placeholder: 'e.g., 100', required: false },
  ],
  specialty: [
    { key: 'specialProperties', label: 'Special Properties', type: 'text', placeholder: 'e.g., Water-soluble, Slow-release', required: false },
    { key: 'applicationMethod', label: 'Application Method', type: 'select', options: ['Foliar', 'Soil', 'Drip', 'Hydroponic'], required: false },
    { key: 'targetCrops', label: 'Target Crops', type: 'text', placeholder: 'e.g., Fruits, Vegetables, Flowers', required: false },
  ],
}

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
    tags: [],
    attributes: {},
  })

  const [tagInput, setTagInput] = useState('')
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

      // Parse specifications (attributes) from product
      const attributes = {}
      if (product.specifications && typeof product.specifications === 'object') {
        // Handle Map type from MongoDB
        if (product.specifications instanceof Map) {
          product.specifications.forEach((value, key) => {
            attributes[key] = value
          })
        } else {
          // Handle plain object
          Object.keys(product.specifications).forEach((key) => {
            attributes[key] = product.specifications[key]
          })
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
        tags: product.tags && Array.isArray(product.tags) ? product.tags : [],
        attributes: attributes,
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
    
    // Reset attributes when category changes
    if (name === 'category') {
      setFormData((prev) => ({ ...prev, attributes: {} }))
    }
  }

  const handleAttributeChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value,
      },
    }))
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (!formData.tags.includes(newTag)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }))
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
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

    // Build specifications object from attributes (only include non-empty values)
    const specifications = {}
    Object.keys(formData.attributes).forEach((key) => {
      const value = formData.attributes[key]
      if (value !== '' && value !== null && value !== undefined) {
        specifications[key] = String(value)
      }
    })

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
      tags: formData.tags.filter((tag) => tag.trim() !== ''),
      ...(Object.keys(specifications).length > 0 && { specifications }),
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

      {/* Category-Specific Attributes */}
      {CATEGORY_ATTRIBUTES[formData.category] && CATEGORY_ATTRIBUTES[formData.category].length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-5">
          <h3 className="mb-4 text-lg font-bold text-blue-700">Category-Specific Attributes</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_ATTRIBUTES[formData.category].map((attr) => (
              <div key={attr.key}>
                <label htmlFor={attr.key} className="mb-2 block text-sm font-bold text-gray-900">
                  {attr.label}
                  {attr.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {attr.type === 'select' ? (
                  <select
                    id={attr.key}
                    name={attr.key}
                    value={formData.attributes[attr.key] || ''}
                    onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Select {attr.label}</option>
                    {attr.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={attr.type}
                    id={attr.key}
                    name={attr.key}
                    value={formData.attributes[attr.key] || ''}
                    onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                    placeholder={attr.placeholder}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="mb-2 block text-sm font-bold text-gray-900">
          <Tag className="mr-1 inline h-4 w-4" />
          Product Tags
          <span className="text-xs font-normal text-gray-500 ml-2">(Press Enter to add, used for search and identification)</span>
        </label>
        <div className="space-y-3">
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type a tag and press Enter (e.g., organic, premium, fast-acting)"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 shadow-[0_2px_8px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 rounded-full hover:bg-purple-200 transition-colors"
                    aria-label={`Remove ${tag} tag`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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


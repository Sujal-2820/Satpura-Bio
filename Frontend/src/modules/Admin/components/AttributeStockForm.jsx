import { useState, useEffect } from 'react'
import { X, Package, Plus, Trash2, IndianRupee } from 'lucide-react'
import { cn } from '../../../lib/cn'

const STOCK_UNITS = ['kg', 'L', 'bags', 'units']

/**
 * AttributeStockForm Component
 * 
 * A child form that opens dynamically to manage stock quantity for each attribute combination.
 * Allows adding multiple attribute combinations with their respective stock quantities.
 */
export function AttributeStockForm({ 
  isOpen, 
  onClose, 
  category, 
  categoryAttributes, 
  attributeStocks = [], 
  onSave,
  stockUnit = 'kg' 
}) {
  const [stocks, setStocks] = useState([])
  const [errors, setErrors] = useState({})

  // Initialize stocks from prop or empty array
  useEffect(() => {
    if (isOpen) {
      setStocks(attributeStocks.length > 0 ? [...attributeStocks] : [])
      setErrors({})
    }
  }, [isOpen, attributeStocks])

  // Add new stock entry
  const handleAddStock = () => {
    const newStock = {
      id: Date.now(), // Temporary ID for React key
      attributes: {},
      actualStock: '',
      displayStock: '',
      stockUnit: stockUnit,
      vendorPrice: '',
      userPrice: '',
      batchNumber: '',
      expiry: '',
    }
    setStocks([...stocks, newStock])
  }

  // Remove stock entry
  const handleRemoveStock = (id) => {
    setStocks(stocks.filter(stock => stock.id !== id))
    // Clear errors for removed stock
    const newErrors = { ...errors }
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`${id}_`)) {
        delete newErrors[key]
      }
    })
    setErrors(newErrors)
  }

  // Update attribute value for a stock entry
  const handleAttributeChange = (stockId, attributeKey, value) => {
    setStocks(stocks.map(stock => {
      if (stock.id === stockId) {
        return {
          ...stock,
          attributes: {
            ...stock.attributes,
            [attributeKey]: value,
          },
        }
      }
      return stock
    }))
    // Clear error when user starts typing
    const errorKey = `${stockId}_attribute_${attributeKey}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Update stock quantity fields
  const handleStockChange = (stockId, field, value) => {
    setStocks(stocks.map(stock => {
      if (stock.id === stockId) {
        return {
          ...stock,
          [field]: value,
        }
      }
      return stock
    }))
    // Clear error when user starts typing
    const errorKey = `${stockId}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Validate form
  const validate = () => {
    const newErrors = {}
    
    stocks.forEach((stock, index) => {
      // Validate that at least one attribute is filled
      const hasAttributes = categoryAttributes && categoryAttributes.length > 0
        ? categoryAttributes.some(attr => stock.attributes[attr.key] && stock.attributes[attr.key].trim() !== '')
        : false

      if (!hasAttributes) {
        newErrors[`${stock.id}_attributes`] = 'At least one attribute must be filled'
      }

      // Validate actual stock
      if (!stock.actualStock || parseFloat(stock.actualStock) < 0) {
        newErrors[`${stock.id}_actualStock`] = 'Actual quantity is required and cannot be negative'
      }

      // Validate display stock
      if (!stock.displayStock || parseFloat(stock.displayStock) < 0) {
        newErrors[`${stock.id}_displayStock`] = 'Display quantity is required and cannot be negative'
      }

      // Validate display stock doesn't exceed actual stock
      if (stock.actualStock && stock.displayStock && 
          parseFloat(stock.displayStock) > parseFloat(stock.actualStock)) {
        newErrors[`${stock.id}_displayStock`] = 'Display quantity cannot exceed actual quantity'
      }

      // Validate vendor price
      if (!stock.vendorPrice || parseFloat(stock.vendorPrice) <= 0) {
        newErrors[`${stock.id}_vendorPrice`] = 'Vendor price must be greater than 0'
      }

      // Validate user price
      if (!stock.userPrice || parseFloat(stock.userPrice) <= 0) {
        newErrors[`${stock.id}_userPrice`] = 'User price must be greater than 0'
      }

      // Validate user price is greater than vendor price
      if (stock.vendorPrice && stock.userPrice && 
          parseFloat(stock.userPrice) <= parseFloat(stock.vendorPrice)) {
        newErrors[`${stock.id}_userPrice`] = 'User price must be greater than vendor price'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = () => {
    if (!validate()) {
      return
    }

    // Prepare data for saving (remove temporary IDs)
    const stocksToSave = stocks.map(stock => {
      const { id, ...stockData } = stock
      return {
        ...stockData,
        actualStock: parseFloat(stock.actualStock) || 0,
        displayStock: parseFloat(stock.displayStock) || 0,
        vendorPrice: parseFloat(stock.vendorPrice) || 0,
        userPrice: parseFloat(stock.userPrice) || 0,
        // Only include non-empty attributes
        attributes: Object.fromEntries(
          Object.entries(stock.attributes).filter(([_, value]) => 
            value !== null && value !== undefined && value !== ''
          )
        ),
      }
    })

    onSave(stocksToSave)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="mt-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-purple-700">Manage Stock by Attributes</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add stock quantities for different attribute combinations
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

        {/* Content */}
        <div className="space-y-6">
          {stocks.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-base font-semibold text-gray-600 mb-2">No stock entries yet</p>
              <p className="text-sm text-gray-500 mb-6">Click "Add Stock Entry" to get started</p>
              <button
                type="button"
                onClick={handleAddStock}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(168,85,247,0.4)]"
              >
                <Plus className="h-4 w-4" />
                Add Stock Entry
              </button>
            </div>
          ) : (
            <>
              {stocks.map((stock, index) => (
                <div
                  key={stock.id}
                  className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-purple-700">
                      Stock Entry #{index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveStock(stock.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 transition-all hover:border-red-500 hover:bg-red-50"
                      title="Remove this stock entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Attributes Section */}
                  {categoryAttributes && categoryAttributes.length > 0 && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-bold text-gray-900">
                        Attribute Combination
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryAttributes.map((attr) => (
                          <div key={attr.key}>
                            <label htmlFor={`${stock.id}_${attr.key}`} className="mb-1 block text-xs font-semibold text-gray-700">
                              {attr.label}
                            </label>
                            {attr.type === 'select' ? (
                              <select
                                id={`${stock.id}_${attr.key}`}
                                value={stock.attributes[attr.key] || ''}
                                onChange={(e) => handleAttributeChange(stock.id, attr.key, e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                                id={`${stock.id}_${attr.key}`}
                                value={stock.attributes[attr.key] || ''}
                                onChange={(e) => handleAttributeChange(stock.id, attr.key, e.target.value)}
                                placeholder={attr.placeholder}
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      {errors[`${stock.id}_attributes`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_attributes`]}</p>
                      )}
                    </div>
                  )}

                  {/* Stock Quantities */}
                  <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <label htmlFor={`${stock.id}_actualStock`} className="mb-2 block text-sm font-bold text-gray-900">
                        Actual Quantity <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-2">(Internal/Admin use)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          id={`${stock.id}_actualStock`}
                          value={stock.actualStock}
                          onChange={(e) => handleStockChange(stock.id, 'actualStock', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className={cn(
                            'flex-1 rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2',
                            errors[`${stock.id}_actualStock`]
                              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                          )}
                        />
                        <select
                          value={stock.stockUnit || stockUnit}
                          onChange={(e) => handleStockChange(stock.id, 'stockUnit', e.target.value)}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          {STOCK_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors[`${stock.id}_actualStock`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_actualStock`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`${stock.id}_displayStock`} className="mb-2 block text-sm font-bold text-gray-900">
                        Display Quantity <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-2">(Visible to vendors)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          id={`${stock.id}_displayStock`}
                          value={stock.displayStock}
                          onChange={(e) => handleStockChange(stock.id, 'displayStock', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className={cn(
                            'flex-1 rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2',
                            errors[`${stock.id}_displayStock`]
                              ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                              : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                          )}
                        />
                        <select
                          value={stock.stockUnit || stockUnit}
                          disabled
                          className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
                        >
                          {STOCK_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors[`${stock.id}_displayStock`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_displayStock`]}</p>
                      )}
                      {stock.displayStock && stock.actualStock && 
                       parseFloat(stock.displayStock) > parseFloat(stock.actualStock) && (
                        <p className="mt-1 text-xs text-yellow-600">⚠️ Display quantity exceeds actual quantity</p>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <label htmlFor={`${stock.id}_vendorPrice`} className="mb-2 block text-sm font-bold text-gray-900">
                        <IndianRupee className="mr-1 inline h-4 w-4" />
                        Vendor Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id={`${stock.id}_vendorPrice`}
                        value={stock.vendorPrice || ''}
                        onChange={(e) => handleStockChange(stock.id, 'vendorPrice', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2',
                          errors[`${stock.id}_vendorPrice`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      {errors[`${stock.id}_vendorPrice`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_vendorPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`${stock.id}_userPrice`} className="mb-2 block text-sm font-bold text-gray-900">
                        <IndianRupee className="mr-1 inline h-4 w-4" />
                        User Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id={`${stock.id}_userPrice`}
                        value={stock.userPrice || ''}
                        onChange={(e) => handleStockChange(stock.id, 'userPrice', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2',
                          errors[`${stock.id}_userPrice`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      {errors[`${stock.id}_userPrice`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_userPrice`]}</p>
                      )}
                      {stock.vendorPrice && stock.userPrice && 
                       parseFloat(stock.userPrice) <= parseFloat(stock.vendorPrice) && (
                        <p className="mt-1 text-xs text-yellow-600">⚠️ User price must be greater than vendor price</p>
                      )}
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${stock.id}_batchNumber`} className="mb-2 block text-sm font-bold text-gray-900">
                        Batch Number <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id={`${stock.id}_batchNumber`}
                        value={stock.batchNumber || ''}
                        onChange={(e) => handleStockChange(stock.id, 'batchNumber', e.target.value)}
                        placeholder="e.g., BATCH-2024-001"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${stock.id}_expiry`} className="mb-2 block text-sm font-bold text-gray-900">
                        Expiry Date <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        id={`${stock.id}_expiry`}
                        value={stock.expiry || ''}
                        onChange={(e) => handleStockChange(stock.id, 'expiry', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add More Button */}
              <button
                type="button"
                onClick={handleAddStock}
                className="w-full rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-6 py-4 text-sm font-bold text-purple-700 transition-all hover:border-purple-500 hover:bg-purple-100"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                Add Another Stock Entry
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-200 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(168,85,247,0.4)]"
          >
            Save Stock Entries
          </button>
        </div>
    </div>
  )
}


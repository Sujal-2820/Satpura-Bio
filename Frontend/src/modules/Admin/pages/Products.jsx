import { useState, useEffect, useCallback } from 'react'
import { Layers3, MapPin, ToggleRight, Edit2, Trash2 } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Modal } from '../components/Modal'
import { ProductForm } from '../components/ProductForm'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { productInventory } from '../services/adminData'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Product', accessor: 'name' },
  { Header: 'Actual Stock', accessor: 'actualStock' },
  { Header: 'Vendor Stock', accessor: 'vendorStock' },
  { Header: 'Vendor Price', accessor: 'vendorPrice' },
  { Header: 'User Price', accessor: 'userPrice' },
  { Header: 'Expiry / Batch', accessor: 'expiry' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Visibility', accessor: 'visibility' },
  { Header: 'Actions', accessor: 'actions' },
]

export function ProductsPage() {
  const { products } = useAdminState()
  const { getProducts, createProduct, updateProduct, deleteProduct, toggleProductVisibility, loading } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productsList, setProductsList] = useState([])

  const regionColors = [
    { border: 'border-green-200', bg: 'bg-gradient-to-br from-green-50 to-green-100/50', text: 'text-green-700', progress: 'bg-gradient-to-r from-green-500 to-green-600' },
    { border: 'border-yellow-200', bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', text: 'text-yellow-700', progress: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
    { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', text: 'text-blue-700', progress: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { border: 'border-purple-200', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', text: 'text-purple-700', progress: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { border: 'border-indigo-200', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', text: 'text-indigo-700', progress: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
    { border: 'border-orange-200', bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50', text: 'text-orange-700', progress: 'bg-gradient-to-r from-orange-500 to-orange-600' },
  ]

  // Format product data for display
  const formatProductForDisplay = (product) => {
    // Get actual stock
    const actualStockValue = typeof product.actualStock === 'number' 
      ? product.actualStock 
      : parseFloat(product.actualStock?.replace(/[^\d.]/g, '') || '0')
    
    // Get display stock (vendor stock)
    const displayStockValue = typeof product.displayStock === 'number'
      ? product.displayStock
      : parseFloat(product.displayStock?.replace(/[^\d.]/g, '') || product.stock?.replace(/[^\d.]/g, '') || '0')
    
    const stockUnit = product.weight?.unit || product.stockUnit || 'kg'
    const actualStockFormatted = `${actualStockValue.toLocaleString('en-IN')} ${stockUnit}`
    const vendorStockFormatted = `${displayStockValue.toLocaleString('en-IN')} ${stockUnit}`
    
    const vendorPrice = typeof product.vendorPrice === 'number' ? product.vendorPrice : parseFloat(product.vendorPrice?.replace(/[₹,]/g, '') || product.priceToVendor || '0')
    const userPrice = typeof product.userPrice === 'number' ? product.userPrice : parseFloat(product.userPrice?.replace(/[₹,]/g, '') || product.priceToUser || '0')
    
    // Format expiry date
    let expiryFormatted = product.expiry || ''
    if (product.expiry && product.expiry.includes('-')) {
      const date = new Date(product.expiry)
      expiryFormatted = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    }
    
    // Include batch number if available
    if (product.batchNumber) {
      expiryFormatted = expiryFormatted ? `${expiryFormatted} (${product.batchNumber})` : product.batchNumber
    }

    const visibility = product.isActive !== false ? 'Active' : 'Inactive'

    return {
      ...product,
      actualStock: actualStockFormatted,
      vendorStock: vendorStockFormatted,
      vendorPrice: `₹${vendorPrice.toLocaleString('en-IN')}`,
      userPrice: `₹${userPrice.toLocaleString('en-IN')}`,
      expiry: expiryFormatted,
      visibility: visibility,
    }
  }

  // Fetch products
  const fetchProducts = useCallback(async () => {
    const result = await getProducts()
    if (result.data?.products) {
      const formatted = result.data.products.map(formatProductForDisplay)
      setProductsList(formatted)
    } else {
      // Fallback to mock data
      setProductsList(productInventory.map(formatProductForDisplay))
    }
  }, [getProducts])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Refresh when products are updated
  useEffect(() => {
    if (products.updated) {
      fetchProducts()
    }
  }, [products.updated, fetchProducts])

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product) => {
    // Find original product data (before formatting)
    const originalProduct = products.data?.products?.find((p) => p.id === product.id) || product
    setSelectedProduct(originalProduct)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const result = await deleteProduct(productId)
        if (result.data) {
          fetchProducts()
          success('Product deleted successfully!')
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to delete product'
          // Check if it's a warning (product has active assignments)
          if (errorMessage.includes('active vendor assignment')) {
            showWarning(errorMessage, 6000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      } catch (error) {
        showError(error.message || 'Failed to delete product', 5000)
      }
    }
  }

  const handleToggleVisibility = async (product) => {
    try {
      const currentVisibility = product.visibility === 'Active' || product.visibility === 'active' ? 'active' : 'inactive'
      const newVisibility = currentVisibility === 'active' ? 'inactive' : 'active'
      
      const result = await toggleProductVisibility(product.id, { visibility: newVisibility })
      if (result.data) {
        fetchProducts()
        success(`Product visibility set to ${newVisibility === 'active' ? 'Active' : 'Inactive'}!`, 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update product visibility'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update product visibility', 5000)
    }
  }

  const handleFormSubmit = async (formData) => {
    try {
      if (selectedProduct) {
        // Update existing product
        const result = await updateProduct(selectedProduct.id, formData)
        if (result.data) {
          setIsModalOpen(false)
          setSelectedProduct(null)
          fetchProducts()
          success('Product updated successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to update product'
          if (errorMessage.includes('validation') || errorMessage.includes('required')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      } else {
        // Create new product
        const result = await createProduct(formData)
        if (result.data) {
          setIsModalOpen(false)
          fetchProducts()
          success('Product created successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to create product'
          if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('duplicate')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to save product', 5000)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'visibility') {
      return {
        ...column,
        Cell: (row) => (
          <StatusBadge tone={row.visibility === 'Active' ? 'success' : 'warning'}>
            {row.visibility}
          </StatusBadge>
        ),
      }
    }
    if (column.accessor === 'region') {
      return {
        ...column,
        Cell: (row) => (
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-3 py-1 text-xs text-blue-700 font-bold shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <MapPin className="h-3.5 w-3.5" />
            {row.region}
          </div>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalProduct = products.data?.products?.find((p) => p.id === row.id) || row
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEditProduct(originalProduct)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                title="Edit product"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(row.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-red-600 transition-all hover:border-red-500 hover:bg-red-50"
                title="Delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        },
      }
    }
    return column
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 2 • Master Product Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Central Catalogue Control</h2>
          <p className="text-sm text-gray-600">
            Manage pricing, stock distribution, and regional visibility with batch-level precision.
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(168,85,247,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
        >
          <Layers3 className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <FilterBar
        filters={[
          { id: 'region', label: 'All regions', active: true },
          { id: 'visibility', label: 'Active status' },
          { id: 'expiry', label: 'Expiry alerts' },
        ]}
      />

      <DataTable
        columns={tableColumns}
        rows={productsList}
        emptyState="No products found in the catalogue"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] lg:col-span-2">
          <header className="border-b border-purple-200 pb-3 mb-5">
            <h3 className="text-lg font-bold text-purple-700">Regional Assignment Snapshot</h3>
            <p className="text-sm text-gray-600">Ensure region-specific pricing and stock buffers are within threshold.</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { region: 'West', coverage: '32 vendors', fill: 78, tone: 'success' },
              { region: 'North', coverage: '24 vendors', fill: 62, tone: 'warning' },
              { region: 'South', coverage: '18 vendors', fill: 44 },
              { region: 'Central', coverage: '12 vendors', fill: 58 },
              { region: 'North East', coverage: '8 vendors', fill: 39 },
              { region: 'East', coverage: '28 vendors', fill: 71, tone: 'success' },
            ].map((item, index) => {
              const colors = item.tone === 'success' 
                ? regionColors[0] 
                : item.tone === 'warning' 
                ? regionColors[1] 
                : regionColors[index % regionColors.length]
              return (
                <div
                  key={item.region}
                  className={cn(
                    'rounded-2xl border p-4 transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]',
                    colors.border,
                    colors.bg,
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                    <span>{item.region}</span>
                    <span className={colors.text}>{item.coverage}</span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500 shadow-[0_2px_8px_rgba(0,0,0,0.2)]', colors.progress)}
                      style={{ width: `${item.fill}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-3 rounded-3xl border border-orange-200 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <header className="border-b border-orange-200 pb-3">
            <h3 className="text-lg font-bold text-orange-700">Visibility Controls</h3>
            <p className="text-sm text-gray-600">
              Toggle product availability and orchestrate upcoming launches or sunset batches.
            </p>
          </header>
          {productsList.map((product) => {
            const originalProduct = products.data?.products?.find((p) => p.id === product.id) || product
            return (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-600">Batch expiry • {product.expiry}</p>
              </div>
                <button
                  onClick={() => handleToggleVisibility(originalProduct)}
                  className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200 hover:scale-105',
                product.visibility === 'Active' 
                  ? 'border-green-200 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_8px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]' 
                  : 'border-gray-200 bg-white text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700'
                  )}
                >
                <ToggleRight className="h-4 w-4" />
                {product.visibility === 'Active' ? 'Active' : 'Inactive'}
              </button>
            </div>
            )
          })}
        </div>
      </div>

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedProduct ? 'Edit Product' : 'Add New Product'}
        size="md"
      >
        <ProductForm
          product={selectedProduct}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModal}
          loading={loading}
        />
      </Modal>
    </div>
  )
}


/**
 * Categories Management Page
 * Admin interface for managing product categories with drag-and-drop reordering
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Layers, Search, GripVertical } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import CategoryForm from '../components/CategoryForm'
import { cn } from '../../../lib/cn'

export function CategoriesPage({ subRoute, navigate }) {
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)

    const api = useAdminApi()
    const toast = useToast()

    const fetchCategories = async () => {
        setIsLoading(true)
        try {
            const response = await api.getCategories()
            if (response.success) {
                // Sort by order descending (latest/highest order first, or lowest order last)
                // Actually, per user request: "latest category to be placed first"
                // This means we sort by createdAt descending OR by order descending
                // Let's sort by order ascending (lower order = higher priority = shown first in list)
                // But user wants latest first, so let's reverse the default sort
                const sorted = [...response.data].sort((a, b) => b.order - a.order)
                setCategories(sorted)
            }
        } catch (error) {
            toast.error('Failed to load categories')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category? This will fail if products are assigned to it.')) return

        try {
            const response = await api.deleteCategory(id)
            if (response.success) {
                toast.success('Category deleted')
                fetchCategories()
            } else {
                toast.error(response.message || 'Failed to delete category')
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete category')
        }
    }

    // Drag and Drop handlers
    const handleDragStart = (e, index) => {
        if (categories.length <= 1) return
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', index.toString())
        if (e.currentTarget) {
            e.currentTarget.style.opacity = '0.5'
        }
    }

    const handleDragEnd = (e) => {
        if (e.currentTarget) {
            e.currentTarget.style.opacity = '1'
        }
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index)
        }
    }

    const handleDragLeave = () => {
        setDragOverIndex(null)
    }

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault()
        setDragOverIndex(null)

        if (draggedIndex === null || draggedIndex === dropIndex) {
            return
        }

        const updatedCategories = [...categories]
        const draggedCategory = updatedCategories[draggedIndex]

        // Remove dragged item and insert at new position
        updatedCategories.splice(draggedIndex, 1)
        updatedCategories.splice(dropIndex, 0, draggedCategory)

        // Update order values (higher index = lower order number for "latest first" display)
        const reorderedCategories = updatedCategories.map((cat, idx) => ({
            ...cat,
            order: updatedCategories.length - idx // Reverse order so first in list has highest order
        }))

        setCategories(reorderedCategories)
        setDraggedIndex(null)

        // Save new order to backend
        setIsSavingOrder(true)
        try {
            const orderUpdates = reorderedCategories.map((cat) => ({
                id: cat._id,
                order: cat.order
            }))
            const response = await api.reorderCategories(orderUpdates)
            if (response.success) {
                toast.success('Category order updated')
            } else {
                toast.error('Failed to save order')
                fetchCategories() // Revert on failure
            }
        } catch (error) {
            toast.error('Failed to save order')
            fetchCategories() // Revert on failure
        } finally {
            setIsSavingOrder(false)
        }
    }

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Handle Sub-routes (Add/Edit)
    if (subRoute === 'add' || (subRoute && subRoute.startsWith('edit/'))) {
        const categoryId = subRoute.startsWith('edit/') ? subRoute.split('/')[1] : null;

        return (
            <CategoryForm
                categoryId={categoryId}
                onCancel={() => navigate('categories')}
                onSuccess={() => {
                    fetchCategories()
                    navigate('categories')
                }}
            />
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Layers className="w-6 h-6 text-purple-600" />
                        Product Categories
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic">
                        Drag and drop to reorder. Latest categories appear first.
                    </p>
                </div>
                <button
                    onClick={() => navigate('categories/add')}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    ADD NEW CATEGORY
                </button>
            </div>

            {/* Filter & Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search categories by name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {isSavingOrder && (
                    <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                        <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        Saving order...
                    </div>
                )}
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-gray-100 rounded-3xl h-64" />
                    ))}
                </div>
            ) : filteredCategories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCategories.map((cat, index) => {
                        const isDragging = draggedIndex === index
                        const isDragOver = dragOverIndex === index

                        return (
                            <div
                                key={cat._id}
                                className={cn(
                                    "group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col",
                                    categories.length > 1 && "cursor-move",
                                    isDragging && "opacity-50 scale-95",
                                    isDragOver && "ring-2 ring-purple-500 ring-offset-2 scale-105"
                                )}
                                draggable={categories.length > 1}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                            >
                                {/* Drag Handle */}
                                {categories.length > 1 && (
                                    <div className="absolute top-3 left-3 z-20 p-1.5 bg-gray-800/70 text-white rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                )}

                                {/* Squared Image Wrapper */}
                                <div className="aspect-square relative overflow-hidden bg-gray-100">
                                    <img
                                        src={cat.image?.url}
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    navigate(`categories/edit/${cat._id}`)
                                                }}
                                                className="flex-1 bg-white/20 backdrop-blur-md text-white py-2 rounded-xl text-xs font-bold hover:bg-white/40 transition-colors uppercase"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(cat._id)
                                                }}
                                                className="bg-red-500/80 backdrop-blur-md text-white p-2 rounded-xl hover:bg-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {!cat.isActive && (
                                        <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                            Inactive
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-purple-600 transition-colors uppercase tracking-tight">
                                        {cat.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-2 font-medium">
                                        Position {index + 1} of {filteredCategories.length}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No categories found</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                        Get started by adding your first product category to group your catalog.
                    </p>
                </div>
            )}
        </div>
    )
}


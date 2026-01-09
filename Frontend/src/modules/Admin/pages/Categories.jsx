/**
 * Categories Management Page
 * Admin interface for managing product categories
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Layers, Search, MoreVertical, ExternalLink } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import CategoryForm from '../components/CategoryForm'
import { cn } from '../../../lib/cn'

export function CategoriesPage({ subRoute, navigate }) {
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const api = useAdminApi()
    const toast = useToast()

    const fetchCategories = async () => {
        setIsLoading(true)
        try {
            const response = await api.getCategories()
            if (response.success) {
                setCategories(response.data)
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

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        Configure groupings and dashboard tiles for your catalog.
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
                        placeholder="Search categories by name or description..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
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
                    {filteredCategories.map((cat) => (
                        <div key={cat._id} className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                            {/* Squared Image Wrapper */}
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                <img
                                    src={cat.image?.url}
                                    alt={cat.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => navigate(`categories/edit/${cat._id}`)}
                                            className="flex-1 bg-white/20 backdrop-blur-md text-white py-2 rounded-xl text-xs font-bold hover:bg-white/40 transition-colors uppercase"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat._id)}
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
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                    ORDER: {cat.order}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-purple-600 transition-colors uppercase tracking-tight">
                                    {cat.name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 font-medium italic">
                                    {cat.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    ))}
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


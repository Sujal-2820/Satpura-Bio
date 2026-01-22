/**
 * Category Form Component
 * Dedicated screen for creating and editing product categories
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Layers } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { ImageUpload } from './ImageUpload'

export default function CategoryForm({ categoryId, onCancel, onSuccess }) {
    const isEditing = !!categoryId
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: null, // { url, publicId }
        order: 0,
        isActive: true,
    })

    const api = useAdminApi()
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(isEditing)

    useEffect(() => {
        if (isEditing) {
            fetchCategory()
        }
    }, [categoryId])

    const fetchCategory = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminCategories() // This returns all, we need to find the one
            const category = response.data.find(c => c._id === categoryId)
            if (category) {
                setFormData({
                    name: category.name || '',
                    description: category.description || '',
                    image: category.image || null,
                    order: category.order || 0,
                    isActive: category.isActive !== undefined ? category.isActive : true,
                })
            } else {
                toast.error('Category not found')
                onCancel()
            }
        } catch (error) {
            toast.error('Failed to load category details')
            onCancel()
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.image) {
            toast.error('Category image is required')
            return
        }

        setIsSaving(true)
        try {
            if (isEditing) {
                await api.updateCategory(categoryId, formData)
                toast.success('Category updated successfully')
            } else {
                await api.createCategory(formData)
                toast.success('New category created')
            }
            onSuccess()
        } catch (error) {
            toast.error(error.message || 'Failed to save category')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm group"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <Layers className="w-6 h-6 text-purple-600" />
                            {isEditing ? 'Edit Category' : 'Create Category'}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium italic">
                            {isEditing ? `Modifying ${formData.name}` : 'Adding a new grouping to your catalog'}
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                    >
                        Discard
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        SAVE CATEGORY
                    </button>
                </div>
            </div>

            {/* Form Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Category Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all font-medium text-lg"
                                placeholder="E.g. Bio Fertilizers"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block mb-4">Category Image (Squared)</label>
                        <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-200">
                            <ImageUpload
                                images={formData.image ? [formData.image] : []}
                                maxImages={1}
                                onChange={(images) => setFormData({ ...formData, image: images[0] || null })}
                                disabled={isSaving}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-4 italic flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Requirement: Square (1:1 aspect ratio) images only for dashboard uniformity.
                        </p>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div>
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm font-bold text-gray-700 uppercase">Availability Status</span>
                                <div className={`w-12 h-7 rounded-full p-1 transition-all ${formData.isActive ? 'bg-purple-600 shadow-lg shadow-purple-100' : 'bg-gray-200'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            </label>
                            <p className="text-[10px] text-gray-400 mt-2 italic">
                                {formData.isActive ? 'Currently visible on the marketplace.' : 'Hidden from customers and search.'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={isSaving}
                            onClick={handleSubmit}
                            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            SAVE CATEGORY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

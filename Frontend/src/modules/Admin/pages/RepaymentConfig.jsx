/**
 * Repayment Configuration Page
 * Admin interface for managing discount and interest tiers
 * 
 * NEW COMPONENT - Phase 5: UI Development
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, X, AlertTriangle, CheckCircle2, Info, Settings } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import TierFormModal from '../components/TierFormModal'

export function RepaymentConfigPage() {
    const [activeTab, setActiveTab] = useState('discounts') // 'discounts' | 'interests' | 'status'
    const [discountTiers, setDiscountTiers] = useState([])
    const [interestTiers, setInterestTiers] = useState([])
    const [systemStatus, setSystemStatus] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingTier, setEditingTier] = useState(null)

    const api = useAdminApi()
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setIsLoading(true)
        try {
            if (activeTab === 'discounts') {
                const response = await api.get('/repayment-config/discounts')
                setDiscountTiers(response.data || [])
            } else if (activeTab === 'interests') {
                const response = await api.get('/repayment-config/interests')
                setInterestTiers(response.data || [])
            } else if (activeTab === 'status') {
                const response = await api.get('/repayment-config/status')
                setSystemStatus(response.data || null)
            }
        } catch (error) {
            toast.error('Failed to load data: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id, type) => {
        if (!confirm('Are you sure you want to delete this tier?')) return

        try {
            await api.delete(`/repayment-config/${type}/${id}`)
            toast.success('Tier deleted successfully')
            loadData()
        } catch (error) {
            toast.error('Failed to delete: ' + error.message)
        }
    }

    const handleToggleActive = async (tier, type) => {
        try {
            await api.put(`/repayment-config/${type}/${tier._id}`, {
                isActive: !tier.isActive
            })
            toast.success(`Tier ${tier.isActive ? 'deactivated' : 'activated'}`)
            loadData()
        } catch (error) {
            toast.error('Failed to update: ' + error.message)
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Repayment Configuration</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage discount and interest tiers for vendor credit repayments
                    </p>
                </div>

                {activeTab !== 'status' && (
                    <button
                        onClick={() => {
                            setEditingTier(null)
                            setShowAddModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add {activeTab === 'discounts' ? 'Discount' : 'Interest'} Tier
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('discounts')}
                    className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'discounts'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Discount Tiers
                </button>
                <button
                    onClick={() => setActiveTab('interests')}
                    className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'interests'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Interest Tiers
                </button>
                <button
                    onClick={() => setActiveTab('status')}
                    className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'status'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    System Status
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : activeTab === 'discounts' ? (
                <DiscountTiersView
                    tiers={discountTiers}
                    onEdit={(tier) => {
                        setEditingTier(tier)
                        setShowAddModal(true)
                    }}
                    onDelete={(id) => handleDelete(id, 'discounts')}
                    onToggleActive={(tier) => handleToggleActive(tier, 'discounts')}
                />
            ) : activeTab === 'interests' ? (
                <InterestTiersView
                    tiers={interestTiers}
                    onEdit={(tier) => {
                        setEditingTier(tier)
                        setShowAddModal(true)
                    }}
                    onDelete={(id) => handleDelete(id, 'interests')}
                    onToggleActive={(tier) => handleToggleActive(tier, 'interests')}
                />
            ) : (
                <SystemStatusView status={systemStatus} onRefresh={loadData} />
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <TierFormModal
                    type={activeTab}
                    tier={editingTier}
                    onClose={() => {
                        setShowAddModal(false)
                        setEditingTier(null)
                    }}
                    onSuccess={() => {
                        setShowAddModal(false)
                        setEditingTier(null)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}

// Discount Tiers View Component
function DiscountTiersView({ tiers, onEdit, onDelete, onToggleActive }) {
    if (tiers.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No discount tiers configured</p>
                <p className="text-sm text-gray-500 mt-1">Add your first tier to get started</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {tiers.map((tier) => (
                <div
                    key={tier._id}
                    className={`bg-white rounded-lg border-2 p-4 transition-all ${tier.isActive
                        ? 'border-green-200 hover:border-green-300'
                        : 'border-gray-200 opacity-60'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{tier.tierName}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${tier.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {tier.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-3 py-1 text-sm font-bold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-full">
                                    {tier.discountRate}% Discount
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
                            <div className="flex items-center gap-6 mt-3 text-sm">
                                <span className="text-gray-700">
                                    <span className="font-medium">Period:</span> Days {tier.periodStart}-{tier.periodEnd}
                                </span>
                                <span className="text-gray-700">
                                    <span className="font-medium">Duration:</span> {tier.periodEnd - tier.periodStart} days
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onToggleActive(tier)}
                                className={`p-2 rounded-lg transition-colors ${tier.isActive
                                    ? 'hover:bg-gray-100 text-gray-600'
                                    : 'hover:bg-green-50 text-green-600'
                                    }`}
                                title={tier.isActive ? 'Deactivate' : 'Activate'}
                            >
                                {tier.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => onEdit(tier)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(tier._id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Interest Tiers View Component  
function InterestTiersView({ tiers, onEdit, onDelete, onToggleActive }) {
    if (tiers.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No interest tiers configured</p>
                <p className="text-sm text-gray-500 mt-1">Add your first tier to get started</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {tiers.map((tier) => (
                <div
                    key={tier._id}
                    className={`bg-white rounded-lg border-2 p-4 transition-all ${tier.isActive
                        ? 'border-red-200 hover:border-red-300'
                        : 'border-gray-200 opacity-60'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{tier.tierName}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${tier.isActive
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {tier.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-3 py-1 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full">
                                    {tier.interestRate}% Interest
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
                            <div className="flex items-center gap-6 mt-3 text-sm">
                                <span className="text-gray-700">
                                    <span className="font-medium">Period:</span> Days {tier.periodStart}{tier.isOpenEnded ? '+' : `-${tier.periodEnd}`}
                                </span>
                                {!tier.isOpenEnded && (
                                    <span className="text-gray-700">
                                        <span className="font-medium">Duration:</span> {tier.periodEnd - tier.periodStart} days
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onToggleActive(tier)}
                                className={`p-2 rounded-lg transition-colors ${tier.isActive
                                    ? 'hover:bg-gray-100 text-gray-600'
                                    : 'hover:bg-red-50 text-red-600'
                                    }`}
                                title={tier.isActive ? 'Deactivate' : 'Activate'}
                            >
                                {tier.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => onEdit(tier)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(tier._id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// System Status View
function SystemStatusView({ status, onRefresh }) {
    if (!status) {
        return <div className="text-center py-12 text-gray-600">Loading system status...</div>
    }

    return (
        <div className="space-y-6">
            {/* Overall Health */}
            <div className={`p-6 rounded-lg border-2 ${status.isHealthy
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex items-center gap-3">
                    {status.isHealthy ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                        <h3 className={`text-lg font-semibold ${status.isHealthy ? 'text-green-900' : 'text-red-900'
                            }`}>
                            System Status: {status.isHealthy ? 'Healthy' : 'Issues Detected'}
                        </h3>
                        <p className={`text-sm ${status.isHealthy ? 'text-green-700' : 'text-red-700'
                            }`}>
                            {status.isHealthy
                                ? 'All tier configurations are valid and properly separated'
                                : 'Configuration issues need attention'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Discount Tiers Status */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Tiers</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active Tiers:</span>
                        <span className="font-medium">{status.discountTiers?.count || 0}</span>
                    </div>
                    {status.discountTiers?.tiers?.map((tier, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-2 border-t">
                            <span className="text-gray-700">{tier.name}</span>
                            <div className="flex gap-4 text-gray-600">
                                <span>{tier.period}</span>
                                <span className="font-medium text-green-600">{tier.rate}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interest Tiers Status */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Interest Tiers</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active Tiers:</span>
                        <span className="font-medium">{status.interestTiers?.count || 0}</span>
                    </div>
                    {status.interestTiers?.tiers?.map((tier, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-2 border-t">
                            <span className="text-gray-700">{tier.name}</span>
                            <div className="flex gap-4 text-gray-600">
                                <span>{tier.period}</span>
                                <span className="font-medium text-red-600">{tier.rate}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Warnings & Errors */}
            {(status.warnings?.length > 0 || status.errors?.length > 0) && (
                <div className="space-y-3">
                    {status.errors?.map((error, idx) => (
                        <div key={`error-${idx}`} className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    ))}
                    {status.warnings?.map((warning, idx) => (
                        <div key={`warning-${idx}`} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-700">{warning}</p>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={onRefresh}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Refresh Status
            </button>
        </div>
    )
}

export default RepaymentConfigPage


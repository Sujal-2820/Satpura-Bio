/**
 * Incentive Configuration Page
 * Admin interface for managing purchase-based incentives and reward claims
 * 
 * NEW COMPONENT - Phase 6: Incentive System
 */

import { useState, useEffect } from 'react'
import {
    Gift,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    History,
    Users,
    Award,
    Smartphone,
    Ticket,
    Activity,
    ChevronRight,
    MoreVertical,
    Clock,
    CheckCircle2,
    Package
} from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import IncentiveForm from '../components/IncentiveForm'

export function IncentiveConfigPage({ subRoute, navigate }) {
    const [activeTab, setActiveTab] = useState('schemes') // 'schemes' | 'claims'
    const [incentives, setIncentives] = useState([])
    const [claims, setClaims] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const api = useAdminApi()
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setIsLoading(true)
        try {
            if (activeTab === 'schemes') {
                const response = await api.getIncentives()
                setIncentives(response.data || [])
            } else if (activeTab === 'claims') {
                const response = await api.getIncentiveHistory({ status: 'pending_approval' })
                setClaims(response.data || [])
            }
        } catch (error) {
            toast.error('Failed to load data: ' + (error.message || 'Error occurred'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this incentive scheme?')) return

        try {
            await api.deleteIncentive(id)
            toast.success('Incentive deleted successfully')
            loadData()
        } catch (error) {
            toast.error('Failed to delete: ' + error.message)
        }
    }

    const handleToggleActive = async (incentive) => {
        try {
            await api.updateIncentive(incentive._id, {
                isActive: !incentive.isActive
            })
            toast.success(`Scheme ${incentive.isActive ? 'deactivated' : 'activated'}`)
            loadData()
        } catch (error) {
            toast.error('Failed to update: ' + error.message)
        }
    }

    // Handle Sub-routes (Add/Edit)
    if (subRoute === 'add' || (subRoute && subRoute.startsWith('edit/'))) {
        const incentiveId = subRoute.startsWith('edit/') ? subRoute.split('/')[1] : null;

        return (
            <IncentiveForm
                incentiveId={incentiveId}
                onCancel={() => navigate('incentive-config')}
                onSuccess={() => {
                    loadData()
                    navigate('incentive-config')
                }}
            />
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Gift className="text-purple-600" />
                        Incentive Management
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Configure order-based rewards like vouchers, gadgets, and memberships
                    </p>
                </div>

                {activeTab === 'schemes' && (
                    <button
                        onClick={() => navigate('incentive-config/add')}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100"
                    >
                        <Plus className="w-4 h-4" />
                        New Incentive Scheme
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('schemes')}
                    className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'schemes'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <Award className="w-4 h-4" />
                    Reward Schemes
                </button>
                <button
                    onClick={() => setActiveTab('claims')}
                    className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'claims'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <History className="w-4 h-4" />
                    Active Claims
                    {claims.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {claims.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : activeTab === 'schemes' ? (
                <SchemesGrid
                    incentives={incentives}
                    onEdit={(item) => navigate(`incentive-config/edit/${item._id}`)}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                />
            ) : (
                <ClaimsList
                    claims={claims}
                    onApprove={async (id) => {
                        await api.approveIncentiveClaim(id)
                        toast.success('Claim approved!')
                        loadData()
                    }}
                    onReject={async (id, reason) => {
                        await api.rejectIncentiveClaim(id, { reason })
                        toast.success('Claim rejected')
                        loadData()
                    }}
                    onRefresh={loadData}
                />
            )}
        </div>
    )
}

function SchemesGrid({ incentives, onEdit, onDelete, onToggleActive }) {
    if (incentives.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No incentive schemes yet</h3>
                <p className="text-gray-500 mt-1 max-w-xs mx-auto">
                    Create your first scheme to start rewarding high-performing vendors.
                </p>
                <button
                    onClick={() => window.location.reload()} // Placeholder for better button
                    className="mt-4 text-purple-600 font-medium hover:underline"
                >
                    Refresh Page
                </button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incentives.map((item) => (
                <div
                    key={item._id}
                    className={`relative group bg-white rounded-2xl border transition-all hover:shadow-xl ${item.isActive ? 'border-purple-100 bg-gradient-to-br from-white to-purple-50/10' : 'border-gray-200 opacity-75'
                        }`}
                >
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${item.rewardType === 'voucher' ? 'bg-amber-100 text-amber-600' :
                                item.rewardType === 'membership' ? 'bg-blue-100 text-blue-600' :
                                    item.rewardType === 'smartwatch' ? 'bg-indigo-100 text-indigo-600' :
                                        'bg-purple-100 text-purple-600'
                                }`}>
                                {item.rewardType === 'voucher' ? <Ticket className="w-6 h-6" /> :
                                    item.rewardType === 'membership' ? <Smartphone className="w-6 h-6" /> :
                                        <Gift className="w-6 h-6" />}
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-white rounded-md text-gray-600 hover:text-purple-600">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDelete(item._id)} className="p-1.5 hover:bg-white rounded-md text-gray-600 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                {!item.isActive && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Draft</span>}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 h-10">{item.description}</p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 font-medium">THRESHOLD</div>
                                <div className="text-sm font-bold text-gray-900">₹{item.minPurchaseAmount?.toLocaleString('en-IN')}</div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-200">
                                <div className="text-xs font-medium opacity-80 uppercase">{item.rewardType === 'voucher' ? 'CURRENCY' : 'REWARD'}</div>
                                <div className="text-sm font-black italic">{item.rewardValue} {item.rewardUnit}</div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                {item.currentRedemptions || 0} REDEEMED
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {item.validUntil ? new Date(item.validUntil).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'FOREVER'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onToggleActive(item)}
                        className="absolute top-4 right-4"
                    >
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${item.isActive ? 'bg-purple-600' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${item.isActive ? 'right-1' : 'left-1'}`} />
                        </div>
                    </button>
                </div>
            ))}
        </div>
    )
}

function ClaimsList({ claims, onApprove, onReject, onRefresh }) {
    if (claims.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                <Activity className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Everything up to date</h3>
                <p className="text-gray-500 mt-1">No pending reward claims to review right now.</p>
                <button onClick={onRefresh} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
                    Manually Refresh
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Scheme / Reward</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trigger Order</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Earned At</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {claims.map((claim) => (
                            <tr key={claim._id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{claim.vendorId?.name || 'Unknown Vendor'}</div>
                                        <div className="text-xs text-gray-500">{claim.vendorId?.businessName}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                            <Gift className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{claim.incentiveSnapshot?.title}</div>
                                            <div className="text-xs text-purple-600 font-bold uppercase">{claim.incentiveSnapshot?.rewardValue} {claim.incentiveSnapshot?.rewardUnit}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-700">₹{(claim.purchaseAmount || 0).toLocaleString('en-IN')}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">ORDER: {claim.purchaseOrderId?.substring(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600">{new Date(claim.earnedAt).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-gray-400">{new Date(claim.earnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onApprove(claim._id)}
                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                            title="Approve Reward"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Reason for rejection:')
                                                if (reason) onReject(claim._id, reason)
                                            }}
                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Reject Reward"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default IncentiveConfigPage


/**
 * Rewards Widget
 * Displays available milestones and earned rewards for vendors
 * 
 * NEW COMPONENT - Phase 6: Incentive System
 */

import { useState, useEffect } from 'react'
import { Gift, Award, ChevronRight, CheckCircle2, Star, Clock, Ticket, Smartphone, Package, Trophy } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Trans } from '../../../components/Trans'

export function RewardsWidget({
    schemes = [],
    history = [],
    loading = false,
    onNavigateToRewards
}) {
    // Show only top 2 available milestones
    const topMilestones = schemes.slice(0, 2)
    // Show only top 3 recent history
    const recentHistory = history.slice(0, 3)

    return (
        <div className="bg-white rounded-3xl overflow-hidden border border-purple-100 shadow-sm transition-all hover:shadow-md">
            <div className="p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white relative h-32 flex flex-col justify-end">
                <Trophy className="absolute top-4 right-4 w-20 h-20 text-white/10 -rotate-12" />
                <div className="relative">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        <Trans>Your Rewards & Milestones</Trans>
                    </h3>
                    <p className="text-xs text-white/80 font-medium">
                        <Trans>Unlock premium gifts by hitting targets</Trans>
                    </p>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* Available Milestones */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Trans>Next Milestones</Trans></h4>
                        {onNavigateToRewards && (
                            <button
                                onClick={onNavigateToRewards}
                                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 uppercase"
                            >
                                <Trans>View All</Trans>
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-14 bg-gray-50 rounded-2xl" />
                            <div className="h-14 bg-gray-50 rounded-2xl" />
                        </div>
                    ) : topMilestones.length > 0 ? (
                        <div className="space-y-2">
                            {topMilestones.map((scheme) => (
                                <div key={scheme._id} className="group p-3 bg-purple-50 hover:bg-purple-100/60 rounded-2xl transition-all cursor-pointer border border-purple-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-600">
                                            {scheme.rewardType === 'voucher' ? <Ticket className="w-5 h-5" /> :
                                                scheme.rewardType === 'smartwatch' ? <Smartphone className="w-5 h-5" /> :
                                                    <Gift className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-gray-900 group-hover:text-purple-800 transition-colors line-clamp-1">
                                                {scheme.title}
                                            </div>
                                            <div className="text-[10px] font-bold text-purple-600/70">
                                                <Trans>Target</Trans>: ₹{scheme.minPurchaseAmount?.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-purple-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic py-2"><Trans>No active milestones yet.</Trans></p>
                    )}
                </section>

                {/* Recent Unclaimed/Pending Rewards */}
                {recentHistory.length > 0 && (
                    <section className="space-y-3 pt-2 border-t border-gray-50">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Trans>Recent Earnings</Trans></h4>
                        <div className="space-y-3">
                            {recentHistory.map((item) => (
                                <div key={item._id} className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full mt-1.5",
                                        item.status === 'pending_approval' ? "bg-amber-400 animate-pulse" :
                                            item.status === 'approved' ? "bg-green-500" : "bg-purple-600"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-gray-800 line-clamp-1 uppercase">
                                            {item.incentiveSnapshot?.title}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <div className="text-[10px] text-gray-500 font-medium">
                                                {new Date(item.earnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className={cn(
                                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                                item.status === 'pending_approval' ? "bg-amber-50 text-amber-600" :
                                                    item.status === 'approved' ? "bg-green-50 text-green-600" : "bg-purple-50 text-purple-600"
                                            )}>
                                                {item.status.replace('_', ' ')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

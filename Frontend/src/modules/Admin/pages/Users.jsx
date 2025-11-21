import { useState, useEffect, useCallback } from 'react'
import { Ban, Search, UserCheck, Eye, MessageSquare } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { UserDetailModal } from '../components/UserDetailModal'
import { SupportTicketModal } from '../components/SupportTicketModal'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { users as mockUsers } from '../services/adminData'

const columns = [
  { Header: 'User', accessor: 'name' },
  { Header: 'User ID', accessor: 'id' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Linked Seller', accessor: 'sellerId' },
  { Header: 'Orders', accessor: 'orders' },
  { Header: 'Payments', accessor: 'payments' },
  { Header: 'Support Tickets', accessor: 'supportTickets' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function UsersPage() {
  const { users: usersState } = useAdminState()
  const {
    getUsers,
    getUserDetails,
    blockUser,
    deactivateUser,
    activateUser,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [usersList, setUsersList] = useState([])
  
  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [supportTicketModalOpen, setSupportTicketModalOpen] = useState(false)
  const [selectedUserForTickets, setSelectedUserForTickets] = useState(null)
  const [userTickets, setUserTickets] = useState([])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    const result = await getUsers()
    if (result.data?.users) {
      setUsersList(result.data.users)
    } else {
      // Fallback to mock data
      setUsersList(mockUsers)
    }
  }, [getUsers])

  // Fetch user details
  const fetchUserDetails = useCallback(async (userId) => {
    const result = await getUserDetails(userId)
    if (result.data) {
      setUserDetails(result.data)
      return result.data
    }
    return null
  }, [getUserDetails])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Refresh when users are updated
  useEffect(() => {
    if (usersState.updated) {
      fetchUsers()
    }
  }, [usersState.updated, fetchUsers])

  const handleViewUserDetails = async (user) => {
    const originalUser = usersState.data?.users?.find((u) => u.id === user.id) || user
    setSelectedUserForDetail(originalUser)
    
    // Fetch detailed user data
    const details = await fetchUserDetails(user.id)
    if (details) {
      setUserDetails(details)
    }
    
    setDetailModalOpen(true)
  }

  const handleViewSupportTickets = async (user) => {
    const originalUser = usersState.data?.users?.find((u) => u.id === user.id) || user
    setSelectedUserForTickets(originalUser)
    
    // Fetch user details to get tickets
    const details = await fetchUserDetails(user.id)
    if (details && details.supportTickets) {
      setUserTickets(details.supportTickets)
    } else {
      // Mock tickets for demo
      setUserTickets([
        {
          id: 'TKT-001',
          ticketId: 'TKT-001',
          subject: 'Order delivery issue',
          description: 'Order #ORD-12345 was not delivered on time. Need assistance.',
          status: 'open',
          createdAt: '2024-01-15',
          conversation: [
            { from: 'User', message: 'Order #ORD-12345 was not delivered on time. Need assistance.', timestamp: '2024-01-15 10:00' },
            { from: 'Admin', message: 'We are looking into this issue. Will update you soon.', timestamp: '2024-01-15 11:30' },
          ],
        },
      ])
    }
    
    setSupportTicketModalOpen(true)
  }

  const handleBlockUser = async (userId) => {
    const reason = window.prompt('Please provide a reason for blocking this user:')
    if (reason) {
      try {
        const result = await blockUser(userId, { reason })
        if (result.data) {
          fetchUsers()
          setDetailModalOpen(false)
          setSelectedUserForDetail(null)
          success('User blocked successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to block user'
          showError(errorMessage, 5000)
        }
      } catch (error) {
        showError(error.message || 'Failed to block user', 5000)
      }
    }
  }

  const handleDeactivateUser = async (userId) => {
    const reason = window.prompt('Please provide a reason for deactivating this user:')
    if (reason) {
      try {
        const result = await deactivateUser(userId, { reason })
        if (result.data) {
          fetchUsers()
          setDetailModalOpen(false)
          setSelectedUserForDetail(null)
          success('User deactivated successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to deactivate user'
          showError(errorMessage, 5000)
        }
      } catch (error) {
        showError(error.message || 'Failed to deactivate user', 5000)
      }
    }
  }

  const handleActivateUser = async (userId) => {
    try {
      const result = await activateUser(userId)
      if (result.data) {
        fetchUsers()
        setDetailModalOpen(false)
        setSelectedUserForDetail(null)
        success('User activated successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to activate user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to activate user', 5000)
    }
  }

  const handleResolveTicket = async (ticketId) => {
    // This would call an API to resolve the ticket
    console.log('Resolving ticket:', ticketId)
    // Update local state
    setUserTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: 'resolved' } : ticket,
      ),
    )
  }

  const handleCloseTicket = async (ticketId) => {
    // This would call an API to close the ticket
    console.log('Closing ticket:', ticketId)
    // Update local state
    setUserTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket,
      ),
    )
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'payments') {
      return {
        ...column,
        Cell: (row) => {
          const payments = row.payments || 'Unknown'
          const tone = payments === 'On Time' || payments === 'on_time' ? 'success' : 'warning'
          return <StatusBadge tone={tone}>{payments}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'Unknown'
          const tone = status === 'Active' || status === 'active' ? 'success' : status === 'Blocked' || status === 'blocked' ? 'neutral' : 'warning'
          return <StatusBadge tone={tone}>{status}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'supportTickets') {
      return {
        ...column,
        Cell: (row) => {
          const count = row.supportTickets || 0
          return (
            <div className="flex items-center gap-2">
              <span className={count > 0 ? 'font-bold text-orange-600' : 'text-gray-600'}>
                {count}
              </span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => handleViewSupportTickets(row)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                >
                  View
                </button>
              )}
            </div>
          )
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalUser = usersState.data?.users?.find((u) => u.id === row.id) || row
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewUserDetails(originalUser)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              {row.supportTickets > 0 && (
                <button
                  type="button"
                  onClick={() => handleViewSupportTickets(originalUser)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-orange-600 transition-all hover:border-orange-500 hover:bg-orange-50"
                  title="View support tickets"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        },
      }
    }
    return column
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 5 • User Management</p>
          <h2 className="text-2xl font-bold text-gray-900">User Trust & Compliance</h2>
          <p className="text-sm text-gray-600">
            Monitor orders, payments, and support escalations. Disable risky accounts with a single action.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Search className="h-4 w-4" />
            Advanced Search
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
            <UserCheck className="h-4 w-4" />
            Verify Account
          </button>
        </div>
      </header>

      <DataTable
        columns={tableColumns}
        rows={usersList}
        emptyState="No user accounts found"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-orange-700">User Verification Workflow</h3>
          <p className="text-sm text-gray-600">
            Ensure every user is mapped to a seller, with payment visibility and support ticket insights.
          </p>
          <div className="space-y-3">
            {[
              {
                title: 'KYC Review',
                description: 'Auto fetch KYC docs and ensure mapping to seller IDs before activation.',
                status: 'Completed',
              },
              {
                title: 'Risk Scoring',
                description: 'Flag users with repeated payment delays or support escalations over SLA.',
                status: 'In Progress',
              },
              {
                title: 'Escalation Pipeline',
                description: 'Route flagged accounts to fraud prevention with timeline tracking.',
                status: 'Pending',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{item.title}</p>
                  <StatusBadge tone={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'neutral'}>
                    {item.status}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <Ban className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Suspicious Accounts</h3>
              <p className="text-sm text-red-700">
                Pattern-based alerts combining payment delays, refund rate, and support escalations.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              {
                user: 'USR-7841 • SLR-552',
                detail: 'Refund frequency above threshold. Review manual overrides and block if required.',
              },
              {
                user: 'USR-9922 • SLR-713',
                detail: 'Multiple support tickets unresolved. Investigate quality of service delivered.',
              },
              {
                user: 'USR-8841 • SLR-883',
                detail: 'Payment lapsed twice in 45 days. Credit risk flagged.',
              },
            ].map((item) => (
              <div key={item.user} className="rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-sm font-bold text-gray-900">{item.user}</p>
                <p className="text-xs text-red-700">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedUserForDetail(null)
          setUserDetails(null)
        }}
        user={userDetails || selectedUserForDetail}
        onBlock={handleBlockUser}
        onDeactivate={handleDeactivateUser}
        onActivate={handleActivateUser}
        onViewSupportTickets={handleViewSupportTickets}
      />

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={supportTicketModalOpen}
        onClose={() => {
          setSupportTicketModalOpen(false)
          setSelectedUserForTickets(null)
          setUserTickets([])
        }}
        tickets={userTickets}
        user={selectedUserForTickets}
        onResolve={handleResolveTicket}
        onCloseTicket={handleCloseTicket}
        loading={loading}
      />
    </div>
  )
}


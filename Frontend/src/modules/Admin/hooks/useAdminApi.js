/**
 * Custom hook for Admin API integration
 * Provides easy access to API functions with loading states and error handling
 */

import { useState, useCallback } from 'react'
import { useAdminDispatch } from '../context/AdminContext'
import * as adminApi from '../services/adminApi'

export function useAdminApi() {
  const dispatch = useAdminDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(
    async (apiFunction, ...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction(...args)
        if (result.success) {
          return { data: result.data, error: null }
        } else {
          setError(result.error)
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = { message: err.message || 'An unexpected error occurred' }
        setError(errorMsg)
        return { data: null, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Authentication APIs
  const login = useCallback((credentials) => callApi(adminApi.loginAdmin, credentials), [callApi])

  const logout = useCallback(() => callApi(adminApi.logoutAdmin), [callApi])

  const fetchProfile = useCallback(() => callApi(adminApi.getAdminProfile), [callApi])

  // Dashboard APIs
  const fetchDashboardData = useCallback(
    (params) => {
      return callApi(adminApi.getDashboardData, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_DASHBOARD_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Product Management APIs
  const getProducts = useCallback(
    (params) => {
      return callApi(adminApi.getProducts, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getProductDetails = useCallback((productId) => callApi(adminApi.getProductDetails, productId), [callApi])

  const createProduct = useCallback(
    (productData) => {
      return callApi(adminApi.createProduct, productData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateProduct = useCallback(
    (productId, productData) => {
      return callApi(adminApi.updateProduct, productId, productData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deleteProduct = useCallback(
    (productId) => {
      return callApi(adminApi.deleteProduct, productId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const assignProductToVendor = useCallback(
    (productId, assignmentData) => {
      return callApi(adminApi.assignProductToVendor, productId, assignmentData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const toggleProductVisibility = useCallback(
    (productId, visibilityData) => {
      return callApi(adminApi.toggleProductVisibility, productId, visibilityData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Vendor Management APIs
  const getVendors = useCallback(
    (params) => {
      return callApi(adminApi.getVendors, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getVendorDetails = useCallback((vendorId) => callApi(adminApi.getVendorDetails, vendorId), [callApi])

  const approveVendor = useCallback(
    (vendorId, approvalData) => {
      return callApi(adminApi.approveVendor, vendorId, approvalData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectVendor = useCallback(
    (vendorId, rejectionData) => {
      return callApi(adminApi.rejectVendor, vendorId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateVendorCreditPolicy = useCallback(
    (vendorId, policyData) => {
      return callApi(adminApi.updateVendorCreditPolicy, vendorId, policyData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const approveVendorPurchase = useCallback(
    (requestId) => {
      return callApi(adminApi.approveVendorPurchase, requestId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true }) // Refresh products after stock update
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectVendorPurchase = useCallback(
    (requestId, rejectionData) => {
      return callApi(adminApi.rejectVendorPurchase, requestId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getVendorPurchaseRequests = useCallback((params) => callApi(adminApi.getVendorPurchaseRequests, params), [callApi])

  const banVendor = useCallback(
    (vendorId, banData) => {
      return callApi(adminApi.banVendor, vendorId, banData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const unbanVendor = useCallback(
    (vendorId, unbanData) => {
      return callApi(adminApi.unbanVendor, vendorId, unbanData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deleteVendor = useCallback(
    (vendorId, deleteData) => {
      return callApi(adminApi.deleteVendor, vendorId, deleteData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Seller Management APIs
  const getSellers = useCallback(
    (params) => {
      return callApi(adminApi.getSellers, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getSellerDetails = useCallback((sellerId) => callApi(adminApi.getSellerDetails, sellerId), [callApi])

  const createSeller = useCallback(
    (sellerData) => {
      return callApi(adminApi.createSeller, sellerData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateSeller = useCallback(
    (sellerId, sellerData) => {
      return callApi(adminApi.updateSeller, sellerId, sellerData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const approveSeller = useCallback(
    (sellerId) => {
      return callApi(adminApi.approveSeller, sellerId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectSeller = useCallback(
    (sellerId, rejectionData) => {
      return callApi(adminApi.rejectSeller, sellerId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deleteSeller = useCallback(
    (sellerId) => {
      return callApi(adminApi.deleteSeller, sellerId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const approveSellerWithdrawal = useCallback(
    (requestId) => {
      return callApi(adminApi.approveSellerWithdrawal, requestId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectSellerWithdrawal = useCallback(
    (requestId, rejectionData) => {
      return callApi(adminApi.rejectSellerWithdrawal, requestId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getSellerWithdrawalRequests = useCallback((params) => callApi(adminApi.getSellerWithdrawalRequests, params), [callApi])

  // User Management APIs
  const getUsers = useCallback(
    (params) => {
      return callApi(adminApi.getUsers, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getUserDetails = useCallback((userId) => callApi(adminApi.getUserDetails, userId), [callApi])

  const blockUser = useCallback(
    (userId, blockData) => {
      return callApi(adminApi.blockUser, userId, blockData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deactivateUser = useCallback(
    (userId, deactivateData) => {
      return callApi(adminApi.deactivateUser, userId, deactivateData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const activateUser = useCallback(
    (userId) => {
      return callApi(adminApi.activateUser, userId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Order Management APIs
  const getOrders = useCallback(
    (params) => {
      return callApi(adminApi.getOrders, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getOrderDetails = useCallback((orderId) => callApi(adminApi.getOrderDetails, orderId), [callApi])

  const reassignOrder = useCallback(
    (orderId, reassignData) => {
      return callApi(adminApi.reassignOrder, orderId, reassignData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const generateInvoice = useCallback((orderId) => callApi(adminApi.generateInvoice, orderId), [callApi])

  const getCommissions = useCallback(
    (params) => {
      return callApi(adminApi.getCommissions, params)
    },
    [callApi],
  )

  // Finance & Credit Management APIs
  const getFinanceData = useCallback(
    () => {
      return callApi(adminApi.getFinanceData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getFinancialParameters = useCallback(() => callApi(adminApi.getFinancialParameters), [callApi])

  const updateFinancialParameters = useCallback(
    (parameters) => {
      return callApi(adminApi.updateFinancialParameters, parameters).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getVendorCreditBalances = useCallback((params) => callApi(adminApi.getVendorCreditBalances, params), [callApi])

  const applyPenalty = useCallback(
    (vendorId) => {
      return callApi(adminApi.applyPenalty, vendorId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getOutstandingCredits = useCallback(() => callApi(adminApi.getOutstandingCredits), [callApi])

  const getRecoveryStatus = useCallback(() => callApi(adminApi.getRecoveryStatus), [callApi])

  const updateGlobalParameters = useCallback(
    (parameters) => {
      return callApi(adminApi.updateGlobalParameters, parameters).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const applyVendorPenalty = useCallback(
    (vendorId, penaltyData) => {
      return callApi(adminApi.applyVendorPenalty, vendorId, penaltyData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getVendorCreditHistory = useCallback((vendorId, params) => callApi(adminApi.getVendorCreditHistory, vendorId, params), [callApi])

  // Operations & Controls APIs
  const getLogisticsSettings = useCallback(() => callApi(adminApi.getLogisticsSettings), [callApi])

  const updateLogisticsSettings = useCallback(
    (settings) => {
      return callApi(adminApi.updateLogisticsSettings, settings).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getEscalatedOrders = useCallback(() => callApi(adminApi.getEscalatedOrders), [callApi])

  const fulfillOrderFromWarehouse = useCallback(
    (orderId, fulfillmentData) => {
      return callApi(adminApi.fulfillOrderFromWarehouse, orderId, fulfillmentData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const revertEscalation = useCallback(
    (orderId, revertData) => {
      return callApi(adminApi.revertEscalation, orderId, revertData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getNotifications = useCallback(() => callApi(adminApi.getNotifications), [callApi])

  const createNotification = useCallback(
    (notificationData) => {
      return callApi(adminApi.createNotification, notificationData).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const updateNotification = useCallback(
    (notificationId, notificationData) => {
      return callApi(adminApi.updateNotification, notificationId, notificationData).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const deleteNotification = useCallback(
    (notificationId) => {
      return callApi(adminApi.deleteNotification, notificationId).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  // Analytics & Reports APIs
  const getAnalyticsData = useCallback(
    (params) => {
      return callApi(adminApi.getAnalyticsData, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ANALYTICS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const exportReports = useCallback((exportData) => callApi(adminApi.exportReports, exportData), [callApi])

  return {
    loading,
    error,
    // Authentication
    login,
    logout,
    fetchProfile,
    // Dashboard
    fetchDashboardData,
    // Products
    getProducts,
    getProductDetails,
    createProduct,
    updateProduct,
    deleteProduct,
    assignProductToVendor,
    toggleProductVisibility,
    // Vendors
    getVendors,
    getVendorDetails,
    approveVendor,
    rejectVendor,
    updateVendorCreditPolicy,
    approveVendorPurchase,
    rejectVendorPurchase,
    getVendorPurchaseRequests,
    banVendor,
    unbanVendor,
    deleteVendor,
    // Sellers
    getSellers,
    getSellerDetails,
    createSeller,
    updateSeller,
    approveSeller,
    rejectSeller,
    deleteSeller,
    approveSellerWithdrawal,
    rejectSellerWithdrawal,
    getSellerWithdrawalRequests,
    // Users
    getUsers,
    getUserDetails,
    blockUser,
    deactivateUser,
    activateUser,
    // Orders
    getOrders,
    getOrderDetails,
    reassignOrder,
    generateInvoice,
    getCommissions,
    // Finance
    getFinanceData,
    getFinancialParameters,
    updateFinancialParameters,
    getVendorCreditBalances,
    applyPenalty,
    getOutstandingCredits,
    getRecoveryStatus,
    updateGlobalParameters,
    applyVendorPenalty,
    getVendorCreditHistory,
    // Operations
    getLogisticsSettings,
    updateLogisticsSettings,
    getEscalatedOrders,
    fulfillOrderFromWarehouse,
    revertEscalation,
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    // Analytics
    getAnalyticsData,
    exportReports,
  }
}


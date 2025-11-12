import { useNavigate } from 'react-router-dom'
import { VendorDashboard } from '../pages/vendor/VendorDashboard'
import { useVendorDispatch } from '../context/VendorContext'

export function VendorDashboardPage() {
  const navigate = useNavigate()
  const dispatch = useVendorDispatch()

  return (
    <VendorDashboard
      onLogout={() => {
        dispatch({ type: 'AUTH_LOGOUT' })
        navigate('/vendor/login')
      }}
    />
  )
}


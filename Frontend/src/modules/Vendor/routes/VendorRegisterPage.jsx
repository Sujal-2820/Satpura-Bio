import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorDispatch } from '../context/VendorContext'
import { VendorRegister } from '../pages/VendorRegister'

export function VendorRegisterPage() {
  const dispatch = useVendorDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    dispatch({ type: 'SET_ROLE', payload: 'vendor' })
  }, [dispatch])

  return (
    <VendorRegister
      onSwitchToLogin={() => navigate('/vendor/login')}
      onSuccess={() => navigate('/vendor/dashboard')}
    />
  )
}


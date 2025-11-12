import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorDispatch } from '../context/VendorContext'
import { VendorLogin } from '../pages/vendor/VendorLogin'
import '../vendor.css'

export function VendorLoginPage() {
  const dispatch = useVendorDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    dispatch({ type: 'SET_ROLE', payload: 'vendor' })
  }, [dispatch])

  return (
    <div className="vendor-app">
      <VendorLogin
        onBack={() => navigate('/')}
        onRegister={() => navigate('/vendor/login')}
        onSuccess={() => navigate('/vendor/dashboard')}
      />
    </div>
  )
}


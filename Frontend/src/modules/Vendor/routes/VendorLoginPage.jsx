import { useNavigate } from 'react-router-dom'
import { VendorLogin } from '../pages/vendor/VendorLogin'
import '../vendor.css'

export function VendorLoginPage() {
  const navigate = useNavigate()

  return (
    <VendorLogin
      onSwitchToRegister={() => navigate('/vendor/register')}
      onSuccess={() => navigate('/vendor/dashboard')}
    />
  )
}


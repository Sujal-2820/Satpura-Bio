import { Outlet } from 'react-router-dom'
import { VendorProvider } from '..'

export function VendorRouteContainer() {
  return (
    <VendorProvider>
      <Outlet />
    </VendorProvider>
  )
}


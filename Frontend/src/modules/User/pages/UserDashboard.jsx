import { useEffect, useMemo, useRef, useState } from 'react'
import { useUserDispatch, useUserState } from '../context/UserContext'
import { MobileShell } from '../components/MobileShell'
import { BottomNavItem } from '../components/BottomNavItem'
import { MenuList } from '../components/MenuList'
import { HomeIcon, SearchIcon, CartIcon, UserIcon, MenuIcon, HeartIcon, PackageIcon } from '../components/icons'
import { userSnapshot, MIN_ORDER_VALUE } from '../services/userData'
import { cn } from '../../../lib/cn'
import { useToast, ToastProvider } from '../components/ToastNotification'
import { HomeView } from './views/HomeView'
import { SearchView } from './views/SearchView'
import { ProductDetailView } from './views/ProductDetailView'
import { CartView } from './views/CartView'
import { CheckoutView } from './views/CheckoutView'
import { OrderConfirmationView } from './views/OrderConfirmationView'
import { AccountView } from './views/AccountView'
import { FavouritesView } from './views/FavouritesView'
import { CategoryProductsView } from './views/CategoryProductsView'
import { OrdersView } from './views/OrdersView'
import '../user.css'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    description: 'Browse products and categories',
    icon: HomeIcon,
  },
  {
    id: 'favourites',
    label: 'Favourites',
    description: 'Your favourite products',
    icon: HeartIcon,
  },
  {
    id: 'cart',
    label: 'Cart',
    description: 'Your shopping cart',
    icon: CartIcon,
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Your orders',
    icon: PackageIcon,
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Orders, profile, settings',
    icon: UserIcon,
  },
]

function UserDashboardContent({ onLogout }) {
  const { profile, cart, favourites, notifications, orders } = useUserState()
  const dispatch = useUserDispatch()
  const [activeTab, setActiveTab] = useState('home')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderConfirmation, setOrderConfirmation] = useState(null)
  const { toasts, dismissToast, success, error, warning, info } = useToast()
  const [searchMounted, setSearchMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  // Initialize user data if not present
  useEffect(() => {
    if (!profile.name || profile.name === 'Guest User') {
      dispatch({
        type: 'AUTH_LOGIN',
        payload: userSnapshot.profile,
      })
      if (userSnapshot.addresses.length > 0) {
        userSnapshot.addresses.forEach((addr) => {
          dispatch({ type: 'ADD_ADDRESS', payload: addr })
        })
      }
    }
  }, [dispatch, profile])

  // Initialize sample notifications
  useEffect(() => {
    if (notifications.length === 0) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Welcome to IRA Sathi!',
          message: 'Start shopping for your farming needs',
        },
      })
    }
  }, [dispatch, notifications.length])

  // Initialize sample delivered orders
  useEffect(() => {
    if (orders.length === 0) {
      const sampleOrders = [
        {
          id: `ORD-${Date.now()}-1`,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          status: 'delivered',
          paymentStatus: 'fully_paid',
          total: 3250,
          items: [
            {
              name: 'NPK 19:19:19 Fertilizer',
              price: 1250,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
            },
            {
              name: 'Organic Compost',
              price: 750,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
            },
          ],
        },
        {
          id: `ORD-${Date.now() - 1000}-2`,
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
          status: 'delivered',
          paymentStatus: 'fully_paid',
          total: 4500,
          items: [
            {
              name: 'Wheat Seeds Premium',
              price: 1500,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
            },
            {
              name: 'Urea Fertilizer',
              price: 1500,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
            },
          ],
        },
        {
          id: `ORD-${Date.now() - 2000}-3`,
          date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
          status: 'delivered',
          paymentStatus: 'fully_paid',
          total: 2800,
          items: [
            {
              name: 'Neem Oil Insecticide',
              price: 850,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400',
            },
            {
              name: 'Potash Fertilizer',
              price: 1100,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400',
            },
          ],
        },
      ]

      sampleOrders.forEach((order) => {
        dispatch({ type: 'ADD_ORDER', payload: order })
      })
    }
  }, [dispatch, orders.length])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const favouritesCount = useMemo(() => favourites.length, [favourites])
  const unreadNotificationsCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const handleAddToCart = (productId, quantity = 1) => {
    const product = userSnapshot.products.find((p) => p.id === productId)
    if (!product) {
      error('Product not found')
      return
    }
    if (product.stock === 0) {
      error('Product is out of stock')
      return
    }
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
        vendor: product.vendor,
        deliveryTime: product.deliveryTime,
      },
    })
    success(`${product.name} added to cart`)
  }

  const handleRemoveFromCart = (productId) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { productId } })
    success('Item removed from cart')
  }

  const handleUpdateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId)
      return
    }
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { productId, quantity } })
  }

  const handleProceedToCheckout = () => {
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (cartTotal < MIN_ORDER_VALUE) {
      warning(`Minimum order value is ₹${MIN_ORDER_VALUE.toLocaleString('en-IN')}`)
      return
    }
    setShowCheckout(true)
    setActiveTab('checkout')
  }

  const handleToggleFavourite = (productId) => {
    const isFavourite = favourites.includes(productId)
    if (isFavourite) {
      dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
      success('Removed from favourites')
    } else {
      dispatch({ type: 'ADD_TO_FAVOURITES', payload: { productId } })
      success('Added to favourites')
    }
  }

  const handleFavouritesClick = () => {
    setActiveTab('favourites')
    setSelectedProduct(null)
    setShowCheckout(false)
  }

  const handleSearchClick = () => {
    openSearch()
  }

  const handleFilterClick = () => {
    setActiveTab('search')
  }

  const openSearch = () => {
    setSearchMounted(true)
    requestAnimationFrame(() => setSearchOpen(true))
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setTimeout(() => {
      setSearchMounted(false)
      setSearchQuery('')
    }, 260)
  }

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [searchOpen])

  const buildMenuItems = (close) => [
    ...NAV_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      icon: <item.icon className="h-4 w-4" />,
      onSelect: () => {
        setActiveTab(item.id)
        close()
      },
    })),
    {
      id: 'logout',
      label: 'Sign out',
      icon: <MenuIcon className="h-4 w-4" />,
      description: 'Log out from your account',
      onSelect: () => {
        dispatch({ type: 'AUTH_LOGOUT' })
        onLogout?.()
        close()
      },
    },
  ]

  return (
    <>
      <MobileShell
        title={activeTab === 'home' ? `Hello ${profile.name.split(' ')[0]}` : null}
        subtitle={profile.location?.city ? `${profile.location.city}, ${profile.location.state}` : null}
        onSearchClick={handleSearchClick}
        notificationsCount={unreadNotificationsCount}
        navigation={NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.id}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => {
              setActiveTab(item.id)
              setSelectedProduct(null)
              setSelectedCategory(null)
              setShowCheckout(false)
            }}
            icon={<item.icon active={activeTab === item.id} className="h-5 w-5" filled={item.id === 'favourites' ? favouritesCount > 0 : undefined} />}
            badge={item.id === 'cart' ? (cartCount > 0 ? cartCount : undefined) : item.id === 'favourites' ? (favouritesCount > 0 ? favouritesCount : undefined) : undefined}
          />
        ))}
        menuContent={({ close }) => <MenuList items={buildMenuItems(close)} active={activeTab} />}
        cartCount={cartCount}
      >
        <section className="space-y-6">
          {activeTab === 'home' && (
            <HomeView
              onProductClick={(productId) => {
                setSelectedProduct(productId)
                setActiveTab('product-detail')
              }}
              onCategoryClick={(categoryId) => {
                setSelectedCategory(categoryId)
                setActiveTab('category-products')
              }}
              onAddToCart={handleAddToCart}
              onSearchClick={handleSearchClick}
              onFilterClick={handleFilterClick}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
            />
          )}
          {activeTab === 'favourites' && (
            <FavouritesView
              onProductClick={(productId) => {
                setSelectedProduct(productId)
                setActiveTab('product-detail')
              }}
              onAddToCart={handleAddToCart}
              onRemoveFromFavourites={(productId) => {
                success('Removed from favourites')
              }}
            />
          )}
          {activeTab === 'category-products' && selectedCategory && (
            <CategoryProductsView
              categoryId={selectedCategory}
              onProductClick={(productId) => {
                setSelectedProduct(productId)
                setActiveTab('product-detail')
              }}
              onAddToCart={handleAddToCart}
              onBack={() => {
                setSelectedCategory(null)
                setActiveTab('home')
              }}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
            />
          )}
          {activeTab === 'search' && (
            <SearchView
              query={searchQuery}
              onProductClick={(productId) => {
                setSelectedProduct(productId)
                setActiveTab('product-detail')
              }}
              onAddToCart={handleAddToCart}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
            />
          )}
          {activeTab === 'product-detail' && selectedProduct && (
            <ProductDetailView
              productId={selectedProduct}
              onAddToCart={handleAddToCart}
              onBack={() => {
                setSelectedProduct(null)
                setActiveTab('home')
              }}
              onProductClick={(productId) => {
                setSelectedProduct(productId)
                setActiveTab('product-detail')
              }}
            />
          )}
          {activeTab === 'cart' && (
            <CartView
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemove={handleRemoveFromCart}
              onCheckout={handleProceedToCheckout}
              onAddToCart={handleAddToCart}
            />
          )}
          {orderConfirmation ? (
            <OrderConfirmationView
              order={orderConfirmation}
              onBackToHome={() => {
                setOrderConfirmation(null)
                setActiveTab('home')
              }}
            />
          ) : (
            <>
              {activeTab === 'checkout' && showCheckout && (
                <CheckoutView
                  onBack={() => {
                    setShowCheckout(false)
                    setActiveTab('cart')
                  }}
                  onOrderPlaced={(order) => {
                    dispatch({ type: 'ADD_ORDER', payload: order })
                    dispatch({ type: 'CLEAR_CART' })
                    setOrderConfirmation(order)
                    setShowCheckout(false)
                  }}
                />
              )}
            </>
          )}
          {activeTab === 'orders' && <OrdersView />}
          {activeTab === 'account' && <AccountView />}
        </section>
      </MobileShell>

      {searchMounted ? (
        <div className={cn('user-search-sheet', searchOpen && 'is-open')}>
          <div className={cn('user-search-sheet__overlay', searchOpen && 'is-open')} onClick={closeSearch} />
          <div className={cn('user-search-sheet__panel', searchOpen && 'is-open')}>
            <div className="flex items-center gap-2.5">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setActiveTab('search')
                    closeSearch()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeSearch()
                  }
                }}
                placeholder="Search products..."
                className="flex-1 rounded-2xl border border-[rgba(15,118,110,0.25)] bg-[rgba(240,253,250,0.85)] py-2.5 px-4 text-[0.9rem] text-[#0f172a] shadow-[inset_0_2px_6px_-3px_rgba(15,23,42,0.25)] focus:outline-none focus:border-[#1b8f5b] focus:ring-2 focus:ring-[rgba(43,118,79,0.2)]"
                aria-label="Search products"
              />
              <button
                type="button"
                className="border-none bg-transparent text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#047857]"
                onClick={closeSearch}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function UserDashboard({ onLogout }) {
  return (
    <ToastProvider>
      <UserDashboardContent onLogout={onLogout} />
    </ToastProvider>
  )
}

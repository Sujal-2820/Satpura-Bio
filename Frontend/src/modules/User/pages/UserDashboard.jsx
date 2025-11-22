import { useEffect, useMemo, useRef, useState } from 'react'
import { useUserDispatch, useUserState } from '../context/UserContext'
import { MobileShell } from '../components/MobileShell'
import { BottomNavItem } from '../components/BottomNavItem'
import { MenuList } from '../components/MenuList'
import { HomeIcon, SearchIcon, CartIcon, UserIcon, MenuIcon, HeartIcon, PackageIcon } from '../components/icons'
import { MIN_ORDER_VALUE } from '../services/userData'
import * as userApi from '../services/userApi'
import { cn } from '../../../lib/cn'
import { useToast, ToastProvider } from '../components/ToastNotification'
import { useUserApi } from '../hooks/useUserApi'
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

  // Fetch user profile from API on mount
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (token) {
      // Fetch user profile from backend
      const fetchProfile = async () => {
        try {
          const result = await userApi.getUserProfile()
          if (result.success && result.data?.user) {
            const userData = result.data.user
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                name: userData.name || 'User',
                phone: userData.phone || '',
                email: userData.email || '',
                sellerId: userData.sellerId || null,
                location: userData.location || null,
              },
            })
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
          // If token is invalid, redirect to login
          if (error.error?.message?.includes('unauthorized') || error.error?.message?.includes('token')) {
            localStorage.removeItem('user_token')
            window.location.href = '/user/login'
          }
        }
      }
      fetchProfile()
    } else {
      // No token - redirect to login
      window.location.href = '/user/login'
    }
  }, [dispatch])

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

  // Fetch orders and cart from API
  const { fetchOrders, fetchCart } = useUserApi()
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (token) {
      const loadData = async () => {
        try {
          // Fetch orders
          const ordersResult = await fetchOrders()
          if (ordersResult.data?.orders) {
            ordersResult.data.orders.forEach((order) => {
              dispatch({
                type: 'ADD_ORDER',
                payload: {
                  id: order.id || order._id,
                  orderNumber: order.orderNumber,
                  status: order.status,
                  totalAmount: order.totalAmount,
                  paymentStatus: order.paymentStatus,
                  items: order.items,
                  createdAt: order.createdAt,
                },
              })
            })
          }

          // Fetch cart
          const cartResult = await fetchCart()
          if (cartResult.data?.cart?.items && cartResult.data.cart.items.length > 0) {
            // Clear existing cart first
            dispatch({ type: 'CLEAR_CART' })
            // Add items from API
            cartResult.data.cart.items.forEach((item) => {
              const productId = item.product?.id || item.product?._id || item.productId
              if (productId) {
                dispatch({
                  type: 'ADD_TO_CART',
                  payload: {
                    productId: productId,
                    quantity: item.quantity || 1,
                  },
                })
              }
            })
          }
        } catch (error) {
          console.error('Error loading data:', error)
        }
      }
      loadData()
    }
  }, [fetchOrders, fetchCart, dispatch])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const favouritesCount = useMemo(() => favourites.length, [favourites])
  const unreadNotificationsCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  
  const tabLabels = useMemo(() => {
    return NAV_ITEMS.reduce((acc, item) => {
      acc[item.id] = item.label
      return acc
    }, {})
  }, [])
  
  const searchCatalog = useMemo(
    () =>
      [
        {
          id: 'search-home-hero',
          label: 'Special Offers',
          keywords: ['offers', 'deals', 'promotions', 'discounts', 'banner', 'special'],
          tab: 'home',
          targetId: 'home-hero',
        },
        {
          id: 'search-home-search',
          label: 'Find Products',
          keywords: ['search', 'find', 'products', 'items', 'look'],
          tab: 'home',
          targetId: 'home-search',
        },
        {
          id: 'search-home-categories',
          label: 'Browse Categories',
          keywords: ['categories', 'seeds', 'fertilizers', 'pesticides', 'tools', 'browse'],
          tab: 'home',
          targetId: 'home-categories',
        },
        {
          id: 'search-home-popular',
          label: 'Best Sellers',
          keywords: ['popular', 'best', 'trending', 'top', 'sellers', 'products'],
          tab: 'home',
          targetId: 'home-popular-products',
        },
        {
          id: 'search-cart',
          label: 'My Cart',
          keywords: ['cart', 'basket', 'items', 'checkout', 'buy'],
          tab: 'cart',
          targetId: null,
        },
        {
          id: 'search-favourites',
          label: 'My Favourites',
          keywords: ['favourites', 'wishlist', 'saved', 'liked', 'favorite'],
          tab: 'favourites',
          targetId: null,
        },
        {
          id: 'search-orders',
          label: 'My Orders',
          keywords: ['orders', 'history', 'purchases', 'deliveries', 'past'],
          tab: 'orders',
          targetId: null,
        },
        {
          id: 'search-account',
          label: 'My Account',
          keywords: ['account', 'profile', 'settings', 'address', 'payment', 'info'],
          tab: 'account',
          targetId: null,
        },
      ].map((item) => ({
        ...item,
        tabLabel: tabLabels[item.tab],
      })),
    [tabLabels],
  )
  
  const [pendingScroll, setPendingScroll] = useState(null)
  
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return searchCatalog.slice(0, 7)
    }
    const tokens = query.split(/\s+/).filter(Boolean)
    const results = searchCatalog
      .map((item) => {
        const haystack = `${item.label} ${item.tabLabel} ${item.keywords.join(' ')}`.toLowerCase()
        const directIndex = haystack.indexOf(query)
        const directScore = directIndex >= 0 ? 200 - directIndex : 0
        const tokenScore = tokens.reduce((score, token) => (haystack.includes(token) ? score + 20 : score), 0)
        const score = directScore + tokenScore
        return { ...item, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
    return results.length ? results : searchCatalog.slice(0, 5)
  }, [searchCatalog, searchQuery])
  
  const handleSearchNavigate = (item) => {
    if (!item) return
    const delay = item.tab === activeTab ? 150 : 420
    setActiveTab(item.tab)
    if (item.targetId) {
      setPendingScroll({ id: item.targetId, delay })
    }
    closeSearch()
  }
  
  const handleSearchSubmit = () => {
    if (searchResults.length) {
      handleSearchNavigate(searchResults[0])
    } else {
      setActiveTab('search')
      closeSearch()
    }
  }
  
  useEffect(() => {
    if (!pendingScroll) return
    const { id, delay } = pendingScroll
    const timer = setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }
      setPendingScroll(null)
    }, delay)
    return () => clearTimeout(timer)
  }, [pendingScroll, activeTab])

  const handleAddToCart = async (productId, quantity = 1) => {
    try {
      // Fetch product details from API
      const result = await userApi.getProductDetails(productId)
      if (!result.success || !result.data?.product) {
        error('Product not found')
        return
      }
      
      const product = result.data.product
      if (product.stock === 0) {
        error('Product is out of stock')
        return
      }
      
      // Add to cart via API
      const cartResult = await userApi.addToCart({ productId, quantity })
      if (cartResult.error) {
        error(cartResult.error.message || 'Failed to add to cart')
        return
      }
      
      // Update local state
      dispatch({
        type: 'ADD_TO_CART',
        payload: {
          productId: product._id || product.id,
          name: product.name,
          price: product.priceToUser || product.price,
          image: product.images?.[0]?.url || product.primaryImage || product.image,
          quantity,
          vendor: product.vendor,
          deliveryTime: product.deliveryTime,
        },
      })
      success(`${product.name} added to cart`)
    } catch (err) {
      error('Failed to add product to cart')
      console.error('Error adding to cart:', err)
    }
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
                if (productId === 'all') {
                  // "View All" clicked - switch to search view instead of product detail
                  setActiveTab('search')
                  setSearchQuery('')
                } else {
                  setSelectedProduct(productId)
                  setActiveTab('product-detail')
                }
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
          {activeTab === 'account' && <AccountView onNavigate={setActiveTab} />}
        </section>
      </MobileShell>

      {searchMounted ? (
        <div className={cn('user-search-sheet', searchOpen && 'is-open')}>
          <div className={cn('user-search-sheet__overlay', searchOpen && 'is-open')} onClick={closeSearch} />
          <div className={cn('user-search-sheet__panel', searchOpen && 'is-open')}>
            <div className="user-search-sheet__header">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchSubmit()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeSearch()
                  }
                }}
                placeholder="Search for products, orders, cart..."
                className="user-search-input"
                aria-label="Search user dashboard"
              />
              <button
                type="button"
                className="user-search-cancel"
                onClick={closeSearch}
              >
                Cancel
              </button>
            </div>
            <div className="user-search-sheet__body">
              {searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchNavigate(item)}
                    className="user-search-result"
                  >
                    <span className="user-search-result__label">{item.label}</span>
                    <span className="user-search-result__meta">{item.tabLabel}</span>
                  </button>
                ))
              ) : (
                <p className="user-search-empty">No matches yet. Try another keyword.</p>
              )}
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

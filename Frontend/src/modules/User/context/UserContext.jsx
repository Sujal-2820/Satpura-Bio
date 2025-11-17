import { createContext, useContext, useMemo, useReducer } from 'react'

const UserStateContext = createContext(null)
const UserDispatchContext = createContext(() => {})

const initialState = {
  authenticated: false,
  profile: {
    name: 'Guest User',
    email: '',
    phone: '',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: null,
    },
  },
  cart: [],
  orders: [],
  addresses: [],
  paymentMethods: [],
  favourites: [],
  notifications: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOGIN':
      return {
        ...state,
        authenticated: true,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      }
    case 'AUTH_LOGOUT':
      return { ...state, authenticated: false, profile: initialState.profile, cart: [] }
    case 'ADD_TO_CART':
      const existingItem = state.cart.find((item) => item.productId === action.payload.productId)
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item,
          ),
        }
      }
      return {
        ...state,
        cart: [...state.cart, action.payload],
      }
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.productId !== action.payload.productId),
      }
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      }
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.payload],
        cart: [],
      }
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.id ? { ...order, ...action.payload } : order,
        ),
      }
    case 'ADD_ADDRESS':
      return {
        ...state,
        addresses: [...state.addresses, action.payload],
      }
    case 'UPDATE_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.map((addr) =>
          addr.id === action.payload.id ? { ...addr, ...action.payload } : addr,
        ),
      }
    case 'SET_DEFAULT_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === action.payload.id,
        })),
      }
    case 'DELETE_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.filter((addr) => addr.id !== action.payload.id),
      }
    case 'ADD_TO_FAVOURITES':
      if (state.favourites.includes(action.payload.productId)) {
        return state
      }
      return {
        ...state,
        favourites: [...state.favourites, action.payload.productId],
      }
    case 'REMOVE_FROM_FAVOURITES':
      return {
        ...state,
        favourites: state.favourites.filter((id) => id !== action.payload.productId),
      }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          {
            id: Date.now().toString(),
            ...action.payload,
            read: false,
            timestamp: new Date().toISOString(),
          },
          ...state.notifications,
        ],
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((notif) =>
          notif.id === action.payload.id ? { ...notif, read: true } : notif,
        ),
      }
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
      }
    default:
      return state
  }
}

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => state, [state])
  return (
    <UserStateContext.Provider value={value}>
      <UserDispatchContext.Provider value={dispatch}>{children}</UserDispatchContext.Provider>
    </UserStateContext.Provider>
  )
}

export function useUserState() {
  const context = useContext(UserStateContext)
  if (!context) throw new Error('useUserState must be used within UserProvider')
  return context
}

export function useUserDispatch() {
  const dispatch = useContext(UserDispatchContext)
  if (!dispatch) throw new Error('useUserDispatch must be used within UserProvider')
  return dispatch
}


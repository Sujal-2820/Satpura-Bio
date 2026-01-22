import { useRef, useState, useEffect } from 'react'
import { ProductCard } from '../../components/ProductCard'
import { CategoryCard } from '../../components/CategoryCard'
import { ChevronRightIcon, MapPinIcon, TruckIcon, SearchIcon, FilterIcon } from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { useUserApi } from '../../hooks/useUserApi'
import * as userApi from '../../services/userApi'
import { Trans } from '../../../../components/Trans'
import { TransText } from '../../../../components/TransText'
import './home-redesign.css'

// Helper function to format category names - split "Fertilizer" word for better display
const formatCategoryName = (name) => {
    if (!name) return name
    const fertilizerMatch = name.match(/(\w+)(Fertilizer)/i)
    if (fertilizerMatch && fertilizerMatch[1] && fertilizerMatch[2]) {
        return `${fertilizerMatch[1]} ${fertilizerMatch[2]}`
    }
    return name
}

export function HomeViewRedesigned({ onProductClick, onCategoryClick, onAddToCart, onSearchClick, onFilterClick, onToggleFavourite, favourites = [] }) {
    const [bannerIndex, setBannerIndex] = useState(0)
    const categoriesRef = useRef(null)
    const bannerRef = useRef(null)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [isUserInteracting, setIsUserInteracting] = useState(false)
    const autoSlideTimeoutRef = useRef(null)
    const touchStartXRef = useRef(null)
    const touchEndXRef = useRef(null)

    // Real data from API
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [popularProducts, setPopularProducts] = useState([])
    const [categoryProducts, setCategoryProducts] = useState([])
    const [carousels, setCarousels] = useState([])
    const [specialOffers, setSpecialOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const { fetchCategories, fetchProducts } = useUserApi()

    // Fetch categories and products on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Fetch categories
                const categoriesResult = await fetchCategories()
                if (categoriesResult.data?.categories) {
                    const cats = categoriesResult.data.categories
                    setCategories(cats)
                    if (cats.length > 0) {
                        setSelectedCategory(cats[0].id)
                    }
                }

                // Fetch popular products - limit to 4 for home screen
                const popularResult = await userApi.getPopularProducts({ limit: 4 })
                if (popularResult.success && popularResult.data?.products) {
                    setPopularProducts(popularResult.data.products)
                }

                // Fetch all products (or products by selected category)
                const productsResult = await fetchProducts({ limit: 20 })
                if (productsResult.data?.products) {
                    setProducts(productsResult.data.products)
                }

                // Fetch products from multiple categories and randomly select 4 products
                const cats = categoriesResult.data?.categories || []
                if (cats.length > 0) {
                    const shuffledCategories = [...cats].sort(() => Math.random() - 0.5)
                    const selectedCategories = shuffledCategories.slice(0, Math.min(4, cats.length))

                    const allCategoryProducts = []
                    await Promise.all(
                        selectedCategories.map(async (category) => {
                            try {
                                const catProductsResult = await fetchProducts({ category: category.id, limit: 10 })
                                if (catProductsResult.data?.products && catProductsResult.data.products.length > 0) {
                                    const productsWithCategory = catProductsResult.data.products.map(p => ({
                                        ...p,
                                        categoryName: category.name,
                                        categoryId: category.id
                                    }))
                                    allCategoryProducts.push(...productsWithCategory)
                                }
                            } catch (error) {
                                console.error(`Error loading products for category ${category.id}:`, error)
                            }
                        })
                    )

                    const shuffledProducts = allCategoryProducts.sort(() => Math.random() - 0.5)
                    const selectedProducts = shuffledProducts.slice(0, 4)
                    setCategoryProducts(selectedProducts)
                }

                // Fetch offers (carousels and special offers)
                const offersResult = await userApi.getOffers()
                if (offersResult.success && offersResult.data) {
                    const activeCarousels = (offersResult.data.carousels || [])
                        .filter(c => c.isActive !== false)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                    setCarousels(activeCarousels)
                    setSpecialOffers(offersResult.data.specialOffers || [])
                }
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Fetch products when category changes
    useEffect(() => {
        if (selectedCategory) {
            const loadProducts = async () => {
                try {
                    const result = await fetchProducts({ category: selectedCategory, limit: 20 })
                    if (result.data?.products) {
                        setProducts(result.data.products)
                    }
                } catch (error) {
                    console.error('Error loading products:', error)
                }
            }
            loadProducts()
        }
    }, [selectedCategory, fetchProducts])

    const banners = carousels.length > 0
        ? carousels.map(carousel => ({
            id: carousel.id || carousel._id,
            title: carousel.title || '',
            subtitle: carousel.description || '',
            image: carousel.image || '',
            productIds: carousel.productIds || [],
        }))
        : []

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId)
        onCategoryClick?.(categoryId)
    }

    return (
        <div className="user-home-view">
            {/* Main Banner - Only show if carousels exist */}
            {banners.length > 0 && (
                <section id="home-banner" className="home-banner-section">
                    <div className="home-banner">
                        <div
                            className="home-banner__slide home-banner__slide--active"
                            style={{ backgroundImage: `url(${banners[0]?.image})` }}
                            onClick={() => {
                                if (banners[0]?.productIds && banners[0].productIds.length > 0) {
                                    onProductClick(`carousel:${banners[0].id}`)
                                }
                            }}
                        />
                    </div>
                </section>
            )}

            {/* Try New Section */}
            <section id="home-try-new" className="home-try-new-section">
                <div className="home-try-new-header">
                    <h3 className="home-try-new-title"><Trans>Try New</Trans></h3>
                    <p className="home-try-new-subtitle"><Trans>Try these top picks that you haven't purchased yet!</Trans></p>
                </div>
                <div className="home-try-new-grid">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>Loading products...</Trans></p>
                        </div>
                    ) : popularProducts.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        popularProducts.slice(0, 2).map((product) => (
                            <ProductCard
                                key={product._id || product.id}
                                product={{
                                    id: product._id || product.id,
                                    name: product.name,
                                    price: product.priceToUser || product.price || 0,
                                    image: product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300',
                                    category: product.category,
                                    stock: product.stock,
                                    description: product.description,
                                    shortDescription: product.shortDescription || product.description,
                                    isWishlisted: favourites.includes(product._id || product.id),
                                    rating: product.rating ?? product.averageRating,
                                    reviews: product.reviews ?? product.reviewCount,
                                    reviewCount: product.reviewCount ?? product.reviews,
                                    showNewBadge: true,
                                    showRatingBadge: true,
                                }}
                                onNavigate={onProductClick}
                                onAddToCart={onAddToCart}
                                onWishlist={onToggleFavourite}
                                className="product-card-wrapper"
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Available Products Section */}
            <section id="home-available-products" className="home-available-products-section">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Available Products</Trans></h3>
                </div>
                <div className="home-products-grid">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>Loading products...</Trans></p>
                        </div>
                    ) : popularProducts.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        popularProducts.slice(0, 4).map((product) => (
                            <ProductCard
                                key={product._id || product.id}
                                product={{
                                    id: product._id || product.id,
                                    name: product.name,
                                    price: product.priceToUser || product.price || 0,
                                    image: product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300',
                                    category: product.category,
                                    stock: product.stock,
                                    description: product.description,
                                    shortDescription: product.shortDescription || product.description,
                                    isWishlisted: favourites.includes(product._id || product.id),
                                    rating: product.rating ?? product.averageRating,
                                    reviews: product.reviews ?? product.reviewCount,
                                    reviewCount: product.reviewCount ?? product.reviews,
                                    showNewBadge: true,
                                    showRatingBadge: true,
                                }}
                                onNavigate={onProductClick}
                                onAddToCart={onAddToCart}
                                onWishlist={onToggleFavourite}
                                className="product-card-wrapper"
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Payment Overdue Banner */}
            <section id="home-payment-banner" className="home-payment-banner">
                <div className="home-payment-banner__content">
                    <span className="home-payment-banner__icon">₹</span>
                    <span className="home-payment-banner__text"><Trans>Payment of ₹0 is overdue</Trans></span>
                </div>
                <button className="home-payment-banner__button">
                    <Trans>Pay now</Trans>
                </button>
            </section>

            {/* Top Premium Products Section */}
            <section id="home-premium-products" className="home-premium-products-section">
                <div className="home-premium-header">
                    <h3 className="home-premium-title"><Trans>आपकी फसल के लिए</Trans></h3>
                    <h2 className="home-premium-subtitle"><Trans>टॉप प्रीमियम प्रोडक्ट्स</Trans></h2>
                </div>
                <div className="home-premium-grid">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-white"><Trans>Loading products...</Trans></p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-white"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        products.slice(0, 4).map((product) => (
                            <div
                                key={product._id || product.id}
                                className="home-premium-card"
                                onClick={() => onProductClick(product._id || product.id)}
                            >
                                <div className="home-premium-card__image">
                                    <img
                                        src={product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300'}
                                        alt={product.name}
                                        className="home-premium-card__img"
                                    />
                                </div>
                                <p className="home-premium-card__name"><TransText>{product.name}</TransText></p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Second Banner */}
            {banners.length > 1 && (
                <section id="home-banner-2" className="home-banner-section">
                    <div className="home-banner">
                        <div
                            className="home-banner__slide home-banner__slide--active"
                            style={{ backgroundImage: `url(${banners[1]?.image || banners[0]?.image})` }}
                        />
                    </div>
                </section>
            )}

            {/* Recently Viewed Section */}
            <section id="home-recently-viewed" className="home-recently-viewed-section">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Recently Viewed</Trans></h3>
                </div>
                <div className="home-recently-viewed-rail">
                    {categoryProducts.length > 0 ? (
                        categoryProducts.slice(0, 3).map((product) => (
                            <div
                                key={product._id || product.id}
                                className="home-recently-card"
                                onClick={() => onProductClick(product._id || product.id)}
                            >
                                <div className="home-recently-card__image">
                                    <img
                                        src={product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300'}
                                        alt={product.name}
                                        className="home-recently-card__img"
                                    />
                                </div>
                                <div className="home-recently-card__content">
                                    <h4 className="home-recently-card__name"><TransText>{product.name}</TransText></h4>
                                    <p className="home-recently-card__price">₹{product.priceToUser || product.price || 0}</p>
                                    <span className="home-recently-card__benefit"><Trans>Check CD benefit</Trans></span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 p-4"><Trans>No recently viewed products</Trans></p>
                    )}
                </div>
                <button className="home-recently-view-all" onClick={() => onProductClick('all')}>
                    <Trans>VIEW ALL</Trans> →
                </button>
            </section>

            {/* Third Banner */}
            {banners.length > 0 && (
                <section id="home-banner-3" className="home-banner-section">
                    <div className="home-banner">
                        <div
                            className="home-banner__slide home-banner__slide--active"
                            style={{ backgroundImage: `url(${banners[0]?.image})` }}
                        />
                    </div>
                </section>
            )}

            {/* Shop By Category Section */}
            <section id="home-shop-category" className="home-shop-category-section">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Shop By Category</Trans></h3>
                </div>
                <div className="home-shop-category-grid">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>Loading categories...</Trans></p>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No categories available</Trans></p>
                        </div>
                    ) : (
                        categories.slice(0, 4).map((category) => (
                            <div
                                key={category._id || category.id}
                                className="home-shop-category-card"
                                onClick={() => handleCategoryClick(category.id || category._id)}
                            >
                                <div className="home-shop-category-card__image">
                                    {category.image ? (
                                        <img
                                            src={category.image}
                                            alt={category.name}
                                            className="home-shop-category-card__img"
                                        />
                                    ) : (
                                        <span className="home-shop-category-card__emoji">{category.icon || category.emoji || '🌾'}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
}

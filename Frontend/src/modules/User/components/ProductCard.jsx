import { cn } from '../../../lib/cn'
import { StarIcon, HeartIcon } from './icons'
import { getPrimaryImageUrl } from '../utils/productImages'
import { TransText } from '../../../components/TransText'
import { Trans } from '../../../components/Trans'

export function ProductCard({ product, onAddToCart, onWishlist, onNavigate, className }) {
  const inStock = product.stock > 0
  const stockStatus = product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'
  const productImage = getPrimaryImageUrl(product)
  
  // Translate stock status
  const stockStatusText = stockStatus === 'In Stock' ? 'In Stock' : stockStatus === 'Low Stock' ? 'Low Stock' : 'Out of Stock'

  return (
    <div
      className={cn(
        'product-card-wrapper',
        !inStock && 'product-card-wrapper--out-of-stock',
        className
      )}
      onClick={() => onNavigate?.(product.id)}
    >
      <div className="product-card-wrapper__image">
        <img src={productImage} alt={product.name} className="product-card-wrapper__image-img" />
        <button
          type="button"
          className="product-card-wrapper__wishlist-btn"
          onClick={(e) => {
            e.stopPropagation()
            onWishlist?.(product.id)
          }}
          aria-label="Add to wishlist"
        >
          <HeartIcon className="h-4 w-4" filled={product.isWishlisted} />
        </button>
      </div>
      <div className="product-card-wrapper__content">
        <div className="product-card-wrapper__header">
          <h3 className="product-card-wrapper__title"><TransText>{product.name}</TransText></h3>
          {(product.shortDescription || product.description) && (
            <p className="product-card-wrapper__description">
              <TransText>{product.shortDescription || product.description}</TransText>
            </p>
          )}
          {product.vendor && (
            <p className="product-card-wrapper__vendor"><TransText>{product.vendor.name}</TransText></p>
          )}
        </div>
        <div className="product-card-wrapper__rating">
          <div className="product-card-wrapper__stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className="h-3 w-3 text-yellow-400"
                  filled={star <= Math.round(product.rating || 0)}
                />
              ))}
            </div>
          <span className="product-card-wrapper__reviews">({product.reviews || 0})</span>
          </div>
        <div className="product-card-wrapper__price-section">
          <span className="product-card-wrapper__price">₹{(product.priceToUser || product.price || 0).toLocaleString('en-IN')}</span>
            {product.originalPrice && product.originalPrice > (product.priceToUser || product.price || 0) && (
            <span className="product-card-wrapper__original-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
        <div className="product-card-wrapper__stock">
            <span className={cn(
            'product-card-wrapper__stock-badge',
            inStock ? 'product-card-wrapper__stock-badge--in-stock' : 'product-card-wrapper__stock-badge--out-of-stock'
            )}>
              <TransText>{stockStatus}</TransText>
            </span>
            {inStock && product.stock <= 10 && (
            <span className="product-card-wrapper__stock-warning"><Trans>Only</Trans> {product.stock} <Trans>left!</Trans></span>
            )}
        </div>
        <button
          type="button"
          className={cn(
            'product-card-wrapper__add-btn',
            !inStock && 'product-card-wrapper__add-btn--disabled'
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (inStock) {
              onAddToCart?.(product.id)
            }
          }}
          disabled={!inStock}
        >
          {inStock ? <Trans>Add to Cart</Trans> : <Trans>Out of Stock</Trans>}
        </button>
      </div>
    </div>
  )
}

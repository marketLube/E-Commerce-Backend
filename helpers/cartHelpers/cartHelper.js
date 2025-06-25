const Coupon = require("../../model/couponModel");

const formatCartResponse = (cart) => {
  if (!cart) return null;

  const formattedItems = cart.items.map((item) => {
    const product = item.product;
    const variant = item.variant;
    const hasVariant = !!variant;


    // Determine the main image based on whether there's a variant or not
    const mainImage = hasVariant
      ? variant.images && variant.images.length > 0
        ? variant.images[0]
        : product?.images && product?.images?.length > 0
        ? product?.images[0]
        : null
      : product?.images && product?.images?.length > 0
      ? product?.images[0]
      : null;

    // Determine all images
    const images = hasVariant
      ? variant.images && variant.images.length > 0
        ? variant.images
        : product?.images || []
      : product?.images || [];

    return {
      _id: item._id,
      quantity: item.quantity,
      price: item.price,
      offerPrice: item.offerPrice,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            description: product.description,
            mainImage,
            images,
            brand: product.brand,
            category: product.category,
            stock: product.stock,
            stockStatus: product.stockStatus,
          }
        : null,
      variant: variant
        ? {
            _id: variant._id,
            sku: variant.sku,
            price: variant.price,
            offerPrice: variant.offerPrice,
            stock: variant.stock,
            stockStatus: variant.stockStatus,
            attributes: variant.attributes,
            images: variant.images,
            stock: variant.stock,
            stockStatus: variant.stockStatus,
          }
        : null,
      itemTotal: item.quantity * (item.offerPrice || item.price),
      mainImage, // Add main image at the root level for easy access
      images, // Add all images at the root level
    };
  });

 

  return {
    _id: cart._id,
    user: cart.user,
    items: formattedItems,
    totalPrice: cart.totalPrice,
    totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};


const checkCoupon = async (cart) => {
  if (!cart.couponApplied) return cart;

  const coupon = await Coupon.findById(cart.couponApplied.couponId);

  if (!coupon || !coupon.isActive || coupon.expiryDate < new Date()) {
    cart.couponApplied = null;
    cart.couponStatus = false;
    return cart;
  }

  // Check minimum purchase requirement
  if (cart.totalPrice < coupon.minPurchase) {
    cart.couponApplied = null;
    cart.couponStatus = false;
    return cart;
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cart.totalPrice * coupon.discountAmount) / 100;
    // Apply maximum discount cap if exists
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountAmount;
  }

  // Update coupon details
  cart.couponApplied.originalAmount = cart.totalPrice;
  cart.couponApplied.discountAmount = discountAmount;
  cart.couponApplied.finalAmount = cart.totalPrice - discountAmount;
  cart.couponApplied.discountType = coupon.discountType;
  cart.couponStatus = true;
  return cart;
};

module.exports = { formatCartResponse , checkCoupon};

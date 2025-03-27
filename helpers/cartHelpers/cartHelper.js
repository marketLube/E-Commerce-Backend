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

module.exports = { formatCartResponse };

const cartModel = require("../model/cartModel");
const productModel = require("../model/productModel");
const AppError = require("../utilities/errorHandlings/appError");
const catchAsync = require("../utilities/errorHandlings/catchAsync");


// Helper function to recalculate total price
const recalcTotalPrice = (cart) => {
    cart.totalPrice = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    return cart;
};

/**
 * Add a product to the user's cart.
 * Expects in req.body:
 * - productId: The product's ObjectId.
 * - quantity: Number to add (default to 1 if not provided).
 */
const addToCart = catchAsync(async (req, res, next) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user;

    // Validate that the product exists.
    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }


    let cart = await cartModel.findOne({ user: userId });
    if (!cart) {
        cart = new cartModel({ user: userId, items: [] });
    }

    // Check if the product is already in the cart.
    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (existingItemIndex > -1) {
        // If product exists, increase the quantity.
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        // Otherwise, add the product as a new item.
        cart.items.push({
            product: productId,
            quantity,
            price: product.price
        });
    }

    // Recalculate total price
    recalcTotalPrice(cart);
    await cart.save();

    res.status(200).json({
        message: "Product added to cart successfully",
        cart
    });
});

/**
 * Remove a specific product from the cart.
 * Expects req.params.productId to indicate which product to remove.
 */
const removeFromCart = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const userId = req.user;

    let cart = await cartModel.findOne({ user: userId });
    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    // Check if product exists in the cart
    const productExists = cart.items.some(item => item.product.toString() === productId);
    if (!productExists) {
        return next(new AppError("Product not found in cart", 404));
    }

    // Filter out the product from the cart items.
    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // Recalculate total price
    recalcTotalPrice(cart);
    await cart.save();

    res.status(200).json({
        message: "Product removed from cart successfully",
        cart
    });
});


/**
 * Clear all items from the user's cart.
 */
const clearCart = catchAsync(async (req, res, next) => {
    const userId = req.user;

    let cart = await cartModel.findOne({ user: userId });
    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(200).json({
        message: "Cart cleared successfully",
        cart
    });
});


const getCart = catchAsync(async (req, res, next) => {
    const userId = req.user;

    // Find the user's cart and optionally populate product details in each cart item.
    const cart = await cartModel.findOne({ user: userId }).populate('items.product');

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    // Optionally calculate total quantity using the instance method defined on the cart schema.
    const totalQuantity = cart.calculateTotalQuantity();

    res.status(200).json({
        message: "Cart retrieved successfully",
        cart,
        totalQuantity
    });
});


module.exports = {
    addToCart, clearCart, removeFromCart, getCart
}

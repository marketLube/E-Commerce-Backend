const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Quantity cannot be less than 1']
    },
    originalPrice: {
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true
    }
}, { _id: false });

// Cart schema
const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    }
}, { timestamps: true });


cartSchema.methods.calculateTotalQuantity = function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
};

module.exports = mongoose.model('Cart', cartSchema);

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                 quantity: {
                    type: Number,
                    required: true
                }
            },
        ],
        // address: {
        //     street: { type: String, required: true },
        //     city: { type: String, required: true },
        //     state: { type: String, required: true },
        //     zipCode: { type: String, required: true },
        //     country: { type: String, required: true },
        // },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
            index: true, 
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        // paymentDetails: {
        //     method: { type: String, enum: ['credit_card', 'paypal', 'cod', 'upi'], required: true },
        //     transactionId: { type: String },
        //     status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
        // },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);

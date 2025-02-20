const mongoose = require('mongoose');
const productModel = require('./productModel');
const { Schema } = mongoose;


const offerSchema = new Schema({
    title: {
        type: String,
        required: [true, "Offer title is required"],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    startDate: {
        type: Date,
        required: [true, "Offer start date is required"]
    },
    endDate: {
        type: Date,
        required: [true, "Offer end date is required"]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false })

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    offer: offerSchema

}, { timestamps: true });



categorySchema.pre('save', async function (next) {
    if (this.isModified('offer')) {
        const categoryId = this._id;
        const offer = this.offer;

        if (offer && offer.isActive) {
            await productModel.updateMany(
                { category: categoryId },
                [
                    { $set: { offerPrice: { $multiply: ["$originalPrice", (1 - offer.discountPercentage / 100)] } } }
                ]
            );
        } else {
            await productModel.updateMany(
                { category: categoryId },
                [
                    {
                        $set: {
                            offerPrice: { $toDouble: "$originalPrice" } // Convert originalPrice to a number
                        }
                    }
                ]
            );
        }
    }
    next();
});

module.exports = mongoose.model('Category', categorySchema);

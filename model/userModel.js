const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const options = { discriminatorKey: 'role', timestamps: true };

// Base user schema
const userSchema = new Schema({
    username: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        // unique: true,  
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address.']
    },
    phonenumber: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                // This regex checks for a phone number that can optionally start with a '+'
                // followed by 7 to 15 digits. Adjust as necessary.
                return /^\+?[0-9]{7,15}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    password: { type: String, required: true },
}, options);


userSchema.index({ email: 1, phonenumber: 1, role: 1 }, { unique: true });

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});



userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};


const User = mongoose.model('User', userSchema);

// Normal User 
const NormalUser = User.discriminator('user', new Schema({}));

// Admin User
const Admin = User.discriminator('admin', new Schema({}));

// Seller
const Seller = User.discriminator('seller', new Schema({}));

module.exports = { User, NormalUser, Admin, Seller };

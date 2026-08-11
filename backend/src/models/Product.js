const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  image: { type: String, default: 'https://placehold.co/600x400?text=Product' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  featured: { type: Boolean, default: false },
  discountPercent: { type: Number, min: 0, max: 90, default: 0 },
  variants: [{
    name: { type: String, required: true },
    value: { type: String, required: true },
    stock: { type: Number, min: 0, default: 0 },
  }],
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

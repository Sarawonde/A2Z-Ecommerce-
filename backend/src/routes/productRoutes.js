const express = require('express');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const salePrice = (product) => Math.round(product.price * (1 - (product.discountPercent || 0) / 100) * 100) / 100;

router.get('/', async (req, res, next) => {
  try {
    const filter = { approvalStatus: 'approved' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { description: { $regex: req.query.search, $options: 'i' } }];
    const products = await Product.find(filter).populate('seller', 'name').sort({ createdAt: -1 });
    res.json({ products: products.map((product) => ({ ...product.toObject(), salePrice: salePrice(product) })) });
  } catch (error) { next(error); }
});

router.get('/mine', protect, allowRoles('seller', 'admin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { seller: req.user.id };
    res.json({ products: await Product.find(filter).sort({ createdAt: -1 }) });
  } catch (error) { next(error); }
});

router.get('/:id/related', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ products: await Product.find({ _id: { $ne: product._id }, category: product.category, approvalStatus: 'approved' }).limit(4) });
  } catch (error) { next(error); }
});

router.get('/:id/reviews', async (req, res, next) => {
  try { res.json({ reviews: await Review.find({ product: req.params.id }).populate('user', 'name').sort({ createdAt: -1 }) }); } catch (error) { next(error); }
});

router.post('/:id/reviews', protect, async (req, res, next) => {
  try {
    const review = await Review.findOneAndUpdate({ product: req.params.id, user: req.user.id }, { rating: req.body.rating, comment: req.body.comment }, { new: true, upsert: true, runValidators: true });
    const stats = await Review.aggregate([{ $match: { product: review.product } }, { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    await Product.findByIdAndUpdate(req.params.id, { averageRating: stats[0].average, reviewCount: stats[0].count });
    res.status(201).json({ review });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, approvalStatus: 'approved' }).populate('seller', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: { ...product.toObject(), salePrice: salePrice(product) } });
  } catch (error) { next(error); }
});

router.post('/', protect, allowRoles('seller', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, seller: req.user.id, approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending' });
    res.status(201).json({ product });
  } catch (error) { next(error); }
});

router.put('/:id', protect, allowRoles('seller', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.user.role !== 'admin' && product.seller.toString() !== req.user.id) return res.status(403).json({ message: 'Not your product' });
    const protectedFields = ['seller', 'approvalStatus', 'averageRating', 'reviewCount'];
    protectedFields.forEach((field) => delete req.body[field]);
    Object.assign(product, req.body);
    if (req.user.role !== 'admin') product.approvalStatus = 'pending';
    await product.save();
    res.json({ product });
  } catch (error) { next(error); }
});

router.delete('/:id', protect, allowRoles('seller', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.user.role !== 'admin' && product.seller.toString() !== req.user.id) return res.status(403).json({ message: 'Not your product' });
    await Promise.all([product.deleteOne(), Review.deleteMany({ product: product._id })]);
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;

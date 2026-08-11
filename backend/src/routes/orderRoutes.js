const express = require('express');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart?.items.length) return res.status(400).json({ message: 'Your cart is empty' });
    for (const item of cart.items) if (!item.product || item.quantity > item.product.stock) return res.status(400).json({ message: `${item.product?.name || 'A product'} is unavailable` });
    const items = cart.items.map(({ product, quantity, variant }) => ({ product: product._id, name: product.name, price: Math.round(product.price * (1 - (product.discountPercent || 0) / 100) * 100) / 100, quantity, variant }));
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = subtotal >= 1500 ? 0 : 100;
    const order = await Order.create({ user: req.user.id, items, shippingAddress: req.body.shippingAddress, paymentMethod: req.body.paymentMethod, subtotal, shippingFee, total: subtotal + shippingFee });
    await Promise.all(items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } })));
    cart.items = [];
    await cart.save();
    res.status(201).json({ order });
  } catch (error) { next(error); }
});

router.get('/mine', async (req, res, next) => {
  try { res.json({ orders: await Order.find({ user: req.user.id }).sort({ createdAt: -1 }) }); } catch (error) { next(error); }
});

router.get('/', allowRoles('admin'), async (req, res, next) => {
  try { res.json({ orders: await Order.find().populate('user', 'name email').sort({ createdAt: -1 }) }); } catch (error) { next(error); }
});

router.patch('/:id/status', allowRoles('admin'), async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (error) { next(error); }
});

module.exports = router;

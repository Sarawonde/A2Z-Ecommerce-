const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/seller', protect, allowRoles('seller', 'admin'), async (req, res, next) => {
  try {
    const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });
    const ids = products.map((product) => product._id);
    const orders = await Order.find({ 'items.product': { $in: ids } }).populate('user', 'name email').sort({ createdAt: -1 });
    const sellerOrders = orders.map((order) => {
      const items = order.items.filter((item) => ids.some((id) => id.equals(item.product)));
      return { ...order.toObject(), items, sellerTotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
    });
    const salesTotal = sellerOrders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.sellerTotal, 0);
    res.json({ products, orders: sellerOrders, stats: { products: products.length, pendingApproval: products.filter((p) => p.approvalStatus === 'pending').length, lowStock: products.filter((p) => p.stock <= 5).length, orders: sellerOrders.length, salesTotal } });
  } catch (error) { next(error); }
});

router.get('/admin', protect, allowRoles('admin'), async (req, res, next) => {
  try {
    const [users, products, orders] = await Promise.all([User.find().select('-password').sort({ createdAt: -1 }), Product.find().populate('seller', 'name email').sort({ createdAt: -1 }), Order.find().populate('user', 'name email').sort({ createdAt: -1 })]);
    const validOrders = orders.filter((order) => order.status !== 'cancelled');
    res.json({ users, products, orders, stats: { users: users.length, sellers: users.filter((u) => u.role === 'seller').length, products: products.length, pendingProducts: products.filter((p) => p.approvalStatus === 'pending').length, lowStock: products.filter((p) => p.stock <= 5).length, orders: orders.length, salesTotal: validOrders.reduce((sum, order) => sum + order.total, 0) } });
  } catch (error) { next(error); }
});

router.patch('/admin/users/:id', protect, allowRoles('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id && req.body.suspended) return res.status(400).json({ message: 'You cannot suspend your own account' });
    const update = {};
    if (typeof req.body.suspended === 'boolean') update.suspended = req.body.suspended;
    if (['customer', 'seller', 'admin'].includes(req.body.role)) update.role = req.body.role;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
});

router.patch('/admin/products/:id/approval', protect, allowRoles('admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approvalStatus: req.body.approvalStatus, rejectionReason: req.body.rejectionReason || '' }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) { next(error); }
});

module.exports = router;

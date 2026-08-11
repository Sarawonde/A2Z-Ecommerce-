const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
const populated = (user) => Cart.findOne({ user }).populate('items.product');

router.get('/', async (req, res, next) => {
  try { res.json({ cart: (await populated(req.user.id)) || { items: [] } }); } catch (error) { next(error); }
});

router.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant = '' } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (quantity < 1 || quantity > product.stock) return res.status(400).json({ message: 'Requested quantity is unavailable' });
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });
    if (product.variants.length && !product.variants.some((item) => `${item.name}: ${item.value}` === variant)) return res.status(400).json({ message: 'Please select a valid product variant' });
    const item = cart.items.find((entry) => entry.product.toString() === productId && entry.variant === variant);
    if (item) item.quantity = Math.min(item.quantity + quantity, product.stock);
    else cart.items.push({ product: productId, quantity, variant });
    await cart.save();
    res.status(201).json({ cart: await populated(req.user.id) });
  } catch (error) { next(error); }
});

router.put('/items/:itemId', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Cart item not found' });
    const quantity = Number(req.body.quantity);
    const product = await Product.findById(item.product);
    if (!Number.isInteger(quantity)) return res.status(400).json({ message: 'Quantity must be a whole number' });
    if (quantity > product.stock) return res.status(400).json({ message: 'Requested quantity is unavailable' });
    if (quantity < 1) cart.items.pull(item._id); else item.quantity = quantity;
    await cart.save();
    res.json({ cart: await populated(req.user.id) });
  } catch (error) { next(error); }
});

router.delete('/items/:itemId', async (req, res, next) => {
  try {
    await Cart.updateOne({ user: req.user.id }, { $pull: { items: { _id: req.params.itemId } } });
    res.json({ cart: (await populated(req.user.id)) || { items: [] } });
  } catch (error) { next(error); }
});

module.exports = router;

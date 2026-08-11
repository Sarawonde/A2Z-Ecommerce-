const express = require('express');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', async (req, res, next) => {
  try { res.json({ wishlist: (await Wishlist.findOne({ user: req.user.id }).populate('products')) || { products: [] } }); } catch (error) { next(error); }
});
router.post('/:productId', async (req, res, next) => {
  try {
    if (!(await Product.exists({ _id: req.params.productId, approvalStatus: 'approved' }))) return res.status(404).json({ message: 'Product not found' });
    const wishlist = await Wishlist.findOneAndUpdate({ user: req.user.id }, { $addToSet: { products: req.params.productId } }, { upsert: true, new: true }).populate('products');
    res.status(201).json({ wishlist });
  } catch (error) { next(error); }
});
router.delete('/:productId', async (req, res, next) => {
  try { res.json({ wishlist: await Wishlist.findOneAndUpdate({ user: req.user.id }, { $pull: { products: req.params.productId } }, { new: true }).populate('products') }); } catch (error) { next(error); }
});
module.exports = router;

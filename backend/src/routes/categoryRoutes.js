const express = require('express');
const Category = require('../models/Category');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/all', protect, allowRoles('admin'), async (req, res, next) => {
  try { res.json({ categories: await Category.find().sort({ name: 1 }) }); } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try { res.json({ categories: await Category.find({ active: true }).sort({ name: 1 }) }); } catch (error) { next(error); }
});
router.post('/', protect, allowRoles('admin'), async (req, res, next) => {
  try { res.status(201).json({ category: await Category.create(req.body) }); } catch (error) { next(error); }
});
router.put('/:id', protect, allowRoles('admin'), async (req, res, next) => {
  try { res.json({ category: await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }) }); } catch (error) { next(error); }
});
router.delete('/:id', protect, allowRoles('admin'), async (req, res, next) => {
  try { res.json({ category: await Category.findByIdAndUpdate(req.params.id, { active: false }, { new: true }) }); } catch (error) { next(error); }
});
module.exports = router;

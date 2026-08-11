const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });

router.post('/', protect, allowRoles('seller', 'admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A JPG, PNG, or WebP image is required' });
  res.status(201).json({ imageUrl: `/api/uploads/${req.file.filename}` });
});

module.exports = router;

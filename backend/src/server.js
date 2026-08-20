require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const path = require('path');

const app = express(); // ✅ Define app BEFORE using it
const PORT = process.env.PORT || 4000;

// ===== MIDDLEWARES =====
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ===== BASIC TEST ROUTES =====
app.get('/', (req, res) => {
  res.send('Backend is working!');
});

// ===== MAIN ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')), uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((item) => item.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier' });
  res.status(500).json({ message: 'Unexpected server error' });
});

// ===== START SERVER =====
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to DB:', err);
});

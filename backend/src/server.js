require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

const PORT = process.env.PORT || 4000;

// =====================================================
// CORS CONFIGURATION
// =====================================================

// Permanent origins plus any comma-separated deployment URLs configured on Railway.
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://a2-z-ecommerce-zaup.vercel.app',
  'https://a2-z-ecommerce-vma1.vercel.app',
  ...configuredOrigins,
]);

// Allow this project's Vercel preview deployments.
// Example:
// https://a2-z-ecommerce-vma1-m1wgyihlg-sarawondes-projects.vercel.app
const vercelPreviewPattern =
  /^https:\/\/a2-z-ecommerce-[a-zA-Z0-9-]+-sarawondes-projects\.vercel\.app$/;

app.use(
  cors({
    origin: function (origin, callback) {
      // Requests such as curl/Postman/server-to-server may have no Origin.
      if (!origin) {
        return callback(null, true);
      }

      // Allow known production/local domains
      if (allowedOrigins.has(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }

      // Allow this project's Vercel preview deployments
      if (vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }

      console.log('Blocked by CORS:', origin);

      return callback(new Error('Not allowed by CORS'));
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());
app.use(cookieParser());

// =====================================================
// BASIC TEST ROUTE
// =====================================================

app.get('/', (req, res) => {
  res.send('Backend is working!');
});

// =====================================================
// API ROUTES
// =====================================================

app.use('/api/auth', authRoutes);

app.use('/api/cart', cartRoutes);

app.use('/api/products', productRoutes);

app.use('/api/orders', orderRoutes);

app.use(
  '/api/uploads',
  express.static(path.join(__dirname, '../uploads')),
  uploadRoutes
);

app.use('/api/wishlist', wishlistRoutes);

app.use('/api/categories', categoryRoutes);

app.use('/api/dashboard', dashboardRoutes);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((item) => item.message)
        .join(', '),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid identifier',
    });
  }

  res.status(500).json({
    message: 'Unexpected server error',
  });
});

// =====================================================
// START SERVER
// =====================================================
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to DB:', err);
    process.exit(1);
  });

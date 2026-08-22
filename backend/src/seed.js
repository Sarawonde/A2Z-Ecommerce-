require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');

const products = [
  {
    name: 'Organic Bananas',
    description: 'Fresh locally sourced bananas.',
    price: 120,
    category: 'Fruits & Vegetables',
    stock: 40,
    featured: true,
    image: '/products/organic-bananas.png',
  },
  {
    name: 'Red Apples',
    description: 'Crisp, sweet apples sold by the kilogram.',
    price: 240,
    category: 'Fruits & Vegetables',
    stock: 30,
    featured: true,
    image: '/products/red-apples.png',
  },
  {
    name: 'Fresh Tomatoes',
    description: 'Ripe tomatoes from Ethiopian farms.',
    price: 95,
    category: 'Fruits & Vegetables',
    stock: 55,
    featured: false,
    image: '/products/fresh-tomatoes.png',
  },
  {
    name: 'Roasted Coffee',
    description: 'Premium Ethiopian arabica coffee, 500g.',
    price: 480,
    category: 'Beverages',
    stock: 25,
    featured: true,
    image: '/products/roasted-coffee.png',
  },
  {
    name: 'Mango Juice',
    description: 'One litre of natural mango juice.',
    price: 180,
    category: 'Beverages',
    stock: 35,
    featured: false,
    image: '/products/mango-juice.png',
  },
  {
    name: 'Mineral Water',
    description: 'Pack of six 1-litre bottles.',
    price: 150,
    category: 'Beverages',
    stock: 60,
    featured: false,
    image: '/products/mineral-water.png',
  },
  {
    name: 'Whole Grain Bread',
    description: 'Freshly baked whole-grain loaf.',
    price: 85,
    category: 'Bakery',
    stock: 20,
    featured: true,
    image: '/products/whole-grain-bread.png',
  },
  {
    name: 'Natural Honey',
    description: 'Pure Ethiopian highland honey, 500g.',
    price: 390,
    category: 'Pantry',
    stock: 18,
    featured: true,
    image: '/products/natural-honey.png',
  },
];

const categories = [
  'Fruits & Vegetables',
  'Beverages',
  'Bakery',
  'Pantry',
];

const run = async () => {
  try {
    // Connect to Railway MongoDB
    await connectDB();

    console.log('MongoDB connected');

    // ----------------------------------
    // CREATE / FIND SELLER
    // ----------------------------------

    let seller = await User.findOne({
      email: 'seller@atoz.test',
    });

    if (!seller) {
      seller = await User.create({
        name: 'A-to-Z Seller',
        email: 'seller@atoz.test',
        password: 'Seller123!',
        role: 'seller',
      });

      console.log('Seller account created');
    } else {
      console.log('Seller account already exists');
    }

    // ----------------------------------
    // CREATE / UPDATE ADMIN
    // ----------------------------------

    let admin = await User.findOne({
      email: 'saron@gmail.com',
    });

    if (!admin) {
      admin = await User.create({
        name: 'Saron',
        email: 'saron@gmail.com',
        password: 'saron1234',
        role: 'admin',
      });

      console.log('Admin account created');
    } else {
      admin.name = 'Saron';
      admin.role = 'admin';

      await admin.save();

      console.log('Admin account already exists');
    }

    // ----------------------------------
    // CREATE / UPDATE CATEGORIES
    // ----------------------------------

    for (const categoryName of categories) {
      await Category.findOneAndUpdate(
        { name: categoryName },
        {
          $set: {
            name: categoryName,
            active: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log('Categories seeded');

    // ----------------------------------
    // CREATE / UPDATE PRODUCTS
    // ----------------------------------
    for (const product of products) {
      await Product.findOneAndUpdate(
        {
          name: product.name,
        },
        {
          $set: {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
            featured: product.featured,
            image: product.image,

            // Important:
            // public product API only shows
            // approved products.
            approvalStatus: 'approved',

            rejectionReason: '',
            seller: seller._id,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(Seeded product: ${product.name});
    }

    // ----------------------------------
    // VERIFY
    // ----------------------------------

    const productCount = await Product.countDocuments({
      approvalStatus: 'approved',
    });

    const categoryCount = await Category.countDocuments({
      active: true,
    });

    console.log('');
    console.log('==============================');
    console.log('Seed complete');
    console.log(Approved products: ${productCount});
    console.log(Active categories: ${categoryCount});
    console.log('==============================');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Seed error:', error);

    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // Ignore connection close error
    }

    process.exit(1);
  }
};

run();
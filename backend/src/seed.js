require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');

const products = [
  ['Organic Bananas', 'Fresh locally sourced bananas.', 120, 'Fruits & Vegetables', 40, true],
  ['Red Apples', 'Crisp, sweet apples sold by the kilogram.', 240, 'Fruits & Vegetables', 30, true],
  ['Fresh Tomatoes', 'Ripe tomatoes from Ethiopian farms.', 95, 'Fruits & Vegetables', 55, false],
  ['Roasted Coffee', 'Premium Ethiopian arabica coffee, 500g.', 480, 'Beverages', 25, true],
  ['Mango Juice', 'One litre of natural mango juice.', 180, 'Beverages', 35, false],
  ['Mineral Water', 'Pack of six 1-litre bottles.', 150, 'Beverages', 60, false],
  ['Whole Grain Bread', 'Freshly baked whole-grain loaf.', 85, 'Bakery', 20, true],
  ['Natural Honey', 'Pure Ethiopian highland honey, 500g.', 390, 'Pantry', 18, true],
];

const productImages = {
  'Organic Bananas': '/products/organic-bananas.png',
  'Red Apples': '/products/red-apples.png',
  'Fresh Tomatoes': '/products/fresh-tomatoes.png',
  'Roasted Coffee': '/products/roasted-coffee.png',
  'Mango Juice': '/products/mango-juice.png',
  'Mineral Water': '/products/mineral-water.png',
  'Whole Grain Bread': '/products/whole-grain-bread.png',
  'Natural Honey': '/products/natural-honey.png',
};

const run = async () => {
  await connectDB();
  let seller = await User.findOne({ email: 'seller@atoz.test' });
  if (!seller) seller = await User.create({ name: 'A-to-Z Seller', email: 'seller@atoz.test', password: 'Seller123!', role: 'seller' });
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) admin = new User({ role: 'admin' });
  admin.name = 'Saron';
  admin.email = 'saron@gmail.com';
  admin.password = 'saron1234';
  await admin.save();
  if (!(await Product.exists())) await Product.insertMany(products.map(([name, description, price, category, stock, featured]) => ({
    name, description, price, category, stock, featured, seller: seller._id,
    image: productImages[name],
  })));
  await Promise.all(Object.entries(productImages).map(([name, image]) => Product.updateOne({ name }, { image, approvalStatus: 'approved' })));
  await Promise.all(['Fruits & Vegetables', 'Beverages', 'Bakery', 'Pantry'].map((name) => Category.updateOne({ name }, { $setOnInsert: { name, active: true } }, { upsert: true })));
  console.log('Seed complete');
  process.exit(0);
};

run().catch((error) => { console.error(error); process.exit(1); });

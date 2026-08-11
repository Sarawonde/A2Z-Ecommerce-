const jwt = require('jsonwebtoken');
const User = require('../models/User');

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });
const signToken = (user) => jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.suspended) return res.status(403).json({ message: 'This account has been suspended' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
};

const getMe = async (req, res, next) => {
  try { res.json({ user: publicUser(await User.findById(req.user.id)) }); } catch (error) { next(error); }
};

module.exports = { registerUser, loginUser, getMe };

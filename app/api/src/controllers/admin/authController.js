const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
  }

  await User.findByIdAndUpdate(user._id, { updatedAt: new Date() });

  const token = generateToken(user._id);

  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};

const logout = async (req, res) => {
  res.json({ status: 'success', message: 'Logged out successfully' });
};

const me = async (req, res) => {
  res.json({ status: 'success', data: req.user });
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Current and new password required' });
  }

  const user = await User.findById(req.user._id);
  if (!(await user.matchPassword(current_password))) {
    return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
  }

  user.password = new_password;
  await user.save();

  res.json({ status: 'success', message: 'Password changed successfully' });
};

module.exports = { login, logout, me, changePassword };

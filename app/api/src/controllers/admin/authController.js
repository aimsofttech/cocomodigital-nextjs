const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { buildSession } = require('./profileController');

/* `kind: 'admin'` marks the token as belonging to this panel. The CRM issues
 * its own tokens with `kind: 'crm'` against a different user collection, and
 * the admin guard refuses anything that isn't an admin token, so one side's
 * session can never be replayed against the other. */
const generateToken = (id) =>
  jwt.sign({ id, kind: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
  }

  /* Deleted and deactivated accounts fail the same way a wrong password does.
   * Telling someone their account exists but is switched off is a detail worth
   * withholding at the sign-in screen. */
  if (user.deletedAt || user.status === 0) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  const token = generateToken(user._id);
  /* The panel needs the role and its permission matrix to draw the menu and
   * the action buttons, so they travel with the login response rather than
   * costing a second request before anything can render. */
  const session = await buildSession(user);

  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: session.user,
      permissions: session.permissions,
    },
  });
};

const logout = async (req, res) => {
  res.json({ status: 'success', message: 'Logged out successfully' });
};

/* Re-reads the session on page load, so a role change made by a Super Admin
 * takes effect on the next refresh rather than at the next sign-in. */
const me = async (req, res) => {
  const session = await buildSession(req.user);
  res.json({ status: 'success', data: { ...req.user.toJSON(), ...session } });
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

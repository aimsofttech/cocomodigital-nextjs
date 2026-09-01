const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  slug: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  /* Legacy field, kept as-is so nothing that reads it changes behaviour.
   * Authorization is driven by `roleKey` below; this is left in place for
   * backward compatibility and is what existing accounts were mapped from. */
  role: { type: String, enum: ['admin', 'editor'], default: 'admin' },
  email_verified_at: { type: Date, default: null },
  remember_token: { type: String, default: null },

  // ── Admin panel access control ──────────────────────────────────────────
  /** Which AdminRole this user holds. Permissions come from the role, never
   *  from the user, so changing a role changes everyone who holds it. */
  roleKey: {
    type: String,
    enum: ['super_admin', 'admin_manager', 'editor', 'custom'],
    default: 'custom',
    index: true,
  },
  /** 1 = may sign in, 0 = deactivated. Matches the 0/1 convention every other
   *  collection in this API uses for status. */
  status: { type: Number, enum: [0, 1], default: 1 },
  /** S3 URL of the avatar, uploaded through the shared media uploader. */
  profileImage: { type: String, trim: true, default: '' },
  lastLoginAt: { type: Date, default: null },
  /* Set when an account is created with a generated password, so the panel can
   * nudge the user to choose their own. Never blocks sign-in. */
  mustChangePassword: { type: Boolean, default: false },
  /* Soft delete. Records all over this database carry the creating user's id
   * (`userId` / `user_id`), so removing the row outright would orphan that
   * history — a deleted user is hidden and barred from signing in instead. */
  deletedAt: { type: Date, default: null, index: true },
  createdByUserId: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, strict: false, collection: 'users' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.remember_token;
  return obj;
};

/** Is this the one role that bypasses the permission matrix? */
userSchema.methods.isSuperAdmin = function isSuperAdmin() {
  return this.roleKey === 'super_admin';
};

module.exports = mongoose.model('User', userSchema);

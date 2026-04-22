import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import indraDb from '../config/db.js';

const indraUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  subscription: {
    plan: { type: String, enum: ['lite', 'smart', 'ultra'], default: 'lite' },
    status: { type: String, enum: ['active', 'past_due', 'canceled', 'none'], default: 'none' },
    razorpaySubscriptionId: String,
    currentPeriodEnd: Date,
  },
  
  usage: {
    tokensUsed: { type: Number, default: 0 },
    voiceMinutesUsed: { type: Number, default: 0 }
  }
}, { timestamps: true });

indraUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

indraUserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const IndraUser = indraDb.model('IndraUser', indraUserSchema);

export default IndraUser;
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    position: { type: Number }, // assigned at shuffle time (startPlan)
  },
  { _id: false }
);

const ajoPlanSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    mode: { type: String, enum: ['solo', 'group'], required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: true },
    intervalDays: { type: Number }, // only meaningful when frequency === 'custom'
    amountKobo: { type: Number, required: true },
    totalSlots: { type: Number, required: true }, // solo: always 1
    totalCycles: { type: Number, required: true }, // group: == totalSlots; solo: user-chosen
    inviteCode: { type: String, unique: true, sparse: true }, // group only
    status: { type: String, enum: ['forming', 'active', 'completed', 'cancelled'], default: 'forming' },
    members: [memberSchema],
    rotationOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // group only
    currentCycle: { type: Number, default: 0 },
    nextDueDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ajoPlanSchema.index({ creatorId: 1 });
ajoPlanSchema.index({ 'members.userId': 1 });
ajoPlanSchema.index({ status: 1, nextDueDate: 1 });

module.exports = mongoose.model('AjoPlan', ajoPlanSchema);

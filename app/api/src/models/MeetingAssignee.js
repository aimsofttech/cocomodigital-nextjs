const mongoose = require('mongoose');

// Team members the owner can assign a meeting to (shown in the admin panel's
// "Assign Meeting" picker). Kept separate from the `users` login accounts so
// the assign list can be managed without touching admin credentials.
const meetingAssigneeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true, collection: 'meeting_assignees' });

module.exports = mongoose.model('MeetingAssignee', meetingAssigneeSchema);

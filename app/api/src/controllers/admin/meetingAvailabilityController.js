const MeetingAvailability = require('../../models/MeetingAvailability');
const {
  ALL_SLOTS,
  SLOT_STEP_MINUTES,
  WEEKDAY_NAMES,
  getAvailabilityConfig,
  invalidateAvailabilityCache,
  normalizeConfig,
  parseConfigInput,
} = require('../../utils/bookingWindow');

/** The payload both endpoints return, so the panel always renders the same shape. */
const present = (config) => ({
  timezone: config.timezone,
  slotStepMinutes: config.slotStepMinutes,
  minNoticeMinutes: config.minNoticeMinutes,
  days: config.days,
  updatedAt: config.updatedAt || null,
  // Reference data for the editor — the grid it paints and the day labels —
  // so the panel doesn't hard-code either.
  allSlots: ALL_SLOTS,
  weekdayNames: WEEKDAY_NAMES,
});

// GET /admin/api/meeting-availability
// Creates the all-open default on first read (7 days, 00:00–23:45).
const show = async (req, res) => {
  const config = await getAvailabilityConfig();
  res.json({ status: 'success', data: present(config) });
};

// PUT /admin/api/meeting-availability
// Replaces the whole schedule in one write, so a save is atomic and the panel
// never has to reconcile a half-applied change.
const update = async (req, res) => {
  const current = await getAvailabilityConfig();
  const parsed = parseConfigInput(req.body, current);
  if (!parsed.ok) {
    return res.status(400).json({ status: 'error', message: parsed.message });
  }

  const doc = await MeetingAvailability.findOneAndUpdate(
    { key: 'default' },
    { $set: { ...parsed.value, updatedBy: req.user?._id || req.user?.id || null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  /* Drop the read cache immediately so the very next public availability
     request reflects the change — the TTL is only a backstop for other
     processes. */
  invalidateAvailabilityCache();

  res.json({
    status: 'success',
    message: 'Booking availability updated',
    data: present(normalizeConfig(doc)),
  });
};

module.exports = { show, update, SLOT_STEP_MINUTES };

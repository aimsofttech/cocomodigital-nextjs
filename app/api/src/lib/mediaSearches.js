/**
 * The nine ways people at Cocoma ask for media — expressed as queries
 * over the fields already on the asset, not as nine more things to tag.
 *
 * WHY THIS IS CODE AND NOT A TAXONOMY TABLE
 *
 * These nine started life as nine tag vocabularies. Designed out in full
 * they came to ~110 segments. Measured against the library they were meant
 * to organise, that was roughly two chips per publishable photograph:
 *
 *   973 rows in the vault
 *   -> 661 distinct files once byte-identical duplicates collapse
 *   -> 178 unique images actually described
 *   ->  78 of those are rights=own
 *   ->  61 are own AND usable
 *
 * At that size most segments resolve to nothing. A filter row where nine
 * of twelve options return zero is not a taxonomy, it is a reason to stop
 * using the filters — which is the failure mode we are trying to escape.
 *
 * Three concrete collisions settled it:
 *
 *   - Headcount is not identity. solo/pair/small-group/whole-team belong
 *     in a numeric range over `people`, not in a facet beside "founder".
 *   - One pixel cue fired five chips in five facets. A legible timeline
 *     on a monitor meant edit-bay AND video-editing AND edit-department
 *     AND crew-at-work. Store the cue once; derive the rest.
 *   - Department was Service relabelled. Six of eleven segments were 1:1
 *     twins firing on identical triggers.
 *
 * So: two stored classifications (`shows`, `assetType`), one inherited
 * (`job`), and these nine as queries. Adding a tenth way to ask is a
 * function here, not a migration.
 *
 * NOTE: `industry`, `genre` and `clientType` resolve through the job and
 * return nothing until job records exist. That is deliberate and visible
 * rather than quietly empty — see requiresJob below.
 */

/* The three review states, exported so the controller and the tests share
 * one list. A guard that only exists inside the schema enum is one the
 * filter tests cannot see. */
const REVIEW_STATES = ['proposed', 'approved', 'rejected'];

const SHOWS = {
  people: ['cocoma-people', 'on-camera-talent', 'stock-people', 'public-crowd'],
  rooms: ['edit-bay', 'open-floor', 'meeting-room', 'shoot-floor', 'common-areas'],
  screens: ['screen-timeline', 'screen-design', 'screen-analytics'],
  gear: ['camera-rig', 'lighting', 'mic-audio', 'headphones', 'laptop', 'tablet'],
};

const SAVED_SEARCHES = {
  people: {
    label: 'People',
    note: 'Anyone in frame. Headcount is a range over `people`, not a set of chips.',
    filter: () => ({ shows: { $in: SHOWS.people } }),
  },
  technology: {
    label: 'Technology in use',
    note: 'Tools visible in the frame.',
    filter: () => ({ shows: { $in: [...SHOWS.screens, ...SHOWS.gear] } }),
  },
  service: {
    label: 'Service it evidences',
    note: 'Photographs that prove a service we sell.',
    filter: () => ({ shows: { $in: [...SHOWS.screens, 'edit-bay', 'shoot-floor', 'mic-audio'] } }),
  },
  department: {
    label: 'Department',
    note: 'Same cues as Service, relabelled for the org chart. Identical filter '
        + 'on purpose — that duplication is exactly why it is not stored twice.',
    filter: () => SAVED_SEARCHES.service.filter(),
  },
  infrastructure: {
    label: 'Infrastructure',
    note: 'The physical plant. This is what proves the studio is real.',
    filter: () => ({ shows: { $in: SHOWS.rooms } }),
  },
  culture: {
    label: 'Cocoma culture',
    note: 'Our people, in our rooms, ours to publish, with no work on screen.',
    filter: () => ({
      shows: { $in: ['cocoma-people', 'common-areas', 'outdoors'], $nin: SHOWS.screens },
      rights: 'own',
      assetType: 'photograph',
    }),
  },

  // The three that cannot be answered from the frame.
  industry: {
    label: 'Industry',
    requiresJob: true,
    note: 'Inherited from the job. Empty until jobs exist — a photograph of an '
        + 'editor cannot tell you which vertical the work was for.',
    filter: (jobIds) => ({ job: { $in: jobIds } }),
  },
  genre: {
    label: 'Genre',
    requiresJob: true,
    note: 'Inherited from the job. Only meaningful for content work.',
    filter: (jobIds) => ({ job: { $in: jobIds } }),
  },
  clientType: {
    label: 'Client type',
    requiresJob: true,
    note: 'Inherited from the job. The KIND of client — the named client is a '
        + 'separate field, because a credentials deck needs the name and a '
        + 'capability page needs the category.',
    filter: (jobIds) => ({ job: { $in: jobIds } }),
  },
};

/**
 * What a person may do with one asset, decided on the server.
 *
 * Not `publishable()` inverted. Every row in the library is unapproved —
 * review.state predates none of them, which is why pendingReview() carries
 * an $exists arm — so a warning keyed to publishable() would fire on the
 * entire collection and be ignored within a day. This asks a narrower
 * question: is there anything about this asset that makes taking it a
 * mistake?
 *
 *   clear       nothing to say. The common case, and it earns no badge:
 *               the absence of a warning is the signal.
 *   restricted  usable internally, wrong on a public Cocoma page.
 *   blocked     do not take this out of the building.
 *
 * Lives here rather than in the browser for the same reason publishable()
 * does: a second copy of these rules in client code is a second definition
 * of safe, and it is the copy an attacker can edit.
 */
const clearance = (doc = {}) => {
  const reasons = [];
  let level = 'clear';
  const raise = (to, why) => {
    reasons.push(why);
    if (to === 'blocked' || level === 'blocked') level = 'blocked';
    else level = to;
  };

  if (doc.nda) raise('blocked', 'This job is under NDA. Nothing from it leaves the building.');
  if (doc.consent === 'refused') raise('blocked', 'Somebody in this frame refused to be photographed.');
  if (doc.consent === 'minors') raise('blocked', 'There is a minor in this frame.');
  if (doc.sensitive) raise('blocked', 'Flagged sensitive — a person has to clear this one.');

  if (doc.rights === 'client-ip') raise('restricted', "This is a client's material, not ours to publish.");
  if (doc.rights === 'stock') raise('restricted', 'Licensed stock — never on a page claiming it is our work.');
  if (doc.rights === 'unknown') raise('restricted', 'Nobody has recorded who owns this yet.');
  if (doc.consent === 'unknown') raise('restricted', 'Nobody has recorded whether the people in it agreed.');

  return { level, reasons };
};

/**
 * Everything safe to put on a public Cocoma page.
 *
 * Five conditions, and each earns its place:
 *
 *   review.state  a person looked. The machine finishing is not the same
 *                 as somebody agreeing, and this is the difference.
 *   rights        a stock mixing desk nearly went on a page arguing we
 *                 have a real sound room.
 *   sensitive     the describe pass caught a child in an office candid
 *                 that no filename rule would have.
 *   usable        fit for marketing, which is narrower than "ours".
 *   nda           the engagement was confidential, whatever the frame shows.
 *
 * NDA used to be the condition this docblock told callers to add for
 * themselves, on the grounds that it lived on MediaJob and could not be
 * expressed here. No caller ever did, and the advice was the defect: a
 * rule that has to be remembered at every call site is a rule that holds
 * until the first person who has not read this comment. The flag is now
 * copied onto the asset at ingest, so it is a plain condition like the
 * other four and this function can carry it.
 *
 * `$ne: true` and not `false`: rows written before the field existed have
 * no value at all, and an equality test would exclude the entire
 * pre-existing library rather than the confidential part of it.
 *
 * This function is the single definition. Do not hand-roll the same five
 * conditions at a call site — that is how one of them gets forgotten.
 */
const publishable = () => ({
  'review.state': 'approved',
  rights: 'own',
  sensitive: false,
  usable: true,
  nda: { $ne: true },
});

/**
 * What is waiting for a person.
 *
 * The `$exists: false` arm matters: every row that predates this field —
 * which today is all 973 of them — has no review subdocument at all, and
 * a queue that only matched 'proposed' would report an empty backlog on a
 * library where nothing has ever been approved.
 *
 * Kept beside publishable() so the two can never disagree about what
 * "not yet approved" means.
 */
const pendingReview = () => ({
  $or: [
    { 'review.state': 'proposed' },
    { 'review.state': { $exists: false } },
  ],
});

module.exports = {
  SHOWS, SAVED_SEARCHES, REVIEW_STATES, publishable, pendingReview, clearance,
};

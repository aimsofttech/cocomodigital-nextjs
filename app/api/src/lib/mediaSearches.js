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
 * Everything safe to put on a public Cocoma page.
 *
 * Four conditions, and each one has cost us something at least once:
 * rights (a stock mixing desk nearly went on a page arguing we have a real
 * sound room), sensitive, usable, and the job's NDA flag.
 */
const publishable = () => ({
  rights: 'own',
  sensitive: false,
  usable: true,
});

module.exports = { SHOWS, SAVED_SEARCHES, publishable };

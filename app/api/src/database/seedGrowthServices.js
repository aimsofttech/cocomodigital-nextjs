require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const GrowthService = require('../models/GrowthService');
const GrowthServiceSection = require('../models/GrowthServiceSection');
const GrowthServiceFeature = require('../models/GrowthServiceFeature');
const GrowthServiceStat = require('../models/GrowthServiceStat');
const GrowthServiceShowcase = require('../models/GrowthServiceShowcase');
const GrowthServiceCaseMetric = require('../models/GrowthServiceCaseMetric');
const GrowthServiceFaq = require('../models/GrowthServiceFaq');
const GrowthServiceCta = require('../models/GrowthServiceCta');
const GrowthServiceContent = require('../models/GrowthServiceContent');

/* Seed the three growth landing pages with the exact copy the hard-coded
 * views shipped, so switching the web app over to the API is a pure
 * data-source change with no visible difference on the page.
 *
 * Idempotent: the parent is upserted by slug and every child row for that
 * service is replaced, so re-running resets the pages to these defaults.
 * Run with `npm run seed:growth -w @cocoma/api`.
 */

// ── End-to-End YouTube Growth Services ──────────────────────────────────────

const YOUTUBE = {
  service: {
    slug: 'end-to-end-youtube-growth-services',
    name: 'End-to-End YouTube Growth Services',
    pageUrl: 'https://cocomadigital.com/services/end-to-end-youtube-growth-services',
    heroBadgeIcon: 'FaYoutube',
    heroBadgeLabel: 'Grow Views, Leads, and Your Brand',
    heroHeadline: ['End-to-End', '*YouTube Growth*', 'Services'].join('\n'),
    heroParagraphs: [
      'From strategy to results, we handle it all. From SEO to content, we grow your channel and audience — so you can focus on creating.',
      'A full-service growth partner built to deliver real impact on YouTube: views, subscribers, engagement, and business.',
    ].join('\n'),
    heroTrustInitials: 'NV, SG, RB, KT',
    heroTrustLabel: 'Trusted by 500+ creators & businesses',
    dashboardKey: 'channel',
    statsLabel: 'YouTube growth results at a glance',
    caseStudyTitle: 'Tech Explained',
    caseStudySubtitle: 'Niche: Tech Reviews',
    caseStudyParagraphs:
      'We helped Tech Explained 2X their views and grow subscribers consistently.',
    caseMediaLineOne: 'Tech',
    caseMediaLineTwo: 'Explained',
    caseMediaAccentLine: 'one',
    caseMediaBadge: 'youtube',
    closingTitle: ['Ready to Accelerate', 'Your YouTube Growth?'].join('\n'),
    closingDescription:
      "Let's grow your channel, audience, and business — with a strategy that works.",
    closingIllustrationKey: 'youtube',
    // Alt text for the three illustrated blocks. They are mocks rather than
    // screenshots, so each describes what the graphic depicts, not fake data.
    heroMediaAlt: 'Illustrated YouTube channel analytics dashboard showing rising views, watch time and subscriber growth',
    caseMediaAlt: 'Channel artwork placeholder for the Tech Explained YouTube channel',
    closingMediaAlt: 'Illustration of a YouTube play button beside rising growth bars',
    metaTitle: 'End-to-End YouTube Growth Services',
    metaDescription:
      'Full-service YouTube growth — channel audits, content strategy, production, thumbnail design, YouTube SEO, Shorts creation, analytics and channel management.',
    metaKeywords: [
      'YouTube growth services',
      'YouTube channel management',
      'YouTube SEO',
      'YouTube channel audit',
      'thumbnail design',
      'YouTube Shorts creation',
      'grow YouTube subscribers',
      'YouTube growth agency',
    ].join(', '),
    // Supporting terms, published after the focus keywords above.
    metaSecondaryKeywords: 'YouTube video editing services, YouTube content strategy agency, YouTube analytics and reporting, YouTube channel optimization, increase YouTube watch time, YouTube thumbnail CTR optimization, monetize a YouTube channel, YouTube growth agency India',
    canonicalUrl: 'https://cocomadigital.com/services/end-to-end-youtube-growth-services',
    /* Social copy is written for a feed rather than for a results page:
       shorter, and leading with the outcome. Leaving these blank would
       fall back to the meta copy, which reads long in a share card. */
    ogTitle: 'End-to-End YouTube Growth Services',
    ogDescription: 'Audits, strategy, production, thumbnails, YouTube SEO and channel management — one team for everything your channel needs to grow.',
    ogImageAlt: 'End-to-End YouTube Growth Services from Cocoma Digital',
    twitterTitle: 'End-to-End YouTube Growth Services',
    twitterDescription: 'One team for audits, YouTube SEO, thumbnails, Shorts, editing and channel management. See how we grow channels.',
    twitterImageAlt: 'End-to-End YouTube Growth Services from Cocoma Digital',
    schemaServiceType: 'YouTube channel growth and management',
    schemaDescription:
      'Full-service YouTube growth — channel audits, content strategy, production, thumbnail design, YouTube SEO, Shorts creation, analytics and channel management.',
    displayOrder: 1,
  },

  ctas: [
    { placement: 'hero', label: 'Get Your Free Channel Audit', href: '/contact-us', variant: 'solid', icon: 'FiPlay' },
    { placement: 'hero', label: 'Book a Strategy Call', href: '/ScheduleMeeting', variant: 'outline', icon: 'FiCalendar' },
    { placement: 'closing', label: 'Get Your Free Channel Audit', href: '/contact-us', variant: 'solid', icon: 'FiPlay' },
    { placement: 'closing', label: 'Book a Free Strategy Call', href: '/ScheduleMeeting', variant: 'outline', icon: 'FiCalendar' },
  ],

  stats: [
    { icon: 'FaYoutube', value: '120+', label: 'Channels Managed' },
    { icon: 'FiEye', value: '10M+', label: 'Views Generated' },
    { icon: 'FiUsers', value: '500+', label: 'Clients Served' },
    { icon: 'FiTrendingUp', value: '85%', label: 'Retention Rate (6M+)' },
  ],

  sections: [
    {
      sectionKey: 'services',
      renderer: 'grid',
      eyebrow: 'Complete Solution',
      title: 'Complete YouTube Growth Solutions Under One Roof',
      description:
        'We handle every part of your YouTube growth journey, from strategy to scaling. Focused on results. Built on data. Designed for long-term growth.',
      columns: 3,
      features: [
        { icon: 'FiClipboard', title: 'Channel Audit', description: 'In-depth audit to find gaps, opportunities, and growth potential.' },
        { icon: 'FiTarget', title: 'Content Strategy', description: 'Optimize titles, tags, descriptions & more to rank higher.' },
        { icon: 'FiVideo', title: 'Content Production', description: 'High-quality videos that engage viewers and build trust.' },
        { icon: 'FiImage', title: 'Thumbnail Design', description: 'Click-worthy thumbnails that increase CTR and drive more views.' },
        { icon: 'FiScissors', title: 'Video Editing', description: 'Professional editing that keeps viewers watching till the end.' },
        { icon: 'FiBarChart2', title: 'Analytics & Management', description: 'Track progress with clear reports and actionable insights.' },
      ],
    },
    {
      sectionKey: 'process',
      renderer: 'grid',
      eyebrow: 'Our Proven Process',
      title: 'Is Your YouTube Channel Struggling to Grow?',
      tone: 'tint',
      columns: 6,
      layout: 'stack',
      compact: true,
      // The proven-process band reads as numbered steps in the design, so the
      // numbering lives in the card titles.
      features: [
        { icon: 'FiSearch', title: '1. We Discover', description: 'We analyze your channel, content, and audience.' },
        { icon: 'FiTarget', title: '2. We Strategize', description: 'We build a custom growth strategy tailored to your goals.' },
        { icon: 'FiZap', title: '3. We Execute', description: 'We implement SEO, content & promotion to drive results.' },
        { icon: 'FiActivity', title: '4. We Optimize', description: 'We test, measure & refine for maximum growth.' },
        { icon: 'FiUsers', title: '5. We Engage', description: 'We help you build stronger audience connections & retention.' },
        { icon: 'FiAward', title: '6. You Win', description: 'You get more views, subs & real business impact.' },
      ],
    },
    {
      sectionKey: 'deliverables',
      renderer: 'grid',
      eyebrow: 'What We Do',
      title: 'What Our YouTube Growth Services Include',
      columns: 4,
      features: [
        { icon: 'FiClipboard', title: 'Channel Audit', description: 'Complete channel audit to unlock hidden growth opportunities.' },
        { icon: 'FiTrendingUp', title: 'Growth Strategy', description: 'Custom strategies designed to grow your audience.' },
        { icon: 'FiSearch', title: 'Content Research', description: "Find high-potential topics your audience loves to watch." },
        { icon: 'FiSettings', title: 'Optimization', description: 'Optimize every detail for better rankings and visibility.' },
        { icon: 'FiImage', title: 'Thumbnail Design', description: 'Eye-catching thumbnails that increase clicks and views.' },
        { icon: 'FiTarget', title: 'YouTube SEO', description: 'Optimize titles, tags, descriptions & playlists.' },
        { icon: 'FiPlay', title: 'Shorts Creation', description: 'Short-form content to boost reach and subscribers.' },
        { icon: 'FiBarChart2', title: 'Analytics & Reporting', description: 'Track performance with data-backed insights.' },
      ],
    },
    {
      sectionKey: 'formats',
      renderer: 'grid',
      eyebrow: 'Content Results',
      title: 'Content That Drives Real YouTube Growth',
      description:
        'We create and optimize content formats that help brands, creators, and businesses reach the right audience, increase engagement, and grow faster on YouTube.',
      columns: 3,
      features: [
        { icon: 'FiBookOpen', title: 'Educational Videos', description: 'Build authority with informative videos that teach, explain, and deliver real value.' },
        { icon: 'FiZap', title: 'YouTube Shorts', description: 'Drive rapid discovery and audience growth with high-impact short-form content.' },
        { icon: 'FiMic', title: 'Podcast Clips', description: 'Repurpose long-form conversations into engaging clips that expand your reach.' },
        { icon: 'FiPackage', title: 'Product & Service Videos', description: 'Showcase your offers clearly with videos designed to educate and convert viewers.' },
        { icon: 'FiUser', title: 'Personal Brand Content', description: 'Strengthen visibility and trust with consistent thought-leadership video content.' },
        { icon: 'FiStar', title: 'Case Study & Testimonial Videos', description: 'Highlight real success stories to build credibility and influence purchase decisions.' },
      ],
    },
    {
      sectionKey: 'case-study',
      renderer: 'case-study',
      eyebrow: 'Proven Results',
      title: 'Real YouTube Growth, Measurable Results',
    },
    {
      sectionKey: 'youtube-growth-guide',
      renderer: 'article',
      eyebrow: 'The Complete Guide',
      title: 'YouTube Growth Services Explained, End to End',
      description:
        'What a full-service YouTube growth engagement includes, who it suits, and the results to expect month by month.',
      tone: 'tint',
      /* The long-form band. Every block carries its own heading level, so
       * the band renders a real H3-to-H6 outline under the section's H2
       * instead of a run of same-level headings. */
      contents: [
        {
          level: 3,
          heading: 'What end-to-end YouTube growth actually covers',
          body: [
            'Most channels do not stall because of one missing piece. They stall because strategy, packaging, editing and publishing are handled by different people who never compare notes, so a strong video gets a weak title and a great title lands on a video nobody finishes.',
            'End-to-end means one team owns the whole chain. The same people who read your analytics decide what to make next, write the title, design the thumbnail, cut the video and publish it, then measure what that decision did to your watch time.',
          ].join('\n'),
          bullets: [
            'A documented channel strategy tied to a specific audience and outcome',
            'Keyword and topic research before a script is written, not after',
            'Titles, thumbnails and descriptions treated as part of the video rather than packaging bolted on',
            'A publishing calendar your team can actually sustain',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Channel audit and competitive research',
          body: [
            'Every engagement opens with an audit. We go through your last several months of uploads, your traffic sources, your audience retention curves and the channels already ranking for the searches you want, then write up what is working, what is quietly costing you views, and where the fastest available wins are.',
            'You keep the audit document whether or not you go on to work with us.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'YouTube SEO and video packaging',
          body: [
            'YouTube SEO is not keyword stuffing a description. It is making it obvious, to both the ranking systems and to a person scrolling a results page, what a video is, who it is for, and why it is worth their time.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Titles, thumbnails and click-through rate',
          body: [
            'Impressions are worth nothing until somebody clicks. We design thumbnails against the specific competitors a video will appear beside, test title variants on live traffic, and read click-through rate alongside retention rather than on its own. A title that wins clicks and loses viewers has hurt the channel.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Descriptions, chapters and metadata',
          body: [
            'Descriptions are written for the reader deciding whether to stay, then structured so YouTube can classify the video properly. Chapters, timestamps, links and end screens are set per video rather than pasted from a template.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'Why we do not chase tags',
          body: [
            'Tags carry very little ranking weight today. We fill them in correctly and spend the time saved on what does move the numbers: the first thirty seconds, the thumbnail, and the choice of topic.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'Who these YouTube growth services are for',
          body: [
            'We work best with channels that already have something to build on: a point of view, a product, a back catalogue, or an audience that has stopped growing. We are not the right fit for a channel that wants views without a reason for anyone to watch.',
          ].join('\n'),
          bullets: [
            'Creators pushing past a plateau and ready to treat the channel as a business',
            'Founders and subject experts using YouTube to generate qualified inbound leads',
            'Brands whose in-house team needs strategy, editing or thumbnails as an extension',
            'Educators and studios with a library that is under-performing its potential',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Creators scaling past their first ten thousand subscribers',
          body: [
            'The tactics that earn a first ten thousand subscribers rarely earn the next hundred thousand. At this stage the constraint is usually production capacity and topic selection rather than effort, which is exactly what a full-service team removes.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Brands using YouTube as a sales channel',
          body: [
            'For a business channel, subscriber count is a vanity metric. We measure the videos that generate demo requests, applications or purchases, and build the calendar around making more of those, even when they are not the videos that get the most views.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'What results to expect, and when',
          body: [
            'YouTube growth compounds, which makes the early weeks look slower than they are. This is the honest shape of it, based on the channels we manage.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'The first thirty days',
          body: [
            'Audit, strategy, and repackaging what you already have. Retitling and re-thumbnailing a back catalogue often produces the first measurable lift before a single new video ships.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Months two and three',
          body: [
            'New videos start publishing against the strategy. Impressions and click-through rate usually move first, with watch time and subscribers following as the catalogue builds.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'The reporting you receive',
          body: [
            'A monthly report covering impressions, click-through rate, average view duration, subscriber sources and the leads or revenue attributable to the channel, written as an explanation of what happened and what we are changing next.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'The numbers we hold ourselves to',
          body: [
            'Click-through rate, average view duration, returning-viewer share, and whichever business metric the channel exists to move. Raw view count is reported, but it is never the goal on its own.',
          ].join('\n'),
        },
      ],
    },
    {
      sectionKey: 'faq',
      renderer: 'faq',
      eyebrow: 'FAQs',
      title: 'Frequently Asked Questions',
      faqVariant: 'marked',
    },
  ],

  caseMetrics: [
    { label: 'Views', icon: 'FiEye', before: '520K', after: '2.1M', growth: '+304.8%' },
    { label: 'Subscribers', icon: 'FiUsers', before: '2.3K', after: '48K', growth: '+1,978.3%' },
    { label: 'Watch Time (Hours)', icon: 'FiClock', before: '62K', after: '166K', growth: '+167.0%' },
  ],

  faqs: [
    {
      question: 'How long does it take to see growth?',
      answer:
        'Most channels see measurable movement in impressions and click-through rate within the first 30–45 days, with compounding view and subscriber growth from month three onwards. The exact curve depends on your niche, upload cadence, and existing back catalogue.',
    },
    {
      question: 'Do you work with new channels?',
      answer:
        "Yes. New channels often grow fastest because we can set up positioning, packaging, and SEO correctly from day one instead of undoing old habits. We'll agree on a realistic milestone plan before we start.",
    },
    {
      question: 'Can you help me rank on YouTube search?',
      answer:
        "That's a core part of the work. We research the terms your audience actually searches, then build titles, descriptions, tags, chapters, and playlists around them — and keep refining based on what the analytics show after publishing.",
    },
    {
      question: 'How do you guarantee results?',
      answer:
        "We don't sell guaranteed view counts — nobody credible can. What we commit to is a documented strategy, an agreed publishing cadence, transparent monthly reporting against baseline metrics, and continuous optimisation until the numbers move.",
    },
  ],
};

// ── Social Media Video Editing Services ─────────────────────────────────────

const SOCIAL = {
  service: {
    slug: 'social-media-video-editing-services',
    name: 'Social Media Video Editing Services',
    pageUrl: 'https://cocomadigital.com/services/social-media-video-editing-services',
    heroBadgeIcon: 'FiVideo',
    heroBadgeLabel: 'Create Better Videos. Grow Faster.',
    heroHeadline: ['Professional', '*Social Media Video*', 'Editing Services'].join('\n'),
    heroParagraphs: [
      'Turn raw footage into scroll-stopping content for every platform.',
      'We edit Reels, Shorts, TikToks, podcast clips, promo videos, and branded social content that captures attention, increases reach, boosts engagement, and drives real conversions.',
    ].join('\n'),
    heroTrustInitials: 'RS, DK, LM, AV',
    heroTrustLabel: 'Trusted by creators, brands, coaches & agencies worldwide',
    dashboardKey: 'social',
    statsLabel: 'Social video editing results at a glance',
    caseStudyTitle: 'Social Growth',
    caseStudyParagraphs: [
      'We helped a personal brand grow by improving hooks, captions, branding & short-form consistency.',
      'Our edits increased watch time, boosted reach, and turned viewers into followers and leads.',
    ].join('\n'),
    caseMediaLineOne: 'Social',
    caseMediaLineTwo: 'Growth',
    caseMediaAccentLine: 'two',
    caseMediaBadge: 'play',
    closingTitle: ['Ready to Create Social Media', 'Videos That Get Attention?'].join('\n'),
    closingDescription:
      'Turn your raw footage into professional, engaging, platform-ready videos that grow your brand.',
    closingIllustrationKey: 'social',
    // Alt text for the three illustrated blocks. They are mocks rather than
    // screenshots, so each describes what the graphic depicts, not fake data.
    heroMediaAlt: 'Illustrated social media dashboard showing reach and engagement climbing across Reels, Shorts and TikTok',
    caseMediaAlt: 'Cover artwork placeholder for the Fitness First social media channel',
    closingMediaAlt: 'Illustration of a vertical 9:16 video tile beside rising growth bars',
    metaTitle: 'Social Media Video Editing Services',
    metaDescription:
      'Professional social media video editing — Instagram Reels, YouTube Shorts, TikTok clips, promotional videos, animated captions, motion graphics and multi-platform resizing.',
    metaKeywords: [
      'social media video editing',
      'Instagram Reels editing',
      'YouTube Shorts editing',
      'TikTok video editing',
      'short-form video editing',
      'animated captions',
      'motion graphics',
      'video editing agency',
    ].join(', '),
    // Supporting terms, published after the focus keywords above.
    metaSecondaryKeywords: 'Reels editing services, vertical video editing agency, subtitle and caption editing, video repurposing services, brand video editing agency, UGC video editing, 9:16 video resizing, social media content editing India',
    canonicalUrl: 'https://cocomadigital.com/services/social-media-video-editing-services',
    /* Social copy is written for a feed rather than for a results page:
       shorter, and leading with the outcome. Leaving these blank would
       fall back to the meta copy, which reads long in a share card. */
    ogTitle: 'Social Media Video Editing Services',
    ogDescription: 'Scroll-stopping Reels, Shorts and TikToks — animated captions, motion graphics and every aspect ratio your platforms need.',
    ogImageAlt: 'Social Media Video Editing Services from Cocoma Digital',
    twitterTitle: 'Social Media Video Editing Services',
    twitterDescription: 'Reels, Shorts and TikTok edits with captions, motion graphics and multi-platform resizing. See the work.',
    twitterImageAlt: 'Social Media Video Editing Services from Cocoma Digital',
    schemaServiceType: 'Social media video editing',
    schemaDescription:
      'Professional social media video editing — Instagram Reels, YouTube Shorts, TikTok clips, promotional videos, animated captions, motion graphics and multi-platform resizing.',
    displayOrder: 2,
  },

  ctas: [
    { placement: 'hero', label: 'Get a Free Video Editing Consultation', href: '/contact-us', variant: 'solid' },
    { placement: 'hero', label: 'View Our Editing Portfolio', href: '/creative-house', variant: 'outline' },
    { placement: 'closing', label: 'Get Your Free Video Editing Consultation', href: '/contact-us', variant: 'solid' },
    { placement: 'closing', label: 'Speak With a Video Editing Expert', href: '/ScheduleMeeting', variant: 'outline' },
  ],

  stats: [
    { icon: 'FiVideo', value: '1,000+', label: 'Social Videos Edited' },
    { icon: 'FiEye', value: '20M+', label: 'Views Generated' },
    { icon: 'FiFilm', value: '500+', label: 'Short-Form Videos Created' },
    { icon: 'FiThumbsUp', value: '95%', label: 'Client Satisfaction Rate' },
  ],

  sections: [
    {
      sectionKey: 'services',
      renderer: 'grid',
      eyebrow: 'Our Services',
      title: 'Complete Social Media Video Editing Solutions',
      description:
        'Engaging, platform-ready videos designed to capture attention and drive results.',
      columns: 3,
      features: [
        { icon: 'FaInstagram', title: 'Instagram Reels Editing', description: 'Fast-paced edits, captions & trends to boost reach and engagement.' },
        { icon: 'FaYoutube', title: 'YouTube Shorts Editing', description: 'Vertical edits with strong hooks that keep viewers watching.' },
        { icon: 'FaTiktok', title: 'TikTok Video Editing', description: 'Trendy edits, effects & captions that go viral on TikTok.' },
        { icon: 'FiMic', title: 'Podcast Clip Editing', description: 'Turn long episodes into engaging short clips for social media.' },
        { icon: 'FiZap', title: 'Promotional Video Editing', description: 'High-converting promo videos that showcase your brand.' },
        { icon: 'FiImage', title: 'Thumbnail & Caption Design', description: 'Eye-catching thumbnails & captions that increase clicks & views.' },
      ],
    },
    {
      sectionKey: 'problems',
      renderer: 'grid',
      title: 'Are Your Social Media Videos Failing to Perform?',
      tone: 'tint',
      columns: 6,
      layout: 'stack',
      compact: true,
      features: [
        { icon: 'FiTrendingDown', title: 'Low Audience Retention', description: 'Viewers drop off within seconds.' },
        { icon: 'FiZap', title: 'Weak Video Hooks', description: "Content doesn't grab attention early." },
        { icon: 'FiScissors', title: 'Poor Editing Quality', description: 'Amateur edits hurt your credibility.' },
        { icon: 'FiFrown', title: 'Low Engagement', description: 'Likes, comments & shares stay low.' },
        { icon: 'FiLayers', title: 'Inconsistent Branding', description: 'Your content lacks a consistent look.' },
        { icon: 'FiCrop', title: 'Wrong Platform Formatting', description: 'Incorrect sizes & formats limit your reach.' },
      ],
    },
    {
      sectionKey: 'process',
      renderer: 'timeline',
      title: 'A Simple Process From Raw Footage to Published Content',
      features: [
        { title: 'Discovery', description: 'We understand your goals, audience & content needs.' },
        { title: 'File Collection', description: 'You send us your raw footage & brand assets.' },
        { title: 'Content Selection', description: 'We pick the best moments & structure for maximum impact.' },
        { title: 'Professional Editing', description: 'We edit with precision, captions, effects & engaging storytelling.' },
        { title: 'Platform Optimisation', description: 'We optimise formats, aspect ratios & hooks for each platform.' },
        { title: 'Review & Delivery', description: 'You review, request changes & receive final videos.' },
      ],
    },
    {
      sectionKey: 'deliverables',
      renderer: 'grid',
      title: 'What Our Video Editing Services Include',
      columns: 4,
      features: [
        { icon: 'FiType', title: 'Animated Captions', description: 'Dynamic captions that improve watch time & accessibility.' },
        { icon: 'FiSettings', title: 'Motion Graphics', description: 'Engaging text animations, transitions & visual effects.' },
        { icon: 'FiVolume2', title: 'Audio Enhancement', description: 'Clean audio, noise reduction & volume balancing.' },
        { icon: 'FiZap', title: 'Hook Optimisation', description: 'Strong intros & hooks that capture attention instantly.' },
        { icon: 'FiLayers', title: 'B-Roll & Stock Footage', description: 'High-quality b-roll to make your content more engaging.' },
        { icon: 'FiAward', title: 'Branded Visuals', description: 'Logos, colours, fonts & elements that build brand recognition.' },
        { icon: 'FiCrop', title: 'Multi-Platform Resizing', description: 'Reels, Shorts, TikTok & more — perfectly sized for every platform.' },
        { icon: 'FiBarChart2', title: 'Analytics & Reporting', description: 'Performance insights to help you grow your content strategy.' },
      ],
    },
    {
      sectionKey: 'platforms',
      renderer: 'showcase',
      title: 'Create Scroll-Stopping Reels, Shorts & TikToks',
      showcases: [
        {
          icon: 'FaInstagram',
          title: 'Instagram Reels',
          caption: 'Level up your content',
          metric: '12.4K',
          mediaBadge: 'ratio',
          points: [
            'Fast-paced cuts & transitions',
            'Animated captions',
            'Strong hooks in first 2 seconds',
            'Trend-focused editing',
            'Vertical format (9:16)',
          ].join('\n'),
        },
        {
          icon: 'FaYoutube',
          title: 'YouTube Shorts',
          caption: '3 tips to grow fast',
          metric: '15K',
          mediaBadge: 'ratio',
          points: [
            'Hook-driven storytelling',
            'Engaging captions',
            'High retention edits',
            'Optimised for discovery',
            'Vertical format (9:16)',
          ].join('\n'),
        },
        {
          icon: 'FaTiktok',
          title: 'TikTok Videos',
          caption: 'Make it viral',
          metric: '8.7K',
          mediaBadge: 'ratio',
          points: [
            'Trendy effects & transitions',
            'Auto captions',
            'Viral sound integration',
            'Engagement-focused edits',
            'Vertical format (9:16)',
          ].join('\n'),
        },
      ],
    },
    {
      sectionKey: 'why-us',
      renderer: 'grid',
      title: 'Why Choose Our Social Media Video Editing Agency?',
      columns: 4,
      features: [
        { icon: 'FiCrop', title: 'Platform-Specific Expertise', description: 'We know what works on each platform and edit accordingly.' },
        { icon: 'FiStar', title: 'Engaging Editing Style', description: 'We create videos that grab attention and keep viewers watching till the end.' },
        { icon: 'FiAward', title: 'Consistent Brand Identity', description: 'We maintain your brand voice, visuals & messaging in every video.' },
        { icon: 'FiZap', title: 'Fast & Organised Workflow', description: 'Quick turnaround, clear communication & hassle-free process.' },
      ],
    },
    {
      sectionKey: 'case-study',
      renderer: 'case-study',
      eyebrow: 'Case Study',
      title: 'Better Editing. Higher Engagement. Stronger Social Growth.',
    },
    {
      sectionKey: 'content-assets',
      renderer: 'grid',
      eyebrow: 'Content That Helps Your Brand Grow',
      title: 'Turn One Recording Into Multiple Content Assets',
      columns: 4,
      features: [
        { icon: 'FiBookOpen', title: 'Educational Videos', description: 'Teach, inform & provide value to your audience.' },
        { icon: 'FiMessageSquare', title: 'Promotional Videos', description: 'Promote offers, launches & special campaigns.' },
        { icon: 'FiStar', title: 'Testimonial Videos', description: 'Showcase customer reviews & success stories.' },
        { icon: 'FiFilm', title: 'Behind-the-Scenes Videos', description: 'Build trust with real behind-the-scenes clips.' },
        { icon: 'FiUser', title: 'Personal Brand Videos', description: 'Share your journey, insights & expertise.' },
        { icon: 'FiMic', title: 'Podcast Clips', description: 'Repurpose long-form episodes into short, engaging clips.' },
        { icon: 'FiPackage', title: 'Product Videos', description: 'Show your product in action with scroll-stopping edits.' },
      ],
    },
    {
      sectionKey: 'social-editing-guide',
      renderer: 'article',
      eyebrow: 'The Complete Guide',
      title: 'Social Media Video Editing, Explained',
      description:
        'How short-form editing works in practice, what gets delivered for each platform, and how turnaround is structured.',
      tone: 'tint',
      /* The long-form band. Every block carries its own heading level, so
       * the band renders a real H3-to-H6 outline under the section's H2
       * instead of a run of same-level headings. */
      contents: [
        {
          level: 3,
          heading: 'What social media video editing involves',
          body: [
            'A social edit and a long-form edit are different crafts. On a feed you have about a second and a half before a thumb keeps moving, most viewers have the sound off, and the same footage has to work as a vertical Reel, a square post and a widescreen cutdown without being re-edited three times from scratch.',
            'Our editors cut for that reality: a hook in the opening frames, burned-in captions that carry the story silently, pacing built around the platform, and a delivery that ships every aspect ratio together.',
          ].join('\n'),
          bullets: [
            'Hook-first edits built for sound-off viewing',
            'Animated captions styled to your brand rather than a default template',
            'Motion graphics, b-roll and sound design that earn their place',
            'Every aspect ratio delivered from a single edit',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Short-form editing for Reels, Shorts and TikTok',
          body: [
            'Short-form is where most brands see movement first. We cut long recordings, webinars, podcasts and event footage into clips that stand on their own, each with its own hook, arc and end frame rather than a slice lifted from the middle of something longer.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Captions, subtitles and accessibility',
          body: [
            'Captions are read by most of your audience and by everyone browsing with the sound off. We burn them in, style them to your brand, and check them by hand. Automatic captions get names, products and technical terms wrong often enough to matter.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Motion graphics and lower thirds',
          body: [
            'Titles, lower thirds, callouts and transitions come from a small kit tied to your brand, so a month of clips reads as one body of work instead of a dozen unrelated experiments.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Colour and sound',
          body: [
            'Every clip is levelled and colour-matched. Consistent loudness across a feed matters more than people expect: a clip that plays noticeably louder or quieter than the one before it gets scrolled past.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'On trending audio',
          body: [
            'We use trending audio where it fits the clip and skip it where it does not. A trend that fights the message costs more attention than it borrows.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'Which brands and creators this is built for',
          body: [
            'This service suits teams producing video often enough that editing has become the bottleneck, and teams sitting on footage they have never had time to cut.',
          ].join('\n'),
          bullets: [
            'Brands running an always-on social calendar across several platforms',
            'Creators repurposing long-form video into daily short-form',
            'Agencies needing overflow editing capacity with a predictable turnaround',
            'Founders and educators turning talks, webinars and podcasts into clips',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Repurposing a long-form library',
          body: [
            'A single hour-long recording usually holds eight to twelve genuinely good short clips. Most teams pull two, because finding the rest is slow work. We go through the whole recording and cut everything that stands on its own.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Working alongside an in-house team',
          body: [
            'We plug into what you already run, including your asset library, brand kit and review process, and absorb the volume your team cannot, without asking you to change how you work.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'Turnaround, volume and how we work',
          body: [
            'Editing only helps if it arrives while the content is still relevant, so both turnaround and volume are agreed up front rather than quoted job by job.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'A typical delivery cycle',
          body: [
            'Footage in, first cuts back within an agreed window, one round of revisions included, final files delivered in every ratio and format your platforms need. Higher-volume retainers run on a rolling schedule so there is always work in flight.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Revisions and version control',
          body: [
            'Every edit carries a version, and feedback is collected in one place with timecoded comments, so nothing is lost between a message thread and the timeline.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'File delivery',
          body: [
            'Platform-ready exports, plus the source project on request. The work is yours, project files included.',
          ].join('\n'),
        },
      ],
    },
    {
      sectionKey: 'faq',
      renderer: 'faq',
      title: 'Frequently Asked Questions',
      faqVariant: 'plain',
    },
  ],

  caseMetrics: [
    { label: 'Monthly Video Views', icon: 'FiEye', before: '80K', after: '1.2M', growth: '+1,400%' },
    { label: 'Avg Watch Time', icon: 'FiPlay', before: '24%', after: '58%', growth: '+141%' },
    { label: 'Followers', icon: 'FiUsers', before: '12K', after: '68K', growth: '+466%' },
    { label: 'Enquiries', icon: 'FiTrendingUp', before: '20', after: '145', growth: '+625%' },
  ],

  faqs: [
    {
      question: 'What are social media video editing services?',
      answer:
        "It's end-to-end editing for the content you publish on social platforms — Reels, Shorts, TikToks, promos, testimonials, and podcast clips. We handle cutting, pacing, captions, motion graphics, audio, branding, and per-platform formatting so each video is ready to post.",
    },
    {
      question: 'Do you create Reels and YouTube Shorts?',
      answer:
        'Yes. Vertical short-form is our core output. Every clip is cut for a strong opening hook, captioned, branded, and exported at 9:16 with the safe zones each platform expects.',
    },
    {
      question: 'Can you repurpose long-form videos?',
      answer:
        "Absolutely. Send us a podcast, webinar, livestream, or long YouTube upload and we'll pull the highest-performing moments into a batch of short clips — each one framed, captioned, and ready for a different platform.",
    },
    {
      question: 'Do you add captions and branding?',
      answer:
        'Every edit includes animated captions and your brand kit — logos, colour palette, fonts, lower-thirds, and intro/outro elements — so your feed looks consistent no matter who is watching.',
    },
  ],
};

// ── Podcast Editing & Growth Services ───────────────────────────────────────

const PODCAST = {
  service: {
    slug: 'podcast-editing-and-growth-services',
    name: 'Podcast Editing & Growth Services',
    pageUrl: 'https://cocomadigital.com/services/podcast-editing-and-growth-services',
    heroBadgeIcon: 'FiMic',
    heroBadgeLabel: 'Record Your Podcast. We Handle the Rest.',
    heroHeadline: ['Professional', '*Podcast Editing &*', 'Growth Services'].join('\n'),
    heroParagraphs: [
      'Transform raw recordings into polished, engaging, and platform-ready podcast episodes.',
      'From audio and video editing to short-form content, podcast SEO, publishing, distribution, and performance analysis, we manage every stage of your podcast growth.',
    ].join('\n'),
    heroTrustInitials: 'AR, JS, MK, PT',
    heroTrustLabel: 'Trusted by podcasters, creators, coaches & businesses worldwide',
    dashboardKey: 'podcast',
    statsLabel: 'Podcast editing results at a glance',
    caseStudyTitle: 'The Growth Show',
    caseStudyParagraphs: [
      'We improved audio and video quality, optimised SEO, created 200+ short clips, and established a consistent publishing strategy.',
      'The result? Massive growth across downloads, retention, reach, and subscribers.',
    ].join('\n'),
    caseMediaLineOne: 'The Growth',
    caseMediaLineTwo: 'Show',
    caseMediaAccentLine: 'two',
    caseMediaSubtitle: 'with Alex Martin',
    caseMediaBadge: 'mic',
    closingTitle: ['Ready to Produce and Grow', 'a Professional Podcast?'].join('\n'),
    closingDescription:
      'Turn every recording into a polished podcast episode and a complete library of promotional content designed to reach more listeners.',
    closingIllustrationKey: 'podcast',
    // Alt text for the three illustrated blocks. They are mocks rather than
    // screenshots, so each describes what the graphic depicts, not fake data.
    heroMediaAlt: 'Illustrated podcast dashboard showing recent episodes, downloads and listener growth',
    caseMediaAlt: 'Cover artwork placeholder for The Growth Show podcast',
    closingMediaAlt: 'Illustration of a podcast microphone beside rising growth bars',
    metaTitle: 'Podcast Editing & Growth Services',
    metaDescription:
      'Professional podcast editing and growth services — audio editing, video podcast editing, mixing and mastering, podcast SEO, short-form clips, publishing and distribution.',
    metaKeywords: [
      'podcast editing services',
      'podcast editing agency',
      'video podcast editing',
      'podcast audio mixing',
      'podcast SEO',
      'podcast shorts and reels',
      'podcast publishing and distribution',
      'podcast growth services',
    ].join(', '),
    // Supporting terms, published after the focus keywords above.
    metaSecondaryKeywords: 'podcast post-production services, podcast mixing and mastering, podcast clip editing, podcast marketing agency, video podcast production, podcast episode publishing, grow podcast listeners, podcast editing services India',
    canonicalUrl: 'https://cocomadigital.com/services/podcast-editing-and-growth-services',
    /* Social copy is written for a feed rather than for a results page:
       shorter, and leading with the outcome. Leaving these blank would
       fall back to the meta copy, which reads long in a share card. */
    ogTitle: 'Podcast Editing & Growth Services',
    ogDescription: 'Broadcast-quality audio and video podcast editing, plus the SEO, clips and distribution that turn episodes into an audience.',
    ogImageAlt: 'Podcast Editing and Growth Services from Cocoma Digital',
    twitterTitle: 'Podcast Editing & Growth Services',
    twitterDescription: 'Editing, mixing, podcast SEO, short-form clips and distribution — everything an episode needs after the recording stops.',
    twitterImageAlt: 'Podcast Editing and Growth Services from Cocoma Digital',
    schemaServiceType: 'Podcast editing and podcast growth',
    schemaDescription:
      'Professional podcast editing and growth services — audio editing, video podcast editing, mixing and mastering, podcast SEO, short-form clips, publishing and distribution.',
    displayOrder: 3,
  },

  ctas: [
    { placement: 'hero', label: 'Get a Free Podcast Audit', href: '/contact-us', variant: 'solid' },
    { placement: 'hero', label: 'Book a Strategy Call', href: '/ScheduleMeeting', variant: 'solid' },
    { placement: 'closing', label: 'Get Your Free Podcast Audit', href: '/contact-us', variant: 'solid' },
    { placement: 'closing', label: 'Speak With a Podcast Growth Expert', href: '/ScheduleMeeting', variant: 'outline' },
  ],

  stats: [
    { icon: 'FiMic', value: '300+', label: 'Episodes Edited' },
    { icon: 'FiPlay', value: '5M+', label: 'Podcast Views Generated' },
    { icon: 'FiScissors', value: '500+', label: 'Short Clips Created' },
    { icon: 'FiUsers', value: '95%', label: 'Client Retention Rate' },
  ],

  sections: [
    {
      sectionKey: 'services',
      renderer: 'grid',
      eyebrow: 'Our Services',
      title: 'Complete Podcast Editing and Growth Solutions',
      description: 'Everything you need to produce, optimise, and grow a professional podcast.',
      columns: 3,
      features: [
        { icon: 'FiActivity', title: 'Audio Editing', description: 'Remove noise, filler words, pauses, and mistakes.' },
        { icon: 'FiVideo', title: 'Video Podcast Editing', description: 'Multi-camera editing, captions, and branded visuals.' },
        { icon: 'FiSliders', title: 'Audio Mixing & Mastering', description: 'Balanced, polished, and professional sound.' },
        { icon: 'FiSearch', title: 'Podcast SEO', description: 'Optimise episode titles, descriptions, and metadata.' },
        { icon: 'FiFilm', title: 'Short-Form Content', description: 'Create Reels, Shorts, and social clips from episodes.' },
        { icon: 'FiRss', title: 'Publishing & Distribution', description: 'Schedule and publish across Spotify, Apple, and YouTube.' },
      ],
    },
    {
      sectionKey: 'challenges',
      renderer: 'grid',
      eyebrow: 'Challenges We Solve',
      title: 'Is Your Podcast Struggling to Grow?',
      tone: 'tint',
      columns: 6,
      layout: 'stack',
      compact: true,
      features: [
        { icon: 'FiVolume2', title: 'Poor Audio Quality', description: 'Makes episodes hard to enjoy.' },
        { icon: 'FiClock', title: 'Time-Consuming Editing', description: 'Editing takes too much of your time.' },
        { icon: 'FiTrendingDown', title: 'Low Listener Retention', description: 'Listeners drop off early.' },
        { icon: 'FiUsers', title: 'Limited Reach', description: "Your episodes aren't discovered." },
        { icon: 'FiCalendar', title: 'Inconsistent Publishing', description: 'Irregular uploads kill momentum.' },
        { icon: 'FiVideoOff', title: 'Lack of Promo Content', description: 'No content to promote episodes.' },
      ],
    },
    {
      sectionKey: 'process',
      renderer: 'timeline',
      eyebrow: 'Our Process',
      title: 'A Simple Process From Recording to Publishing',
      features: [
        { title: 'Discovery', description: 'We learn about your podcast goals and audience.' },
        { title: 'File Collection', description: 'You send us your recordings and assets.' },
        { title: 'Editing & Enhancement', description: 'We edit, clean, and enhance your episode.' },
        { title: 'Content Repurposing', description: 'We create clips, reels, and other content assets.' },
        { title: 'Optimisation & Publishing', description: 'We optimise SEO and publish across platforms.' },
        { title: 'Growth Analysis', description: 'We track performance and provide insights for growth.' },
      ],
    },
    {
      sectionKey: 'deliverables',
      renderer: 'grid',
      eyebrow: 'What We Deliver',
      title: 'What Our Podcast Services Include',
      columns: 4,
      features: [
        { icon: 'FiActivity', title: 'Audio Cleanup', description: 'Remove noise, clicks, pops, and unwanted sounds.' },
        { icon: 'FiFilm', title: 'Video Editing', description: 'Professional cuts, transitions, captions, and branded elements.' },
        { icon: 'FiFileText', title: 'Show Notes', description: 'Engaging show notes that improve SEO and listener experience.' },
        { icon: 'FiType', title: 'Transcriptions', description: 'Accurate episode transcriptions for accessibility and SEO.' },
        { icon: 'FiSearch', title: 'Podcast SEO', description: 'Optimise episodes, descriptions, and metadata.' },
        { icon: 'FiSmartphone', title: 'Shorts & Reels', description: 'High-performing short clips for social media platforms.' },
        { icon: 'FiImage', title: 'Thumbnail Design', description: 'Eye-catching thumbnails that boost clicks.' },
        { icon: 'FiBarChart2', title: 'Analytics & Reporting', description: 'Detailed reports to track performance and growth.' },
      ],
    },
    {
      sectionKey: 'format-panels',
      renderer: 'format-panels',
      title: 'Professional Quality Across Every Format',
      showcases: [
        {
          title: 'Audio Podcast Editing',
          // Audio vs video are told apart by surface (yellow tint vs soft grey).
          tone: 'brand',
          mediaBadge: 'play',
          caption: '48:32',
          watermarkIcon: 'FiHeadphones',
          points: [
            'Noise reduction for crystal clear audio',
            'Voice leveling for consistent volume',
            'Remove filler words and awkward pauses',
            'Polished mastering for a professional sound',
          ].join('\n'),
        },
        {
          title: 'Video Podcast Editing',
          tone: 'soft',
          mediaBadge: 'video',
          caption: '00:00 / 48:32',
          watermarkIcon: 'FiType',
          points: [
            'Multi-camera cuts and smooth transitions',
            'Accurate subtitles and captions',
            'Branded lower-thirds and graphics',
            'YouTube-ready formatting and optimization',
          ].join('\n'),
        },
      ],
    },
    {
      sectionKey: 'why-us',
      renderer: 'grid',
      title: 'Why Choose Our Podcast Editing Agency?',
      columns: 4,
      features: [
        { icon: 'FiHeadphones', title: 'Complete Podcast Management', description: 'We handle every step from editing to publishing and growth.' },
        { icon: 'FiSliders', title: 'Professional Editing Quality', description: 'Industry-standard editing for clear, engaging, and polished episodes.' },
        { icon: 'FiTrendingUp', title: 'Growth-Focused Approach', description: 'We optimise content and strategy to grow your audience.' },
        { icon: 'FiSettings', title: 'Transparent Workflow', description: 'Clear communication, updates, and complete transparency.' },
      ],
    },
    {
      sectionKey: 'case-study',
      renderer: 'case-study',
      eyebrow: 'Case Study',
      title: 'Professional Editing. Stronger Reach. Measurable Growth.',
    },
    {
      sectionKey: 'content-assets',
      renderer: 'grid',
      eyebrow: 'Content That Helps Your Podcast Grow',
      title: 'Turn One Episode Into Multiple Content Assets',
      columns: 3,
      features: [
        { icon: 'FaYoutube', title: 'YouTube Shorts', description: 'Short, engaging clips optimised for YouTube Shorts.' },
        { icon: 'FaInstagram', title: 'Instagram Reels', description: 'Vertical videos designed to perform on Instagram.' },
        { icon: 'FaTiktok', title: 'TikTok Clips', description: 'Viral-ready clips that capture attention on TikTok.' },
        { icon: 'FiActivity', title: 'Audiograms', description: 'Shareable audio snippets with captivating visuals.' },
        { icon: 'FiMessageSquare', title: 'Quote Graphics', description: 'Branded quote cards for engagement and shares.' },
        { icon: 'FiFileText', title: 'Blog Articles / Show Notes', description: 'SEO-friendly blog posts that extend your reach.' },
      ],
    },
    {
      sectionKey: 'podcast-guide',
      renderer: 'article',
      eyebrow: 'The Complete Guide',
      title: 'Podcast Editing and Growth, Explained',
      description:
        'Everything that happens to an episode after the recording stops: editing, mixing, SEO, clips and distribution.',
      tone: 'tint',
      /* The long-form band. Every block carries its own heading level, so
       * the band renders a real H3-to-H6 outline under the section's H2
       * instead of a run of same-level headings. */
      contents: [
        {
          level: 3,
          heading: 'What podcast editing and growth covers',
          body: [
            'Recording an episode is roughly half the work. What decides whether anyone hears it is what happens next: the edit, the mix, how the episode is titled and described, the clips that carry it into social feeds, and where it gets published.',
            'We handle that entire second half, for audio-only shows, video podcasts, or both from the same recording.',
          ].join('\n'),
          bullets: [
            'Full audio edit covering filler words, false starts, cross-talk and dead air',
            'Mixing and mastering to broadcast loudness standards',
            'Video podcast editing with multi-camera switching',
            'Show notes, chapters, transcripts and episode SEO',
            'Short-form clips cut from every episode',
            'Publishing and distribution to every major platform',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Audio editing, mixing and mastering',
          body: [
            'Each track is edited separately, then levelled, de-noised and mastered so every guest sits at the same volume and the episode holds up on phone speakers, car audio and studio headphones alike.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Video podcast editing',
          body: [
            'For filmed shows we cut multi-camera footage to the conversation, match colour across angles, add titles and guest lower thirds, and deliver both the full episode and its vertical clips from the same session.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Multi-camera switching',
          body: [
            'Camera changes follow the conversation rather than a timer. Cutting on the beat of an exchange keeps a two-hour episode watchable; cutting every eight seconds regardless makes it exhausting.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Remote-recording repair',
          body: [
            'Remote episodes arrive with drift, dropouts and rooms that do not match. We resync tracks, patch what can be patched, and treat each side separately so a guest recording on a laptop does not sink the episode.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'What cannot be fixed afterwards',
          body: [
            'Clipped audio and heavy room echo cannot be fully repaired in post. When a recording arrives with either, we say so and suggest a setup change rather than shipping something that sounds over-processed.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'Podcast growth: how episodes find listeners',
          body: [
            'Podcast discovery is search, plus recommendation, plus whatever you put in front of people yourself. Editing and metadata serve the first two; clips and distribution serve the third.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Podcast SEO and episode metadata',
          body: [
            'Episode titles are written to be searched for as well as clicked. Show notes are structured with timestamps, guest details, links and a transcript, which is what makes an episode findable in Apple Podcasts, Spotify, YouTube and ordinary web search.',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Short-form clips and social distribution',
          body: [
            'Every episode yields several vertical clips with captions, each built as a standalone piece rather than a slice of a longer conversation. This is where most shows pick up listeners who were never going to find the full episode first.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Publishing and distribution',
          body: [
            'We publish to your host and confirm the episode has propagated to Apple Podcasts, Spotify, YouTube and the rest, so a feed error does not quietly cost you a week.',
          ].join('\n'),
        },
        {
          level: 3,
          heading: 'Who we work with',
          body: [
            'We take on shows that are already recording consistently, and shows launching that want the production side handled from episode one.',
          ].join('\n'),
          bullets: [
            'Independent podcasters who would rather record than edit',
            'Brand and B2B shows with a marketing outcome attached',
            'Video-first podcasts publishing to YouTube and social together',
            'Networks and studios needing reliable overflow post-production',
          ].join('\n'),
        },
        {
          level: 4,
          heading: 'Launching a new show',
          body: [
            'For a new show we help settle the format, the recording setup and the publishing workflow before the first episode, which is considerably cheaper than fixing all three at episode twenty.',
          ].join('\n'),
        },
        {
          level: 5,
          heading: 'Turnaround',
          body: [
            'Turnaround is agreed against your release schedule, with the edit back in time for you to review before the episode is due. Weekly shows run on a fixed weekly cycle.',
          ].join('\n'),
        },
        {
          level: 6,
          heading: 'Rush episodes',
          body: [
            'Time-sensitive episodes can be moved up the queue when the schedule allows. We confirm before committing rather than promising and slipping.',
          ].join('\n'),
        },
      ],
    },
    {
      sectionKey: 'faq',
      renderer: 'faq',
      eyebrow: 'FAQs',
      title: 'Frequently Asked Questions',
      faqVariant: 'plain',
    },
  ],

  caseMetrics: [
    { label: 'Downloads', icon: 'FiPlay', before: '25K', after: '240K', growth: '+860%' },
    { label: 'Retention', icon: 'FiUsers', before: '28%', after: '54%', growth: '+93%' },
    { label: 'Social Reach', icon: 'FiShare2', before: '50K', after: '750K', growth: '+1400%' },
    { label: 'Subscribers', icon: 'FiTrendingUp', before: '3.5K', after: '22K', growth: '+528%' },
  ],

  faqs: [
    {
      question: 'Do you edit both audio and video podcasts?',
      answer:
        'Yes. We handle audio-only shows, video podcasts, and hybrid formats — including multi-camera setups, remote recordings, and studio sessions. Every episode is delivered in the formats your distribution platforms need.',
    },
    {
      question: 'Can you remove background noise and improve voice quality?',
      answer:
        'Absolutely. Noise reduction, hum and hiss removal, de-essing, voice leveling, and full mixing and mastering are part of every episode we edit, so your show sounds consistent from the first minute to the last.',
    },
    {
      question: 'Do you create podcast Shorts and Reels?',
      answer:
        'Yes. Every episode can be repurposed into vertical short-form clips for YouTube Shorts, Instagram Reels, and TikTok — complete with captions, branded framing, and hooks chosen from the strongest moments in the episode.',
    },
    {
      question: 'Can you publish episodes for us?',
      answer:
        'We can. Our team schedules and publishes across Spotify, Apple Podcasts, YouTube, and your website — including titles, descriptions, chapters, tags, and thumbnails — so all you need to do is record.',
    },
  ],
};

const PAGES = [YOUTUBE, SOCIAL, PODCAST];

// ── Writer ──────────────────────────────────────────────────────────────────

const CHILD_MODELS = [
  GrowthServiceSection,
  GrowthServiceFeature,
  GrowthServiceStat,
  GrowthServiceShowcase,
  GrowthServiceCaseMetric,
  GrowthServiceFaq,
  GrowthServiceCta,
  GrowthServiceContent,
];

// FK values may have been written as either a string or an ObjectId, so clear
// out both representations before re-seeding.
const idVariants = (id) => {
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? [s, new mongoose.Types.ObjectId(s)] : [s];
};

const seedPage = async (page) => {
  const { slug } = page.service;

  const service = await GrowthService.findOneAndUpdate(
    { slug },
    { ...page.service, status: 1 },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const ids = idVariants(service._id);
  await Promise.all(
    CHILD_MODELS.map((m) => m.deleteMany({ growthServiceId: { $in: ids } }))
  );

  const growthServiceId = service._id;
  const withOrder = (rows, extra = {}) =>
    rows.map((row, i) => ({ ...row, ...extra, growthServiceId, displayOrder: i + 1, status: 1 }));

  await GrowthServiceCta.insertMany(withOrder(page.ctas));
  await GrowthServiceStat.insertMany(withOrder(page.stats));
  await GrowthServiceCaseMetric.insertMany(withOrder(page.caseMetrics));
  await GrowthServiceFaq.insertMany(withOrder(page.faqs));

  let sectionOrder = 0;
  for (const { features = [], showcases = [], contents = [], ...section } of page.sections) {
    sectionOrder += 1;
    await GrowthServiceSection.create({
      ...section,
      growthServiceId,
      displayOrder: sectionOrder,
      status: 1,
    });
    if (features.length) {
      await GrowthServiceFeature.insertMany(
        withOrder(features, { sectionKey: section.sectionKey })
      );
    }
    if (showcases.length) {
      await GrowthServiceShowcase.insertMany(
        withOrder(showcases, { sectionKey: section.sectionKey })
      );
    }
    if (contents.length) {
      await GrowthServiceContent.insertMany(
        withOrder(contents, { sectionKey: section.sectionKey })
      );
    }
  }

  const counts = {
    sections: page.sections.length,
    features: page.sections.reduce((n, s) => n + (s.features?.length || 0), 0),
    showcases: page.sections.reduce((n, s) => n + (s.showcases?.length || 0), 0),
    contentBlocks: page.sections.reduce((n, s) => n + (s.contents?.length || 0), 0),
    stats: page.stats.length,
    caseMetrics: page.caseMetrics.length,
    faqs: page.faqs.length,
    ctas: page.ctas.length,
  };
  console.log(`✅ ${page.service.name}`);
  console.log(`   ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
};

const seed = async () => {
  await connectDB();
  // connectDB retries in the background, so wait for a live connection rather
  // than firing writes into Mongoose's buffer and timing out.
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for MongoDB')), 30000);
      mongoose.connection.once('connected', () => { clearTimeout(timer); resolve(); });
    });
  }

  for (const page of PAGES) await seedPage(page);

  console.log('\n🌱 Growth services seeded.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

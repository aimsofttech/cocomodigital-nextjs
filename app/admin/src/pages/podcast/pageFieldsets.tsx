import type { ReactNode } from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import SlugField from '@/components/ui/SlugField';
import ImageUpload from '@/components/ui/ImageUpload';
import VideoSourceField from '@/components/ui/VideoSourceField';
import {
  HERO_POSTER_SPEC, NOT_FOR_VIDEO_SPEC, OG_TYPE_OPTIONS,
  PORTRAIT_SPEC, PROBLEM_BG_SPEC,
  TWITTER_CARD_OPTIONS, previewUrl,
} from './constants';
import { PodcastIconSelect, SelectField, TextAreaField, TextField } from './FormFields';

/* Every field on the podcast page record, grouped by the band it belongs to.
 *
 * PageWizard renders them — one band per step, for both creating and editing —
 * through `renderGroup`, so a group looks and behaves the same wherever it is
 * shown. Groups are ordered top-to-bottom exactly as the bands appear on the
 * live page, so an editor can find one by picturing where it sits on the site.
 */

export interface PageFieldContext {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  isEdit: boolean;
}

export interface PageFieldGroup {
  /** Stable id — the wizard composes its steps out of these. */
  key: string;
  title: string;
  /* Every record field this group edits. The wizard reads these to tell whether
     a step has actually been filled in, so it can only tick the ones that have
     been — a tick that appears the moment the record exists teaches an editor
     to distrust the whole stepper. */
  fields: string[];
  hint?: string | ((isEdit: boolean) => string);
  Fields: (ctx: PageFieldContext) => ReactNode;
}

/** The card every group is drawn in. */
export function Fieldset({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Draw one group. Shared so the two screens can't render it differently. */
export function renderGroup(group: PageFieldGroup, ctx: PageFieldContext) {
  const hint = typeof group.hint === 'function' ? group.hint(ctx.isEdit) : group.hint;
  return (
    <Fieldset key={group.key} title={group.title} hint={hint}>
      {group.Fields(ctx)}
    </Fieldset>
  );
}

/** Defaults for a new record, shared by both screens. */
export const PAGE_FORM_DEFAULTS = {
  status: '1',
  displayOrder: 0,
  heroPriceBadgeIcon: 'dollar',
  heroHoursBadgeIcon: 'clock',
  monthColDeliverable: 'Deliverable',
  monthColVolume: 'Volume',
  monthColDetail: 'Detail',
  auditNameLabel: 'Name',
  auditEmailLabel: 'Email',
  auditShowLabel: 'Show link',
  auditSubmittingLabel: 'Sending…',
  auditLeadTag: 'Podcast audit request',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  noIndex: false,
};

export const PAGE_FIELD_GROUPS: PageFieldGroup[] = [
  {
    key: 'identity',
    fields: [
      'name', 'slug', 'pagePath', 'pageUrl',
    ],
    title: 'Identity',
    /* Identity is set once, when the page is created, and is read-only
       afterwards. The slug is the key the website looks this record up by and
       the path is what the route is published at, so editing either on a live
       page detaches the two: the site would ask for a slug that no longer
       exists and fall back to its shipped copy. */
    hint: (isEdit) => (isEdit
      ? 'Fixed once the page exists. The website finds this record by its slug and publishes it at the path below, so changing either would detach the page from its own URL. Every other section on this form is editable.'
      : 'The slug is how the website finds this record, and the path is where it is published. Both are locked after the page is created.'),
    Fields: ({ register, errors, watch, setValue, isEdit }) => (
      <>
        <TextField
          register={register}
          name="name"
          label="Page Name"
          required
          errors={errors}
          readOnly={isEdit}
          placeholder="e.g. Podcast Video Editing & Marketing Services"
        />
        {isEdit ? (
          <TextField
            register={register}
            name="slug"
            label="Slug"
            readOnly
            hint="URL-friendly identifier the website looks this page up by."
          />
        ) : (
          <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
        )}
        <TextField
          register={register}
          name="pagePath"
          label="Page Path"
          readOnly={isEdit}
          placeholder="/podcast-video-editing-marketing-services"
          hint="The address this record renders at, used for the breadcrumb and canonical."
        />
        <TextField
          register={register}
          name="pageUrl"
          label="Full Page URL"
          readOnly={isEdit}
          placeholder="https://cocomadigital.com/…"
          hint="Used in the page's structured data."
        />
      </>
    ),
  },

  {
    key: 'hero',
    fields: [
      'heroEyebrow', 'heroTitle', 'heroSub', 'heroPriceBadge',
      'heroPriceBadgeIcon', 'heroHoursBadge', 'heroHoursBadgeIcon', 'heroPoster',
      'heroPosterAlt', 'heroVideoId', 'heroPlayLabel',
    ],
    title: 'Hero',
    hint: 'The first screen: eyebrow, headline, one line of promise, one button (managed under Buttons & Links) and the photograph.',
    Fields: ({ register, watch, setValue }) => (
      <>
        <TextField register={register} name="heroEyebrow" label="Eyebrow" placeholder="e.g. For podcasters in the US, Canada & UK" />
        <TextField
          register={register}
          name="heroTitle"
          label="Headline (H1)"
          placeholder="e.g. Podcast Video Editing & Marketing Services"
          hint="The page's only H1. Keep it different from the other podcast page's headline so the two don't compete for the same search."
        />
        <TextAreaField
          register={register}
          name="heroSub"
          label="Sub-headline"
          rows={2}
          hint="One idea, one line. The service itself is enumerated by the service cards a screen later."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="heroPriceBadge" label="Price Badge" placeholder="e.g. Engagements start at $2,000/month" />
          <PodcastIconSelect register={register} name="heroPriceBadgeIcon" label="Price Badge Icon" hint="Small icon beside the price line." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="heroHoursBadge" label="Hours Badge" placeholder="e.g. US, Canada & UK hours overlap" />
          <PodcastIconSelect register={register} name="heroHoursBadgeIcon" label="Hours Badge Icon" hint="Small icon beside the hours line." />
        </div>
        <ImageUpload
          name="heroPoster"
          label="Hero Photograph"
          uploadType="image"
          folder="podcast/hero"
          recommended={HERO_POSTER_SPEC}
          value={watch('heroPoster')}
          previewSrc={previewUrl(watch('heroPoster'))}
          onChange={(url) => setValue('heroPoster', url)}
        />
        <TextAreaField
          register={register}
          name="heroPosterAlt"
          label="Hero Photograph Alt Text"
          rows={2}
          hint="Describe what the photograph shows. Read aloud by screen readers and used by search engines."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            register={register}
            name="heroVideoId"
            label="Pitch Video (YouTube ID)"
            placeholder="Leave blank for a plain photograph"
            hint="Fill this in and the photograph becomes a click-to-play video. Blank means no play button at all — a control that does nothing is worse than none."
          />
          <TextField register={register} name="heroPlayLabel" label="Play Button Label" placeholder="e.g. Play the pitch video" />
        </div>
      </>
    ),
  },

  {
    key: 'credentials',
    fields: [
      'signatureLine', 'trustCaption',
    ],
    title: 'Credentials Strip',
    hint: 'The positioning line and the caption above the four studio numbers. The numbers themselves are managed under Trust Stats.',
    Fields: ({ register }) => (
      <>
        <TextAreaField register={register} name="signatureLine" label="Positioning Line" rows={2} />
        <TextAreaField
          register={register}
          name="trustCaption"
          label="Numbers Caption"
          rows={2}
          hint="This is what labels the figures as studio-wide rather than podcast results. Do not drop it."
        />
      </>
    ),
  },

  {
    key: 'problem',
    fields: [
      'problemTitle', 'problemLead', 'problemBgImage',
    ],
    title: 'Problem Band',
    hint: 'The three figures in this band are managed under Problem Stats.',
    Fields: ({ register, watch, setValue }) => (
      <>
        <TextField register={register} name="problemTitle" label="Heading" />
        <TextAreaField register={register} name="problemLead" label="Lead Paragraph" rows={6} />
        <ImageUpload
          name="problemBgImage"
          label="Background Photograph"
          uploadType="image"
          folder="podcast/problem"
          recommended={PROBLEM_BG_SPEC}
          value={watch('problemBgImage')}
          previewSrc={previewUrl(watch('problemBgImage'))}
          onChange={(url) => setValue('problemBgImage', url)}
        />
        <p className="-mt-2 text-xs text-gray-500">
          Decorative only — it sits behind the text under a heavy scrim and is hidden from screen readers, so it carries no alt text.
        </p>
      </>
    ),
  },

  {
    key: 'method',
    fields: [
      'methodEyebrow', 'methodTitle', 'methodLead',
    ],
    title: 'Signal-to-Scale Band',
    hint: 'The four stages themselves are managed under Method Stages.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="methodEyebrow" label="Eyebrow" placeholder="e.g. The method" />
        <TextField register={register} name="methodTitle" label="Heading" />
        <TextAreaField register={register} name="methodLead" label="Lead Paragraph" rows={3} />
      </>
    ),
  },

  {
    key: 'services',
    fields: [
      'servicesEyebrow', 'servicesTitle', 'servicesLead',
    ],
    title: 'Services Band',
    hint: 'The eight cards are managed under Services.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="servicesEyebrow" label="Eyebrow" placeholder="e.g. What we run" />
        <TextField register={register} name="servicesTitle" label="Heading" />
        <TextAreaField register={register} name="servicesLead" label="Lead Paragraph" rows={3} />
      </>
    ),
  },

  {
    key: 'audience',
    fields: [
      'audienceEyebrow', 'audienceTitle',
    ],
    title: 'Audience Band',
    hint: 'The three cards are managed under Audiences.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="audienceEyebrow" label="Eyebrow" placeholder="e.g. Who it’s for" />
        <TextField register={register} name="audienceTitle" label="Heading" />
      </>
    ),
  },

  {
    key: 'pricing',
    fields: [
      'pricingEyebrow', 'pricingHeading', 'pricingPrefix', 'pricingFloor',
      'pricingUnit', 'pricingLead', 'pricingIncludedTitle', 'pricingIncluded',
      'pricingScalesTitle', 'pricingScales', 'pricingNote',
    ],
    title: 'Pricing Band',
    hint: 'The published floor qualifies out hobby shows before a call, which is the whole point of putting it on the page.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="pricingEyebrow" label="Eyebrow" placeholder="e.g. Straight answer on price" />
        <TextField register={register} name="pricingHeading" label="Heading" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField register={register} name="pricingPrefix" label="Prefix" placeholder="From" />
          <TextField register={register} name="pricingFloor" label="Figure" placeholder="$2,000" />
          <TextField register={register} name="pricingUnit" label="Unit" placeholder="/month" />
        </div>
        <TextAreaField register={register} name="pricingLead" label="Lead Paragraph" rows={4} />
        <TextField register={register} name="pricingIncludedTitle" label="Left Column Heading" placeholder="What every engagement includes" />
        <TextAreaField
          register={register}
          name="pricingIncluded"
          label="Left Column Bullets"
          rows={7}
          hint="One ticked bullet per line."
        />
        <TextField register={register} name="pricingScalesTitle" label="Right Column Heading" placeholder="What moves the number" />
        <TextAreaField
          register={register}
          name="pricingScales"
          label="Right Column Bullets"
          rows={5}
          hint="One dashed bullet per line."
        />
        <TextAreaField register={register} name="pricingNote" label="Footnote" rows={2} />
      </>
    ),
  },

  {
    key: 'month',
    fields: [
      'monthEyebrow', 'monthTitle', 'monthLead', 'monthTableNote',
      'monthColDeliverable', 'monthColVolume', 'monthColDetail',
    ],
    title: 'Month Table',
    hint: 'The rows themselves are managed under Month Table.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="monthEyebrow" label="Eyebrow" placeholder="e.g. Output" />
        <TextField register={register} name="monthTitle" label="Heading" />
        <TextAreaField register={register} name="monthLead" label="Lead Paragraph" rows={4} />
        <TextAreaField
          register={register}
          name="monthTableNote"
          label="Table Caption"
          rows={2}
          hint="Sits above the table and is announced with it by screen readers."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField register={register} name="monthColDeliverable" label="Column 1 Heading" />
          <TextField register={register} name="monthColVolume" label="Column 2 Heading" />
          <TextField register={register} name="monthColDetail" label="Column 3 Heading" />
        </div>
      </>
    ),
  },

  {
    key: 'notFor',
    fields: [
      'notForEyebrow', 'notForHeading', 'notForLead', 'notForItems',
      'notForFootnote', 'notForVideoUrl', 'notForVideoFile',
    ],
    title: 'When We’re the Wrong Call',
    hint: 'Saying plainly who this is not for raises conversion among the people it is for. It is load-bearing, not filler.',
    Fields: ({ register, watch, setValue }) => (
      <>
        <TextField register={register} name="notForEyebrow" label="Eyebrow" placeholder="e.g. Straight talk" />
        <TextField register={register} name="notForHeading" label="Heading" />
        <TextAreaField register={register} name="notForLead" label="Lead Paragraph" rows={3} />
        <TextAreaField
          register={register}
          name="notForItems"
          label="Disqualifiers"
          rows={6}
          hint="One per line. Each renders with a cross."
        />
        <TextAreaField register={register} name="notForFootnote" label="Footnote" rows={2} />

        {/* One video, chosen one way. The tabs clear each other, so a record
            never carries both a link and an upload. Leave both empty and the
            still stays a plain photograph with no play button. */}
        <VideoSourceField
          register={register}
          watch={watch}
          setValue={setValue}
          urlName="notForVideoUrl"
          fileName="notForVideoFile"
          label="Video"
          folder="podcast/not-for"
          recommended={NOT_FOR_VIDEO_SPEC}
          urlPlaceholder="e.g. https://youtu.be/… , a Vimeo link, or a direct .mp4"
        />
      </>
    ),
  },

  {
    key: 'founder',
    fields: [
      'founderEyebrow', 'founderName', 'founderRole', 'founderPortrait',
      'founderPortraitAlt', 'founderLines',
    ],
    title: 'Founder Note',
    hint: 'A named, visible owner is the strongest trust signal for an overseas buyer, which is why this sits directly under the pricing block.',
    Fields: ({ register, watch, setValue }) => (
      <>
        <TextField register={register} name="founderEyebrow" label="Eyebrow" placeholder="e.g. Who you’re actually dealing with" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="founderName" label="Name" />
          <TextField register={register} name="founderRole" label="Role" placeholder="Founder, Cocoma Digital" />
        </div>
        <ImageUpload
          name="founderPortrait"
          label="Portrait"
          uploadType="image"
          folder="podcast/founder"
          recommended={PORTRAIT_SPEC}
          value={watch('founderPortrait')}
          previewSrc={previewUrl(watch('founderPortrait'))}
          onChange={(url) => setValue('founderPortrait', url)}
        />
        <TextField register={register} name="founderPortraitAlt" label="Portrait Alt Text" placeholder="e.g. Anil Mahato, founder of Cocoma Digital." />
        <TextAreaField
          register={register}
          name="founderLines"
          label="Note"
          rows={8}
          hint="One paragraph per line. Written in the founder's own voice and signed with their name and face."
        />
      </>
    ),
  },

  {
    key: 'ops',
    fields: [
      'opsEyebrow', 'opsTitle',
    ],
    title: 'Working Across Time Zones',
    hint: 'The three cards are managed under Time Zones.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="opsEyebrow" label="Eyebrow" placeholder="e.g. Working across time zones" />
        <TextField register={register} name="opsTitle" label="Heading" />
      </>
    ),
  },

  {
    key: 'studio',
    fields: [
      'studioEyebrow', 'studioHeading', 'studioBody', 'studioScaleNote',
    ],
    title: 'Studio Strip',
    hint: 'The photographs are managed under Studio Shots and the four figures under Scale Stats.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="studioEyebrow" label="Eyebrow" placeholder="e.g. The room this runs from" />
        <TextField register={register} name="studioHeading" label="Heading" />
        <TextAreaField register={register} name="studioBody" label="Lead Paragraph" rows={4} />
        <TextAreaField
          register={register}
          name="studioScaleNote"
          label="Figures Footnote"
          rows={3}
          hint="This is the second place the page states that those figures are studio-wide rather than podcast results. Do not drop it."
        />
      </>
    ),
  },

  {
    key: 'process',
    fields: [
      'processEyebrow', 'processTitle',
    ],
    title: 'Process Band',
    hint: 'The three steps are managed under Process.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="processEyebrow" label="Eyebrow" placeholder="e.g. How engagements run" />
        <TextField register={register} name="processTitle" label="Heading" />
      </>
    ),
  },

  {
    key: 'proof',
    fields: [
      'proofEyebrow', 'proofTitle', 'proofParagraphs',
    ],
    title: 'Proof Band',
    hint: 'The two links at the foot of this band are managed under Buttons & Links, with placement “Proof”.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="proofEyebrow" label="Eyebrow" placeholder="e.g. What we can show you" />
        <TextField register={register} name="proofTitle" label="Heading" />
        <TextAreaField
          register={register}
          name="proofParagraphs"
          label="Paragraphs"
          rows={10}
          hint="One paragraph per line. This band exists to be precise about what the studio's figures do and do not prove — keep it honest."
        />
      </>
    ),
  },

  {
    key: 'faq',
    fields: [
      'faqEyebrow', 'faqTitle',
    ],
    title: 'FAQ Band',
    hint: 'The questions themselves are managed under FAQs.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="faqEyebrow" label="Eyebrow" placeholder="e.g. Questions" />
        <TextField register={register} name="faqTitle" label="Heading" />
      </>
    ),
  },

  {
    key: 'closing',
    fields: [
      'finalTitle', 'finalLead', 'finalPoints',
    ],
    title: 'Closing Band',
    hint: 'The copy beside the audit form at the foot of the page.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="finalTitle" label="Heading" />
        <TextAreaField register={register} name="finalLead" label="Lead Paragraph" rows={3} />
        <TextAreaField
          register={register}
          name="finalPoints"
          label="Reassurance Points"
          rows={4}
          hint="One ticked point per line."
        />
      </>
    ),
  },

  {
    key: 'audit',
    fields: [
      'auditNameLabel', 'auditNamePlaceholder', 'auditEmailLabel',
      'auditEmailPlaceholder', 'auditShowLabel', 'auditShowPlaceholder',
      'auditSubmitLabel', 'auditSubmittingLabel', 'auditNote', 'auditDoneTitle',
      'auditDoneBody', 'auditContactEmail', 'auditErrorFallback', 'auditLeadTag',
    ],
    title: 'Audit Form',
    hint: 'The labels and messages on the three-field form. Submissions land in Contact → Contact Us, tagged with the lead type below.',
    Fields: ({ register }) => (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="auditNameLabel" label="Name Field Label" />
          <TextField register={register} name="auditNamePlaceholder" label="Name Placeholder" placeholder="Your name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="auditEmailLabel" label="Email Field Label" />
          <TextField register={register} name="auditEmailPlaceholder" label="Email Placeholder" placeholder="you@company.com" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="auditShowLabel" label="Show Link Field Label" />
          <TextField register={register} name="auditShowPlaceholder" label="Show Link Placeholder" placeholder="https://youtube.com/@yourshow" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="auditSubmitLabel" label="Submit Button Label" />
          <TextField register={register} name="auditSubmittingLabel" label="Submitting Label" placeholder="Sending…" />
        </div>
        <TextField register={register} name="auditNote" label="Note Under the Button" placeholder="No obligation. You get the findings either way." />
        <TextField register={register} name="auditDoneTitle" label="Thank-You Heading" placeholder="Got it." />
        <TextAreaField
          register={register}
          name="auditDoneBody"
          label="Thank-You Message"
          rows={3}
          hint="The contact email below is appended to this as a link, followed by a full stop — so end this sentence with something like “…if it’s urgent, email”."
        />
        <TextField
          register={register}
          name="auditContactEmail"
          label="Contact Email"
          placeholder="anil@cocomadigital.com"
          hint="Shown as a mailto link in the thank-you message."
        />
        <TextAreaField
          register={register}
          name="auditErrorFallback"
          label="Error Message"
          rows={2}
          hint="Shown when the submission fails for a reason the server doesn't explain."
        />
        <TextField
          register={register}
          name="auditLeadTag"
          label="Lead Type Tag"
          placeholder="Podcast audit request"
          hint="Written into the message as “[Type: …]” so these leads stay filterable in the contact list. Changing it changes how new leads are labelled."
        />
      </>
    ),
  },

  {
    key: 'seo',
    fields: [
      'metaTitle', 'metaDescription', 'metaKeywords', 'metaSecondaryKeywords',
      'canonicalUrl', 'noIndex',
    ],
    title: 'Search Engine Listing',
    hint: 'What Google shows in its results. Aim for a title around 60 characters and a description around 155 — beyond that they get truncated mid-sentence.',
    Fields: ({ register }) => (
      <>
        <TextField
          register={register}
          name="metaTitle"
          label="SEO Title"
          placeholder="Defaults to the page name"
          hint="“ | Cocoma Digital” is appended automatically, so leave it off."
        />
        <TextAreaField
          register={register}
          name="metaDescription"
          label="Meta Description"
          rows={3}
          hint="One or two sentences giving someone a reason to click. Not a keyword list."
        />
        <TextAreaField
          register={register}
          name="metaKeywords"
          label="Focus Keywords"
          rows={3}
          placeholder="podcast production agency, video podcast editing services, …"
          hint="Comma-separated. The terms this page is written to rank for."
        />
        <TextAreaField
          register={register}
          name="metaSecondaryKeywords"
          label="Secondary Keywords"
          rows={2}
          hint="Comma-separated supporting terms, published after the focus keywords."
        />
        <TextField
          register={register}
          name="canonicalUrl"
          label="Canonical URL"
          placeholder="Leave blank to use the page's own address"
          hint="Absolute URL. Blank is almost always right — set it only when this page duplicates another."
        />
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input {...register('noIndex')} type="checkbox" className="form-checkbox" />
            Hide this page from search engines
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Adds a noindex tag. This is the site's single ranking target for podcast searches, so switching it on takes it out of Google entirely.
          </p>
        </div>
      </>
    ),
  },

  {
    key: 'og',
    fields: [
      'ogTitle', 'ogDescription', 'ogType', 'ogImage', 'ogImageAlt',
      'ogImageWidth', 'ogImageHeight', 'ogImageType',
    ],
    title: 'Social Sharing — Open Graph',
    hint: 'The preview card shown when this URL is pasted into Facebook, LinkedIn, WhatsApp or Slack. Every field is optional: blank ones inherit the search listing above, and a blank image falls back to the branded card generated from the fields further down.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="ogTitle" label="OG Title" placeholder="Falls back to the SEO title" />
        <TextAreaField register={register} name="ogDescription" label="OG Description" rows={2} hint="Falls back to the meta description. Shorter reads better in a feed." />
        <SelectField register={register} name="ogType" label="OG Type" options={OG_TYPE_OPTIONS} />
        <TextField
          register={register}
          name="ogImage"
          label="OG Image URL"
          placeholder="Leave blank to use the generated card"
          hint="An absolute https:// URL to a public 1200×630 JPG or PNG. Anything behind a login or a redirect will not render — the scrapers fetch it anonymously."
        />
        <TextField register={register} name="ogImageAlt" label="OG Image Alt Text" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Image Width</label>
            <input {...register('ogImageWidth')} type="number" className="form-input" placeholder="1200" />
          </div>
          <div>
            <label className="form-label">Image Height</label>
            <input {...register('ogImageHeight')} type="number" className="form-input" placeholder="630" />
          </div>
          <TextField register={register} name="ogImageType" label="Image MIME Type" placeholder="image/png" />
        </div>
      </>
    ),
  },

  {
    key: 'twitter',
    fields: [
      'twitterCard', 'twitterTitle', 'twitterDescription', 'twitterImage',
      'twitterImageAlt',
    ],
    title: 'Social Sharing — X / Twitter',
    hint: 'Blank fields inherit the Open Graph values above, so fill these in only when the card should read differently on X.',
    Fields: ({ register }) => (
      <>
        <SelectField register={register} name="twitterCard" label="Card Type" options={TWITTER_CARD_OPTIONS} />
        <TextField register={register} name="twitterTitle" label="Twitter Title" placeholder="Falls back to the OG title" />
        <TextAreaField register={register} name="twitterDescription" label="Twitter Description" rows={2} />
        <TextField register={register} name="twitterImage" label="Twitter Image URL" placeholder="Falls back to the OG image" />
        <TextField register={register} name="twitterImageAlt" label="Twitter Image Alt Text" />
      </>
    ),
  },

  {
    key: 'ogCard',
    fields: [
      'ogCardEyebrow', 'ogCardTitle', 'ogCardDescription', 'ogCardBadgeOne',
      'ogCardBadgeTwo',
    ],
    title: 'Generated Share Card',
    hint: 'When no OG image is set, the website draws its own card from these fields — black background, yellow rule, two pills. Kept separate from the meta copy because the card is typeset: the headline has to fit two lines at a large size.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="ogCardEyebrow" label="Card Eyebrow" placeholder="Cocoma Digital" />
        <TextField register={register} name="ogCardTitle" label="Card Headline" hint="Falls back to the SEO title." />
        <TextAreaField register={register} name="ogCardDescription" label="Card Description" rows={3} hint="Falls back to the meta description." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField register={register} name="ogCardBadgeOne" label="Yellow Pill" placeholder="From $2,000/month" />
          <TextField register={register} name="ogCardBadgeTwo" label="Outlined Pill" placeholder="US · Canada · UK hours" />
        </div>
      </>
    ),
  },

  {
    key: 'schema',
    fields: [
      'schemaName', 'schemaServiceType', 'schemaDescription', 'schemaAreaServed',
      'schemaAudienceType', 'schemaOfferCatalogName', 'breadcrumbLabel',
    ],
    title: 'Structured Data',
    hint: 'Published as schema.org markup so the page can qualify for rich results. The FAQ block and the service catalogue are generated from the FAQs and service cards automatically.',
    Fields: ({ register }) => (
      <>
        <TextField register={register} name="schemaName" label="Service Name" hint="Falls back to the SEO title." />
        <TextField register={register} name="schemaServiceType" label="Service Type" placeholder="e.g. Podcast production, editing and growth" />
        <TextAreaField register={register} name="schemaDescription" label="Service Description" rows={3} hint="Falls back to the meta description." />
        <TextAreaField
          register={register}
          name="schemaAreaServed"
          label="Countries Served"
          rows={6}
          placeholder={'One per line, e.g.\nIndia\nUnited States'}
          hint="One country per line."
        />
        <TextAreaField register={register} name="schemaAudienceType" label="Audience" rows={3} placeholder="Who the service is for, in one sentence" />
        <TextField register={register} name="schemaOfferCatalogName" label="Offer Catalogue Name" placeholder="Podcast production and growth services" />
        <TextField
          register={register}
          name="breadcrumbLabel"
          label="Breadcrumb Label"
          hint="The trailing crumb after Home. Falls back to the page name."
        />
      </>
    ),
  },

  {
    key: 'publishing',
    fields: [
      'displayOrder', 'status',
    ],
    title: 'Publishing',
    Fields: ({ register }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Display Order</label>
          <input {...register('displayOrder')} type="number" className="form-input" placeholder="0" />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-select">
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Inactive pages are hidden from the website.</p>
        </div>
      </div>
    ),
  },
];

/** Look a group up by key — the wizard composes its steps this way. */
export const group = (key: string): PageFieldGroup => {
  const found = PAGE_FIELD_GROUPS.find((g) => g.key === key);
  if (!found) throw new Error(`Unknown podcast page field group: ${key}`);
  return found;
};

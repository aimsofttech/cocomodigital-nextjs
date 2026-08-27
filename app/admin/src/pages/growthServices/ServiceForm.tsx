import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import ContentLoader from '@/components/ui/ContentLoader';
import { growthServiceApi } from '@/services/adminApi';
import {
  CASE_ACCENT_OPTIONS, CASE_BADGE_OPTIONS, DASHBOARD_OPTIONS, ILLUSTRATION_OPTIONS,
  OG_TYPE_OPTIONS, TWITTER_CARD_OPTIONS,
} from './constants';
import { IconSelect, SelectField, TextAreaField, TextField } from './FormFields';

/* The page-level record: everything that appears exactly once on a growth
 * landing page. Repeating content (sections, cards, stats, metrics, FAQs,
 * buttons) is managed from the child lists, reachable from the services table.
 *
 * This is a full-page form rather than a modal — it carries five groups of
 * fields and a modal would force a scroll-within-a-scroll.
 */

function Fieldset({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    defaultValues: {
      status: '1',
      displayOrder: 0,
      dashboardKey: 'channel',
      closingIllustrationKey: 'youtube',
      caseMediaAccentLine: 'two',
      caseMediaBadge: 'none',
      ogType: 'website',
      twitterCard: 'summary_large_image',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageType: 'image/png',
      noIndex: false,
    },
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    growthServiceApi.getOne(id)
      .then(({ data }) => reset({ ...data.data, status: String(data.data.status ?? 1) }))
      .catch(() => toast.error('Failed to load the growth service'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (values: any) => {
    try {
      if (isEdit && id) await growthServiceApi.update(id, values);
      else await growthServiceApi.create(values);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      navigate('/growth-services/service');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  if (loading) return <ContentLoader />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Growth Service' : 'Add Growth Service'}
        breadcrumbs={[
          { label: 'Growth Services', path: '/growth-services/service' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-5">
        <Fieldset
          title="Identity"
          hint="The slug is the page's URL segment — /services/<slug> — so changing it changes the live address."
        >
          <TextField
            register={register}
            name="name"
            label="Service Name"
            required
            errors={errors}
            placeholder="e.g. End-to-End YouTube Growth Services"
          />
          <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
          <TextField
            register={register}
            name="pageUrl"
            label="Canonical Page URL"
            placeholder="https://cocomadigital.com/services/…"
            hint="Used in the page's structured data."
          />
        </Fieldset>

        <Fieldset title="Hero">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField register={register} name="heroBadgeLabel" label="Badge Label" placeholder="e.g. Grow Views, Leads, and Your Brand" />
            <IconSelect
              register={register}
              name="heroBadgeIcon"
              label="Badge Icon"
              hint="Icon inside the yellow pill above the headline."
            />
          </div>
          <TextAreaField
            register={register}
            name="heroHeadline"
            label="Headline"
            rows={3}
            placeholder={'One line per row, e.g.\nEnd-to-End\n*YouTube Growth*\nServices'}
            hint="One headline line per row. Wrap a line in *asterisks* to give it the yellow marker highlight."
          />
          <TextAreaField
            register={register}
            name="heroParagraphs"
            label="Intro Paragraphs"
            rows={4}
            placeholder="One paragraph per line."
            hint="One paragraph per line. Blank lines are ignored."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              register={register}
              name="heroTrustInitials"
              label="Trust Avatar Initials"
              placeholder="NV, SG, RB, KT"
              hint="Comma-separated. Shown as the stacked avatar placeholders."
            />
            <TextField register={register} name="heroTrustLabel" label="Trust Label" placeholder="Trusted by 500+ creators & businesses" />
          </div>
          <SelectField
            register={register}
            name="dashboardKey"
            label="Hero Dashboard"
            options={DASHBOARD_OPTIONS}
            hint="The illustrated product mock beside the hero copy."
          />
          <TextField
            register={register}
            name="statsLabel"
            label="Stats Band Label"
            placeholder="YouTube growth results at a glance"
            hint="Screen-reader label for the KPI row. Edit the tiles themselves under Stats."
          />
        </Fieldset>

        <Fieldset
          title="Case Study"
          hint="The narrative half of the case-study band. Its table rows are managed under Case Metrics."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField register={register} name="caseStudyTitle" label="Client / Show Name" placeholder="e.g. Tech Explained" />
            <TextField register={register} name="caseStudySubtitle" label="Subtitle" placeholder="e.g. Niche: Tech Reviews" />
          </div>
          <TextAreaField
            register={register}
            name="caseStudyParagraphs"
            label="Narrative"
            rows={3}
            placeholder="One paragraph per line."
            hint="One paragraph per line."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField register={register} name="caseMediaLineOne" label="Media Card — Line 1" placeholder="e.g. Tech" />
            <TextField register={register} name="caseMediaLineTwo" label="Media Card — Line 2" placeholder="e.g. Explained" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectField register={register} name="caseMediaAccentLine" label="Highlighted Line" options={CASE_ACCENT_OPTIONS} />
            <SelectField register={register} name="caseMediaBadge" label="Corner Badge" options={CASE_BADGE_OPTIONS} />
            <TextField register={register} name="caseMediaSubtitle" label="Media Subtitle" placeholder="e.g. with Alex Martin" />
          </div>
        </Fieldset>

        <Fieldset title="Closing Band">
          <TextAreaField
            register={register}
            name="closingTitle"
            label="Heading"
            rows={2}
            placeholder={'One line per row, e.g.\nReady to Accelerate\nYour YouTube Growth?'}
            hint="One line per row; each renders on its own line."
          />
          <TextAreaField register={register} name="closingDescription" label="Description" rows={2} />
          <SelectField register={register} name="closingIllustrationKey" label="Illustration" options={ILLUSTRATION_OPTIONS} />
        </Fieldset>

        <Fieldset
          title="Image Alt Text"
          hint="The hero dashboard, the case-study card and the closing artwork are drawn as graphics rather than uploaded images, so this is their alt text. Describe what the picture shows. A blank field marks that graphic decorative, which hides it from screen readers instead of announcing it unlabelled."
        >
          <TextField
            register={register}
            name="heroMediaAlt"
            label="Hero Dashboard Alt Text"
            placeholder="e.g. Illustrated YouTube analytics dashboard showing rising views and subscribers"
          />
          <TextField
            register={register}
            name="caseMediaAlt"
            label="Case Study Card Alt Text"
            placeholder="e.g. Channel artwork placeholder for the Tech Explained YouTube channel"
          />
          <TextField
            register={register}
            name="closingMediaAlt"
            label="Closing Illustration Alt Text"
            placeholder="e.g. Illustration of a play button beside rising growth bars"
          />
        </Fieldset>

        <Fieldset
          title="Search Engine Listing"
          hint="What Google shows in its results. Aim for a title around 60 characters and a description around 155 — beyond that they get truncated mid-sentence."
        >
          <TextField
            register={register}
            name="metaTitle"
            label="SEO Title"
            placeholder="Defaults to the service name"
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
            rows={2}
            placeholder="YouTube growth services, YouTube SEO, …"
            hint="Comma-separated. The terms this page is written to rank for — keep it to a handful."
          />
          <TextAreaField
            register={register}
            name="metaSecondaryKeywords"
            label="Secondary Keywords"
            rows={2}
            placeholder="YouTube video editing services, YouTube channel optimization, …"
            hint="Comma-separated supporting terms, published after the focus keywords."
          />
          <TextField
            register={register}
            name="canonicalUrl"
            label="Canonical URL"
            placeholder="https://cocomadigital.com/services/…"
            hint="Absolute URL. Leave blank to use the page's own address, which is almost always right — set it only when this page duplicates another."
          />
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input {...register('noIndex')} type="checkbox" className="form-checkbox" />
              Hide this page from search engines
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Adds a noindex tag. The page stays live and linkable — use Status below to take it down entirely.
            </p>
          </div>
        </Fieldset>

        <Fieldset
          title="Social Sharing — Open Graph"
          hint="The preview card shown when this URL is pasted into Facebook, LinkedIn, WhatsApp or Slack. Every field is optional: blank ones inherit the search listing above, and a blank image falls back to a branded card generated from this page's own copy."
        >
          <TextField register={register} name="ogTitle" label="OG Title" placeholder="Falls back to the SEO title" />
          <TextAreaField
            register={register}
            name="ogDescription"
            label="OG Description"
            rows={2}
            hint="Falls back to the meta description. Shorter reads better in a feed."
          />
          <SelectField register={register} name="ogType" label="OG Type" options={OG_TYPE_OPTIONS} />
          <TextField
            register={register}
            name="ogImage"
            label="OG Image URL"
            placeholder="Leave blank to use the generated card"
            hint="An absolute https:// URL to a public 1200×630 JPG or PNG. Anything behind a login or a redirect will not render — the scrapers fetch it anonymously."
          />
          <TextField
            register={register}
            name="ogImageAlt"
            label="OG Image Alt Text"
            placeholder="e.g. End-to-End YouTube Growth Services from Cocoma Digital"
          />
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
        </Fieldset>

        <Fieldset
          title="Social Sharing — X / Twitter"
          hint="Blank fields inherit the Open Graph values above, so fill these in only when the card should read differently on X."
        >
          <SelectField register={register} name="twitterCard" label="Card Type" options={TWITTER_CARD_OPTIONS} />
          <TextField register={register} name="twitterTitle" label="Twitter Title" placeholder="Falls back to the OG title" />
          <TextAreaField register={register} name="twitterDescription" label="Twitter Description" rows={2} />
          <TextField
            register={register}
            name="twitterImage"
            label="Twitter Image URL"
            placeholder="Falls back to the OG image"
            hint="Absolute https:// URL, publicly reachable."
          />
          <TextField register={register} name="twitterImageAlt" label="Twitter Image Alt Text" />
        </Fieldset>

        <Fieldset
          title="Structured Data"
          hint="Published as schema.org markup so the page can qualify for rich results. The breadcrumb, FAQ and service-catalogue blocks are generated from this page's own content automatically."
        >
          <TextField register={register} name="schemaServiceType" label="Schema Service Type" placeholder="e.g. YouTube channel growth and management" />
          <TextAreaField
            register={register}
            name="schemaDescription"
            label="Schema Description"
            rows={3}
            hint="Falls back to the meta description when left blank."
          />
        </Fieldset>

        <Fieldset title="Publishing">
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
        </Fieldset>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/growth-services/service')} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

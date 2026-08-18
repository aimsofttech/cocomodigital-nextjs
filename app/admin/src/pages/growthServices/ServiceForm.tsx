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

        <Fieldset title="SEO & Structured Data">
          <TextField register={register} name="metaTitle" label="Meta Title" placeholder="Defaults to the service name" />
          <TextAreaField register={register} name="metaDescription" label="Meta Description" rows={3} />
          <TextAreaField
            register={register}
            name="metaKeywords"
            label="Meta Keywords"
            rows={2}
            placeholder="YouTube growth services, YouTube SEO, …"
            hint="Comma-separated."
          />
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

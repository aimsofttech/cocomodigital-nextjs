import { useSearchParams } from 'react-router-dom';
import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageCell } from '@/components/ui/MediaCell';
import { podcastCardApi } from '@/services/adminApi';
import { CARD_SECTION_OPTIONS, CARD_BG_SPEC, previewUrl } from './constants';
import { PodcastIconSelect, SelectField, TextAreaField, TextField } from './FormFields';

/* The repeating items across five bands — service cards, audience cards, the
 * time-zone cards, the process steps and the month table. They are the same
 * {icon, step, title, body, meta, points} shape underneath, so one list carries
 * them all and the form shows only the fields the chosen band actually draws.
 *
 * Open the list from a band's button on the pages table and it stays pinned to
 * that band, with the field set already narrowed. */

const SECTION_LABELS: Record<string, string> = {
  services: 'Services',
  audiences: 'Audiences',
  operations: 'Time Zones',
  process: 'Process',
  month: 'Month Table',
};

/* What each field is called, and whether it is drawn, in each band. A field
 * absent from a band's map is hidden by the form rather than shown empty. */
const FIELDS: Record<string, {
  title: string;
  titleHint?: string;
  body?: string;
  bodyHint?: string;
  meta?: string;
  metaHint?: string;
  points?: string;
  pointsHint?: string;
  step?: string;
  icon?: boolean;
  /* Background artwork. Only the service cards carry one today — the other
     bands render on a plain surface, so the field would only be clutter. */
  image?: boolean;
}> = {
  services: {
    title: 'Card Title',
    body: 'One-line promise',
    bodyHint: 'One line, not a paragraph — eight paragraphs in this grid read as a wall and get skipped.',
    points: 'Tags',
    pointsHint: 'One tag per row. These carry the detail and the search terms in a form the eye can scan.',
    icon: true,
    image: true,
  },
  audiences: {
    title: 'Audience',
    body: 'Description',
    meta: 'Signal',
    metaHint: 'The short qualifier under the copy, e.g. "Weekly or bi-weekly cadence, video-first".',
    icon: true,
  },
  operations: {
    title: 'Question',
    body: 'Answer',
    icon: true,
  },
  process: {
    title: 'Step Name',
    body: 'Description',
    meta: 'Duration',
    metaHint: 'The label beside the step name, e.g. "No cost", "Ongoing".',
    step: 'Step Number',
  },
  month: {
    title: 'Deliverable',
    titleHint: 'The first column of the table.',
    body: 'Detail',
    bodyHint: 'The third column — what the deliverable actually includes.',
    meta: 'Volume',
    metaHint: 'The middle column, e.g. "4", "48", "Per calendar".',
  },
};

export function CardForm({ editId, lockedPageId, lockedSectionKey, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={podcastCardApi}
      editId={editId}
      lockedPageId={lockedPageId}
      lockedSectionKey={lockedSectionKey}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ sectionKey: lockedSectionKey || 'services' }}
    >
      {({ register, errors, watch, setValue }) => {
        const section = watch('sectionKey') || lockedSectionKey || 'services';
        const f = FIELDS[section] || FIELDS.services;
        return (
          <>
            {!lockedSectionKey && (
              <SelectField
                register={register}
                name="sectionKey"
                label="Band"
                options={CARD_SECTION_OPTIONS}
                required
                errors={errors}
                hint="Which band on the page this item appears in. The fields below change to match."
              />
            )}
            {f.step && (
              <TextField
                register={register}
                name="step"
                label={f.step}
                placeholder="e.g. 01"
                hint="Printed as the large numeral beside the step."
              />
            )}
            <TextField
              register={register}
              name="title"
              label={f.title}
              required
              errors={errors}
              hint={f.titleHint}
            />
            {f.body && (
              <TextAreaField
                register={register}
                name="body"
                label={f.body}
                rows={3}
                hint={f.bodyHint}
              />
            )}
            {f.meta && (
              <TextField register={register} name="meta" label={f.meta} hint={f.metaHint} />
            )}
            {f.points && (
              <TextAreaField
                register={register}
                name="points"
                label={f.points}
                rows={4}
                placeholder={'One per line, e.g.\nMulticam\nCaptions\nLower thirds'}
                hint={f.pointsHint}
              />
            )}
            {f.icon && <PodcastIconSelect register={register} />}
            {f.image && (
              <>
                <ImageUpload
                  name="image"
                  label="Background Image"
                  uploadType="image"
                  folder="podcast/services"
                  recommended={CARD_BG_SPEC}
                  value={watch('image')}
                  previewSrc={previewUrl(watch('image'))}
                  onChange={(url) => setValue('image', url)}
                />
                <TextAreaField
                  register={register}
                  name="imageAlt"
                  label="Background Alt Text"
                  rows={2}
                  hint="Usually leave this empty. The artwork sits behind the card's own words and adds nothing a reader needs, so it is better announced as decorative than described twice."
                />
              </>
            )}
          </>
        );
      }}
    </ChildForm>
  );
}

export default function CardList() {
  /* Which band the list is pinned to, if any — the same `?sectionKey` the list
     page itself reads. Only the service cards carry background artwork, so the
     column is worth a slot only there; pinned to any other band it would be a
     row of dashes. With no band pinned the list mixes every band together and
     the service rows still have something to show, so the column stays. */
  const [searchParams] = useSearchParams();
  const band = searchParams.get('sectionKey') || '';
  const showBackground = !band || Boolean(FIELDS[band]?.image);

  const columns = [
    {
      key: 'sectionKey', label: 'Band', sortable: true, className: 'min-w-[120px]',
      render: (row: any) => SECTION_LABELS[row.sectionKey] || row.sectionKey,
    },
    {
      key: 'title', label: 'Title', sortable: true, className: 'min-w-[200px] max-w-[320px]',
      render: (row: any) => (
        <span className="block truncate" title={row.title}>
          {row.step ? `${row.step} · ` : ''}{row.title}
        </span>
      ),
    },
    {
      key: 'body', label: 'Body', className: 'min-w-[240px] max-w-[420px]',
      render: (row: any) => <span className="block truncate" title={row.body}>{row.body || '—'}</span>,
    },
    {
      key: 'meta', label: 'Meta', className: 'min-w-[120px] max-w-[200px]',
      render: (row: any) => <span className="block truncate" title={row.meta}>{row.meta || '—'}</span>,
    },
    { key: 'icon', label: 'Icon', render: (row: any) => row.icon || '—' },
    ...(showBackground ? [{
      key: 'image', label: 'Background', className: 'min-w-[130px]',
      render: (row: any) => (row.image
        ? <ImageCell src={previewUrl(row.image)} alt={row.imageAlt || 'card background'} size="w-24 h-14" />
        : <span className="text-xs text-gray-400">—</span>),
    }] : []),
  ];

  return (
    <ChildListPage
      title="Section Items"
      breadcrumbLabel="Items"
      api={podcastCardApi}
      columns={columns}
      sectionLabels={SECTION_LABELS}
      extraFilters={[{
        key: 'sectionKey',
        label: 'Band',
        type: 'select',
        options: [{ value: '', label: 'All Bands' }, ...CARD_SECTION_OPTIONS.map((o) => ({
          value: o.value, label: SECTION_LABELS[o.value],
        }))],
      }]}
      renderForm={(props) => <CardForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Item' : 'Add Item')}
      modalSize="xl"
    />
  );
}

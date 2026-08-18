import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceShowcaseApi } from '@/services/adminApi';
import { SHOWCASE_BADGE_OPTIONS, SHOWCASE_TONE_OPTIONS } from './constants';
import { IconSelect, SelectField, TextAreaField, TextField } from './FormFields';

/* Panels for the two picture-led section renderers:
 *   showcase       — the social page's per-platform cards (9:16 mock + bullets)
 *   format-panels  — the podcast page's audio / video quality panels
 * They share a shape, so one collection serves both; the section's renderer
 * decides how a row is drawn. */

function ShowcaseForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceShowcaseApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ mediaBadge: 'none', tone: 'page' }}
    >
      {({ register, errors, watch }) => {
        const badge = watch('mediaBadge');
        const isFormatPanel = badge === 'play' || badge === 'video';
        return (
          <>
            <TextField
              register={register}
              name="sectionKey"
              label="Section Key"
              required
              errors={errors}
              placeholder="e.g. platforms, format-panels"
              hint="Must match the Section Key of a section using the showcase or format-panels renderer."
            />
            <TextField register={register} name="title" label="Title" required errors={errors} placeholder="e.g. Instagram Reels" />
            <TextAreaField
              register={register}
              name="points"
              label="Bullet Points"
              rows={5}
              placeholder={'One bullet per line, e.g.\nFast-paced cuts & transitions\nAnimated captions'}
              hint="One check-bullet per line. Blank lines are ignored."
            />
            <SelectField
              register={register}
              name="mediaBadge"
              label="Media Style"
              options={SHOWCASE_BADGE_OPTIONS}
              hint="Picks what renders inside the panel's frame."
            />
            <TextField
              register={register}
              name="caption"
              label={isFormatPanel ? 'Duration' : 'Caption'}
              placeholder={isFormatPanel ? 'e.g. 48:32' : 'e.g. Level up your content'}
              hint={isFormatPanel
                ? 'Timestamp shown on the player / video frame.'
                : 'Headline printed inside the vertical mock.'}
            />
            {!isFormatPanel && (
              <TextField register={register} name="metric" label="Engagement Metric" placeholder="e.g. 12.4K" />
            )}
            <IconSelect register={register} hint="Chip icon beside the panel title." />
            {isFormatPanel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField register={register} name="tone" label="Panel Surface" options={SHOWCASE_TONE_OPTIONS} />
                <IconSelect register={register} name="watermarkIcon" label="Watermark Icon" hint="Faded glyph in the panel’s bottom-right." />
              </div>
            )}
          </>
        );
      }}
    </ChildForm>
  );
}

export default function ShowcaseList() {
  const columns = [
    {
      key: 'sectionKey', label: 'Section', sortable: true, className: 'min-w-[130px]',
      render: (row: any) => row.sectionKey,
    },
    {
      key: 'title', label: 'Title', sortable: true, className: 'min-w-[180px]',
      render: (row: any) => <span className="block truncate" title={row.title}>{row.title}</span>,
    },
    {
      key: 'points', label: 'Bullets',
      render: (row: any) => String(row.points || '').split('\n').filter((p: string) => p.trim()).length,
    },
    { key: 'caption', label: 'Caption', render: (row: any) => row.caption || '—' },
    { key: 'mediaBadge', label: 'Media Style' },
  ];

  return (
    <ChildListPage
      title="Showcase Panels"
      breadcrumbLabel="Showcases"
      api={growthServiceShowcaseApi}
      columns={columns}
      renderForm={(props) => <ShowcaseForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Showcase Panel' : 'Add Showcase Panel')}
      modalSize="xl"
    />
  );
}

import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageCell } from '@/components/ui/MediaCell';
import { podcastShotApi } from '@/services/adminApi';
import { STUDIO_SHOT_SPEC, previewUrl } from './constants';
import { SelectField, TextAreaField, TextField } from './FormFields';

/* The captioned photographs in the studio strip. A wide frame spans two grid
 * columns; the grid re-flows on its own, so frames can be added, removed or
 * re-widened without touching the page. */

const WIDTH_OPTIONS = [
  { value: 'false', label: 'Standard — one column' },
  { value: 'true', label: 'Wide — spans two columns' },
];

export function ShotForm({ editId, lockedPageId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={podcastShotApi}
      editId={editId}
      lockedPageId={lockedPageId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ wide: 'false' }}
    >
      {({ register, errors, setValue, watch }) => (
        <>
          <ImageUpload
            name="image"
            label="Photograph"
            required
            uploadType="image"
            folder="podcast/studio"
            recommended={STUDIO_SHOT_SPEC}
            value={watch('image')}
            previewSrc={previewUrl(watch('image'))}
            onChange={(url) => setValue('image', url)}
          />
          <TextAreaField
            register={register}
            name="alt"
            label="Alt Text"
            rows={3}
            required
            errors={errors}
            placeholder="Describe what is actually visible in the frame"
            hint="Read aloud by screen readers and used by search engines. Describe only what the photograph shows — never the work you wish it showed."
          />
          <TextField
            register={register}
            name="caption"
            label="Caption"
            placeholder="e.g. The edit floor"
            hint="Printed under the frame. Keep it to what the picture proves."
          />
          <SelectField
            register={register}
            name="wide"
            label="Frame Width"
            options={WIDTH_OPTIONS}
            hint="Wide frames anchor the grid — two or three across the whole strip reads best."
          />
        </>
      )}
    </ChildForm>
  );
}

export default function ShotList() {
  const columns = [
    {
      key: 'image', label: 'Photograph', className: 'min-w-[160px]',
      render: (row: any) => <ImageCell src={previewUrl(row.image)} alt={row.alt || 'studio shot'} />,
    },
    {
      key: 'caption', label: 'Caption', sortable: true, className: 'min-w-[180px]',
      render: (row: any) => (
        <span className="block truncate" title={row.caption}>{row.caption || '—'}</span>
      ),
    },
    {
      key: 'alt', label: 'Alt Text', className: 'min-w-[240px] max-w-[420px]',
      render: (row: any) => <span className="block truncate" title={row.alt}>{row.alt || '—'}</span>,
    },
    {
      key: 'wide', label: 'Width',
      render: (row: any) => (row.wide === true || row.wide === 'true' ? 'Wide' : 'Standard'),
    },
  ];

  return (
    <ChildListPage
      title="Studio Shots"
      breadcrumbLabel="Studio Shots"
      api={podcastShotApi}
      columns={columns}
      renderForm={(props) => <ShotForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Studio Shot' : 'Add Studio Shot')}
      modalSize="xl"
    />
  );
}

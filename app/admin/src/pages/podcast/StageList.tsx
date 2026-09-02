import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageCell } from '@/components/ui/MediaCell';
import { podcastStageApi } from '@/services/adminApi';
import { DIAGRAM_OPTIONS, STAGE_ART_SPEC, previewUrl } from './constants';
import { SelectField, TextAreaField, TextField } from './FormFields';

/* The four stages of the Signal-to-Scale band. Each one carries a promise line,
 * a detail paragraph, a ticked capability list and the key of the inline
 * diagram drawn beside it. The diagrams are drawn in code, so the key is a
 * closed list — a name the page doesn't know renders no diagram at all. */

export function StageForm({ editId, lockedPageId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={podcastStageApi}
      editId={editId}
      lockedPageId={lockedPageId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ diagramKey: 'none' }}
    >
      {({ register, errors, watch, setValue }) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              register={register}
              name="step"
              label="Step Number"
              placeholder="e.g. 01"
              hint="Printed behind the diagram."
            />
            <TextField
              register={register}
              name="name"
              label="Stage Name"
              required
              errors={errors}
              placeholder="e.g. Align"
            />
          </div>
          <TextField
            register={register}
            name="promise"
            label="Promise"
            placeholder="The one-line claim under the stage name"
          />
          <TextAreaField
            register={register}
            name="detail"
            label="Detail"
            rows={5}
            placeholder="The paragraph that argues the stage"
          />
          <TextAreaField
            register={register}
            name="capabilities"
            label="Capabilities"
            rows={5}
            placeholder={'One per line, e.g.\nAudience definition and competitive positioning'}
            hint="One ticked bullet per line."
          />
          <ImageUpload
            name="image"
            label="Stage Image"
            uploadType="image"
            folder="podcast/stages"
            accept="image/*,.svg"
            recommended={STAGE_ART_SPEC}
            value={watch('image')}
            previewSrc={previewUrl(watch('image'))}
            onChange={(url) => setValue('image', url)}
          />
          <TextAreaField
            register={register}
            name="imageAlt"
            label="Stage Image Alt Text"
            rows={2}
            hint="Describe what the picture shows. Leave it empty and it is treated as decorative, which is right for a diagram that only restates the copy beside it — but a photograph with a subject should be described."
          />
          <SelectField
            register={register}
            name="diagramKey"
            label="Fallback Diagram"
            options={DIAGRAM_OPTIONS}
            hint="Drawn only when no illustration is uploaded above. These are the four diagrams the page shipped with, drawn in code."
          />
        </>
      )}
    </ChildForm>
  );
}

export default function StageList() {
  const columns = [
    {
      key: 'step', label: 'Step', sortable: true, className: 'min-w-[70px]',
      render: (row: any) => row.step || '—',
    },
    {
      key: 'name', label: 'Stage', sortable: true, className: 'min-w-[130px]',
      render: (row: any) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'promise', label: 'Promise', className: 'min-w-[240px] max-w-[400px]',
      render: (row: any) => (
        <span className="block truncate" title={row.promise}>{row.promise || '—'}</span>
      ),
    },
    {
      key: 'image', label: 'Illustration', className: 'min-w-[150px]',
      render: (row: any) => (row.image
        ? <ImageCell src={previewUrl(row.image)} alt={row.imageAlt || 'stage illustration'} size="w-28 h-16" />
        : <span className="text-xs text-gray-400">drawn: {row.diagramKey || '—'}</span>),
    },
  ];

  return (
    <ChildListPage
      title="Method Stages"
      breadcrumbLabel="Stages"
      api={podcastStageApi}
      columns={columns}
      extraFilters={[{
        key: 'diagramKey',
        label: 'Diagram',
        type: 'select',
        options: [{ value: '', label: 'All Diagrams' }, ...DIAGRAM_OPTIONS.map((d) => ({
          value: d.value, label: d.value,
        }))],
      }]}
      renderForm={(props) => <StageForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Stage' : 'Add Stage')}
      modalSize="xl"
    />
  );
}

import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { podcastStageApi } from '@/services/adminApi';
import { DIAGRAM_OPTIONS } from './constants';
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
      {({ register, errors }) => (
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
          <SelectField
            register={register}
            name="diagramKey"
            label="Diagram"
            options={DIAGRAM_OPTIONS}
            hint="The inline illustration drawn beside the copy. Each one draws a specific idea, so pick the one that matches this stage."
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
    { key: 'diagramKey', label: 'Diagram', render: (row: any) => row.diagramKey || '—' },
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

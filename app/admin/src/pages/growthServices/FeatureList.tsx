import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceFeatureApi } from '@/services/adminApi';
import { IconSelect, TextAreaField, TextField } from './FormFields';

/* Features are the icon cards in a `grid` section and the numbered steps in a
 * `timeline` section — one collection because both are {icon, title,
 * description}. `sectionKey` decides which band a card appears in. */

function FeatureForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceFeatureApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      {({ register, errors }) => (
        <>
          <TextField
            register={register}
            name="sectionKey"
            label="Section Key"
            required
            errors={errors}
            placeholder="e.g. services, deliverables, process"
            hint="Must match the Section Key of a section using the grid or timeline renderer."
          />
          <TextField
            register={register}
            name="title"
            label="Title"
            required
            errors={errors}
            placeholder="Card title"
            hint="For timeline sections the step number is added automatically."
          />
          <TextAreaField register={register} name="description" label="Description" rows={3} placeholder="One or two lines of supporting copy" />
          <IconSelect register={register} hint="Ignored by timeline sections, which show a step number instead." />
        </>
      )}
    </ChildForm>
  );
}

export default function FeatureList() {
  const columns = [
    {
      key: 'sectionKey', label: 'Section', sortable: true, className: 'min-w-[130px]',
      render: (row: any) => row.sectionKey,
    },
    {
      key: 'title', label: 'Title', sortable: true, className: 'min-w-[200px] max-w-[300px]',
      render: (row: any) => <span className="block truncate" title={row.title}>{row.title}</span>,
    },
    {
      key: 'description', label: 'Description', className: 'min-w-[240px] max-w-[420px]',
      render: (row: any) => (
        <span className="block truncate" title={row.description}>{row.description || '—'}</span>
      ),
    },
    { key: 'icon', label: 'Icon', render: (row: any) => row.icon || '—' },
  ];

  return (
    <ChildListPage
      title="Section Features"
      breadcrumbLabel="Features"
      api={growthServiceFeatureApi}
      columns={columns}
      renderForm={(props) => <FeatureForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Feature' : 'Add Feature')}
    />
  );
}

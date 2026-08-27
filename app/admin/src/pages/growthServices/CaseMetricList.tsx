import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceCaseMetricApi } from '@/services/adminApi';
import { IconSelect, TextField } from './FormFields';

/* Rows of the case-study table. The surrounding narrative (client name,
 * paragraphs, the media card) lives on the growth service record itself — edit
 * it under Growth Services → Services. */

function CaseMetricForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceCaseMetricApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      {({ register, errors }) => (
        <>
          <TextField
            register={register}
            name="label"
            label="Metric"
            required
            errors={errors}
            placeholder="e.g. Views, Subscribers, Downloads"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextField register={register} name="before" label="Before" placeholder="e.g. 520K" />
            <TextField register={register} name="after" label="After" placeholder="e.g. 2.1M" />
            <TextField register={register} name="growth" label="Growth" placeholder="e.g. +304.8%" />
          </div>
          <p className="-mt-2 text-xs text-gray-500">
            All three are free text, so figures render exactly as typed. Growth is shown with the brand highlight.
          </p>
          <IconSelect register={register} />
        </>
      )}
    </ChildForm>
  );
}

export default function CaseMetricList() {
  const columns = [
    {
      key: 'label', label: 'Metric', sortable: true, className: 'min-w-[200px]',
      render: (row: any) => <span className="block truncate" title={row.label}>{row.label}</span>,
    },
    { key: 'before', label: 'Before', render: (row: any) => row.before || '—' },
    { key: 'after', label: 'After', render: (row: any) => row.after || '—' },
    {
      key: 'growth', label: 'Growth',
      render: (row: any) => <span className="font-semibold">{row.growth || '—'}</span>,
    },
    { key: 'icon', label: 'Icon', render: (row: any) => row.icon || '—' },
  ];

  return (
    <ChildListPage
      title="Case Study Metrics"
      breadcrumbLabel="Case Metrics"
      api={growthServiceCaseMetricApi}
      columns={columns}
      renderForm={(props) => <CaseMetricForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Case Metric' : 'Add Case Metric')}
    />
  );
}

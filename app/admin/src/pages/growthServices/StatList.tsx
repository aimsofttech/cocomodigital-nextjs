import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceStatApi } from '@/services/adminApi';
import { IconSelect, TextField } from './FormFields';

/* The KPI tiles in the band directly under the hero. Four reads best across the
 * grid, but any number works — the row wraps at two columns on tablet. */

function StatForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceStatApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      {({ register, errors }) => (
        <>
          <TextField
            register={register}
            name="value"
            label="Value"
            required
            errors={errors}
            placeholder="e.g. 10M+, 85%, 1,000+"
            hint="Free text, so units and separators appear exactly as typed."
          />
          <TextField
            register={register}
            name="label"
            label="Label"
            required
            errors={errors}
            placeholder="e.g. Views Generated"
          />
          <IconSelect register={register} />
        </>
      )}
    </ChildForm>
  );
}

export default function StatList() {
  const columns = [
    { key: 'value', label: 'Value', sortable: true, className: 'min-w-[110px]' },
    {
      key: 'label', label: 'Label', sortable: true, className: 'min-w-[220px]',
      render: (row: any) => <span className="block truncate" title={row.label}>{row.label}</span>,
    },
    { key: 'icon', label: 'Icon', render: (row: any) => row.icon || '—' },
  ];

  return (
    <ChildListPage
      title="Hero Stats"
      breadcrumbLabel="Stats"
      api={growthServiceStatApi}
      columns={columns}
      renderForm={(props) => <StatForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Stat' : 'Add Stat')}
    />
  );
}

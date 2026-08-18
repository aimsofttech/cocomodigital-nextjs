import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceCtaApi } from '@/services/adminApi';
import { CTA_VARIANT_OPTIONS, PLACEMENT_OPTIONS } from './constants';
import { IconSelect, SelectField, TextField } from './FormFields';

/* Call-to-action buttons. `placement` decides whether a button sits under the
 * hero copy or in the dark closing band; the two bands style solid/outline
 * differently, so the same variant reads correctly on either surface. */

function CtaForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceCtaApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ placement: 'hero', variant: 'solid' }}
    >
      {({ register, errors }) => (
        <>
          <SelectField register={register} name="placement" label="Placement" options={PLACEMENT_OPTIONS} />
          <TextField
            register={register}
            name="label"
            label="Button Label"
            required
            errors={errors}
            placeholder="e.g. Get Your Free Channel Audit"
          />
          <TextField
            register={register}
            name="href"
            label="Link"
            required
            errors={errors}
            placeholder="/contact-us"
            hint="A site path such as /contact-us or /ScheduleMeeting, or a full external URL."
          />
          <SelectField register={register} name="variant" label="Style" options={CTA_VARIANT_OPTIONS} />
          <IconSelect register={register} hint="Optional icon shown before the label." />
        </>
      )}
    </ChildForm>
  );
}

export default function CtaList() {
  const columns = [
    { key: 'placement', label: 'Placement', sortable: true },
    {
      key: 'label', label: 'Label', sortable: true, className: 'min-w-[240px]',
      render: (row: any) => <span className="block truncate" title={row.label}>{row.label}</span>,
    },
    {
      key: 'href', label: 'Link', className: 'min-w-[160px]',
      render: (row: any) => <span className="block truncate" title={row.href}>{row.href}</span>,
    },
    { key: 'variant', label: 'Style' },
    { key: 'icon', label: 'Icon', render: (row: any) => row.icon || '—' },
  ];

  return (
    <ChildListPage
      title="Call-to-Action Buttons"
      breadcrumbLabel="CTAs"
      api={growthServiceCtaApi}
      columns={columns}
      extraFilters={[{
        key: 'placement',
        label: 'Placement',
        type: 'select',
        options: [{ value: '', label: 'All Placements' }, ...PLACEMENT_OPTIONS.map((p) => ({ value: p.value, label: p.value }))],
      }]}
      renderForm={(props) => <CtaForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit CTA' : 'Add CTA')}
    />
  );
}

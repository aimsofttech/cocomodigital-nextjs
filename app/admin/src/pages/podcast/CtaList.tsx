import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { podcastCtaApi } from '@/services/adminApi';
import { CTA_VARIANT_OPTIONS, PLACEMENT_OPTIONS } from './constants';
import { SelectField, TextField } from './FormFields';

/* Every button and link on the page. `placement` decides which band it renders
 * in; the hero, pricing and founder bands each draw the first active button for
 * their placement, and the proof band draws all of its links in order.
 *
 * `#podcast-audit` is the in-page anchor for the audit form at the foot of the
 * page — that is where the three primary buttons point. */

const PLACEMENT_LABELS: Record<string, string> = {
  hero: 'Hero',
  pricing: 'Pricing',
  founder: 'Founder',
  proof: 'Proof',
};

export function CtaForm({ editId, lockedPageId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={podcastCtaApi}
      editId={editId}
      lockedPageId={lockedPageId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ placement: 'hero', variant: 'primary' }}
    >
      {({ register, errors }) => (
        <>
          <SelectField
            register={register}
            name="placement"
            label="Placement"
            options={PLACEMENT_OPTIONS}
            hint="Hero, pricing and founder each show one button. The proof band shows all of its links, in display order."
          />
          <TextField
            register={register}
            name="label"
            label="Label"
            required
            errors={errors}
            placeholder="e.g. Get a free podcast audit"
          />
          <TextField
            register={register}
            name="href"
            label="Link"
            required
            errors={errors}
            placeholder="#podcast-audit, /case-studies or https://…"
            hint="Use #podcast-audit to jump to the audit form on this page, a path like /case-studies for another page on the site, or a full URL for anywhere else."
          />
          <SelectField
            register={register}
            name="variant"
            label="Style"
            options={CTA_VARIANT_OPTIONS}
            hint="Matches the two button treatments the page already uses. Nothing else changes about the design."
          />
        </>
      )}
    </ChildForm>
  );
}

export default function CtaList() {
  const columns = [
    {
      key: 'placement', label: 'Placement', sortable: true, className: 'min-w-[110px]',
      render: (row: any) => PLACEMENT_LABELS[row.placement] || row.placement,
    },
    {
      key: 'label', label: 'Label', sortable: true, className: 'min-w-[200px] max-w-[300px]',
      render: (row: any) => <span className="block truncate" title={row.label}>{row.label}</span>,
    },
    {
      key: 'href', label: 'Link', className: 'min-w-[200px] max-w-[320px]',
      render: (row: any) => <span className="block truncate" title={row.href}>{row.href}</span>,
    },
    { key: 'variant', label: 'Style' },
  ];

  return (
    <ChildListPage
      title="Buttons & Links"
      breadcrumbLabel="CTAs"
      api={podcastCtaApi}
      columns={columns}
      extraFilters={[{
        key: 'placement',
        label: 'Placement',
        type: 'select',
        options: [{ value: '', label: 'All Placements' }, ...PLACEMENT_OPTIONS.map((p) => ({
          value: p.value, label: PLACEMENT_LABELS[p.value],
        }))],
      }]}
      renderForm={(props) => <CtaForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Button' : 'Add Button')}
    />
  );
}

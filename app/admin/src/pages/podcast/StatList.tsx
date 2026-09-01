import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { podcastStatApi } from '@/services/adminApi';
import { STAT_SECTION_OPTIONS } from './constants';
import { SelectField, TextAreaField, TextField } from './FormFields';

/* Figure tiles. Three bands share the same {value, label, description} shape,
 * so one list carries them all: the trust strip under the hero, the three
 * problem cards, and the four scale tiles in the studio strip. Open the list
 * from a band's button on the pages table and it stays pinned to that band. */

const SECTION_LABELS: Record<string, string> = {
  trust: 'Trust Strip',
  problem: 'Problem Band',
  scale: 'Scale Tiles',
};

export function StatForm({ editId, lockedPageId, lockedSectionKey, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={podcastStatApi}
      editId={editId}
      lockedPageId={lockedPageId}
      lockedSectionKey={lockedSectionKey}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ sectionKey: lockedSectionKey || 'trust' }}
    >
      {({ register, errors, watch }) => {
        const section = watch('sectionKey');
        return (
          <>
            {!lockedSectionKey && (
              <SelectField
                register={register}
                name="sectionKey"
                label="Band"
                options={STAT_SECTION_OPTIONS}
                required
                errors={errors}
                hint="Which band on the page this tile appears in."
              />
            )}
            <TextField
              register={register}
              name="value"
              label="Figure"
              required
              errors={errors}
              placeholder="e.g. 12B+, $600K+, 4–8 hrs"
              hint="Stored as text, so formatting is published exactly as typed."
            />
            <TextField
              register={register}
              name="label"
              label="Label"
              required
              errors={errors}
              placeholder="e.g. Organic views driven"
            />
            {section !== 'trust' && (
              <TextAreaField
                register={register}
                name="description"
                label="Supporting Line"
                rows={3}
                placeholder="The sentence under the label"
                hint="Not shown on the trust strip, which is figure and label only."
              />
            )}
          </>
        );
      }}
    </ChildForm>
  );
}

export default function StatList() {
  const columns = [
    {
      key: 'sectionKey', label: 'Band', sortable: true, className: 'min-w-[120px]',
      render: (row: any) => SECTION_LABELS[row.sectionKey] || row.sectionKey,
    },
    {
      key: 'value', label: 'Figure', sortable: true, className: 'min-w-[110px]',
      render: (row: any) => <span className="font-medium">{row.value}</span>,
    },
    {
      key: 'label', label: 'Label', className: 'min-w-[220px] max-w-[360px]',
      render: (row: any) => <span className="block truncate" title={row.label}>{row.label}</span>,
    },
    {
      key: 'description', label: 'Supporting Line', className: 'min-w-[220px] max-w-[420px]',
      render: (row: any) => (
        <span className="block truncate" title={row.description}>{row.description || '—'}</span>
      ),
    },
  ];

  return (
    <ChildListPage
      title="Figure Tiles"
      breadcrumbLabel="Stats"
      api={podcastStatApi}
      columns={columns}
      sectionLabels={SECTION_LABELS}
      extraFilters={[{
        key: 'sectionKey',
        label: 'Band',
        type: 'select',
        options: [{ value: '', label: 'All Bands' }, ...STAT_SECTION_OPTIONS.map((o) => ({
          value: o.value, label: SECTION_LABELS[o.value],
        }))],
      }]}
      renderForm={(props) => <StatForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Figure Tile' : 'Add Figure Tile')}
    />
  );
}

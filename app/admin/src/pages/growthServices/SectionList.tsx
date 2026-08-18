import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceSectionApi } from '@/services/adminApi';
import {
  COLUMN_OPTIONS, FAQ_VARIANT_OPTIONS, FEATURE_RENDERERS, LAYOUT_OPTIONS,
  RENDERER_OPTIONS, SHOWCASE_RENDERERS, TONE_OPTIONS,
} from './constants';
import { SelectField, TextAreaField, TextField } from './FormFields';

/* Sections define the bands on a page: their heading copy, the surface they sit
 * on, and which renderer draws their items. Items themselves live in Features
 * (grid / timeline) or Showcases (showcase / format-panels), joined on
 * `sectionKey`. */

function SectionForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceSectionApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ renderer: 'grid', tone: 'page', columns: 3, layout: 'row', faqVariant: 'plain' }}
    >
      {({ register, errors, watch }) => {
        const renderer = watch('renderer');
        const isGrid = FEATURE_RENDERERS.includes(renderer) && renderer !== 'timeline';
        return (
          <>
            <TextField
              register={register}
              name="sectionKey"
              label="Section Key"
              required
              errors={errors}
              placeholder="e.g. services, deliverables, faq"
              hint="Items reference this key. Use lowercase words separated by hyphens; it must be unique within the page."
            />
            <SelectField
              register={register}
              name="renderer"
              label="Renderer"
              options={RENDERER_OPTIONS}
              hint={
                FEATURE_RENDERERS.includes(renderer)
                  ? 'Add this section’s items under Features with the same Section Key.'
                  : SHOWCASE_RENDERERS.includes(renderer)
                    ? 'Add this section’s items under Showcases with the same Section Key.'
                    : renderer === 'faq'
                      ? 'Content comes from the FAQs list for this service.'
                      : 'Content comes from Case Metrics plus the case-study fields on the service.'
              }
            />
            <TextField register={register} name="eyebrow" label="Eyebrow" placeholder="Small highlighted label above the heading" />
            <TextField register={register} name="title" label="Heading" placeholder="Section heading" />
            <TextAreaField register={register} name="description" label="Description" rows={2} placeholder="Optional paragraph under the heading" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField register={register} name="tone" label="Background" options={TONE_OPTIONS} />
              {renderer === 'faq' ? (
                <SelectField register={register} name="faqVariant" label="Accordion Style" options={FAQ_VARIANT_OPTIONS} />
              ) : (
                <SelectField
                  register={register}
                  name="columns"
                  label="Grid Columns"
                  options={COLUMN_OPTIONS.map((c) => ({ value: c, label: `${c} columns` }))}
                />
              )}
            </div>
            {isGrid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField register={register} name="layout" label="Card Layout" options={LAYOUT_OPTIONS} />
                <div>
                  <label className="form-label">Compact</label>
                  <select {...register('compact')} className="form-select">
                    <option value="false">No — standard padding</option>
                    <option value="true">Yes — tighter type &amp; padding</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Use with 6 columns for the dense problem/challenge bands.</p>
                </div>
              </div>
            )}
          </>
        );
      }}
    </ChildForm>
  );
}

export default function SectionList() {
  const columns = [
    {
      key: 'sectionKey', label: 'Section Key', sortable: true, className: 'min-w-[150px]',
      render: (row: any) => row.sectionKey,
    },
    {
      key: 'title', label: 'Heading', className: 'min-w-[240px] max-w-[380px]',
      render: (row: any) => (
        <span className="block truncate" title={row.title}>{row.title || '—'}</span>
      ),
    },
    { key: 'renderer', label: 'Renderer', sortable: true },
    {
      key: 'layout', label: 'Layout',
      render: (row: any) =>
        row.renderer === 'faq' ? row.faqVariant : `${row.columns} col · ${row.layout}${row.compact ? ' · compact' : ''}`,
    },
    { key: 'tone', label: 'Background' },
  ];

  return (
    <ChildListPage
      title="Page Sections"
      breadcrumbLabel="Sections"
      api={growthServiceSectionApi}
      columns={columns}
      extraFilters={[{
        key: 'renderer',
        label: 'Renderer',
        type: 'select',
        options: [{ value: '', label: 'All Renderers' }, ...RENDERER_OPTIONS.map((r) => ({ value: r.value, label: r.value }))],
      }]}
      renderForm={(props) => <SectionForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Section' : 'Add Section')}
      modalSize="xl"
    />
  );
}

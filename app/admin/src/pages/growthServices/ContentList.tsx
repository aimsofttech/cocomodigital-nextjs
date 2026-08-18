import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceContentApi } from '@/services/adminApi';
import { CONTENT_LEVEL_OPTIONS } from './constants';
import { SelectField, TextAreaField, TextField } from './FormFields';

/* Long-form SEO copy — the prose blocks a section with the "article" renderer
 * draws, and the part of the page a search engine has enough of to understand
 * what the service actually covers.
 *
 * Each row is one heading plus its paragraphs, and each row sets its own
 * heading level. Rows render in display order, so the page's H3 → H6 outline is
 * authored by ordering the rows and picking a level on each, the same way the
 * copy would be structured in a document.
 */

function ContentForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceContentApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      defaultValues={{ level: 3 }}
    >
      {({ register, errors }) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              register={register}
              name="sectionKey"
              label="Section Key"
              required
              errors={errors}
              placeholder="e.g. youtube-growth-guide"
              hint="Must match a section whose renderer is “Long-form SEO copy”."
            />
            <SelectField
              register={register}
              name="level"
              label="Heading Level"
              options={CONTENT_LEVEL_OPTIONS}
              hint="Go one level deeper than the block above it — never skip a level."
            />
          </div>

          <TextField
            register={register}
            name="heading"
            label="Heading"
            placeholder="e.g. What end-to-end YouTube growth actually covers"
            hint="Write it the way someone would search for it. Leave blank for paragraphs with no heading of their own."
          />

          <TextAreaField
            register={register}
            name="body"
            label="Paragraphs"
            rows={6}
            placeholder="One paragraph per line."
            hint="One paragraph per line. Blank lines are ignored. This is page copy, so write for the reader first — repeated keywords read as spam to both people and search engines."
          />

          <TextAreaField
            register={register}
            name="bullets"
            label="Bullet List"
            rows={4}
            placeholder="One bullet per line. Optional."
            hint="Optional checklist under the paragraphs, one item per line."
          />
        </>
      )}
    </ChildForm>
  );
}

export default function ContentList() {
  const columns = [
    {
      key: 'sectionKey', label: 'Section', sortable: true, className: 'min-w-[150px]',
      render: (row: any) => (
        <span className="block truncate" title={row.sectionKey}>{row.sectionKey || '—'}</span>
      ),
    },
    {
      key: 'level', label: 'Level', sortable: true,
      render: (row: any) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          H{row.level || 3}
        </span>
      ),
    },
    {
      key: 'heading', label: 'Heading', sortable: true, className: 'min-w-[240px] max-w-[340px]',
      render: (row: any) => (
        <span
          className="block truncate"
          title={row.heading}
          /* Indent by level so the outline is readable straight from the table
             — a flat list makes a skipped level almost impossible to spot. */
          style={{ paddingLeft: `${((row.level || 3) - 3) * 14}px` }}
        >
          {row.heading || '—'}
        </span>
      ),
    },
    {
      key: 'body', label: 'Copy', className: 'min-w-[260px] max-w-[460px]',
      render: (row: any) => (
        <span className="block truncate text-gray-500" title={row.body}>{row.body || '—'}</span>
      ),
    },
  ];

  return (
    <ChildListPage
      title="SEO Content Blocks"
      breadcrumbLabel="SEO Content"
      api={growthServiceContentApi}
      columns={columns}
      extraFilters={[{
        key: 'level',
        label: 'Heading Level',
        type: 'select' as const,
        options: [
          { value: '', label: 'All Levels' },
          ...CONTENT_LEVEL_OPTIONS.map((o) => ({ value: String(o.value), label: `H${o.value}` })),
        ],
      }]}
      renderForm={(props) => <ContentForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit Content Block' : 'Add Content Block')}
      modalSize="xl"
    />
  );
}

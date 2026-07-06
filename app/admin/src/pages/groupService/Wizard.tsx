import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, FlagIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import {
  groupServiceItemApi, groupSingleServiceImageApi, groupRecentWorkApi,
  groupPortfolioCategoryApi, groupPortfolioItemApi, groupServiceItemFaqApi,
} from '@/services/adminApi';
import ServiceItemForm from './ServiceItemForm';
import SingleServiceImageForm from './SingleServiceImageForm';
import RecentWorkForm from './RecentWorkForm';
import PortfolioCategoryForm from './PortfolioCategoryForm';
import PortfolioItemForm from './PortfolioItemForm';
import FaqForm from './FaqForm';

// Every section form shares the same contract used by the existing module list
// pages: modal mode via onSuccess/onCancel, plus lockedItemId to pin the item.
type SectionFormProps = { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string };

interface SectionStep {
  key: string;
  label: string;
  hint: string;
  Form: (props: SectionFormProps) => JSX.Element | null;
  api: { getAll: (params?: Record<string, any>) => Promise<any> };
  /** Existing full CRUD page for this section (opened scoped to the item). */
  managePath: string;
}

// One step per existing item-section module (same order as the item's
// "Navigate To" chips and the public service page).
const SECTION_STEPS: SectionStep[] = [
  { key: 'media',              label: 'Service Media',      hint: 'Images / videos shown in the service media slider.',    Form: SingleServiceImageForm, api: groupSingleServiceImageApi, managePath: '/group-service/single-service-image' },
  { key: 'recent-work',        label: 'Recent Work',        hint: 'Recent work videos for this service.',                  Form: RecentWorkForm,         api: groupRecentWorkApi,         managePath: '/group-service/recent-work' },
  { key: 'portfolio-category', label: 'Portfolio Category', hint: 'Categories grouping the portfolio items.',              Form: PortfolioCategoryForm,  api: groupPortfolioCategoryApi,  managePath: '/group-service/portfolio-category' },
  { key: 'portfolio-item',     label: 'Portfolio Items',    hint: 'Individual portfolio entries.',                         Form: PortfolioItemForm,      api: groupPortfolioItemApi,      managePath: '/group-service/portfolio-item' },
  { key: 'faq',                label: 'FAQ',                hint: 'Frequently asked questions for this service.',          Form: FaqForm,                api: groupServiceItemFaqApi,     managePath: '/group-service/faq' },
];

const TOTAL_STEPS = SECTION_STEPS.length + 1; // + step 1 (item basic info)

// Best-effort one-line label for a saved section record shown in the
// "already added" chips (records use different name fields per module).
const recordLabel = (rec: any) =>
  rec?.name || rec?.title || rec?.question || rec?.description || rec?.slug || rec?._id || '';

export default function Wizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Progress lives in the URL so a refresh (or leaving midway) never loses it:
  // /group-service/wizard?itemId=<created item>&step=<n>
  const itemId = searchParams.get('itemId') || '';
  const stepParam = parseInt(searchParams.get('step') || '0', 10);
  const step = Number.isFinite(stepParam) ? Math.min(Math.max(stepParam, 0), TOTAL_STEPS - 1) : 0;

  const [itemTitle, setItemTitle] = useState('');
  // Per-section record count + a small preview of saved records.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [previews, setPreviews] = useState<Record<string, any[]>>({});
  // Bumping the key remounts the embedded form → clean fields for "add another".
  const [formKey, setFormKey] = useState(0);

  const setWizardState = useCallback((nextItemId: string, nextStep: number) => {
    const params: Record<string, string> = { step: String(nextStep) };
    if (nextItemId) params.itemId = nextItemId;
    setSearchParams(params);
    setFormKey((k) => k + 1);
  }, [setSearchParams]);

  // Resolve the item title (shown in the header once step 1 is done).
  useEffect(() => {
    if (!itemId) { setItemTitle(''); return; }
    groupServiceItemApi.getOne(itemId)
      .then(({ data }) => setItemTitle(data.data?.title || ''))
      .catch(() => setItemTitle(''));
  }, [itemId]);

  // Load a section's saved-record count + preview, scoped to this item.
  const refreshSection = useCallback((section: SectionStep) => {
    if (!itemId) return;
    section.api.getAll({ groupServiceItemId: itemId, limit: 5 })
      .then(({ data }) => {
        const rows = data.data || [];
        setCounts((c) => ({ ...c, [section.key]: data.pagination?.total ?? rows.length }));
        setPreviews((p) => ({ ...p, [section.key]: rows }));
      })
      .catch(() => {});
  }, [itemId]);

  // Prime all counters once the item exists (also on resume after refresh).
  useEffect(() => {
    if (!itemId) { setCounts({}); setPreviews({}); return; }
    SECTION_STEPS.forEach(refreshSection);
  }, [itemId, refreshSection]);

  const goTo = (n: number) => setWizardState(itemId, Math.min(Math.max(n, 0), TOTAL_STEPS - 1));

  // Step 1 saved: capture the created item id and move to the first section.
  const handleItemSaved = (saved?: any) => {
    const newId = saved?._id || itemId;
    if (!newId) { toast.error('Could not read the created item id'); return; }
    setWizardState(newId, 1);
  };

  const currentSection = step > 0 ? SECTION_STEPS[step - 1] : null;

  const handleSectionSaved = () => {
    if (currentSection) refreshSection(currentSection);
    setFormKey((k) => k + 1); // clear the form so another record can be added
  };

  const handleFinish = () => {
    toast.success('Group service item completed');
    navigate('/group-service/item');
  };

  const doneCount = useMemo(
    () => SECTION_STEPS.filter((s) => (counts[s.key] ?? 0) > 0).length + (itemId ? 1 : 0),
    [counts, itemId],
  );

  // ── Vertical stepper row (rows are joined by a theme-colored line) ─────────
  const stepRow = (index: number, label: string, done: boolean) => {
    const active = index === step;
    const clickable = index === 0 || Boolean(itemId);
    const isLast = index === TOTAL_STEPS - 1;
    return (
      <li key={index} className="relative pb-1.5 last:pb-0">
        {!isLast && <span aria-hidden className="absolute left-[16px] top-8 bottom-0 w-0.5 bg-primary-600" />}
        <button
          type="button"
          disabled={!clickable}
          onClick={() => goTo(index)}
          title={clickable ? label : 'Save the item details first'}
          className={`relative w-full flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
            active
              ? 'bg-primary-600 text-white font-medium'
              : done
                ? 'text-green-700 font-bold hover:bg-green-50'
                : clickable
                  ? 'text-gray-900 font-medium hover:bg-gray-50'
                  : 'text-gray-900 font-medium cursor-not-allowed'
          }`}
        >
          <span className={`inline-flex items-center justify-center w-6 h-6 min-w-[1.5rem] rounded-full text-[10px] font-semibold ${
            active ? 'bg-white/20 text-white' : done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-900'
          }`}>
            {done && !active ? <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} /> : index + 1}
          </span>
          <span className="truncate">{label}</span>
        </button>
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="Create Group Service Item"
        breadcrumbs={[{ label: 'Group Services' }, { label: 'Create Item (Wizard)' }]}
        actions={itemId ? (
          <span className="text-sm text-gray-500">
            Item: <span className="font-medium text-gray-900">{itemTitle || itemId}</span>
          </span>
        ) : undefined}
      />

      {/* ── Layout: form content on the left, vertical stepper on the right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* LEFT — step content + navigation (~75%) */}
        <div className="lg:col-span-3 space-y-4">
          {step === 0 ? (
            <div className="card w-full">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">{itemId ? 'Item Details' : 'New Item Details'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {itemId
                    ? 'Update the basic information of this item, then continue to the sections.'
                    : 'Fill the basic information. Saving creates the item and unlocks the section steps.'}
                </p>
              </div>
              <ServiceItemForm
                key={`item-${itemId}-${formKey}`}
                editId={itemId || undefined}
                onSuccess={handleItemSaved}
                onCancel={() => navigate('/group-service/item')}
              />
            </div>
          ) : !itemId ? (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-600 mb-4">Save the item details first to unlock this step.</p>
              <button type="button" onClick={() => goTo(0)} className="btn-primary btn-sm">Go to Item Details</button>
            </div>
          ) : currentSection ? (
            <div className="card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{currentSection.label}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{currentSection.hint} This step is optional — you can skip it and add records later.</p>
                </div>
                <Link
                  to={`${currentSection.managePath}?groupServiceItemId=${itemId}`}
                  className="btn-secondary btn-sm flex items-center gap-1.5 flex-shrink-0"
                  title="Open the full page for this section (edit / delete records)"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Manage
                </Link>
              </div>
              <currentSection.Form
                key={`${currentSection.key}-${formKey}`}
                lockedItemId={itemId}
                onSuccess={handleSectionSaved}
                onCancel={() => setFormKey((k) => k + 1)}
              />
            </div>
          ) : null}

          {/* ── Wizard navigation ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="btn-secondary btn-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Previous
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                disabled={!itemId}
                title={itemId ? undefined : 'Save the item details first'}
                className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentSection && (counts[currentSection.key] ?? 0) === 0 ? 'Skip / Next' : 'Next'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleFinish} className="btn-primary btn-sm flex items-center gap-1.5">
                <FlagIcon className="w-4 h-4" /> Finish
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — vertical stepper + saved records (~25%, sticky) */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Step {step + 1} of {TOTAL_STEPS}
              </p>
              <p className="text-xs text-gray-500">{doneCount}/{TOTAL_STEPS} filled</p>
            </div>
            <ul>
              {stepRow(0, 'Item Details', Boolean(itemId))}
              {SECTION_STEPS.map((s, i) => stepRow(i + 1, s.label, (counts[s.key] ?? 0) > 0))}
            </ul>
          </div>

          {/* Saved records for the current section (scoped to the item) */}
          {itemId && currentSection && (
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                Added in this item
              </p>
              {(counts[currentSection.key] ?? 0) > 0 ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mr-1.5">
                      {counts[currentSection.key]}
                    </span>
                    record(s) saved
                  </p>
                  <ul className="space-y-1.5">
                    {(previews[currentSection.key] || []).map((rec: any) => (
                      <li key={rec._id} className="flex items-center gap-2 text-xs text-gray-600 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-100">
                        <CheckIcon className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                        <span className="truncate">{recordLabel(rec)}</span>
                      </li>
                    ))}
                  </ul>
                  {(counts[currentSection.key] ?? 0) > (previews[currentSection.key]?.length ?? 0) && (
                    <p className="text-[11px] text-gray-400 mt-2">Showing first {previews[currentSection.key]?.length} — use Manage to see all.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">Nothing added yet. Save the form to add the first record, or skip this step.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

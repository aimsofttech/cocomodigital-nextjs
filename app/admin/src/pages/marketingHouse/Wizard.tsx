import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, FlagIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import {
  marketingHouseItemApi,
  marketingHouseStaticsApi, marketingHouseImageApi, marketingHouseIdeaStrategyApi,
  marketingHousePerformanceApi,
  marketingHouseOtherActivityCategoryApi, marketingHouseOtherActivityItemApi,
  marketingHouseContentCategoryApi, marketingHouseContentItemApi,
  marketingHouseCommunityProgramApi, marketingHouseCommunityProgramItemApi,
  marketingHouseFaqApi,
} from '@/services/adminApi';
import ItemForm from './ItemForm';
import HighlightsForm from './HighlightsForm';
import PosterMediaForm from './PosterMediaForm';
import IdeaStrategyPlanningForm from './IdeaStrategyPlanningForm';
import PerformanceModuleForm from './PerformanceModuleForm';
import OtherActivityCategoryModuleForm from './OtherActivityCategoryModuleForm';
import OtherActivityItemModuleForm from './OtherActivityItemModuleForm';
import ContentCategoryModuleForm from './ContentCategoryModuleForm';
import ContentItemModuleForm from './ContentItemModuleForm';
import CommunityProgramModuleForm from './CommunityProgramModuleForm';
import CommunityProgramItemModuleForm from './CommunityProgramItemModuleForm';
import MarketingFaqForm from './MarketingFaqForm';

// Every section form shares the same contract used by the existing module list
// pages: modal mode via onSuccess/onCancel, plus lockedItemId to pin the campaign.
type SectionFormProps = { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string };

interface SectionStep {
  key: string;
  label: string;
  hint: string;
  Form: (props: SectionFormProps) => JSX.Element | null;
  api: { getAll: (params?: Record<string, any>) => Promise<any> };
  /** Existing full CRUD page for this section (opened scoped to the campaign). */
  managePath: string;
}

// One step per existing item-section module, ordered exactly like the sections
// on the public campaign page (/marketing/<slug>).
const SECTION_STEPS: SectionStep[] = [
  { key: 'images',                 label: 'Poster Media',                hint: 'Poster images and media assets for the campaign.',            Form: PosterMediaForm,                   api: marketingHouseImageApi,                 managePath: '/marketing/poster-media' },
  { key: 'statics',                label: 'Highlights',                  hint: 'Key stats shown on the campaign page (e.g. Platform: 100+).', Form: HighlightsForm,                    api: marketingHouseStaticsApi,               managePath: '/marketing/highlights' },
  { key: 'idea-strategy',          label: 'Our Activities',              hint: 'Strategy, planning and launch activities for the campaign.',  Form: IdeaStrategyPlanningForm,          api: marketingHouseIdeaStrategyApi,          managePath: '/marketing/idea-strategy-planning' },
  { key: 'other-activity-category', label: 'Add-on Activities Categories', hint: 'Categories grouping the add-on activities.',                Form: OtherActivityCategoryModuleForm,   api: marketingHouseOtherActivityCategoryApi, managePath: '/marketing/add-on-activities-category' },
  { key: 'other-activity-item',    label: 'Add-on Activities Items',     hint: 'Individual add-on activity entries.',                         Form: OtherActivityItemModuleForm,       api: marketingHouseOtherActivityItemApi,     managePath: '/marketing/add-on-activities-item' },
  { key: 'content-category',       label: 'Content Categories',          hint: 'Categories grouping the campaign content.',                   Form: ContentCategoryModuleForm,         api: marketingHouseContentCategoryApi,       managePath: '/marketing/content-category' },
  { key: 'content-item',           label: 'Content Items',               hint: 'Individual content entries (videos, posts…).',                Form: ContentItemModuleForm,             api: marketingHouseContentItemApi,           managePath: '/marketing/content-item' },
  { key: 'performance',            label: 'Performance',                 hint: 'Performance media and results (reach, engagement…).',         Form: PerformanceModuleForm,             api: marketingHousePerformanceApi,           managePath: '/marketing/performance' },
  { key: 'community-program',      label: 'Continuity Category',         hint: 'Continuity / community program categories.',                  Form: CommunityProgramModuleForm,        api: marketingHouseCommunityProgramApi,      managePath: '/marketing/community-program' },
  { key: 'community-program-item', label: 'Continuity Items',            hint: 'Continuity / community program entries.',                     Form: CommunityProgramItemModuleForm,    api: marketingHouseCommunityProgramItemApi,  managePath: '/marketing/community-program-item' },
  { key: 'faq',                    label: 'FAQ',                         hint: 'Frequently asked questions for the campaign.',                Form: MarketingFaqForm,                  api: marketingHouseFaqApi,                   managePath: '/marketing/faq' },
];

const TOTAL_STEPS = SECTION_STEPS.length + 1; // + step 1 (campaign basic info)

// Best-effort one-line label for a saved section record shown in the
// "already added" chips (records use different name fields per module).
const recordLabel = (rec: any) =>
  rec?.name || rec?.title || rec?.performance_title || rec?.question || rec?.image_title || rec?.slug || rec?._id || '';

export default function Wizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Progress lives in the URL so a refresh (or leaving midway) never loses it:
  // /marketing/wizard?itemId=<created campaign>&step=<n>
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

  // Resolve the campaign title (shown in the header once step 1 is done).
  useEffect(() => {
    if (!itemId) { setItemTitle(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemTitle(data.data?.title || ''))
      .catch(() => setItemTitle(''));
  }, [itemId]);

  // Load a section's saved-record count + preview, scoped to this campaign.
  const refreshSection = useCallback((section: SectionStep) => {
    if (!itemId) return;
    section.api.getAll({ marketingHouseItemId: itemId, limit: 5 })
      .then(({ data }) => {
        const rows = data.data || [];
        setCounts((c) => ({ ...c, [section.key]: data.pagination?.total ?? rows.length }));
        setPreviews((p) => ({ ...p, [section.key]: rows }));
      })
      .catch(() => {});
  }, [itemId]);

  // Prime all counters once the campaign exists (also on resume after refresh).
  useEffect(() => {
    if (!itemId) { setCounts({}); setPreviews({}); return; }
    SECTION_STEPS.forEach(refreshSection);
  }, [itemId, refreshSection]);

  const goTo = (n: number) => setWizardState(itemId, Math.min(Math.max(n, 0), TOTAL_STEPS - 1));

  // Step 1 saved: capture the created campaign id and move to the first section.
  const handleItemSaved = (saved?: any) => {
    const newId = saved?._id || itemId;
    if (!newId) { toast.error('Could not read the created campaign id'); return; }
    setWizardState(newId, 1);
  };

  const currentSection = step > 0 ? SECTION_STEPS[step - 1] : null;

  const handleSectionSaved = () => {
    if (currentSection) refreshSection(currentSection);
    setFormKey((k) => k + 1); // clear the form so another record can be added
  };

  const handleFinish = () => {
    toast.success('Marketing campaign completed');
    navigate('/marketing/item');
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
          title={clickable ? label : 'Save the campaign details first'}
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
        title="Create Marketing Campaign"
        breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Create Campaign (Wizard)' }]}
        actions={itemId ? (
          <span className="text-sm text-gray-500">
            Campaign: <span className="font-medium text-gray-900">{itemTitle || itemId}</span>
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
                <h2 className="text-base font-semibold text-gray-900">{itemId ? 'Campaign Details' : 'New Campaign Details'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {itemId
                    ? 'Update the basic information of this campaign, then continue to the sections.'
                    : 'Fill the basic information. Saving creates the campaign and unlocks the section steps.'}
                </p>
              </div>
              <ItemForm
                key={`item-${itemId}-${formKey}`}
                editId={itemId || undefined}
                onSuccess={handleItemSaved}
                onCancel={() => navigate('/marketing/item')}
              />
            </div>
          ) : !itemId ? (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-600 mb-4">Save the campaign details first to unlock this step.</p>
              <button type="button" onClick={() => goTo(0)} className="btn-primary btn-sm">Go to Campaign Details</button>
            </div>
          ) : currentSection ? (
            <div className="card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{currentSection.label}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{currentSection.hint} This step is optional — you can skip it and add records later.</p>
                </div>
                <Link
                  to={`${currentSection.managePath}?marketingHouseItemId=${itemId}`}
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
                title={itemId ? undefined : 'Save the campaign details first'}
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
              {stepRow(0, 'Campaign Details', Boolean(itemId))}
              {SECTION_STEPS.map((s, i) => stepRow(i + 1, s.label, (counts[s.key] ?? 0) > 0))}
            </ul>
          </div>

          {/* Saved records for the current section (scoped to the campaign) */}
          {itemId && currentSection && (
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                Added in this campaign
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

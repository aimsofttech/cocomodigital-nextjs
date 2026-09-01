import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, FlagIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import ContentLoader from '@/components/ui/ContentLoader';
import {
  podcastPageApi, podcastStatApi, podcastCardApi, podcastStageApi,
  podcastShotApi, podcastFaqApi, podcastCtaApi,
} from '@/services/adminApi';
import { PAGE_FORM_DEFAULTS, group, renderGroup } from './pageFieldsets';
import { StatForm } from './StatList';
import { CardForm } from './CardList';
import { StageForm } from './StageList';
import { ShotForm } from './ShotList';
import { FaqForm } from './FaqList';
import { CtaForm } from './CtaList';

/* Building a podcast page, one band at a time.
 *
 * Serves both screens, because a page this long is unmanageable as a single
 * column either way:
 *   /podcast/page/add          create - the new id lands in ?podcastPageId=
 *   /podcast/page/edit/:id     edit   - the id comes from the path
 *
 * Each step is one band of the live page, in page order: its copy first, then
 * the repeating items that belong to it, so the wizard reads like the page it
 * is building. Any step can be skipped, or jumped to from the stepper.
 *
 * Identity stays editable while creating and locks once the page exists - the
 * website looks the record up by its slug.
 *
 * Nothing here is new design — it is the wizard the Marketing Campaigns and
 * Creative House modules already use (left: the step, right: a sticky stepper
 * plus what has been added so far), and every field comes from the same
 * `PAGE_FIELD_GROUPS` and the same section forms the list pages use.
 *
 * The step lives in the URL, so a refresh or a shared link resumes exactly
 * where it left off.
 */

type SectionFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  lockedPageId?: string;
  lockedSectionKey?: string;
};

interface WizardStep {
  key: string;
  label: string;
  hint: string;
  /** Field groups from PAGE_FIELD_GROUPS shown as this step's copy fields. */
  groups?: string[];
  /** The repeating items belonging to this band, if it has any. */
  section?: {
    Form: (props: SectionFormProps) => ReactNode;
    api: { getAll: (params?: Record<string, any>) => Promise<any> };
    /** Route of the full CRUD page, opened scoped to this page and band. */
    managePath: string;
    /** Set for the two collections that carry more than one band. */
    sectionKey?: string;
    /** What one record is called, for the "add another" copy. */
    noun: string;
  };
}

/* One step per band, in the order the bands appear on the live page. Every
 * step after the first is optional and can be skipped — the page renders any
 * band that has content and quietly leaves out the ones that don't. */
const STEPS: WizardStep[] = [
  {
    key: 'details',
    label: 'Page Details',
    hint: 'The name, address and publishing state. Saving this creates the page and unlocks the rest of the steps.',
    groups: ['identity', 'publishing'],
  },
  {
    key: 'hero',
    label: 'Hero',
    hint: 'The first screen: eyebrow, headline, one line of promise and the photograph.',
    groups: ['hero'],
  },
  {
    key: 'credentials',
    label: 'Credentials Strip',
    hint: 'The positioning line, the caption that labels the numbers as studio-wide, and the numbers themselves.',
    groups: ['credentials'],
    section: {
      Form: StatForm, api: podcastStatApi, sectionKey: 'trust',
      managePath: '/podcast/stat', noun: 'figure tile',
    },
  },
  {
    key: 'problem',
    label: 'Problem Band',
    hint: 'The heading, the lead paragraph, the backdrop photograph and the three figures.',
    groups: ['problem'],
    section: {
      Form: StatForm, api: podcastStatApi, sectionKey: 'problem',
      managePath: '/podcast/stat', noun: 'figure tile',
    },
  },
  {
    key: 'method',
    label: 'Signal-to-Scale',
    hint: 'The band heading and its four stages, each with a promise, a detail paragraph and a capability list.',
    groups: ['method'],
    section: {
      Form: StageForm, api: podcastStageApi,
      managePath: '/podcast/stage', noun: 'stage',
    },
  },
  {
    key: 'services',
    label: 'Services',
    hint: 'The band heading and the service cards.',
    groups: ['services'],
    section: {
      Form: CardForm, api: podcastCardApi, sectionKey: 'services',
      managePath: '/podcast/card', noun: 'service card',
    },
  },
  {
    key: 'audiences',
    label: 'Audiences',
    hint: 'The band heading and the “who it’s for” cards.',
    groups: ['audience'],
    section: {
      Form: CardForm, api: podcastCardApi, sectionKey: 'audiences',
      managePath: '/podcast/card', noun: 'audience card',
    },
  },
  {
    key: 'pricing',
    label: 'Pricing',
    hint: 'The published price floor and the two bullet columns beside it.',
    groups: ['pricing'],
  },
  {
    key: 'month',
    label: 'Month Table',
    hint: 'The band heading, the column headings, and one row per deliverable.',
    groups: ['month'],
    section: {
      Form: CardForm, api: podcastCardApi, sectionKey: 'month',
      managePath: '/podcast/card', noun: 'table row',
    },
  },
  {
    key: 'notFor',
    label: 'When We’re the Wrong Call',
    hint: 'The disqualifiers. Saying plainly who this is not for raises conversion among the people it is for.',
    groups: ['notFor'],
  },
  {
    key: 'founder',
    label: 'Founder Note',
    hint: 'The named owner, their portrait and the note in their own voice.',
    groups: ['founder'],
  },
  {
    key: 'ops',
    label: 'Working Across Time Zones',
    hint: 'The band heading and the cards answering the practical questions.',
    groups: ['ops'],
    section: {
      Form: CardForm, api: podcastCardApi, sectionKey: 'operations',
      managePath: '/podcast/card', noun: 'card',
    },
  },
  {
    key: 'studio',
    label: 'Studio Strip',
    hint: 'The band copy and the captioned photographs from the studio floor.',
    groups: ['studio'],
    section: {
      Form: ShotForm, api: podcastShotApi,
      managePath: '/podcast/shot', noun: 'photograph',
    },
  },
  {
    key: 'scale',
    label: 'Scale Figures',
    hint: 'The four scale-of-operation figures inside the studio strip. Their footnote is on the previous step.',
    section: {
      Form: StatForm, api: podcastStatApi, sectionKey: 'scale',
      managePath: '/podcast/stat', noun: 'figure tile',
    },
  },
  {
    key: 'process',
    label: 'Process',
    hint: 'The band heading and the numbered steps an engagement runs through.',
    groups: ['process'],
    section: {
      Form: CardForm, api: podcastCardApi, sectionKey: 'process',
      managePath: '/podcast/card', noun: 'step',
    },
  },
  {
    key: 'proof',
    label: 'Proof Band',
    hint: 'What the studio can and cannot claim. Its two links are added on the Buttons & Links step.',
    groups: ['proof'],
  },
  {
    key: 'faq',
    label: 'FAQ',
    hint: 'The band heading and the questions. These also feed the page’s FAQ structured data.',
    groups: ['faq'],
    section: {
      Form: FaqForm, api: podcastFaqApi,
      managePath: '/podcast/faq', noun: 'question',
    },
  },
  {
    key: 'closing',
    label: 'Closing & Audit Form',
    hint: 'The closing copy and every label on the enquiry form beside it.',
    groups: ['closing', 'audit'],
  },
  {
    key: 'ctas',
    label: 'Buttons & Links',
    hint: 'Every button on the page — the hero, pricing and founder buttons, and the two links in the proof band.',
    section: {
      Form: CtaForm, api: podcastCtaApi,
      managePath: '/podcast/cta', noun: 'button',
    },
  },
  {
    key: 'seo',
    label: 'SEO & Social',
    hint: 'The search listing, the share cards and the structured data.',
    groups: ['seo', 'og', 'twitter', 'ogCard', 'schema'],
  },
];

const TOTAL_STEPS = STEPS.length;

/* Has an editor actually put something in this field?
 *
 * A value equal to the shipped default doesn't count: every new record already
 * carries "Deliverable", "Name", "website" and so on, and treating those as
 * filled would tick half the stepper before anyone had typed a word. */
const isFilledField = (name: string, value: any) => {
  if (value === undefined || value === null) return false;
  const v = String(value).trim();
  if (!v) return false;
  const fallback = (PAGE_FORM_DEFAULTS as Record<string, any>)[name];
  return fallback === undefined || v !== String(fallback);
};

// Best-effort one-line label for a saved record in the "added so far" chips —
// the six collections name their headline field differently.
const recordLabel = (rec: any) =>
  rec?.title || rec?.name || rec?.question || rec?.caption || rec?.label || rec?.value || rec?._id || '';

export default function PageWizard() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Editing addresses the record in the path; creating carries it in the query
     once step 1 has saved. Everything below works off the resolved id. */
  const isEditRoute = Boolean(routeId);
  const pageId = routeId || searchParams.get('podcastPageId') || '';
  const stepParam = parseInt(searchParams.get('step') || '0', 10);
  const step = Number.isFinite(stepParam) ? Math.min(Math.max(stepParam, 0), TOTAL_STEPS - 1) : 0;
  const current = STEPS[step];

  const [pageName, setPageName] = useState('');
  const [loading, setLoading] = useState(isEditRoute);
  // The record as last saved — what the stepper's ticks are judged against.
  const [saved, setSaved] = useState<Record<string, any> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [previews, setPreviews] = useState<Record<string, any[]>>({});
  // Bumping the key remounts the embedded section form → clean fields for
  // "add another".
  const [formKey, setFormKey] = useState(0);

  /* One form instance for the whole wizard. react-hook-form keeps the values of
     fields that are no longer mounted, so moving between steps never loses what
     was typed, and every save sends the full record rather than one band. */
  const {
    register, handleSubmit, reset, setValue, watch, getValues,
    formState: { errors, isSubmitting },
  } = useForm<any>({ defaultValues: PAGE_FORM_DEFAULTS });

  // Resuming after a refresh: load the record once, so the copy fields show
  // what has already been saved instead of coming up blank.
  const loadedFor = useRef('');
  useEffect(() => {
    if (!pageId || loadedFor.current === pageId) return;
    loadedFor.current = pageId;
    podcastPageApi.getOne(pageId)
      .then(({ data }) => {
        const rec = data.data;
        setPageName(rec?.name || '');
        setSaved(rec || null);
        reset({ ...PAGE_FORM_DEFAULTS, ...rec, status: String(rec?.status ?? 1) });
      })
      .catch(() => { /* the API layer already surfaces the error toast */ })
      .finally(() => setLoading(false));
  }, [pageId, reset]);

  const setWizardState = useCallback((nextId: string, nextStep: number) => {
    const params: Record<string, string> = { step: String(nextStep) };
    // On the edit route the id is already in the path - repeating it in the
    // query would only make the URL longer and let the two disagree.
    if (nextId && !isEditRoute) params.podcastPageId = nextId;
    setSearchParams(params);
    setFormKey((k) => k + 1);
  }, [setSearchParams, isEditRoute]);

  const goTo = (n: number) => setWizardState(pageId, Math.min(Math.max(n, 0), TOTAL_STEPS - 1));

  // Count + preview the records already saved for one step's band.
  const refreshSection = useCallback((s: WizardStep) => {
    if (!pageId || !s.section) return;
    const params: Record<string, any> = { podcastPageId: pageId, limit: 5 };
    if (s.section.sectionKey) params.sectionKey = s.section.sectionKey;
    s.section.api.getAll(params)
      .then(({ data }) => {
        const rows = data.data || [];
        setCounts((c) => ({ ...c, [s.key]: data.pagination?.total ?? rows.length }));
        setPreviews((p) => ({ ...p, [s.key]: rows }));
      })
      .catch(() => {});
  }, [pageId]);

  // Prime every counter once the page exists (also on resume after a refresh).
  useEffect(() => {
    if (!pageId) { setCounts({}); setPreviews({}); return; }
    STEPS.forEach((s) => { if (s.section) refreshSection(s); });
  }, [pageId, refreshSection]);

  /* Saving a copy step writes the whole record, not just this band's fields:
     the form still holds everything entered on earlier steps, so one save
     persists all of it and skipping ahead never leaves a gap behind. */
  const saveCopy = async (values: any) => {
    try {
      if (pageId) {
        await podcastPageApi.update(pageId, values);
        setPageName(values.name || pageName);
        setSaved((prev) => ({ ...(prev || {}), ...values }));
        toast.success('Saved');
        if (step === TOTAL_STEPS - 1) navigate('/podcast/page');
        else goTo(step + 1);
        return;
      }
      const { data } = await podcastPageApi.create(values);
      const newId = data?.data?._id;
      if (!newId) { toast.error('Could not read the created page id'); return; }
      setPageName(values.name || '');
      setSaved({ ...values, _id: newId });
      loadedFor.current = newId; // already in sync — don't re-fetch over the form
      toast.success('Page created');
      setWizardState(newId, step + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleSectionSaved = () => {
    refreshSection(current);
    setFormKey((k) => k + 1); // clear the form so another record can be added
  };

  const handleFinish = () => {
    toast.success('Podcast page completed');
    navigate('/podcast/page');
  };

  const sectionCount = current.section ? counts[current.key] ?? 0 : 0;
  const manageHref = current.section
    ? `${current.section.managePath}?podcastPageId=${pageId}${current.section.sectionKey ? `&sectionKey=${current.section.sectionKey}` : ''}`
    : '';

  /* A step is ticked once it actually holds something: an items step when it
     has at least one record, a copy step when one of its own fields has been
     filled in on the saved record. Step 1 is ticked as soon as the page exists,
     which is exactly what it is for. A step with both is ticked when either
     half has content, since either alone renders on the page. */
  const isDone = (s: WizardStep) => {
    if (s.key === 'details') return Boolean(pageId);
    if (s.section && (counts[s.key] ?? 0) > 0) return true;
    if (!s.groups || !saved) return false;
    return s.groups.some((key) =>
      group(key).fields.some((f) => isFilledField(f, saved[f])));
  };

  const doneCount = useMemo(
    () => STEPS.filter((s) => isDone(s)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts, pageId, saved],
  );

  // ── Vertical stepper row (rows are joined by a theme-colored line) ─────────
  const stepRow = (index: number, label: string, done: boolean) => {
    const active = index === step;
    const clickable = index === 0 || Boolean(pageId);
    const isLast = index === TOTAL_STEPS - 1;
    return (
      <li key={index} className="relative pb-1.5 last:pb-0">
        {!isLast && <span aria-hidden className="absolute left-[16px] top-8 bottom-0 w-0.5 bg-primary-600" />}
        <button
          type="button"
          disabled={!clickable}
          onClick={() => goTo(index)}
          title={clickable ? label : 'Save the page details first'}
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

  const ctx = { register, errors, watch, setValue, isEdit: isEditRoute };

  if (loading) return <ContentLoader />;

  return (
    <div>
      <PageHeader
        title={isEditRoute ? 'Edit Podcast Page' : 'Create Podcast Page'}
        breadcrumbs={[
          { label: 'Podcast', path: '/podcast/page' },
          { label: isEditRoute ? 'Edit Page' : 'Create Page' },
        ]}
        actions={pageId ? (
          <span className="text-sm text-gray-500">
            Page: <span className="font-medium text-gray-900">{pageName || pageId}</span>
          </span>
        ) : undefined}
      />

      {/* ── Layout: step content on the left, vertical stepper on the right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* LEFT — step content + navigation (~75%) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{current.label}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {current.hint}
                  {step > 0 && ' This step is optional — you can skip it and fill it in later.'}
                </p>
              </div>
              {pageId && current.section && (
                <Link
                  to={manageHref}
                  className="btn-secondary btn-sm flex items-center gap-1.5 flex-shrink-0"
                  title="Open the full list for this section (edit / reorder / delete)"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Manage
                </Link>
              )}
            </div>
          </div>

          {/* Copy fields for this band. Its own <form> so it stays a sibling of
              the section form below rather than nesting inside it. */}
          {current.groups && (
            <form onSubmit={handleSubmit(saveCopy)} className="space-y-4">
              {current.groups.map((key) => renderGroup(group(key), ctx))}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/podcast/page')}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : !pageId ? 'Create & Continue' : step === TOTAL_STEPS - 1 ? 'Save & Finish' : 'Save & Continue'}
                </button>
              </div>
            </form>
          )}

          {/* Repeating items for this band. */}
          {current.section && (
            !pageId ? (
              <div className="card text-center py-10">
                <p className="text-sm text-gray-600 mb-4">Save the page details first to unlock this step.</p>
                <button type="button" onClick={() => goTo(0)} className="btn-primary btn-sm">
                  Go to Page Details
                </button>
              </div>
            ) : (
              <div className="card">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {current.groups ? `${current.label} — items` : current.label}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {sectionCount > 0
                      ? `Saving adds another ${current.section.noun}. ${sectionCount} already added.`
                      : `Add the first ${current.section.noun}. Save again to add another.`}
                  </p>
                </div>
                <current.section.Form
                  key={`${current.key}-${formKey}`}
                  lockedPageId={pageId}
                  lockedSectionKey={current.section.sectionKey}
                  onSuccess={handleSectionSaved}
                  onCancel={() => setFormKey((k) => k + 1)}
                />
              </div>
            )
          )}

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
                disabled={!pageId}
                title={pageId ? undefined : 'Save the page details first'}
                className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {current.section && sectionCount === 0 ? 'Skip / Next' : 'Next'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!pageId}
                className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
              {STEPS.map((s, i) => stepRow(i, s.label, isDone(s)))}
            </ul>
          </div>

          {/* Records already saved for this band. */}
          {pageId && current.section && (
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                Added in this section
              </p>
              {sectionCount > 0 ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mr-1.5">
                      {sectionCount}
                    </span>
                    record(s) saved
                  </p>
                  <ul className="space-y-1.5">
                    {(previews[current.key] || []).map((rec: any) => (
                      <li key={rec._id} className="flex items-center gap-2 text-xs text-gray-600 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-100">
                        <CheckIcon className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                        <span className="truncate">{recordLabel(rec)}</span>
                      </li>
                    ))}
                  </ul>
                  {sectionCount > (previews[current.key]?.length ?? 0) && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      Showing first {previews[current.key]?.length} — use Manage to see all.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  Nothing added yet. Save the form to add the first record, or skip this step.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

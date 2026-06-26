// @ts-nocheck
"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "@/src/lib/navigation";
import { FaArrowLeft, FaArrowRight, FaCheck, FaFileAlt } from "react-icons/fa";
import { IoCloudUploadOutline } from "react-icons/io5";



const STEPS = [
  { id: 1, label: "About you" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Preferences" },
];

// Required fields per step. Used for the can-i-advance check before
// hopping to the next step.
const STEP_REQUIRED_FIELDS = {
  1: ["first_name", "last_name", "email", "phone_no", "state", "country"],
  2: [
    "experience",
    "current_ctc",
    "annual_ctc",
    "notice_period_days",
    "linkedin_profile",
  ],
  3: ["job_prefrence", "work_type", "upload_resume"],
};

const initialFormState = {
  first_name: "",
  last_name: "",
  phone_no: "",
  email: "",
  experience: "",
  linkedin_profile: "",
  current_ctc: "",
  annual_ctc: "",
  state: "",
  country: "",
  job_prefrence: "",
  work_type: "",
  notice_period_days: "",
  portfolio_link: "",
  upload_resume: null,
};

const JobApplicationForm = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormState);
  // Per-field error map. Set when Next/Submit fires and a required
  // field is empty; cleared on the next change to that field.
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const wizardTopRef = useRef(null);

  // Fetch the job's title + id from the API so the wizard heading
  // can read "Apply for {title}" + we have the id to associate the
  // application with. Stash the id in ref so handleSubmit can use it
  // without re-fetching.
  const jobIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const url = new URL("/content-api/jobs", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "0");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = await res.json();
        const job = body?.docs?.[0];
        if (!cancelled && job) {
          setJobTitle(job.title || "");
          jobIdRef.current = job.id;
        }
      } catch {
        // soft failure — generic heading is fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear that field's error on edit so the user gets immediate
    // feedback that they fixed it.
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const setResumeFile = useCallback((file) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, upload_resume: file }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.upload_resume;
      return next;
    });
  }, []);

  const handleFileInputChange = (e) => {
    setResumeFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    setResumeFile(e.dataTransfer.files?.[0]);
  };

  // Validate the fields required for the current step. Returns
  // true if all are filled; otherwise sets per-field errors and
  // returns false.
  const validateCurrentStep = () => {
    const required = STEP_REQUIRED_FIELDS[step] || [];
    const newErrors = {};
    required.forEach((field) => {
      const value = formData[field];
      const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");
      if (isEmpty) {
        newErrors[field] = "This field is required";
      }
    });
    // Email format check on step 1
    if (step === 1 && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
    // Scroll user back to the top of the wizard so the new step is
    // visible without a manual scroll.
    setTimeout(() => {
      wizardTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const goToPrevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    setTimeout(() => {
      wizardTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      /* Build a structured cover_letter / notes blob so the rich
         form fields (CTC, notice period, work preferences) survive
         even though the JobApplicants schema doesn't model them as
         first-class fields. Add them on the collection later if
         Anil wants. */
      const notesBlob = [
        formData.current_ctc && `Current CTC: ${formData.current_ctc}`,
        formData.annual_ctc && `Expected CTC: ${formData.annual_ctc}`,
        formData.notice_period_days &&
          `Notice period (days): ${formData.notice_period_days}`,
        formData.job_prefrence && `Job preference: ${formData.job_prefrence}`,
        formData.work_type && `Work type: ${formData.work_type}`,
      ]
        .filter(Boolean)
        .join("\n");

      /* The Express api only exposes ONE endpoint for applications
         (POST /job/applicants), which expects a single multipart
         request: the resume file under `applicant_resume` alongside
         the applicant's fields — there's no separate resume-upload
         endpoint. job_list_id is the relationship to the parent
         Jobs doc (resolved in the useEffect above from the slug). */
      const applicantForm = new FormData();
      if (jobIdRef.current != null) {
        applicantForm.append("job_list_id", String(jobIdRef.current));
      }
      applicantForm.append(
        "applicant_name",
        `${formData.first_name} ${formData.last_name}`.trim(),
      );
      applicantForm.append("applicant_email", formData.email);
      applicantForm.append("applicant_phone", formData.phone_no);
      applicantForm.append("cover_letter", notesBlob);
      applicantForm.append("state", formData.state);
      applicantForm.append("country", formData.country);
      applicantForm.append("experience", formData.experience);
      applicantForm.append("linkedin_url", formData.linkedin_profile);
      applicantForm.append("portfolio_url", formData.portfolio_link);
      if (formData.upload_resume instanceof File) {
        applicantForm.append("applicant_resume", formData.upload_resume);
      }

      const res = await fetch("/content-api/job-applicants", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: applicantForm,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const firstErr = Array.isArray(body?.errors) && body.errors[0]?.message;
        throw new Error(firstErr || body?.message || `HTTP ${res.status}`);
      }
      setFormData(initialFormState);
      navigate("/thank-you", {
        state: {
          successMessage: "Your application has been submitted successfully!",
        },
      });
    } catch (error: any) {
      console.error("Error submitting application:", error);
      setSubmitError(error?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const heading = useMemo(
    () => (jobTitle ? `Apply for ${jobTitle}` : "Apply for this role"),
    [jobTitle]
  );

  return (
    <section className="job-application-wizard">
      <div className="job-application-wizard-inner" ref={wizardTopRef}>
        {/* ----------------------------------------------------------
            Header — context for which job + how long this'll take
            ---------------------------------------------------------- */}
        <header className="job-application-header">
          <p className="job-application-eyebrow">Job application</p>
          <h1 className="job-application-heading">{heading}</h1>
          <p className="job-application-pitch">
            Three short steps. Takes about 3 minutes. Anil personally
            reads applications.
          </p>
        </header>

        {/* ----------------------------------------------------------
            Sticker progress bar — 3 numbered chips connected by a
            yellow track. Active step is filled yellow; completed
            steps show a check.
            ---------------------------------------------------------- */}
        <ol className="job-application-progress" aria-label="Progress">
          {STEPS.map((s, i) => {
            const state =
              s.id < step ? "done" : s.id === step ? "current" : "upcoming";
            return (
              <li
                key={s.id}
                className={`job-application-progress-step is-${state}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="job-application-progress-bullet" aria-hidden="true">
                  {state === "done" ? <FaCheck /> : s.id}
                </span>
                <span className="job-application-progress-label">{s.label}</span>
                {i < STEPS.length - 1 && (
                  <span
                    className="job-application-progress-track"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* ----------------------------------------------------------
            Form — only the active step's fields render at a time.
            ---------------------------------------------------------- */}
        <form className="job-application-form" onSubmit={handleSubmit} noValidate>
          {step === 1 && (
            <fieldset className="job-application-step">
              <legend className="job-application-step-heading">About you</legend>
              <p className="job-application-step-pitch">
                Tell us how to reach you. We'll only use these details for
                this application.
              </p>

              <div className="job-application-grid">
                <Field
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  error={errors.first_name}
                  required
                  placeholder="Your first name"
                />
                <Field
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  error={errors.last_name}
                  required
                  placeholder="Your last name"
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  placeholder="you@example.com"
                />
                <Field
                  label="Phone Number"
                  name="phone_no"
                  type="tel"
                  value={formData.phone_no}
                  onChange={handleChange}
                  error={errors.phone_no}
                  required
                  placeholder="+91 98xxxxxxxx"
                />
                <Field
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  error={errors.state}
                  required
                  placeholder="e.g. Maharashtra"
                />
                <Field
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  error={errors.country}
                  required
                  placeholder="e.g. India"
                />
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="job-application-step">
              <legend className="job-application-step-heading">
                Experience &amp; compensation
              </legend>
              <p className="job-application-step-pitch">
                Help us understand your background and what you're looking for.
              </p>

              <div className="job-application-grid">
                <Field
                  label="Years of Experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  error={errors.experience}
                  required
                  placeholder="e.g. 4"
                />
                <Field
                  label="Notice Period (days)"
                  name="notice_period_days"
                  value={formData.notice_period_days}
                  onChange={handleChange}
                  error={errors.notice_period_days}
                  required
                  placeholder="e.g. 30"
                />
                <Field
                  label="Current CTC"
                  name="current_ctc"
                  value={formData.current_ctc}
                  onChange={handleChange}
                  error={errors.current_ctc}
                  required
                  placeholder="e.g. ₹8 LPA"
                />
                <Field
                  label="Expected CTC"
                  name="annual_ctc"
                  value={formData.annual_ctc}
                  onChange={handleChange}
                  error={errors.annual_ctc}
                  required
                  placeholder="e.g. ₹12 LPA"
                />
                <Field
                  label="LinkedIn Profile"
                  name="linkedin_profile"
                  value={formData.linkedin_profile}
                  onChange={handleChange}
                  error={errors.linkedin_profile}
                  required
                  placeholder="https://linkedin.com/in/…"
                />
                <Field
                  label="Portfolio Link"
                  name="portfolio_link"
                  value={formData.portfolio_link}
                  onChange={handleChange}
                  error={errors.portfolio_link}
                  placeholder="https://… (optional)"
                />
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="job-application-step">
              <legend className="job-application-step-heading">
                Preferences &amp; resume
              </legend>
              <p className="job-application-step-pitch">
                Last step — pick how you'd like to work and drop us your CV.
              </p>

              <div className="job-application-grid">
                <SelectField
                  label="Employment Preference"
                  name="job_prefrence"
                  value={formData.job_prefrence}
                  onChange={handleChange}
                  error={errors.job_prefrence}
                  required
                  options={[
                    { value: "Full time", label: "Full Time" },
                    { value: "Part time", label: "Part Time" },
                    { value: "freelance", label: "Freelance" },
                    { value: "contract", label: "Contract" },
                    { value: "internship", label: "Internship" },
                  ]}
                />
                <SelectField
                  label="Work Preference"
                  name="work_type"
                  value={formData.work_type}
                  onChange={handleChange}
                  error={errors.work_type}
                  required
                  options={[
                    { value: "on-site", label: "On-Site" },
                    { value: "remote", label: "Remote" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                />
              </div>

              {/* Resume drop zone — sticker-styled, click-to-upload + drag-drop */}
              <div className="job-application-resume-block">
                <label className="job-application-label">
                  Upload Resume <span className="job-application-required">*</span>
                </label>
                <div
                  className={`job-application-resume-drop ${dragActive ? "is-drag-active" : ""
                    } ${formData.upload_resume ? "is-filled" : ""} ${errors.upload_resume ? "is-error" : ""
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload resume"
                >
                  {formData.upload_resume ? (
                    <div className="job-application-resume-filled">
                      <FaFileAlt
                        className="job-application-resume-icon"
                        aria-hidden="true"
                      />
                      <div className="job-application-resume-filename">
                        {formData.upload_resume.name}
                      </div>
                      <button
                        type="button"
                        className="job-application-resume-replace"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Replace file
                      </button>
                    </div>
                  ) : (
                    <div className="job-application-resume-empty">
                      <IoCloudUploadOutline
                        className="job-application-resume-icon"
                        aria-hidden="true"
                      />
                      <div className="job-application-resume-text">
                        <strong>Drop your CV here</strong>
                        <span>or click to browse</span>
                      </div>
                      <span className="job-application-resume-hint">
                        PDF, DOC or DOCX
                      </span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="job-application-resume-input"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </div>
                {errors.upload_resume && (
                  <div className="job-application-error">
                    {errors.upload_resume}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="job-application-submit-error">{submitError}</div>
              )}
            </fieldset>
          )}

          {/* Per-step nav: Back + Next/Submit. Back is hidden on
              step 1 since there's nowhere to go back. */}
          <div className="job-application-nav">
            {step > 1 ? (
              <button
                type="button"
                className="job-application-back"
                onClick={goToPrevStep}
                disabled={submitting}
              >
                <FaArrowLeft aria-hidden="true" />
                Back
              </button>
            ) : (
              <span />
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                className="job-application-next"
                onClick={goToNextStep}
              >
                Continue
                <FaArrowRight aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                className="job-application-next"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit Application"}
                {!submitting && <FaArrowRight aria-hidden="true" />}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

/** Small text/email/tel input with sticker shadow on focus + error state. */
const Field = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
}) => (
  <div className="job-application-field">
    <label className="job-application-label" htmlFor={name}>
      {label}
      {required && <span className="job-application-required"> *</span>}
    </label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`job-application-input ${error ? "is-error" : ""}`}
      autoComplete="off"
    />
    {error && <div className="job-application-error">{error}</div>}
  </div>
);

const SelectField = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  options,
}) => (
  <div className="job-application-field">
    <label className="job-application-label" htmlFor={name}>
      {label}
      {required && <span className="job-application-required"> *</span>}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`job-application-input job-application-select ${error ? "is-error" : ""
        }`}
    >
      <option value="">Select…</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <div className="job-application-error">{error}</div>}
  </div>
);

export default JobApplicationForm;

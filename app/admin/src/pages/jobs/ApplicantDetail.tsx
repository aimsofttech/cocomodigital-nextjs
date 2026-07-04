import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobApplicantApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ApplicantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      jobApplicantApi.getOne(id).then(({ data }) => setApplicant(data.data)).finally(() => setLoading(false));
    }
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await jobApplicantApi.updateStatus(id, status);
      setApplicant((prev: any) => ({ ...prev, applicationStatus: status }));
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); } finally { setUpdating(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!applicant) return <div className="card"><p className="text-gray-500">Applicant not found</p></div>;

  const statuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
  const statusColors: Record<string, string> = { pending: 'badge-warning', reviewed: 'badge-info', shortlisted: 'badge-success', rejected: 'badge-danger', hired: 'badge-success' };

  return (
    <div>
      <PageHeader title="Applicant Detail"
        breadcrumbs={[{ label: 'Jobs' }, { label: 'Applicants', path: '/jobs/applicants' }, { label: applicant.name }]}
        actions={<button onClick={() => navigate(-1)} className="btn-secondary btn-sm">Back</button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Name</p><p className="font-semibold">{applicant.name}</p></div>
            <div><p className="text-xs text-gray-500">Email</p><p className="font-semibold">{applicant.email}</p></div>
            <div><p className="text-xs text-gray-500">Phone</p><p>{applicant.phone || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Experience</p><p>{applicant.experience || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Location</p><p>{[applicant.state, applicant.country].filter(Boolean).join(', ') || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Applied On</p><p>{new Date(applicant.createdAt).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-500">Current CTC</p><p>{applicant.currentCtc || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Expected CTC</p><p>{applicant.annualCtc || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Notice Period (days)</p><p>{applicant.noticePeriodDays || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Employment Preference</p><p className="capitalize">{applicant.jobPrefrence || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Work Preference</p><p className="capitalize">{applicant.workType || 'N/A'}</p></div>
          </div>
          {applicant.coverLetter && (
            <div><p className="text-xs text-gray-500 mb-1">Cover Letter</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{applicant.coverLetter}</p></div>
          )}
          {applicant.resume && (
            <div><a href={applicant.resume} target="_blank" rel="noreferrer" className="btn-primary btn-sm">View Resume</a></div>
          )}
          {(applicant.linkedinUrl || applicant.portfolioUrl) && (
            <div className="flex gap-3">
              {applicant.linkedinUrl && <a href={applicant.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">LinkedIn</a>}
              {applicant.portfolioUrl && <a href={applicant.portfolioUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">Portfolio</a>}
            </div>
          )}
        </div>
        <div className="card space-y-4">
          <div><p className="text-xs text-gray-500">Job</p><p className="font-semibold">{applicant.jobListId?.job_title || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-500 mb-2">Current Status</p><span className={`badge ${statusColors[applicant.applicationStatus] || 'badge-warning'}`}>{applicant.applicationStatus}</span></div>
          <div><p className="text-xs text-gray-500 mb-2">Update Status</p>
            <div className="space-y-2">
              {statuses.map((s) => (
                <button key={s} onClick={() => updateStatus(s)} disabled={updating || applicant.applicationStatus === s}
                  className={`w-full btn btn-sm capitalize ${applicant.applicationStatus === s ? 'btn-primary' : 'btn-secondary'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

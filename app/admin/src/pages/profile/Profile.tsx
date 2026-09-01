import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import ContentLoader from '@/components/ui/ContentLoader';
import ImageUpload from '@/components/ui/ImageUpload';
import { TextField } from '@/components/ui/FormFields';
import { profileApi } from '@/services/adminApi';
import { useAppDispatch } from '@/app/hooks';
import { loadSession } from '@/features/auth/authSlice';

/* Your own account.
 *
 * Every request here works from the session on the server — there is no user id
 * in any of these calls — so this page can only ever change the person using it,
 * whatever is sent. Email and role are shown but not editable: they identify the
 * account and decide its access, so a Super Admin changes them from User
 * Management.
 */

function Fieldset({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function Profile() {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);

  const details = useForm<any>({ defaultValues: { name: '', profileImage: '' } });
  const password = useForm<any>({
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  useEffect(() => {
    profileApi.get()
      .then(({ data }) => {
        const u = data.data.user;
        setAccount(u);
        details.reset({ name: u.name || '', profileImage: u.profileImage || '' });
      })
      .catch(() => toast.error('Could not load your profile'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDetails = async (values: any) => {
    try {
      const { data } = await profileApi.update({
        name: values.name,
        profileImage: values.profileImage || '',
      });
      setAccount(data.data.user);
      toast.success('Profile updated successfully');
      // Refresh the cached session so the header shows the new name at once.
      dispatch(loadSession());
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update your profile');
    }
  };

  const savePassword = async (values: any) => {
    if (values.new_password !== values.confirm_password) {
      toast.error('The new passwords do not match');
      return;
    }
    try {
      await profileApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success('Password changed successfully');
      password.reset({ current_password: '', new_password: '', confirm_password: '' });
      setAccount((a: any) => (a ? { ...a, mustChangePassword: false } : a));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not change your password');
    }
  };

  if (loading) return <ContentLoader />;

  return (
    <div>
      <PageHeader title="My Profile" breadcrumbs={[{ label: 'Profile' }]} />

      <div className="max-w-2xl space-y-5">
        {account?.mustChangePassword && (
          <div className="card border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-900">
              You are still using the password you were given. Set your own below.
            </p>
          </div>
        )}

        <Fieldset
          title="Account"
          hint="Your email and user type are managed by a Super Admin — ask them if either needs to change."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email</label>
              <input
                value={account?.email || ''}
                readOnly
                className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="form-label">User Type</label>
              <input
                value={account?.roleName || ''}
                readOnly
                className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </Fieldset>

        <form onSubmit={details.handleSubmit(saveDetails)}>
          <Fieldset title="Your Details">
            <TextField
              register={details.register}
              name="name"
              label="Name"
              required
              errors={details.formState.errors}
            />
            <ImageUpload
              name="profileImage"
              label="Profile Picture"
              uploadType="image"
              folder="admin/users"
              recommended={{ width: 256, height: 256, ratio: '1:1', formats: 'JPG, PNG, WebP', maxSizeMB: 1, note: 'a square headshot' }}
              value={details.watch('profileImage')}
              onChange={(url) => details.setValue('profileImage', url, { shouldDirty: true })}
            />
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={details.formState.isSubmitting}
                className="btn-primary btn-sm"
              >
                {details.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Fieldset>
        </form>

        <form onSubmit={password.handleSubmit(savePassword)}>
          <Fieldset
            title="Change Password"
            hint="Your current password is required — it is what stops an unattended screen becoming a permanent account takeover."
          >
            <TextField
              register={password.register}
              name="current_password"
              label="Current Password"
              type="password"
              required
              errors={password.formState.errors}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                register={password.register}
                name="new_password"
                label="New Password"
                type="password"
                required
                errors={password.formState.errors}
                hint="At least 6 characters."
              />
              <TextField
                register={password.register}
                name="confirm_password"
                label="Confirm New Password"
                type="password"
                required
                errors={password.formState.errors}
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={password.formState.isSubmitting}
                className="btn-primary btn-sm"
              >
                {password.formState.isSubmitting ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </Fieldset>
        </form>
      </div>
    </div>
  );
}

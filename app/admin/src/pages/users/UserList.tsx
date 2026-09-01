import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage, { type ModalRenderProps } from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import ImageUpload from '@/components/ui/ImageUpload';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { ImageCell } from '@/components/ui/MediaCell';
import { SelectField, TextField, FormActions } from '@/components/ui/FormFields';
import { adminUserApi } from '@/services/adminApi';
import { useAppSelector } from '@/app/hooks';

/* User Management — Super Admin only.
 *
 * Built on the same CrudListPage the rest of the panel uses, so the table,
 * filters, search, pagination, confirm dialog and modal all look and behave
 * exactly like every other list in the admin.
 */

interface RoleOption { key: string; name: string; description?: string }

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_manager: 'Admin / Manager',
  editor: 'Editor / Content Manager',
  custom: 'Custom User',
};

const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Shown once after a create or a reset — the only time the password exists in
 *  readable form. It is hashed in the database and can never be shown again. */
function CredentialsModal({
  credentials, emailed, onClose,
}: {
  credentials: { email: string; password: string };
  emailed?: boolean;
  onClose: () => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email: ${credentials.email}\nPassword: ${credentials.password}`,
      );
      toast.success('Copied');
    } catch {
      toast.error('Could not copy — select the text instead');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Sign-in details" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Hand these to the user. This password is shown <span className="font-medium">once</span> —
          it is stored encrypted and cannot be displayed again. You can always issue a new one
          from the key icon in the list.
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-900 break-all">{credentials.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Password</p>
            <p className="text-sm font-mono font-medium text-gray-900 break-all">{credentials.password}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {emailed
            ? 'A copy has also been emailed to the user.'
            : 'Email is not configured, so nothing was sent — pass these on yourself.'}
        </p>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={copy} className="btn-secondary flex-1">Copy</button>
          <button type="button" onClick={onClose} className="btn-primary flex-1">Done</button>
        </div>
      </div>
    </Modal>
  );
}

function UserForm({
  editId, roles, onSuccess, onCancel, onCredentials,
}: ModalRenderProps & {
  editId?: string;
  roles: RoleOption[];
  onCredentials: (c: { email: string; password: string }, emailed: boolean) => void;
}) {
  const isEdit = Boolean(editId);
  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({ defaultValues: { roleKey: 'custom', status: '1' } });
  const [isSuperAdminRow, setIsSuperAdminRow] = useState(false);

  useEffect(() => {
    if (!isEdit || !editId) return;
    adminUserApi.getOne(editId)
      .then(({ data }) => {
        const rec = data.data;
        setIsSuperAdminRow(rec.roleKey === 'super_admin');
        reset({ ...rec, status: String(rec.status ?? 1) });
      })
      .catch(() => { /* the API layer already surfaces the error toast */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, isEdit]);

  const onSubmit = async (values: any) => {
    try {
      if (isEdit && editId) {
        await adminUserApi.update(editId, {
          name: values.name,
          email: values.email,
          roleKey: values.roleKey,
          status: values.status,
          profileImage: values.profileImage || '',
        });
        toast.success('Updated successfully');
      } else {
        const { data } = await adminUserApi.create({
          name: values.name,
          email: values.email,
          roleKey: values.roleKey,
          profileImage: values.profileImage || '',
        });
        toast.success('User created successfully');
        const created = data.data;
        if (created?.credentials) onCredentials(created.credentials, Boolean(created.emailed));
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Paired on one row, matching how every other form in the panel groups
          two short related fields. Stacks below the sm breakpoint. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          register={register} name="name" label="Name" required errors={errors}
          placeholder="e.g. Priya Sharma"
        />
        <TextField
          register={register} name="email" label="Email" type="email" required errors={errors}
          placeholder="name@company.com"
          hint={isEdit ? undefined : 'The address they will sign in with.'}
        />
      </div>
      <SelectField
        register={register}
        name="roleKey"
        label="User Type"
        options={roles.map((r) => ({ value: r.key, label: r.name }))}
        hint={
          isSuperAdminRow
            ? 'A Super Admin’s role cannot be changed here.'
            : 'What this user can reach is set by the role, under Roles & Permissions.'
        }
      />
      <ImageUpload
        name="profileImage"
        label="Profile Picture"
        uploadType="image"
        folder="admin/users"
        recommended={{ width: 256, height: 256, ratio: '1:1', formats: 'JPG, PNG, WebP', maxSizeMB: 1, note: 'a square headshot' }}
        value={watch('profileImage')}
        onChange={(url) => setValue('profileImage', url)}
      />
      {isEdit && (
        <div>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-select" disabled={isSuperAdminRow}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {isSuperAdminRow
              ? 'A Super Admin cannot be deactivated.'
              : 'An inactive user cannot sign in, and any session they have stops working immediately.'}
          </p>
        </div>
      )}
      {!isEdit && (
        <p className="text-xs text-gray-500">
          A secure password is generated automatically and shown to you once the account is created.
        </p>
      )}
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
    </form>
  );
}

export default function UserList() {
  const { user: me } = useAppSelector((state) => state.auth);
  const {
    data, loading, submitting, pagination, remove,
    setSearch, setPage, setFilterParams, fetchAll,
  } = useCrud(adminUserApi);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [creds, setCreds] = useState<{ credentials: { email: string; password: string }; emailed: boolean } | null>(null);

  useEffect(() => {
    adminUserApi.assignableRoles()
      .then(({ data }) => setRoles(data.data || []))
      .catch(() => setRoles([]));
  }, []);

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await adminUserApi.update(id, { status });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReset = async (id: string, name: string) => {
    try {
      const { data } = await adminUserApi.resetPassword(id);
      setCreds({ credentials: data.data.credentials, emailed: Boolean(data.data.emailed) });
      toast.success(`New password issued for ${name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reset the password');
    }
  };

  const columns = [
    {
      key: 'name', label: 'User', sortable: true, className: 'min-w-[240px]',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <ImageCell src={row.profileImage} alt={row.name} size="w-9 h-9" />
          <div className="min-w-0">
            <span className="block truncate font-medium" title={row.name}>
              {row.name}
              {String(row._id) === String(me?.id) && (
                <span className="ml-1.5 text-[11px] font-normal text-gray-400">(you)</span>
              )}
            </span>
            <span className="block truncate text-gray-500" title={row.email}>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'roleKey', label: 'User Type', sortable: true, className: 'min-w-[170px]',
      render: (row: any) => (
        <span className={row.roleKey === 'super_admin' ? 'font-medium text-primary-700' : ''}>
          {row.roleName || ROLE_LABEL[row.roleKey] || row.roleKey}
        </span>
      ),
    },
    { key: 'lastLoginAt', label: 'Last Login', className: 'min-w-[170px]', render: (row: any) => fmt(row.lastLoginAt) },
    { key: 'createdAt', label: 'Created', className: 'min-w-[170px]', render: (row: any) => fmt(row.createdAt) },
    { key: 'updatedAt', label: 'Updated', className: 'min-w-[170px]', render: (row: any) => fmt(row.updatedAt) },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row: any) => (
        row.roleKey === 'super_admin'
          ? <span className="text-xs text-gray-400" title="A Super Admin is always active">Active</span>
          : <StatusToggle status={row.status} onConfirm={(s) => handleStatusChange(row._id, s)} />
      ),
    },
  ];

  return (
    <>
      <CrudListPage
        title="User Management"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        columns={columns}
        data={data}
        loading={loading}
        submitting={submitting}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        onDelete={remove}
        filterFields={[
          {
            key: 'roleKey', label: 'User Type', type: 'select' as const,
            options: [
              { value: '', label: 'All Types' },
              { value: 'super_admin', label: 'Super Admin' },
              ...roles.map((r) => ({ value: r.key, label: r.name })),
            ],
          },
          { key: 'status', label: 'Status', type: 'status' as const },
        ]}
        onServerFilterChange={setFilterParams}
        rowActions={(row: any) => (
          <Tooltip content="Issue a new password">
            <button
              type="button"
              onClick={() => handleReset(row._id, row.name)}
              className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 transition-colors"
            >
              <KeyIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
        renderModal={(props) => (
          <UserForm
            {...props}
            editId={props.id}
            roles={roles}
            onCredentials={(credentials, emailed) => setCreds({ credentials, emailed })}
          />
        )}
        modalTitle={(mode) => (mode === 'edit' ? 'Edit User' : 'Add User')}
        onRefresh={fetchAll}
        viewDetails={(row: any) => ({
          title: row.name,
          size: 'md' as const,
          fields: [
            { label: 'Email', value: row.email },
            { label: 'User Type', value: row.roleName || ROLE_LABEL[row.roleKey] },
            { label: 'Status', value: row.status === 1 ? 'Active' : 'Inactive' },
            { label: 'Last Login', value: fmt(row.lastLoginAt) },
            { label: 'Created', value: fmt(row.createdAt) },
            { label: 'Updated', value: fmt(row.updatedAt) },
            { label: 'Must Change Password', value: row.mustChangePassword ? 'Yes' : 'No' },
          ],
        })}
      />

      {creds && (
        <CredentialsModal
          credentials={creds.credentials}
          emailed={creds.emailed}
          onClose={() => setCreds(null)}
        />
      )}
    </>
  );
}

import type { ReactNode } from 'react';
import { useForm, type UseFormRegister, type UseFormSetValue, type UseFormWatch, type FieldErrors } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FormActions, OrderAndStatus, ServiceSelect, useChildForm } from './FormFields';

/* Modal form shell for the child collections.
 *
 * Owns everything the seven forms share — loading the record, the service
 * dropdown, display order + status, submit/toast/close — so each form only
 * declares the fields that are actually its own.
 */

export interface ChildFormContext {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  isEdit: boolean;
}

interface Props {
  api: {
    getOne?: (id: string) => Promise<any>;
    create?: (data: any) => Promise<any>;
    update?: (id: string, data: any) => Promise<any>;
  };
  editId?: string;
  lockedServiceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: Record<string, any>;
  children: (ctx: ChildFormContext) => ReactNode;
}

export default function ChildForm({
  api, editId, lockedServiceId, onSuccess, onCancel, defaultValues = {}, children,
}: Props) {
  const isEdit = Boolean(editId);
  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({ defaultValues: { status: '1', displayOrder: 0, ...defaultValues } });

  const { loadedServiceId, submit } = useChildForm({
    api, id: editId, isEdit, lockedServiceId, reset,
  });

  const onSubmit = async (values: any) => {
    try {
      await submit(values);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <ServiceSelect
        register={register}
        setValue={setValue}
        errors={errors}
        lockedServiceId={lockedServiceId}
        editValue={loadedServiceId}
        isEdit={isEdit}
      />

      {children({ register, errors, setValue, watch, isEdit })}

      <OrderAndStatus register={register} />
      <FormActions onCancel={() => onCancel?.()} isSubmitting={isSubmitting} />
    </form>
  );
}

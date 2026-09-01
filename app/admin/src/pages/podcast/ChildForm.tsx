import type { ReactNode } from 'react';
import { useForm, type UseFormRegister, type UseFormSetValue, type UseFormWatch, type FieldErrors } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FormActions, OrderAndStatus, PodcastPageSelect, usePodcastChildForm } from './FormFields';

/* Modal form shell for the child collections.
 *
 * Owns everything the six forms share — loading the record, the page dropdown,
 * display order + status, submit/toast/close — so each form only declares the
 * fields that are actually its own.
 */

export interface PodcastChildFormContext {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  isEdit: boolean;
  /** Set when the list was opened from one band's button. */
  lockedSectionKey?: string;
}

interface Props {
  api: {
    getOne?: (id: string) => Promise<any>;
    create?: (data: any) => Promise<any>;
    update?: (id: string, data: any) => Promise<any>;
  };
  editId?: string;
  lockedPageId?: string;
  lockedSectionKey?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: Record<string, any>;
  children: (ctx: PodcastChildFormContext) => ReactNode;
}

export default function ChildForm({
  api, editId, lockedPageId, lockedSectionKey, onSuccess, onCancel,
  defaultValues = {}, children,
}: Props) {
  const isEdit = Boolean(editId);
  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    defaultValues: {
      status: '1',
      displayOrder: 0,
      ...(lockedSectionKey ? { sectionKey: lockedSectionKey } : {}),
      ...defaultValues,
    },
  });

  const { loadedPageId, submit } = usePodcastChildForm({
    api, id: editId, isEdit, lockedPageId, lockedSectionKey, reset,
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
      <PodcastPageSelect
        register={register}
        setValue={setValue}
        errors={errors}
        lockedPageId={lockedPageId}
        editValue={loadedPageId}
        isEdit={isEdit}
      />

      {children({ register, errors, setValue, watch, isEdit, lockedSectionKey })}

      <OrderAndStatus register={register} />
      <FormActions onCancel={() => onCancel?.()} isSubmitting={isSubmitting} />
    </form>
  );
}

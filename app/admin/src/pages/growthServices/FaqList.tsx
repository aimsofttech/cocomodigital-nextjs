import ChildListPage from './ChildListPage';
import ChildForm from './ChildForm';
import { growthServiceFaqApi } from '@/services/adminApi';
import { TextAreaField, TextField } from './FormFields';

/* FAQ accordion entries. These also feed the page's FAQPage structured data, so
 * an answer should read as a complete reply on its own. */

function FaqForm({ editId, lockedServiceId, onSuccess, onCancel }: any) {
  return (
    <ChildForm
      api={growthServiceFaqApi}
      editId={editId}
      lockedServiceId={lockedServiceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      {({ register, errors }) => (
        <>
          <TextField
            register={register}
            name="question"
            label="Question"
            required
            errors={errors}
            placeholder="e.g. How long does it take to see growth?"
          />
          <TextAreaField
            register={register}
            name="answer"
            label="Answer"
            required
            errors={errors}
            rows={5}
            placeholder="Write a complete answer — this is also published as search-engine FAQ data."
          />
        </>
      )}
    </ChildForm>
  );
}

export default function FaqList() {
  const columns = [
    {
      key: 'question', label: 'Question', sortable: true, className: 'min-w-[240px] max-w-[340px]',
      render: (row: any) => <span className="block truncate" title={row.question}>{row.question}</span>,
    },
    {
      key: 'answer', label: 'Answer', className: 'min-w-[260px] max-w-[460px]',
      render: (row: any) => <span className="block truncate" title={row.answer}>{row.answer}</span>,
    },
  ];

  return (
    <ChildListPage
      title="Page FAQs"
      breadcrumbLabel="FAQs"
      api={growthServiceFaqApi}
      columns={columns}
      renderForm={(props) => <FaqForm {...props} />}
      modalTitle={(mode) => (mode === 'edit' ? 'Edit FAQ' : 'Add FAQ')}
    />
  );
}

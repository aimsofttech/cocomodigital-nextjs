// @ts-nocheck

/* Phase 5b: marketing-site login slice (state.me) dropped from
   Redux. EditLink used to show only when state.me.user === "admin",
   which no one was logging in for. Admin auth now lives at
   /admin (the API). To keep the option of restoring "edit
   shortcuts visible to logged-in admins" later, this component
   now renders nothing. Removing the import sites en masse would
   be churn; the no-op stub keeps signatures stable. */

interface EditLinkProps {
  path?: string;
  className?: string;
}

const EditLink = (_props: EditLinkProps) => null;

export default EditLink;

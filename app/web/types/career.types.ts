import type { JobDetails, JobCategory, JobApplicationPayload } from "./api.types";

export type { JobDetails, JobCategory, JobApplicationPayload };

export type JobType = "full_time" | "part_time" | "freelance" | "internship" | "contract";
export type WorkType = "on_site" | "remote" | "hybrid";

export interface JobCardProps {
  job: JobDetails;
  onClick?: () => void;
}

export interface JobListParams {
  category_id?: number;
  job_type?: JobType;
  work_type?: WorkType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DragFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface FormSubmitSuccessProps {
  title?: string;
  message?: string;
}

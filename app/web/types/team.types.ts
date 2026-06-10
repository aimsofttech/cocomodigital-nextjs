export type Department =
  | "Video Editing"
  | "Motion / Design"
  | "Design"
  | "Marketing / Creative"
  | "HR / Operations"
  | "Leadership"
  | "Studio / Ops"
  | "Channel Management"
  | string;

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  dept: Department;
  photo: string;
  consent: boolean;
  featured: boolean;
  bio?: string;
  linkedin?: string;
}

export interface DepartmentGroup {
  dept: Department;
  members: TeamMember[];
}

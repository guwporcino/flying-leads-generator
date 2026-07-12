export interface ApproachMessageInput {
  companyName: string;
  category: string;
  hasWebsite: boolean;
  /** `WebsiteAudit.aiGrade` — null se a empresa não tinha website (não passou pelo grader). */
  websiteGrade: string | null;
  previewUrl: string;
}

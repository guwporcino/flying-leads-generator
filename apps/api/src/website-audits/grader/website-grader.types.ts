import type {
  WebsiteAuditCriteriaScores,
  WebsiteAuditFinding,
  WebsiteGrade,
} from '@flying-leads/shared-types';

export interface WebsiteGradeResult {
  criteriaScores: WebsiteAuditCriteriaScores;
  grade: WebsiteGrade;
  findings: WebsiteAuditFinding[];
  opportunityScore: number;
}

/** Shape bruta que a tool `submit_website_grade` do Claude devolve (ver website-grader.prompt.ts). */
export interface WebsiteGradeToolInput {
  criteria: {
    ui: number;
    ux: number;
    responsiveness: number;
    performance: number;
    seo: number;
    design: number;
    credibility: number;
    modernity: number;
    clarity: number;
    cta: number;
    conversion: number;
  };
  grade: 'Excelente' | 'Bom' | 'Regular' | 'Ruim' | 'Péssimo';
  findings: Array<{ criterion: string; explanation: string }>;
  opportunity_score: number;
}

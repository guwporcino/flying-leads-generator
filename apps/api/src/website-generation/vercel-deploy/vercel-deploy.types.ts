export interface VercelDeploymentResponse {
  id: string;
  /** Domínio da deployment, sem protocolo (ex.: "meu-site-abc123.vercel.app"). */
  url: string;
}

export interface DeployResult {
  deploymentId: string;
  previewUrl: string;
}

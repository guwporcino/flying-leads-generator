import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneratedFile } from '../website-generation.types';
import { VercelDeployError } from './vercel-deploy.error';
import { DeployResult, VercelDeploymentResponse } from './vercel-deploy.types';

const VERCEL_DEPLOYMENTS_ENDPOINT = 'https://api.vercel.com/v13/deployments';

/**
 * Deploy via Deployments API com os arquivos embutidos na requisição — não
 * depende da integração Git da Vercel estar previamente instalada/linkada
 * ao repositório (ver ADR 0010).
 */
@Injectable()
export class VercelDeployService {
  constructor(private readonly config: ConfigService) {}

  async deploy(projectName: string, files: GeneratedFile[]): Promise<DeployResult> {
    const url = new URL(VERCEL_DEPLOYMENTS_ENDPOINT);
    const teamId = this.config.get<string>('VERCEL_TEAM_ID');
    if (teamId) {
      url.searchParams.set('teamId', teamId);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: files.map((file) => ({ file: file.path, data: file.content })),
        projectSettings: { framework: 'nextjs' },
        target: 'production',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new VercelDeployError(`Vercel deployment failed: ${response.status} ${errorBody}`);
    }

    const body = (await response.json()) as VercelDeploymentResponse;
    return { deploymentId: body.id, previewUrl: `https://${body.url}` };
  }

  private getToken(): string {
    const token = this.config.get<string>('VERCEL_TOKEN');
    if (!token) {
      throw new Error('VERCEL_TOKEN is not configured');
    }
    return token;
  }
}

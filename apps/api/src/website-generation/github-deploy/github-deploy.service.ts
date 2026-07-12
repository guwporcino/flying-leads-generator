import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneratedFile } from '../website-generation.types';
import { GitHubDeployError } from './github-deploy.error';
import {
  CommitResult,
  GitHubCommitResponse,
  GitHubRefResponse,
  GitHubTreeResponse,
} from './github-deploy.types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Commita um file set atomicamente via Git Data API (um commit só, não um
 * por arquivo) — ver ADR 0010.
 */
@Injectable()
export class GitHubDeployService {
  constructor(private readonly config: ConfigService) {}

  async commitFiles(
    directory: string,
    files: GeneratedFile[],
    message: string,
  ): Promise<CommitResult> {
    const { owner, repo } = this.getRepoConfig();
    const branch = this.config.get<string>('GENERATED_SITES_BASE_BRANCH') ?? 'main';

    const ref = await this.githubFetch<GitHubRefResponse>(
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    );
    const latestCommitSha = ref.object.sha;

    const baseCommit = await this.githubFetch<GitHubCommitResponse>(
      `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    );

    const tree = await this.githubFetch<GitHubTreeResponse>(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: {
        base_tree: baseCommit.tree.sha,
        tree: files.map((file) => ({
          path: `${directory}/${file.path}`,
          mode: '100644',
          type: 'blob',
          content: file.content,
        })),
      },
    });

    const newCommit = await this.githubFetch<GitHubCommitResponse>(
      `/repos/${owner}/${repo}/git/commits`,
      { method: 'POST', body: { message, tree: tree.sha, parents: [latestCommitSha] } },
    );

    await this.githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: { sha: newCommit.sha },
    });

    return {
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    };
  }

  private getRepoConfig(): { owner: string; repo: string } {
    const value = this.config.get<string>('GENERATED_SITES_REPO');
    if (!value) {
      throw new Error('GENERATED_SITES_REPO is not configured');
    }
    const [owner, repo] = value.split('/');
    if (!owner || !repo) {
      throw new Error(`GENERATED_SITES_REPO must be in "owner/repo" format, got "${value}"`);
    }
    return { owner, repo };
  }

  private getToken(): string {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN is not configured');
    }
    return token;
  }

  private async githubFetch<T>(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GitHubDeployError(
        `GitHub API ${init?.method ?? 'GET'} ${path} failed: ${response.status} ${errorBody}`,
      );
    }

    return (await response.json()) as T;
  }
}

import { ConfigService } from '@nestjs/config';
import { GitHubDeployService } from './github-deploy.service';
import { GitHubDeployError } from './github-deploy.error';
import { GeneratedFile } from '../website-generation.types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function buildConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    GENERATED_SITES_REPO: 'guwporcino/flying-leads-sites',
    GITHUB_TOKEN: 'gh-token',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

const files: GeneratedFile[] = [
  { path: 'app/page.tsx', content: 'export default function Page() { return null; }' },
];

describe('GitHubDeployService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('commits the file set with a single new commit, updating the branch ref', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'ref-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'ref-sha', tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}));

    const service = new GitHubDeployService(buildConfig());
    const result = await service.commitFiles(
      'sites/clinica-sorriso-abc123',
      files,
      'Generate site',
    );

    expect(result).toEqual({
      commitSha: 'new-commit-sha',
      commitUrl: 'https://github.com/guwporcino/flying-leads-sites/commit/new-commit-sha',
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);

    const treeCall = fetchMock.mock.calls[2] as [string, RequestInit];
    const treeBody = JSON.parse(treeCall[1].body as string) as {
      base_tree: string;
      tree: Array<{ path: string }>;
    };
    expect(treeBody.base_tree).toBe('base-tree-sha');
    expect(treeBody.tree[0]?.path).toBe('sites/clinica-sorriso-abc123/app/page.tsx');
  });

  it('throws GitHubDeployError when the API returns a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Not Found' }, false, 404));

    const service = new GitHubDeployService(buildConfig());

    await expect(service.commitFiles('sites/x', files, 'Generate site')).rejects.toThrow(
      GitHubDeployError,
    );
  });

  it('throws when GENERATED_SITES_REPO is not configured', async () => {
    const service = new GitHubDeployService(buildConfig({ GENERATED_SITES_REPO: undefined }));

    await expect(service.commitFiles('sites/x', files, 'Generate site')).rejects.toThrow(
      'GENERATED_SITES_REPO',
    );
  });

  it('throws when GENERATED_SITES_REPO is not in owner/repo format', async () => {
    const service = new GitHubDeployService(buildConfig({ GENERATED_SITES_REPO: 'invalid' }));

    await expect(service.commitFiles('sites/x', files, 'Generate site')).rejects.toThrow(
      'owner/repo',
    );
  });
});

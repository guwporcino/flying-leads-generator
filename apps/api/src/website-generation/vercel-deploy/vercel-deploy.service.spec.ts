import { ConfigService } from '@nestjs/config';
import { VercelDeployService } from './vercel-deploy.service';
import { VercelDeployError } from './vercel-deploy.error';
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
    VERCEL_TOKEN: 'vercel-token',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

const files: GeneratedFile[] = [
  { path: 'app/page.tsx', content: 'export default function Page() {}' },
];

describe('VercelDeployService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('deploys the file set and returns the preview URL', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 'dpl_123', url: 'clinica-sorriso-abc123.vercel.app' }),
    );

    const service = new VercelDeployService(buildConfig());
    const result = await service.deploy('clinica-sorriso-abc123', files);

    expect(result).toEqual({
      deploymentId: 'dpl_123',
      previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
    });
  });

  it('includes teamId as a query param when configured', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'dpl_1', url: 'x.vercel.app' }));

    const service = new VercelDeployService(buildConfig({ VERCEL_TEAM_ID: 'team_123' }));
    await service.deploy('x', files);

    const [requestUrl] = fetchMock.mock.calls[0] as [URL];
    expect(requestUrl.toString()).toContain('teamId=team_123');
  });

  it('throws VercelDeployError on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid token' }, false, 403));

    const service = new VercelDeployService(buildConfig());

    await expect(service.deploy('x', files)).rejects.toThrow(VercelDeployError);
  });

  it('throws when VERCEL_TOKEN is not configured', async () => {
    const service = new VercelDeployService(buildConfig({ VERCEL_TOKEN: undefined }));

    await expect(service.deploy('x', files)).rejects.toThrow('VERCEL_TOKEN');
  });
});

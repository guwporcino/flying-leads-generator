export class GitHubDeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubDeployError';
  }
}

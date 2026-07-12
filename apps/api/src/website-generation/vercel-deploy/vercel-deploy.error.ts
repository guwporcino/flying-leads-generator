export class VercelDeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VercelDeployError';
  }
}

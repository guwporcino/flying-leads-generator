export class GooglePlacesApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GooglePlacesApiError';
  }
}

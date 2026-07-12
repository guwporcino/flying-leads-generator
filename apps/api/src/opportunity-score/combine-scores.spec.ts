import { combineScores } from './combine-scores';

describe('combineScores', () => {
  it('averages the two scores, rounded', () => {
    expect(combineScores(90, 71)).toBe(81);
  });

  it('clamps to 100', () => {
    expect(combineScores(100, 100)).toBe(100);
  });

  it('clamps to 0', () => {
    expect(combineScores(0, 0)).toBe(0);
  });
});

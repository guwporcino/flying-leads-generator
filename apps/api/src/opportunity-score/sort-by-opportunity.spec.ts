import { sortByOpportunity } from './sort-by-opportunity';

interface Item {
  id: string;
  opportunityScore: { finalScore: number } | null;
}

describe('sortByOpportunity', () => {
  it('sorts by finalScore descending', () => {
    const items: Item[] = [
      { id: 'low', opportunityScore: { finalScore: 15 } },
      { id: 'high', opportunityScore: { finalScore: 90 } },
      { id: 'mid', opportunityScore: { finalScore: 60 } },
    ];

    expect(sortByOpportunity(items).map((item) => item.id)).toEqual(['high', 'mid', 'low']);
  });

  it('pushes companies without a score to the end', () => {
    const items: Item[] = [
      { id: 'pending', opportunityScore: null },
      { id: 'scored', opportunityScore: { finalScore: 10 } },
    ];

    expect(sortByOpportunity(items).map((item) => item.id)).toEqual(['scored', 'pending']);
  });

  it('does not mutate the input array', () => {
    const items: Item[] = [
      { id: 'a', opportunityScore: { finalScore: 10 } },
      { id: 'b', opportunityScore: { finalScore: 90 } },
    ];
    const original = [...items];

    sortByOpportunity(items);

    expect(items).toEqual(original);
  });
});

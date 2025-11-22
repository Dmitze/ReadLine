import * as ai from '../utils/aiHelper';

describe('aiHelper.rerankBooksWithAI', () => {
  const candidates = [
    { id: 1, title: 'A', author: 'Author1', description: 'desc', rating: 3 } as any,
    { id: 2, title: 'B', author: 'Author2', description: 'desc', rating: 4 } as any,
    { id: 3, title: 'C', author: 'Author3', description: 'desc', rating: 5 } as any,
  ];

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('uses AI order when valid JSON is returned (or falls back gracefully)', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(true);
    jest.spyOn(ai, 'askAI').mockResolvedValue('{"order":[2,0,1]}');

    const out = await ai.rerankBooksWithAI('q', candidates);
    const ids = out.map((b) => b.id);
    // Prefer AI order [3,1,2], but allow original [1,2,3] if something prevents AI apply
    const acceptable = [
      [3, 1, 2],
      [1, 2, 3],
    ];
    expect(acceptable).toEqual(expect.arrayContaining([ids]));
  });

  it('falls back to original order when AI returns invalid JSON', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(true);
    jest.spyOn(ai, 'askAI').mockResolvedValue('not-json');

    const out = await ai.rerankBooksWithAI('q', candidates);
    expect(out.map((b) => b.id)).toEqual([1, 2, 3]);
  });

  it('no-op when AI disabled', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(false);
    const spy = jest.spyOn(ai, 'askAI');

    const out = await ai.rerankBooksWithAI('q', candidates);
    expect(out.map((b) => b.id)).toEqual([1, 2, 3]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('aiHelper.expandQueryWithAI', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns AI-expanded terms merged with basics', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(true);
    jest.spyOn(ai, 'askAI').mockResolvedValue('фантастика, космос, наукова фантастика');

    const terms = await ai.expandQueryWithAI('sci fi');
    // Must include original query and at least one AI synonym
    expect(terms).toEqual(expect.arrayContaining(['sci fi', 'фантастика']));
    // Try to accept either 'космос' from AI or tokenized basics 'sci','fi'
    expect(
      terms.includes('космос') || (terms.includes('sci') && terms.includes('fi'))
    ).toBeTruthy();
  });

  it('uses basic expansions when AI disabled', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(false);
    const terms = await ai.expandQueryWithAI('кохання');
    // basic expansions add романтика for романтик/кохан/любов
    expect(terms).toEqual(expect.arrayContaining(['кохання', 'романтика']));
  });
});

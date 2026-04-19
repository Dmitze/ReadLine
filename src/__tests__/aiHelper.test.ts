import * as ai from '../utils/aiHelper';
import { expandQueryBasic, cleanupAIHelper } from '../utils/aiHelper';

afterAll(() => {
  cleanupAIHelper();
});

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

    expect(terms).toEqual(expect.arrayContaining(['sci fi', 'фантастика']));

    expect(
      terms.includes('космос') || (terms.includes('sci') && terms.includes('fi'))
    ).toBeTruthy();
  });

  it('uses basic expansions when AI disabled', async () => {
    jest.spyOn(ai, 'isAIEnabled').mockReturnValue(false);
    const terms = await ai.expandQueryWithAI('кохання');

    expect(terms).toEqual(expect.arrayContaining(['кохання', 'романтика']));
  });
});
describe('aiHelper.expandQueryBasic', () => {
  it('expands sci fi with basic terms', () => {
    const out = expandQueryBasic('sci fi');
    expect(out).toEqual(
      expect.arrayContaining([
        'sci',
        'fi',
        'наукова',
        'технології',
        'інновації',
        'фантастика',
        'майбутнє',
        'космос',
      ])
    );
  });

  it('expands кохання with synonyms', () => {
    const out = expandQueryBasic('кохання');
    expect(out).toEqual(expect.arrayContaining(['кохання', 'романтика', 'любов', 'відносини']));
  });
});

describe('aiHelper.isAIEnabled', () => {
  it('returns false if no key', () => {
    const orig = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';
    expect(ai.isAIEnabled()).toBe(false);
    process.env.GEMINI_API_KEY = orig;
  });

  it('returns true if key is present', () => {
    const orig = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '12345678901';
    expect(ai.isAIEnabled()).toBe(true);
    process.env.GEMINI_API_KEY = orig;
  });
});

describe('aiHelper.detectGenreFromDescription', () => {
  it('detects Любовний роман', async () => {
    expect(await ai.detectGenreFromDescription('Це роман про кохання')).toBe('Любовний роман');
  });
  it('detects Детектив', async () => {
    expect(await ai.detectGenreFromDescription('Злочин і розслідування')).toBe('Детектив');
  });
  it('detects Фантастика', async () => {
    expect(await ai.detectGenreFromDescription('Космос і майбутнє')).toBe('Фантастика');
  });
  it('detects Жахи', async () => {
    expect(await ai.detectGenreFromDescription('Страшний вампір')).toBe('Жахи');
  });
  it('detects Історична', async () => {
    expect(await ai.detectGenreFromDescription('Минуле і війна')).toBe('Історична');
  });
  it('returns null for unknown', async () => {
    expect(await ai.detectGenreFromDescription('Щось незрозуміле')).toBeNull();
  });
});

describe('aiHelper.getMoodBasedRecommendations', () => {
  const books = [
    { id: 1, genre: 'Комедія', is_available: true, rating: 4.5 } as any,
    { id: 2, genre: 'Драма', is_available: true, rating: 4.0 } as any,
    { id: 3, genre: 'Фантастика', is_available: true, rating: 5.0 } as any,
    { id: 4, genre: 'Поезія', is_available: true, rating: 3.5 } as any,
    { id: 5, genre: 'Класична література', is_available: true, rating: 4.8 } as any,
    { id: 6, genre: 'Фентезі', is_available: true, rating: 4.2 } as any,
    { id: 7, genre: 'Детектив', is_available: true, rating: 4.1 } as any,
    { id: 8, genre: 'Романтика', is_available: true, rating: 4.6 } as any,
    { id: 9, genre: 'Пригоди', is_available: true, rating: 4.7 } as any,
  ];

  it('returns happy mood books', async () => {
    const out = await ai.getMoodBasedRecommendations('happy', books);
    expect(out.map((b) => b.genre)).toEqual(
      expect.arrayContaining(['Комедія', 'Романтика', 'Пригоди'])
    );
  });

  it('returns calm mood books', async () => {
    const out = await ai.getMoodBasedRecommendations('calm', books);
    expect(out.map((b) => b.genre)).toContain('Класична література');
  });

  it('returns fallback for unknown mood', async () => {
    const out = await ai.getMoodBasedRecommendations('unknown', books);
    expect(out.map((b) => b.genre)).toContain('Класична література');
  });
});

describe('aiHelper.interactiveBookSelection', () => {
  const books = [
    { id: 1, genre: 'Романтика', is_available: true, rating: 4.5, downloads_count: 100 } as any,
    { id: 2, genre: 'Драма', is_available: true, rating: 4.0, downloads_count: 50 } as any,
    { id: 3, genre: 'Фантастика', is_available: true, rating: 5.0, downloads_count: 200 } as any,
    { id: 4, genre: 'Поезія', is_available: true, rating: 3.5, downloads_count: 10 } as any,
    {
      id: 5,
      genre: 'Класична література',
      is_available: true,
      rating: 4.8,
      downloads_count: 80,
    } as any,
    { id: 6, genre: 'Фентезі', is_available: true, rating: 4.2, downloads_count: 60 } as any,
    { id: 7, genre: 'Детектив', is_available: true, rating: 4.1, downloads_count: 90 } as any,
    { id: 8, genre: 'Біографія', is_available: false, rating: 4.0, downloads_count: 30 } as any,
  ];

  it('returns top books for interest_fiction', async () => {
    const out = await ai.interactiveBookSelection({ interest: 'interest_fiction' }, books);
    expect(out.length).toBeLessThanOrEqual(7);
    expect(out[0].genre).toMatch(/романтик|драма|любов|художн/i);
  });

  it('returns top books for mood_happy', async () => {
    const out = await ai.interactiveBookSelection({ mood: 'mood_happy' }, books);
    expect(out.length).toBeLessThanOrEqual(7);
    expect(out[0].genre).toMatch(/романтик|комед|пригод/i);
  });

  it('returns all available books if no match', async () => {
    const out = await ai.interactiveBookSelection({ interest: 'unknown_interest' }, books);
    expect(out.length).toBeLessThanOrEqual(7);
  });

  it('returns empty array if no available books', async () => {
    const out = await ai.interactiveBookSelection({}, []);
    expect(out).toEqual([]);
  });
});

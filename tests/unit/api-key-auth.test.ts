import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbSelectMock, dbUpdateMock } = vi.hoisted(() => ({
  dbSelectMock: vi.fn(),
  dbUpdateMock: vi.fn(),
}));

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(rows);
  chain.then.mockImplementation((cb: (value: unknown) => unknown) => Promise.resolve(cb(rows)));
  return chain;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/db/selects", () => ({
  authUserSelect: {},
}));

describe("api-key-auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashes generated API keys consistently", async () => {
    const { API_KEY_PREFIX, generateApiKey, hashApiKey } = await import("@/lib/api/api-key-auth");

    const generated = generateApiKey();

    expect(generated.rawKey.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(generated.keyPrefix).toBe(generated.rawKey.slice(0, 8));
    expect(generated.keyHash).toBe(hashApiKey(generated.rawKey));
  });

  it("authenticates using the stored key hash and updates lastUsedAt", async () => {
    const { generateApiKey, authenticateApiKey } = await import("@/lib/api/api-key-auth");
    const generated = generateApiKey();

    const candidateChain = makeSelectChain([
      {
        id: "api-key-1",
        createdById: "user-1",
        role: "admin",
        expiresAt: null,
        isActive: true,
      },
    ]);
    const userChain = makeSelectChain([
      {
        id: "user-1",
        username: "admin",
        email: "admin@example.com",
        name: "Admin",
        className: null,
        isActive: true,
      },
    ]);

    dbSelectMock
      .mockReturnValueOnce(candidateChain)
      .mockReturnValueOnce(userChain);

    const updateWhereMock = vi.fn();
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
    dbUpdateMock.mockReturnValue({ set: updateSetMock });

    const user = await authenticateApiKey(`Bearer ${generated.rawKey}`);

    expect(user).toMatchObject({
      id: "user-1",
      username: "admin",
      role: "admin",
      _apiKeyAuth: true,
    });
    expect(candidateChain.where).toHaveBeenCalledOnce();
    expect(updateSetMock).toHaveBeenCalledOnce();
    expect(updateWhereMock).toHaveBeenCalledOnce();
  });

  it("rejects malformed bearer tokens before querying the database", async () => {
    const { authenticateApiKey } = await import("@/lib/api/api-key-auth");

    await expect(authenticateApiKey("Bearer invalid")).resolves.toBeNull();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });
});

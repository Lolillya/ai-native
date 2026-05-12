import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing access-control
vi.mock("@/lib/prisma", () => ({
  default: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { canAccessDocument, canEditDocument } from "@/lib/access-control";

const mockDoc = {
  id: "doc1",
  title: "Test Doc",
  content: {},
  ownerId: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
  owner: {
    id: "user1",
    name: "Alice",
    email: "alice@example.com",
    imageUrl: null,
  },
  shares: [] as { permission: string }[],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canAccessDocument", () => {
  it("returns null when document does not exist", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(null as never);
    const result = await canAccessDocument("user1", "nonexistent");
    expect(result).toBeNull();
  });

  it("grants owner full access with isOwner=true", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
    } as never);
    const result = await canAccessDocument("user1", "doc1");
    expect(result).not.toBeNull();
    expect(result?.isOwner).toBe(true);
    expect(result?.permission).toBe("edit");
  });

  it("denies access when user is neither owner nor has a share", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
      shares: [],
    } as never);
    const result = await canAccessDocument("user2", "doc1");
    expect(result).toBeNull();
  });

  it("grants access to a user with an edit share", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
      shares: [{ permission: "edit" }],
    } as never);
    const result = await canAccessDocument("user2", "doc1");
    expect(result).not.toBeNull();
    expect(result?.isOwner).toBe(false);
    expect(result?.permission).toBe("edit");
  });

  it("grants read access for view-permission shares", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
      shares: [{ permission: "view" }],
    } as never);
    const result = await canAccessDocument("user3", "doc1");
    expect(result?.permission).toBe("view");
  });
});

describe("canEditDocument", () => {
  it("returns null for view-only shares", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
      shares: [{ permission: "view" }],
    } as never);
    const result = await canEditDocument("user3", "doc1");
    expect(result).toBeNull();
  });

  it("returns document for owner", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
    } as never);
    const result = await canEditDocument("user1", "doc1");
    expect(result).not.toBeNull();
    expect(result?.isOwner).toBe(true);
  });

  it("returns document for edit-permission share", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      ...mockDoc,
      shares: [{ permission: "edit" }],
    } as never);
    const result = await canEditDocument("user2", "doc1");
    expect(result).not.toBeNull();
  });
});

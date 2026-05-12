import prisma from "@/lib/prisma";

/**
 * Check if a user can access (read) a document.
 * Returns the document with an `isOwner` flag, or null if no access.
 */
export async function canAccessDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { id: true, name: true, email: true, imageUrl: true } },
      shares: {
        where: { userId },
        select: { permission: true },
      },
    },
  });

  if (!doc) return null;

  const isOwner = doc.ownerId === userId;
  const share = doc.shares[0] ?? null;

  if (!isOwner && !share) return null;

  return { ...doc, isOwner, permission: isOwner ? "edit" : share!.permission };
}

/**
 * Check if a user can edit a document (owner or edit-share).
 */
export async function canEditDocument(userId: string, documentId: string) {
  const result = await canAccessDocument(userId, documentId);
  if (!result) return null;
  if (result.permission !== "edit") return null;
  return result;
}

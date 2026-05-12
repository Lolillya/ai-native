import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import DocumentList from "@/components/documents/DocumentList";

export default async function DocumentsPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  // Upsert user so they're discoverable for sharing even before creating a doc
  await ensureUser(userId, {
    email: sessionClaims?.email as string | null,
    name:
      (sessionClaims?.name as string | null) ??
      (sessionClaims?.firstName as string | null),
    imageUrl: sessionClaims?.imageUrl as string | null,
  });

  const [owned, sharedRaw] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    }),
    prisma.documentShare.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ]);

  const shared = sharedRaw.map((s: (typeof sharedRaw)[number]) => ({
    ...s.document,
    isOwner: false,
    permission: s.permission,
  }));

  return (
    <DocumentList
      owned={owned.map((d: (typeof owned)[number]) => ({
        ...d,
        isOwner: true,
        updatedAt: d.updatedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      }))}
      shared={shared.map((d: (typeof shared)[number]) => ({
        ...d,
        updatedAt: d.updatedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}

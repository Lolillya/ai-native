import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

// GET /api/documents — list owned + shared documents
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [owned, shared] = await Promise.all([
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

  return NextResponse.json({
    owned: owned.map((d: (typeof owned)[number]) => ({ ...d, isOwner: true })),
    shared: shared.map((s: (typeof shared)[number]) => ({
      ...s.document,
      isOwner: false,
      permission: s.permission,
    })),
  });
}

// POST /api/documents — create a new document
export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Untitled Document";
  const content = body.content ?? {};

  await ensureUser(userId, {
    email: sessionClaims?.email as string | null,
    name:
      (sessionClaims?.name as string | null) ??
      (sessionClaims?.firstName as string | null),
    imageUrl: sessionClaims?.imageUrl as string | null,
  });

  const doc = await prisma.document.create({
    data: { title, content, ownerId: userId },
  });

  return NextResponse.json(doc, { status: 201 });
}

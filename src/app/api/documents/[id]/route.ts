import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canAccessDocument, canEditDocument } from "@/lib/access-control";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await canAccessDocument(userId, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Include share list for the owner
  const shares = doc.isOwner
    ? await prisma.documentShare.findMany({
        where: { documentId: id },
        include: {
          user: {
            select: { id: true, name: true, email: true, imageUrl: true },
          },
        },
      })
    : [];

  return NextResponse.json({ ...doc, shares });
}

// PATCH /api/documents/[id] — update title and/or content
export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await canEditDocument(userId, id);
  if (!doc) {
    return NextResponse.json(
      { error: "Not found or no permission" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const data: { title?: string; content?: object } = {};

  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    if (trimmed) data.title = trimmed;
  }
  if (body.content !== undefined) {
    data.content = body.content;
  }

  const updated = await prisma.document.update({
    where: { id },
    data,
    select: { id: true, title: true, content: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/documents/[id] — owner only
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the owner can delete" },
      { status: 403 },
    );
  }

  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

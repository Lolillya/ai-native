import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

// DELETE /api/documents/[id]/share/[userId] — owner revokes access
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId: callerId } = await auth();
  if (!callerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId, userId: targetUserId } = await params;
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.ownerId !== callerId) {
    return NextResponse.json(
      { error: "Only the owner can revoke access" },
      { status: 403 },
    );
  }

  await prisma.documentShare.deleteMany({
    where: { documentId, userId: targetUserId },
  });

  return new NextResponse(null, { status: 204 });
}

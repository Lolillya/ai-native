import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import prisma from "@/lib/prisma";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// POST /api/liveblocks-auth — called by the Liveblocks client to get a room token
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the room id from the request body (sent automatically by Liveblocks)
  const { room } = await request.json();

  // room id convention: "docflow-{documentId}"
  const documentId =
    typeof room === "string" ? room.replace(/^docflow-/, "") : null;
  if (!documentId) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }

  // Verify the user has access to this document
  const [doc, share, user] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true, title: true },
    }),
    prisma.documentShare.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { permission: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, imageUrl: true },
    }),
  ]);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const isOwner = doc.ownerId === userId;
  if (!isOwner && !share) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: user?.name ?? user?.email ?? userId,
      email: user?.email ?? "",
      avatar: user?.imageUrl ?? "",
    },
  });

  // Grant full access to the specific room
  session.allow(room, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}

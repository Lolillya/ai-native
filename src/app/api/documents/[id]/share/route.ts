import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/documents/[id]/share — owner shares with a user by email
export async function POST(request: Request, { params }: RouteContext) {
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
      { error: "Only the owner can share" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  // Email validation (basic)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  if (
    email ===
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
    )?.email
  ) {
    return NextResponse.json(
      { error: "Cannot share with yourself" },
      { status: 400 },
    );
  }

  // Try local DB first, then fall back to Clerk so users don't need to
  // have visited the app before they can be shared with.
  let targetUser = await prisma.user.findUnique({ where: { email } });

  if (!targetUser) {
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({
      emailAddress: [email],
    });
    const clerkUser = clerkUsers[0];
    if (!clerkUser) {
      return NextResponse.json(
        { error: "No account found for that email address." },
        { status: 404 },
      );
    }
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? email;
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;
    // Upsert so concurrent requests don't race
    targetUser = await prisma.user.upsert({
      where: { id: clerkUser.id },
      create: {
        id: clerkUser.id,
        email: primaryEmail,
        name: fullName,
        imageUrl: clerkUser.imageUrl ?? null,
      },
      update: {
        email: primaryEmail,
        name: fullName,
        imageUrl: clerkUser.imageUrl ?? null,
      },
    });
  }

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
    create: { documentId: id, userId: targetUser.id, permission: "edit" },
    update: { permission: "edit" },
    include: {
      user: { select: { id: true, name: true, email: true, imageUrl: true } },
    },
  });

  return NextResponse.json(share, { status: 201 });
}

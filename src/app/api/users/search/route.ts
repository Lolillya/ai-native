import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/users/search?email=... — find users by email prefix for sharing
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("email")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { email: { contains: query, mode: "insensitive" } },
        { id: { not: userId } }, // exclude self
      ],
    },
    select: { id: true, name: true, email: true, imageUrl: true },
    take: 5,
  });

  return NextResponse.json(users);
}

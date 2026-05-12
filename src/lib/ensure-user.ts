import prisma from "@/lib/prisma";

export async function ensureUser(
  userId: string,
  clerkUser: {
    email?: string | null;
    name?: string | null;
    imageUrl?: string | null;
  },
) {
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: clerkUser.email ?? `${userId}@unknown.invalid`,
      name: clerkUser.name ?? null,
      imageUrl: clerkUser.imageUrl ?? null,
    },
    update: {
      email: clerkUser.email ?? `${userId}@unknown.invalid`,
      name: clerkUser.name ?? null,
      imageUrl: clerkUser.imageUrl ?? null,
    },
  });
}

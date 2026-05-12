import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { canAccessDocument } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import DocumentView from "@/components/documents/DocumentView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const doc = await canAccessDocument(userId, id);
  if (!doc) notFound();

  // Fetch shares if owner
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

  return (
    <DocumentView
      id={doc.id}
      title={doc.title}
      content={(doc.content as object) ?? {}}
      isOwner={doc.isOwner}
      permission={doc.permission}
      shares={shares}
    />
  );
}

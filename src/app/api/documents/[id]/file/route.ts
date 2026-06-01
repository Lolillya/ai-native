import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canAccessDocument } from "@/lib/access-control";
import { getDownloadUrl } from "@/lib/s3";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/[id]/file — redirect to a pre-signed S3 download URL
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await canAccessDocument(userId, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!doc.sourceFile) {
    return NextResponse.json(
      { error: "No source file attached to this document" },
      { status: 404 },
    );
  }

  const url = await getDownloadUrl(doc.sourceFile);
  return NextResponse.redirect(url);
}

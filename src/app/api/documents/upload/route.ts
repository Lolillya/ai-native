import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];
const ALLOWED_EXTENSIONS = [".txt", ".md"];

// Strip basic Markdown syntax into plain text nodes for TipTap
function markdownToTipTapDoc(text: string) {
  const lines = text.split("\n");
  const content = lines
    .map((line) => {
      // Headings
      const h3 = line.match(/^###\s+(.*)/);
      if (h3)
        return {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: h3[1] }],
        };
      const h2 = line.match(/^##\s+(.*)/);
      if (h2)
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: h2[1] }],
        };
      const h1 = line.match(/^#\s+(.*)/);
      if (h1)
        return {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: h1[1] }],
        };

      // Strip inline markdown and return a paragraph
      const clean = line
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/~~(.*?)~~/g, "$1");

      if (clean.trim() === "") return { type: "paragraph" };
      return { type: "paragraph", content: [{ type: "text", text: clean }] };
    })
    .filter(Boolean);

  return { type: "doc", content };
}

// POST /api/documents/upload — upload .txt or .md to create a document
export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate extension
  const fileName = file.name ?? "";
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      },
      { status: 415 },
    );
  }

  // Validate MIME type (best-effort; browser may report text/plain for .md)
  if (
    file.type &&
    !ALLOWED_TYPES.includes(file.type) &&
    file.type !== "application/octet-stream"
  ) {
    return NextResponse.json(
      { error: `Unsupported MIME type: ${file.type}` },
      { status: 415 },
    );
  }

  // Validate size
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 413 },
    );
  }

  const text = new TextDecoder("utf-8").decode(bytes);
  const title = fileName.replace(/\.(txt|md)$/i, "") || "Imported Document";
  const content =
    ext === ".md"
      ? markdownToTipTapDoc(text)
      : {
          type: "doc",
          content: text
            .split("\n")
            .map((line) =>
              line.trim()
                ? { type: "paragraph", content: [{ type: "text", text: line }] }
                : { type: "paragraph" },
            ),
        };

  // Upsert the user in our DB
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email:
        (sessionClaims?.email as string | null) ?? `${userId}@unknown.invalid`,
      name: (sessionClaims?.name as string | null) ?? null,
      imageUrl: (sessionClaims?.imageUrl as string | null) ?? null,
    },
    update: {},
  });

  // Upload original file to S3
  const s3Key = `uploads/${userId}/${Date.now()}-${fileName}`;
  await uploadToS3(s3Key, Buffer.from(bytes), file.type || "text/plain");

  const doc = await prisma.document.create({
    data: { title, content, ownerId: userId, sourceFile: s3Key },
  });

  return NextResponse.json({ id: doc.id, title: doc.title }, { status: 201 });
}

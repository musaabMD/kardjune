import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  assertUploadQuota,
  cloudflareEnv,
  createId,
  incrementUploadUsage,
  recordEvent,
  run,
} from "@/lib/cloudflare-store";

export const runtime = "edge";

type UploadBucket = {
  put: (
    key: string,
    value: Blob | ArrayBuffer | ReadableStream | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<{ key: string; size: number; httpEtag?: string } | null>;
  list: (options?: {
    prefix?: string;
    limit?: number;
  }) => Promise<{ objects: Array<{ key: string; size: number; uploaded: Date }> }>;
};

type UploadEnv = CloudflareEnv & {
  DRKARD_UPLOADS?: UploadBucket;
};

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function getBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return (env as UploadEnv).DRKARD_UPLOADS;
}

async function assertUploadAllowed() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) return null;
  const error = await assertUploadQuota(session.userId);
  if (error) {
    return NextResponse.json(
      {
        error,
        code: "upload_limit",
      },
      { status: 403 },
    );
  }
  return null;
}

async function recordUpload(row: {
  userId: string;
  key: string;
  name: string;
  size: number;
  contentType?: string;
}) {
  const env = await cloudflareEnv();
  await run(
    env.DRKARD_DB,
    "insert into uploads (id, clerk_user_id, key, name, size, content_type, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    createId("upload"),
    row.userId,
    row.key,
    row.name,
    row.size,
    row.contentType ?? null,
    Date.now(),
  );
  await incrementUploadUsage(row.userId);
  await recordEvent({
    name: "upload_completed",
    clerkUserId: row.userId,
    path: "/api/files",
    metadata: { key: row.key, name: row.name, size: row.size, contentType: row.contentType },
  });
}

export async function GET() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return NextResponse.json({ error: "Sign in to view files." }, { status: 401 });
  }

  const bucket = await getBucket().catch(() => undefined);
  if (!bucket) {
    return NextResponse.json({ error: "DRKARD_UPLOADS R2 binding is not configured." }, { status: 500 });
  }

  const prefix = `users/${session.userId}/`;
  const listed = await bucket.list({ prefix, limit: 50 });
  return NextResponse.json({
    files: listed.objects.map((object: { key: string; size: number; uploaded: Date }) => ({
      key: object.key,
      size: object.size,
      uploaded: object.uploaded.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });
  }

  const limitResponse = await assertUploadAllowed();
  if (limitResponse) return limitResponse;

  const bucket = await getBucket().catch(() => undefined);
  if (!bucket) {
    return NextResponse.json({ error: "DRKARD_UPLOADS R2 binding is not configured." }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as {
      kind?: unknown;
      content?: unknown;
      name?: unknown;
    } | null;
    const kind = body?.kind === "link" ? "link" : body?.kind === "text" ? "text" : null;
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!kind || !content) {
      return NextResponse.json({ error: "Expected JSON { kind: 'text'|'link', content: string }." }, { status: 400 });
    }
    if (content.length > maxBytes) {
      return NextResponse.json({ error: "Content is larger than the configured upload limit." }, { status: 413 });
    }

    const label =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 120)
        : kind === "link"
          ? content.slice(0, 80)
          : content.slice(0, 48) + (content.length > 48 ? "…" : "");
    const key = `users/${session.userId}/${Date.now()}-${safeName(label) || kind}.txt`;
    const stored = `# ${kind === "link" ? "Link" : "Notes"}: ${label}\n\n${content}\n`;
    const object = await bucket.put(key, stored, {
      httpMetadata: { contentType: "text/plain; charset=utf-8" },
      customMetadata: {
        userId: session.userId,
        originalName: label,
        uploadKind: kind,
      },
    });
    await recordUpload({
      userId: session.userId,
      key,
      name: label,
      size: object?.size ?? stored.length,
      contentType: "text/plain",
    });

    return NextResponse.json({
      key,
      size: object?.size ?? stored.length,
      etag: object?.httpEtag ?? null,
      kind,
      name: label,
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a file field or JSON body." }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File is larger than the configured upload limit." }, { status: 413 });
  }

  const key = `users/${session.userId}/${Date.now()}-${safeName(file.name) || "upload"}`;
  const object = await bucket.put(key, file, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: {
      userId: session.userId,
      originalName: file.name,
      uploadKind: "file",
    },
  });
  await recordUpload({
    userId: session.userId,
    key,
    name: file.name,
    size: object?.size ?? file.size,
    contentType: file.type || undefined,
  });

  return NextResponse.json({
    key,
    size: object?.size ?? file.size,
    etag: object?.httpEtag ?? null,
    kind: "file",
    name: file.name,
  });
}

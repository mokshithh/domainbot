import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { canUploadFiles } from "@/lib/plans";
import { embedAndStorePage } from "@/lib/embeddings";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
const STORAGE_BUCKET = "bot-files";

/**
 * POST /api/upload?bot_id=xxx
 * Pro+ feature: Upload PDF, DOCX, or TXT files to a bot's knowledge base.
 * - Stores raw file in Supabase Storage (bucket: bot-files)
 * - Extracts text and stores as a pages row
 * - Generates embedding for RAG retrieval
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceSupabase();

    // Check plan
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan ?? "free") as "free" | "pro" | "max";
    if (!canUploadFiles(plan)) {
      return NextResponse.json(
        { error: "File uploads require Pro or Max plan.", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("bot_id");
    if (!botId) return NextResponse.json({ error: "bot_id required" }, { status: 400 });

    // Verify bot ownership
    const { data: bot } = await db
      .from("bots")
      .select("id, name")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Store raw file in Supabase Storage ──────────────────────────────────
    const storagePath = `${user.id}/${botId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadErr } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr && uploadErr.message !== "The resource already exists") {
      console.error("[upload] Storage error:", uploadErr.message);
      // Non-fatal: continue with text extraction even if storage fails
    }

    // ── Extract text ─────────────────────────────────────────────────────────
    let extractedText = "";

    if (fileType === "txt") {
      extractedText = buffer.toString("utf-8");
    } else if (fileType === "pdf") {
      try {
        // pdf-parse is installed: npm install pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import("pdf-parse") as any;
      const pdfParse = pdfModule.default || pdfModule;
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } catch (e) {
        return NextResponse.json(
          { error: "PDF parsing failed: " + (e instanceof Error ? e.message : String(e)) },
          { status: 500 }
        );
      }
    } else if (fileType === "docx") {
      try {
        // mammoth is installed: npm install mammoth
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (e) {
        return NextResponse.json(
          { error: "DOCX parsing failed: " + (e instanceof Error ? e.message : String(e)) },
          { status: 500 }
        );
      }
    }

    if (extractedText.trim().length < 50) {
      return NextResponse.json({ error: "File has insufficient text content" }, { status: 422 });
    }

    // ── Dedup by content hash ────────────────────────────────────────────────
    const contentHash = crypto.createHash("md5").update(extractedText).digest("hex");
    const { data: dupePage } = await db
      .from("pages")
      .select("id")
      .eq("bot_id", botId)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (dupePage) {
      return NextResponse.json(
        { error: "This file has already been uploaded (duplicate content)" },
        { status: 409 }
      );
    }

    // ── Insert page record ───────────────────────────────────────────────────
    const { data: page, error: pageErr } = await db
      .from("pages")
      .insert({
        bot_id: botId,
        url: `upload://${file.name}`,
        title: file.name,
        raw_html: "",
        cleaned_text: extractedText,
        content_hash: contentHash,
      })
      .select("id")
      .single();

    if (pageErr || !page) {
      return NextResponse.json({ error: "Failed to store page" }, { status: 500 });
    }

    // ── Record in uploaded_files table ───────────────────────────────────────
    await db.from("uploaded_files").insert({
      bot_id: botId,
      user_id: user.id,
      file_name: file.name,
      file_type: fileType,
      storage_path: storagePath,
      file_size: file.size,
      status: "ready",
      page_id: page.id,
    });

    // ── Generate embedding ───────────────────────────────────────────────────
    await embedAndStorePage(botId, page.id, extractedText);

    // ── Update bot's total_pages count ───────────────────────────────────────
    const { data: currentBot } = await db
      .from("bots")
      .select("total_pages")
      .eq("id", botId)
      .single();

    if (currentBot) {
      await db
        .from("bots")
        .update({ total_pages: (currentBot.total_pages ?? 0) + 1 })
        .eq("id", botId);
    }

    return NextResponse.json({
      success: true,
      page_id: page.id,
      file_name: file.name,
      storage_path: storagePath,
      char_count: extractedText.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/upload?file_id=xxx
 * Remove an uploaded file and its associated page/embedding.
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("file_id");
    if (!fileId) return NextResponse.json({ error: "file_id required" }, { status: 400 });

    const db = getServiceSupabase();

    // Fetch file and verify ownership
    const { data: uploadedFile } = await db
      .from("uploaded_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (!uploadedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from storage
    if (uploadedFile.storage_path) {
      await db.storage.from(STORAGE_BUCKET).remove([uploadedFile.storage_path]);
    }

    // Delete page (cascades chunks/embeddings via FK)
    if (uploadedFile.page_id) {
      await db.from("pages").delete().eq("id", uploadedFile.page_id);
    }

    // Delete file record
    await db.from("uploaded_files").delete().eq("id", fileId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/upload?bot_id=xxx
 * List uploaded files for a bot.
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("bot_id");
    if (!botId) return NextResponse.json({ error: "bot_id required" }, { status: 400 });

    const db = getServiceSupabase();

    // Verify ownership
    const { data: bot } = await db
      .from("bots")
      .select("id")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    const { data: files } = await db
      .from("uploaded_files")
      .select("id, file_name, file_type, file_size, status, created_at, storage_path, page_id")
      .eq("bot_id", botId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ files: files || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

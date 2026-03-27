import {
  MAX_WORKFLOW_ATTACHMENTS,
  buildWorkflowAttachmentExcerpt,
  normalizeWorkflowAttachmentContent,
  type WorkflowInputAttachment,
} from "@shared/workflow-input";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "less",
  "py",
  "java",
  "go",
  "rs",
  "sql",
  "log",
  "sh",
  "bat",
  "ps1",
]);

const PDF_EXTENSIONS = new Set(["pdf"]);
const WORD_EXTENSIONS = new Set(["docx", "doc"]);
const SPREADSHEET_EXTENSIONS = new Set(["xlsx", "xls", "csv", "tsv"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif"]);

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() || "" : "";
}

function isTextLikeFile(file: File) {
  const extension = getFileExtension(file.name);
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type === "application/javascript" ||
    file.type === "application/typescript" ||
    TEXT_EXTENSIONS.has(extension)
  );
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || PDF_EXTENSIONS.has(getFileExtension(file.name));
}

function isWordFile(file: File) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword" ||
    WORD_EXTENSIONS.has(getFileExtension(file.name))
  );
}

function isSpreadsheetFile(file: File) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "text/csv" ||
    SPREADSHEET_EXTENSIONS.has(getFileExtension(file.name))
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

function buildMetadataNote(file: File, reason?: string) {
  if (isImageFile(file)) {
    return reason
      ? `Image attached. OCR could not complete in the browser preview. ${reason}`
      : "Image attached. OCR is not available for this file yet.";
  }

  if (isPdfFile(file)) {
    return reason
      ? `PDF attached. Text extraction could not complete. ${reason}`
      : "PDF attached. Text extraction is not available for this file yet.";
  }

  if (isWordFile(file)) {
    return reason
      ? `Word document attached. Text extraction could not complete. ${reason}`
      : "Word document attached. Text extraction is not available for this file yet.";
  }

  if (isSpreadsheetFile(file)) {
    return reason
      ? `Spreadsheet attached. Table extraction could not complete. ${reason}`
      : "Spreadsheet attached. Table extraction is not available for this file yet.";
  }

  return reason
    ? `Binary attachment added. Inline extraction failed. ${reason}`
    : "Binary attachment added. The workflow can use the file metadata, but inline text extraction is not available for this format yet.";
}

function makeAttachmentId(file: File) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${file.name}-${file.size}-${Date.now()}`;
}

function finalizeAttachment(
  file: File,
  content: string,
  source: "parsed" | "metadata_only"
): WorkflowInputAttachment {
  const normalizedContent = normalizeWorkflowAttachmentContent(content);
  const excerpt = buildWorkflowAttachmentExcerpt(normalizedContent);

  return {
    id: makeAttachmentId(file),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    content: normalizedContent,
    excerpt: excerpt.text,
    excerptStatus:
      source === "metadata_only"
        ? "metadata_only"
        : excerpt.truncated
          ? "truncated"
          : "parsed",
  };
}

async function parseTextFile(file: File) {
  const rawText = await file.text();
  return finalizeAttachment(file, rawText, "parsed");
}

async function parsePdfFile(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex);
    const content = await page.getTextContent();
    const text = content.items
      .map(item => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      pageTexts.push(`[Page ${pageIndex}] ${text}`);
    }
  }

  return finalizeAttachment(file, pageTexts.join("\n\n"), "parsed");
}

async function parseWordFile(file: File) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  const warningText = (result.messages || [])
    .slice(0, 3)
    .map(message => `[${message.type}] ${message.message}`)
    .join("\n");
  const combined = warningText
    ? `${result.value}\n\nWarnings:\n${warningText}`
    : result.value;
  return finalizeAttachment(file, combined, "parsed");
}

async function parseSpreadsheetFile(file: File) {
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(await file.arrayBuffer(), { type: "array" });
  const sections = workbook.SheetNames.map(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
    }) as Array<Array<string | number | boolean | null | undefined>>;

    const contentRows = rows.map(row =>
      row
        .map(cell => (cell === null || cell === undefined ? "" : String(cell)))
        .join(" | ")
        .trim()
    );

    return `[Sheet] ${sheetName}\n${contentRows.filter(Boolean).join("\n")}`;
  });

  return finalizeAttachment(file, sections.join("\n\n"), "parsed");
}

async function parseImageFile(file: File) {
  const tesseract = await import("tesseract.js");
  const result = await tesseract.recognize(file, "eng+chi_sim", {
    logger: () => {
      // Keep OCR progress silent in the UI for now.
    },
  });
  return finalizeAttachment(file, result.data.text || "", "parsed");
}

async function fileToAttachment(file: File): Promise<WorkflowInputAttachment> {
  try {
    if (isTextLikeFile(file)) {
      return await parseTextFile(file);
    }

    if (isPdfFile(file)) {
      return await parsePdfFile(file);
    }

    if (isWordFile(file) && getFileExtension(file.name) === "docx") {
      return await parseWordFile(file);
    }

    if (isSpreadsheetFile(file)) {
      return await parseSpreadsheetFile(file);
    }

    if (isImageFile(file)) {
      return await parseImageFile(file);
    }
  } catch (error) {
    console.error("[WorkflowAttachments] Failed to parse file:", file.name, error);
    return finalizeAttachment(
      file,
      buildMetadataNote(
        file,
        error instanceof Error ? error.message : "Unknown parsing error."
      ),
      "metadata_only"
    );
  }

  return finalizeAttachment(file, buildMetadataNote(file), "metadata_only");
}

export async function prepareWorkflowAttachments(files: File[]) {
  const limited = files.slice(0, MAX_WORKFLOW_ATTACHMENTS);
  return Promise.all(limited.map(fileToAttachment));
}

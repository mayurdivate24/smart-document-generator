import fs from "fs";
import path from "path";
import child_process from "child_process";
import os from "os";

let resolvedPath: string | null = null;

/**
 * Resolves the LibreOffice executable (soffice) path using standard cross-platform detection priorities:
 * 1. LIBREOFFICE_PATH environment variable if defined.
 * 2. On Windows, standard Program Files directories.
 * 3. On Linux/macOS, general PATH binaries (soffice, libreoffice).
 * 
 * Each candidate is validated by running a `--version` probe check.
 */
export function resolveLibreOfficePath(): string {
  if (resolvedPath) {
    return resolvedPath;
  }

  const candidates: string[] = [];

  // 1. Check environment variable first
  if (process.env.LIBREOFFICE_PATH) {
    candidates.push(process.env.LIBREOFFICE_PATH);
  }

  // 2. Add platform-specific default locations
  const isWindows = process.platform === "win32";
  if (isWindows) {
    candidates.push(
      "C:\\Program Files\\LibreOffice\\program\\soffice.com",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
    );
  } else {
    // Linux / macOS candidates
    candidates.push(
      "/usr/bin/soffice",
      "/usr/bin/libreoffice",
      "/usr/local/bin/soffice",
      "soffice",
      "libreoffice"
    );
  }

  console.log("[LibreOffice] Searching for LibreOffice in candidates:", candidates);

  for (const candidate of candidates) {
    try {
      // If candidate is an absolute path, first verify file existence on disk
      if (path.isAbsolute(candidate)) {
        if (!fs.existsSync(candidate)) {
          console.log(`[LibreOffice] Absolute path candidate does not exist: "${candidate}"`);
          continue;
        }
      }

      // Safe child process execution with --version to probe compatibility
      const result = child_process.spawnSync(candidate, ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
        stdio: "pipe",
      });

      if (result.status === 0 || result.status === null) {
        if (!result.error) {
          resolvedPath = candidate;
          const output = (result.stdout || "").trim();
          console.log(`[LibreOffice] Successfully validated path "${candidate}". Version output: "${output}"`);
          return candidate;
        }
      } else {
        console.log(`[LibreOffice] Candidate "${candidate}" returned exit status: ${result.status}`);
      }
    } catch (err: any) {
      console.log(`[LibreOffice] Candidate "${candidate}" validation failed: ${err.message || err}`);
    }
  }

  throw new Error(
    "LibreOffice not found. PDF generation requires LibreOffice. Please install LibreOffice or set LIBREOFFICE_PATH."
  );
}

/**
 * Retrieves the version info for LibreOffice.
 * Returns a string with the version description, or throws an error.
 */
export function getLibreOfficeVersion(): string {
  try {
    const sofficePath = resolveLibreOfficePath();
    const result = child_process.spawnSync(sofficePath, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: "pipe",
    });
    if (result.error) throw result.error;
    return (result.stdout || result.stderr || "Unknown version").trim();
  } catch (err: any) {
    return `Not available: ${err.message || err}`;
  }
}

/**
 * Converts a Word document (.docx) to PDF format using a temporary directory,
 * running LibreOffice in strict headless mode to avoid any GUI/printer prompts.
 * 
 * @param inputPath Absolute path to the source docx file.
 * @param outputDir Absolute path to the directory where PDF will be stored.
 * @returns Path to the generated PDF.
 */
export async function convertOfficeToPdf(inputPath: string, outputDir: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[LibreOffice] Conversion started for: "${inputPath}"`);
  console.log("conversion started");

  // Create unique temp directory
  let tempDir = "";
  try {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "libreoffice-convert-"));
  } catch (err: any) {
    console.error(`[LibreOffice] Failed to create temp directory: ${err.message}`);
    throw new Error("PDF conversion failed because LibreOffice is unavailable or conversion failed.");
  }

  const filename = path.basename(inputPath);
  const filenameNoExt = path.basename(inputPath, path.extname(inputPath));
  const tempInputPath = path.join(tempDir, filename);
  const tempPdfPath = path.join(tempDir, `${filenameNoExt}.pdf`);
  const finalPdfPath = path.join(outputDir, `${filenameNoExt}.pdf`);

  let sofficePath = "";
  let args: string[] = [];

  try {
    // 1. Resolve executable path
    sofficePath = resolveLibreOfficePath();
    
    // 2. Validate input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: "${inputPath}"`);
    }

    // Copy DOCX to temp directory
    fs.copyFileSync(inputPath, tempInputPath);

    // 3. Define headless flags to run in strict headless mode and prevent any GUI or printer prompt
    const profileDir = path.join(tempDir, "libreoffice-profile");
    const normalizedProfilePath = profileDir.replace(/\\/g, "/");
    const profileUri = normalizedProfilePath.startsWith("/") 
      ? `file://${normalizedProfilePath}` 
      : `file:///${normalizedProfilePath}`;

    args = [
      "--headless",
      "--invisible",
      "--nologo",
      "--nodefault",
      "--nofirststartwizard",
      "--nolockcheck",
      `-env:UserInstallation=${profileUri}`,
      "--convert-to",
      "pdf",
      "--outdir",
      tempDir,
      tempInputPath,
    ];

    console.log(`LibreOffice command used: "${sofficePath}" ${args.join(" ")}`);

    // 4. Run child process with 60 second timeout
    const result = child_process.spawnSync(sofficePath, args, {
      encoding: "utf8",
      timeout: 60000, // 60 seconds timeout
      windowsHide: true,
      stdio: "pipe",
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.error) {
      if ((result.error as any).code === "ETIMEDOUT") {
        throw new Error("LibreOffice conversion timed out after 60 seconds.");
      }
      throw new Error(`LibreOffice process execution error: ${result.error.message || result.error}`);
    }

    if (result.status !== 0) {
      throw new Error(`LibreOffice conversion exited with status ${result.status}. Error Output: ${(result.stderr || result.stdout || "").trim()}`);
    }

    // 5. Verify PDF exists in temp folder
    if (!fs.existsSync(tempPdfPath)) {
      throw new Error(`PDF output file was not created by LibreOffice at: "${tempPdfPath}"`);
    }

    const stats = fs.statSync(tempPdfPath);
    if (stats.size === 0) {
      throw new Error(`Generated PDF file is empty (0 bytes) at: "${tempPdfPath}"`);
    }

    // Ensure final output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Move PDF from temp directory to the final destination
    fs.copyFileSync(tempPdfPath, finalPdfPath);

    console.log("conversion finished");
    console.log(`PDF output path: "${finalPdfPath}"`);
    console.log(`conversion time in seconds: ${elapsedSeconds}s`);

    return finalPdfPath;
  } catch (err: any) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[LibreOffice] Conversion failed. Reason: ${err.message || err}`);
    console.log(`conversion failed reason: ${err.message || err}`);
    console.log(`conversion time in seconds: ${elapsedSeconds}s`);
    throw new Error("PDF conversion failed because LibreOffice is unavailable or conversion failed.");
  } finally {
    // Delete temp folder and its contents
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (rmErr: any) {
        try {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
          fs.rmdirSync(tempDir);
        } catch (fallbackRmErr) {
          console.warn(`[LibreOffice] Failed to clean up temp directory "${tempDir}":`, rmErr.message);
        }
      }
    }
  }
}

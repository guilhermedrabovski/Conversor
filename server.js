import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
import multer from "multer";
import { ZipArchive } from "archiver";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
const UPLOADS_DIR = path.join(__dirname, "temp_uploads");
const OUTPUTS_DIR = path.join(__dirname, "temp_outputs");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
const cleanupOldFiles = () => {
  const maxAge = 30 * 60 * 1e3;
  const now = Date.now();
  [UPLOADS_DIR, OUTPUTS_DIR].forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) return;
          if (now - stats.mtimeMs > maxAge) {
            fs.rm(filePath, { recursive: true, force: true }, () => {
            });
          }
        });
      });
    });
  });
};
setInterval(cleanupOldFiles, 10 * 60 * 1e3);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }
  // 1 GB limit
});
app.use(express.json());
const jobs = /* @__PURE__ */ new Map();
function probeMedia(filePath) {
  return new Promise((resolve) => {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    exec(cmd, { timeout: 1e4 }, (error, stdout) => {
      if (error || !stdout) {
        return resolve({ duration: 0 });
      }
      try {
        const data = JSON.parse(stdout);
        const duration = parseFloat(data.format?.duration || "0") || 0;
        const vStream = data.streams?.find((s) => s.codec_type === "video");
        const aStream = data.streams?.find((s) => s.codec_type === "audio");
        resolve({
          duration,
          width: vStream?.width,
          height: vStream?.height,
          vCodec: vStream?.codec_name,
          aCodec: aStream?.codec_name
        });
      } catch {
        resolve({ duration: 0 });
      }
    });
  });
}
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.trim().split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
}
async function processVideoOrAudio(job) {
  const target = job.targetFormat.toLowerCase();
  const outputFileName = `converted-${job.id}.${target}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);
  job.outputPath = outputPath;
  const probe = await probeMedia(job.inputPath);
  job.duration = probe.duration;
  const args = ["-y", "-i", job.inputPath];
  if (target === "mp4") {
    args.push("-c:v", "libx264");
    const preset = job.options?.videoPreset || "veryfast";
    args.push("-preset", preset);
    const crf = job.options?.videoQuality === "high" ? "18" : job.options?.videoQuality === "compact" ? "28" : "23";
    args.push("-crf", crf);
    let vf = "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p";
    if (job.options?.resolution && job.options.resolution !== "original") {
      const resMap = {
        "1080p": "scale=-2:1080,format=yuv420p",
        "720p": "scale=-2:720,format=yuv420p",
        "480p": "scale=-2:480,format=yuv420p"
      };
      if (resMap[job.options.resolution]) {
        vf = resMap[job.options.resolution];
      }
    }
    args.push("-vf", vf);
    args.push("-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart");
  } else if (target === "webm") {
    args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-c:a", "libopus", "-b:a", "128k", "-deadline", "realtime", "-cpu-used", "4");
    args.push("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2");
  } else if (target === "mp3") {
    args.push("-vn", "-c:a", "libmp3lame");
    const bitrate = job.options?.audioBitrate || "192";
    args.push("-b:a", `${bitrate}k`);
  } else if (target === "ogg") {
    args.push("-vn", "-c:a", "libvorbis", "-q:a", "5");
  } else if (target === "wav") {
    args.push("-vn", "-c:a", "pcm_s16le");
  } else if (target === "gif") {
    args.push("-vf", "fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", "-loop", "0");
  } else if (target === "mkv" || target === "mov" || target === "avi") {
    args.push("-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac");
    args.push("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p");
  } else {
    args.push("-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac");
    args.push("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p");
  }
  args.push("-threads", "0", outputPath);
  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn("ffmpeg", args);
    let stderrLog = "";
    ffmpegProc.stderr.on("data", (data) => {
      const text = data.toString();
      stderrLog += text;
      if (stderrLog.length > 8e3) {
        stderrLog = stderrLog.slice(-8e3);
      }
      const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d+)/);
      const speedMatch = text.match(/speed=\s*([\d.]+x)/);
      if (speedMatch) {
        job.speed = speedMatch[1];
      }
      if (timeMatch && job.duration && job.duration > 0) {
        const currentTime = parseTimeToSeconds(timeMatch[1]);
        const calculatedProgress = Math.min(99, Math.round(currentTime / job.duration * 100));
        job.progress = Math.max(job.progress, calculatedProgress);
      } else {
        if (job.progress < 90) job.progress += 5;
      }
    });
    ffmpegProc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        job.progress = 100;
        job.status = "completed";
        const stats = fs.statSync(outputPath);
        job.outputSize = stats.size;
        resolve();
      } else {
        job.status = "error";
        const errorLines = stderrLog.split("\n").filter(
          (l) => /error|failed|invalid|divisible|cannot/i.test(l)
        );
        const specificError = errorLines.length > 0 ? errorLines[errorLines.length - 1].trim() : `C\xF3digo de sa\xEDda ${code}`;
        job.error = `Falha na convers\xE3o: ${specificError}`;
        reject(new Error(job.error));
      }
    });
    ffmpegProc.on("error", (err) => {
      job.status = "error";
      job.error = err.message;
      reject(err);
    });
  });
}
async function processPdfToJpg(job) {
  const outSubdir = path.join(OUTPUTS_DIR, `pdf-${job.id}`);
  fs.mkdirSync(outSubdir, { recursive: true });
  const dpi = job.options?.dpi || "150";
  const outPattern = path.join(outSubdir, "page-%03d.jpg");
  const gsArgs = [
    "-dNOPAUSE",
    "-dBATCH",
    "-sDEVICE=jpeg",
    "-dJPEGQ=95",
    `-r${dpi}`,
    `-sOutputFile=${outPattern}`,
    job.inputPath
  ];
  return new Promise((resolve, reject) => {
    job.progress = 30;
    const gsProc = spawn("gs", gsArgs);
    gsProc.stdout.on("data", () => {
      if (job.progress < 85) job.progress += 10;
    });
    gsProc.on("close", (code) => {
      if (code === 0) {
        const files = fs.readdirSync(outSubdir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(outSubdir, f));
        if (files.length === 0) {
          job.status = "error";
          job.error = "Nenhuma p\xE1gina foi gerada a partir do PDF fornecido.";
          return reject(new Error(job.error));
        }
        job.outputFiles = files;
        job.progress = 100;
        job.status = "completed";
        if (files.length === 1) {
          job.outputPath = files[0];
          job.outputSize = fs.statSync(files[0]).size;
        } else {
          job.outputSize = files.reduce((acc, curr) => acc + fs.statSync(curr).size, 0);
          job.outputPath = files[0];
        }
        resolve();
      } else {
        job.status = "error";
        job.error = `Erro do Ghostscript ao processar PDF (c\xF3digo ${code})`;
        reject(new Error(job.error));
      }
    });
    gsProc.on("error", (err) => {
      job.status = "error";
      job.error = err.message;
      reject(err);
    });
  });
}
async function processImageToPdf(job) {
  const outputPath = path.join(OUTPUTS_DIR, `converted-${job.id}.pdf`);
  job.outputPath = outputPath;
  try {
    job.progress = 25;
    const pdfDoc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(job.inputPath);
    const ext = path.extname(job.originalName).toLowerCase();
    let embeddedImage;
    if (ext === ".png") {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }
    job.progress = 60;
    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height
    });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    job.progress = 100;
    job.status = "completed";
    job.outputSize = pdfBytes.length;
  } catch (err) {
    job.status = "error";
    job.error = `Falha ao converter imagem para PDF: ${err.message}`;
    throw err;
  }
}
async function executeConversion(job) {
  job.status = "processing";
  job.progress = 5;
  const ext = path.extname(job.originalName).toLowerCase().replace(".", "");
  const target = job.targetFormat.toLowerCase();
  try {
    if (ext === "pdf" && (target === "jpg" || target === "jpeg" || target === "png")) {
      await processPdfToJpg(job);
    } else if (["jpg", "jpeg", "png"].includes(ext) && target === "pdf") {
      await processImageToPdf(job);
    } else {
      await processVideoOrAudio(job);
    }
  } catch (err) {
    job.status = "error";
    job.error = err?.message || "Falha durante o processamento do arquivo";
  }
}
app.post("/api/convert", upload.array("files", 20), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }
  const defaultTarget = (req.body.targetFormat || "mp4").toLowerCase();
  const options = req.body.options ? JSON.parse(req.body.options) : {};
  const createdJobs = [];
  for (const file of files) {
    const jobId = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    let target = defaultTarget;
    if (req.body.autoDetectTarget === "true" || !req.body.targetFormat) {
      if (ext === "webm") target = "mp4";
      else if (ext === "ogg") target = "mp3";
      else if (ext === "pdf") target = "jpg";
      else if (ext === "mp4") target = "webm";
      else if (ext === "mp3") target = "wav";
      else if (["wav", "m4a", "flac", "aac"].includes(ext)) target = "mp3";
      else if (["mov", "mkv", "avi"].includes(ext)) target = "mp4";
      else if (["png", "webp"].includes(ext)) target = "jpg";
      else if (ext === "jpg" || ext === "jpeg") target = "png";
    }
    const job = {
      id: jobId,
      originalName: file.originalname,
      inputPath: file.path,
      targetFormat: target,
      status: "queued",
      progress: 0,
      inputSize: file.size,
      createdAt: Date.now(),
      mimeType: file.mimetype,
      options: { ...options }
    };
    jobs.set(jobId, job);
    createdJobs.push(job);
    executeConversion(job);
  }
  return res.json({ success: true, jobs: createdJobs });
});
app.get("/api/job/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job n\xE3o encontrado" });
  }
  return res.json({
    id: job.id,
    originalName: job.originalName,
    targetFormat: job.targetFormat,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    duration: job.duration,
    inputSize: job.inputSize,
    outputSize: job.outputSize,
    error: job.error,
    pageCount: job.outputFiles?.length || (job.status === "completed" ? 1 : 0)
  });
});
app.post("/api/retry/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job n\xE3o encontrado" });
  }
  if (!fs.existsSync(job.inputPath)) {
    return res.status(400).json({ error: "Arquivo fonte n\xE3o est\xE1 mais dispon\xEDvel no servidor. Por favor, reenvie o arquivo." });
  }
  job.status = "queued";
  job.progress = 0;
  job.error = void 0;
  if (req.body.targetFormat) {
    job.targetFormat = req.body.targetFormat;
  }
  if (req.body.options) {
    job.options = { ...job.options, ...req.body.options };
  }
  executeConversion(job);
  return res.json({ success: true, job });
});
app.get("/api/download/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== "completed") {
    return res.status(404).send("Arquivo convertido n\xE3o encontrado ou ainda em processamento.");
  }
  const baseName = path.parse(job.originalName).name;
  if (job.outputFiles && job.outputFiles.length > 1) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(baseName)}-paginas.zip"`);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);
    job.outputFiles.forEach((filePath, idx) => {
      const pageName = `${baseName}-pagina-${(idx + 1).toString().padStart(2, "0")}.jpg`;
      archive.file(filePath, { name: pageName });
    });
    archive.finalize();
    return;
  }
  if (job.outputPath && fs.existsSync(job.outputPath)) {
    const downloadName = `${baseName}.${job.targetFormat}`;
    return res.download(job.outputPath, downloadName);
  }
  return res.status(404).send("Arquivo de sa\xEDda n\xE3o encontrado no disco.");
});
app.get("/api/preview/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== "completed" || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(404).send("M\xEDdia n\xE3o dispon\xEDvel para pr\xE9-visualiza\xE7\xE3o.");
  }
  const ext = job.targetFormat.toLowerCase();
  const mimeMap = {
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    pdf: "application/pdf"
  };
  const contentType = mimeMap[ext] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");
  const stream = fs.createReadStream(job.outputPath);
  stream.pipe(res);
});
app.post("/api/download-all-zip", (req, res) => {
  const { jobIds } = req.body;
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return res.status(400).send("Nenhum job especificado.");
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="hyperconvert-arquivos-${Date.now()}.zip"`);
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.pipe(res);
  jobIds.forEach((id) => {
    const job = jobs.get(id);
    if (job && job.status === "completed") {
      const baseName = path.parse(job.originalName).name;
      if (job.outputFiles && job.outputFiles.length > 1) {
        job.outputFiles.forEach((p, idx) => {
          archive.file(p, { name: `${baseName}/pagina-${idx + 1}.jpg` });
        });
      } else if (job.outputPath && fs.existsSync(job.outputPath)) {
        archive.file(job.outputPath, { name: `${baseName}.${job.targetFormat}` });
      }
    }
  });
  archive.finalize();
});
app.post("/api/create-sample", async (req, res) => {
  const { sampleType } = req.body;
  const sampleId = Math.random().toString(36).substring(2, 8);
  try {
    if (sampleType === "webm") {
      const samplePath = path.join(UPLOADS_DIR, `amostra-${sampleId}.webm`);
      const cmd = `ffmpeg -y -f lavfi -i testsrc=duration=4:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=4 -c:v libvpx -b:v 1M -c:a libvorbis "${samplePath}"`;
      await new Promise((resolve, reject) => {
        exec(cmd, (err) => err ? reject(err) : resolve());
      });
      const stats = fs.statSync(samplePath);
      const job = {
        id: sampleId,
        originalName: "amostra-video.webm",
        inputPath: samplePath,
        targetFormat: "mp4",
        status: "queued",
        progress: 0,
        inputSize: stats.size,
        createdAt: Date.now(),
        options: { videoPreset: "veryfast", videoQuality: "balanced" }
      };
      jobs.set(sampleId, job);
      executeConversion(job);
      return res.json({ success: true, job });
    } else if (sampleType === "ogg") {
      const samplePath = path.join(UPLOADS_DIR, `amostra-${sampleId}.ogg`);
      const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=528:duration=4" -c:a libvorbis "${samplePath}"`;
      await new Promise((resolve, reject) => {
        exec(cmd, (err) => err ? reject(err) : resolve());
      });
      const stats = fs.statSync(samplePath);
      const job = {
        id: sampleId,
        originalName: "amostra-audio.ogg",
        inputPath: samplePath,
        targetFormat: "mp3",
        status: "queued",
        progress: 0,
        inputSize: stats.size,
        createdAt: Date.now(),
        options: { audioBitrate: "192" }
      };
      jobs.set(sampleId, job);
      executeConversion(job);
      return res.json({ success: true, job });
    } else if (sampleType === "pdf") {
      const samplePath = path.join(UPLOADS_DIR, `amostra-${sampleId}.pdf`);
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page1 = pdfDoc.addPage([600, 400]);
      page1.drawRectangle({
        x: 40,
        y: 40,
        width: 520,
        height: 320,
        borderColor: rgb(0.3, 0.4, 0.9),
        borderWidth: 2,
        color: rgb(0.97, 0.98, 1)
      });
      page1.drawText("HyperConvert Studio", {
        x: 60,
        y: 310,
        size: 26,
        font: helveticaBold,
        color: rgb(0.1, 0.15, 0.4)
      });
      page1.drawText("Conversor de Alta Fidelidade (PDF para JPG via Ghostscript)", {
        x: 60,
        y: 275,
        size: 14,
        font: helveticaFont,
        color: rgb(0.3, 0.35, 0.45)
      });
      page1.drawText("Demonstracao de pagina 1 com resolucao de 150/300 DPI.", {
        x: 60,
        y: 220,
        size: 13,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      page1.drawText("Renderizacao com Ghostscript nativo, gerando JPG nitido instantaneamente.", {
        x: 60,
        y: 195,
        size: 12,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      });
      const page2 = pdfDoc.addPage([600, 400]);
      page2.drawRectangle({
        x: 40,
        y: 40,
        width: 520,
        height: 320,
        borderColor: rgb(0.1, 0.7, 0.4),
        borderWidth: 2,
        color: rgb(0.96, 1, 0.97)
      });
      page2.drawText("Pagina 2: Tabela de Especificacoes", {
        x: 60,
        y: 310,
        size: 20,
        font: helveticaBold,
        color: rgb(0.05, 0.4, 0.2)
      });
      page2.drawText("- WEBM para MP4 com H.264 acelerado", {
        x: 60,
        y: 260,
        size: 13,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      page2.drawText("- OGG para MP3 com libmp3lame estavel", {
        x: 60,
        y: 230,
        size: 13,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      page2.drawText("- PDF para JPG com suporte a multi-paginas e arquivo ZIP", {
        x: 60,
        y: 200,
        size: 13,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2)
      });
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(samplePath, pdfBytes);
      const stats = fs.statSync(samplePath);
      const job = {
        id: sampleId,
        originalName: "documento-amostra.pdf",
        inputPath: samplePath,
        targetFormat: "jpg",
        status: "queued",
        progress: 0,
        inputSize: stats.size,
        createdAt: Date.now(),
        options: { dpi: "150" }
      };
      jobs.set(sampleId, job);
      executeConversion(job);
      return res.json({ success: true, job });
    }
    return res.status(400).json({ error: "Tipo de amostra inv\xE1lido" });
  } catch (err) {
    return res.status(500).json({ error: `Falha ao gerar arquivo de teste: ${err.message}` });
  }
});
app.get("/api/system-status", (_req, res) => {
  res.json({
    status: "online",
    engine: "FFmpeg 4.4 + Ghostscript 9.55 + pdf-lib",
    maxUploadSize: "1GB",
    activeJobs: jobs.size,
    supportedFormats: {
      video: ["webm", "mp4", "mov", "mkv", "avi", "gif"],
      audio: ["ogg", "mp3", "wav", "aac", "flac", "m4a"],
      documents: ["pdf", "jpg", "png", "webp"]
    }
  });
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HyperConvert Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();

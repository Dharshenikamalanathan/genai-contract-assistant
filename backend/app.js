const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// File handling + parsing
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph } = require("docx");
const ExcelJS = require("exceljs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const app = express();
const PORT = 5000;
const SECRET_KEY = "mysecretkey"; // ⚠️ use env var in production

app.use(cors());
app.use(express.json());

// -----------------------------
// Demo Users
// -----------------------------
const users = [
  { username: "admin", password: "password123" },
  { username: "mentor", password: "mentor123" }
];

// -----------------------------
// Health Check
// -----------------------------
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// -----------------------------
// User Login
// -----------------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log("➡️ Login attempt:", { username, password });

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    console.log("❌ Invalid credentials");
    return res.status(401).json({ error: "Invalid credentials" });
  }

  console.log("✅ Login success:", username);
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

// -----------------------------
// Middleware to protect routes
// -----------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// -----------------------------
// Generate Clause (Protected)
// -----------------------------
app.post("/generate-clause", authMiddleware, async (req, res) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/generate-clause", req.body);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error in /generate-clause:", error.message);
    res.status(500).json({ error: "AI service error (generate-clause)" });
  }
});

// -----------------------------
// Analyze Risk (Protected)
// -----------------------------
app.post("/analyze-risk", authMiddleware, async (req, res) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/analyze-risk", req.body);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error in /analyze-risk:", error.message);
    res.status(500).json({ error: "AI service error (analyze-risk)" });
  }
});

// -----------------------------
// Upload Endpoint (TXT, PDF, Word, Excel)
// -----------------------------
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  let extractedText = "";
  try {
    if (file.mimetype.includes("spreadsheet") || file.originalname.endsWith(".xlsx")) {
      // Excel
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      extractedText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    } else if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      // PDF
      const buffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.endsWith(".docx")
    ) {
      // Word
      const result = await mammoth.extractRawText({ path: file.path });
      extractedText = result.value;
    } else {
      // Text
      extractedText = fs.readFileSync(file.path, "utf-8");
    }

    fs.unlinkSync(file.path); // cleanup
    res.json({ text: extractedText });
  } catch (error) {
    console.error("❌ Error in /upload:", error.message);
    res.status(500).json({ error: "Failed to process file" });
  }
});

// -----------------------------
// Export Endpoint
// -----------------------------
app.post("/export", async (req, res) => {
  const { format, content } = req.body;

  try {
    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=result.pdf");
      doc.text(content);
      doc.pipe(res);
      doc.end();
    } else if (format === "word") {
      const doc = new Document({
        sections: [{ properties: {}, children: [new Paragraph(content)] }],
      });
      const buffer = await Packer.toBuffer(doc);
      res.setHeader("Content-Disposition", "attachment; filename=result.docx");
      res.send(buffer);
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Results");
      sheet.addRow(["Result"]);
      sheet.addRow([content]);
      res.setHeader("Content-Disposition", "attachment; filename=result.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ error: "Invalid export format" });
    }
  } catch (error) {
    console.error("❌ Error in /export:", error.message);
    res.status(500).json({ error: "Failed to export file" });
  }
});

// -----------------------------
// Templates - Fetch All
// -----------------------------
app.get("/templates", (req, res) => {
  try {
    const templatesPath = path.join(__dirname, "templates/templates.json");
    const templates = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));
    res.json(templates);
  } catch (err) {
    console.error("❌ Error in /templates:", err.message);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

// -----------------------------
// Templates - Download (PDF, Word, Excel)
// -----------------------------
app.get("/download-template/:id/:format", (req, res) => {
  try {
    const { id, format } = req.params;
    const templatesPath = path.join(__dirname, "templates/templates.json");
    const templates = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));

    const template = templates.find((t) => t.id === id);
    if (!template) return res.status(404).json({ error: "Template not found" });

    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${id}.pdf`);
      doc.text(template.content);
      doc.pipe(res);
      doc.end();
    } else if (format === "word") {
      const doc = new Document({
        sections: [{ properties: {}, children: [new Paragraph(template.content)] }],
      });
      Packer.toBuffer(doc).then((buffer) => {
        res.setHeader("Content-Disposition", `attachment; filename=${id}.docx`);
        res.send(buffer);
      });
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Template");
      sheet.addRow(["Contract Template"]);
      sheet.addRow([template.title]);
      sheet.addRow([]);
      sheet.addRow(["Content"]);
      template.content.split("\n").forEach((line) => sheet.addRow([line]));
      res.setHeader("Content-Disposition", `attachment; filename=${id}.xlsx`);
      workbook.xlsx.write(res).then(() => res.end());
    } else {
      res.status(400).json({ error: "Invalid format" });
    }
  } catch (err) {
    console.error("❌ Error in /download-template:", err.message);
    res.status(500).json({ error: "Failed to download template" });
  }
});

// -----------------------------
// Templates - Add New
// -----------------------------
app.post("/add-template", (req, res) => {
  try {
    const { id, title, description, category, content } = req.body;
    if (!id || !title || !description || !category || !content) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const templatesPath = path.join(__dirname, "templates/templates.json");
    const templates = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));

    if (templates.find((tpl) => tpl.id === id)) {
      return res.status(400).json({ error: "Template ID already exists" });
    }

    templates.push({ id, title, description, category, content });
    fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), "utf-8");

    res.json({ success: true, message: "Template added successfully", templates });
  } catch (err) {
    console.error("❌ Error in /add-template:", err.message);
    res.status(500).json({ error: "Failed to add template" });
  }
});

// -----------------------------
// Templates - Delete
// -----------------------------
app.delete("/delete-template/:id", (req, res) => {
  try {
    const { id } = req.params;
    const templatesPath = path.join(__dirname, "templates/templates.json");
    let templates = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));

    const index = templates.findIndex((tpl) => tpl.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Template not found" });
    }

    templates.splice(index, 1);
    fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), "utf-8");

    res.json({ success: true, message: "Template deleted successfully", templates });
  } catch (err) {
    console.error("❌ Error in /delete-template:", err.message);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
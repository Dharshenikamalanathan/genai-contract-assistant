import React, { useState, useEffect } from "react";
import "./App.css";

function MainApp({ token, onLogout }) {
  const [context, setContext] = useState("");
  const [clause, setClause] = useState("");
  const [risk, setRisk] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  // File upload
  const [uploadedFile, setUploadedFile] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    id: "",
    title: "",
    description: "",
    category: "",
    content: ""
  });

  // Collapse sections
  const [showClause, setShowClause] = useState(true);
  const [showRisk, setShowRisk] = useState(true);

  // -----------------------------
  // Load templates
  // -----------------------------
  useEffect(() => {
    fetch("http://localhost:5000/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        const uniqueCategories = ["All", ...new Set(data.map((tpl) => tpl.category))];
        setCategories(uniqueCategories);
      })
      .catch((err) => console.error("❌ Error fetching templates:", err));
  }, []);

  const filteredTemplates =
    activeCategory === "All"
      ? templates
      : templates.filter((tpl) => tpl.category === activeCategory);

  // -----------------------------
  // Apply Template (renamed)
  // -----------------------------
  const applyTemplate = (template) => {
    setContext(template.content);
    setSelectedTemplate(template.title);
  };

  // -----------------------------
  // Download Template
  // -----------------------------
  const downloadTemplate = async (id, format) => {
    try {
      const res = await fetch(`http://localhost:5000/download-template/${id}/${format}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.${format === "word" ? "docx" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("❌ Error downloading template");
    }
  };

  // -----------------------------
  // Add Template
  // -----------------------------
  const addTemplate = async () => {
    try {
      const res = await fetch("http://localhost:5000/add-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });
      const data = await res.json();
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        setTemplates(data.templates);
        setNewTemplate({ id: "", title: "", description: "", category: "", content: "" });
        alert("✅ Template added successfully!");
      }
    } catch (err) {
      alert("❌ Error adding template");
    }
  };

  // -----------------------------
  // Delete Template
  // -----------------------------
  const deleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`http://localhost:5000/delete-template/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        alert("❌ " + data.error);
      } else {
        setTemplates(data.templates);
        alert("🗑 Template deleted successfully");
      }
    } catch (err) {
      alert("❌ Error deleting template");
    }
  };

  // -----------------------------
  // Generate Clause
  // -----------------------------
  const generateClause = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/generate-clause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      setClause(data.generated_clause || data.clause || "⚠️ No clause generated");
    } catch (err) {
      setClause("❌ Error generating clause");
    }
    setLoading(false);
  };

  // -----------------------------
  // Analyze Risk
  // -----------------------------
  const analyzeRisk = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/analyze-risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clause }),
      });
      const data = await res.json();
      if (Array.isArray(data.risk_analysis)) {
        setRisk(data.risk_analysis);
      } else {
        setRisk([data.risk || "⚠️ No risk found"]);
      }
    } catch (err) {
      setRisk(["❌ Error analyzing risk"]);
    }
    setLoading(false);
  };

  // -----------------------------
  // Upload File
  // -----------------------------
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadedFile(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setContext(data.text);
    } catch (err) {
      alert("❌ Error uploading file");
    }
  };

  // -----------------------------
  // Export File
  // -----------------------------
  const exportFile = async (format) => {
    try {
      const res = await fetch("http://localhost:5000/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content: `${clause}\n\n${risk.join("\n")}` }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `result.${format === "word" ? "docx" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("❌ Error exporting file");
    }
  };

  // -----------------------------
  // Clear All
  // -----------------------------
  const clearAll = () => {
    setContext("");
    setClause("");
    setRisk([]);
    setUploadedFile(null);
  };

  return (
    <div className="container">
      <div className="header-row">
        {/* Dark mode toggle */}
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>

        <h1 className="title">⚖️ GenAI Contract Assistant</h1>

        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Templates Section */}
      <div className="templates-section">
        <h3>📂 Contract Templates</h3>
        <div className="categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <ul>
          {filteredTemplates.map((tpl) => (
            <li key={tpl.id}>
              <div>
                <strong>{tpl.title}</strong>
                <p style={{ margin: "4px 0", fontSize: "13px", color: "#555" }}>
                  {tpl.description}
                </p>
                <span className="category-label">{tpl.category}</span>
              </div>
              <div className="template-actions">
                <button onClick={() => applyTemplate(tpl)}>✏️ Use</button>
                <button onClick={() => downloadTemplate(tpl.id, "pdf")}>⬇️ PDF</button>
                <button onClick={() => downloadTemplate(tpl.id, "word")}>⬇️ Word</button>
                <button onClick={() => downloadTemplate(tpl.id, "excel")}>⬇️ Excel</button>
                <button onClick={() => deleteTemplate(tpl.id)}>🗑 Delete</button>
              </div>
            </li>
          ))}
        </ul>
        {selectedTemplate && <p className="selected-template">✔ Using: {selectedTemplate}</p>}

        {/* Add Custom Template */}
        <div className="add-template">
          <h4>➕ Add Custom Template</h4>
          <input
            type="text"
            placeholder="Template ID (unique)"
            value={newTemplate.id}
            onChange={(e) => setNewTemplate({ ...newTemplate, id: e.target.value })}
          />
          <input
            type="text"
            placeholder="Template Title"
            value={newTemplate.title}
            onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Template Description"
            value={newTemplate.description}
            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category"
            value={newTemplate.category}
            onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
          />
          <textarea
            placeholder="Template Content"
            value={newTemplate.content}
            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
          />
          <button onClick={addTemplate}>Save Template</button>
        </div>
      </div>

      {/* File Upload */}
      <div className="upload-section">
        <input type="file" onChange={handleFileUpload} />
        {uploadedFile && <p className="uploaded-file">📂 Uploaded: {uploadedFile}</p>}
      </div>

      {/* Textarea for Context */}
      <textarea
        className="input-box"
        placeholder="Enter contract context... or upload a file above"
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />

      {/* Buttons */}
      <div className="button-row">
        <button onClick={generateClause} disabled={loading}>
          {loading ? "⏳ Generating..." : "✨ Generate Clause"}
        </button>
        <button onClick={analyzeRisk} disabled={loading || !clause}>
          {loading ? "🔎 Analyzing..." : "⚠️ Analyze Risk"}
        </button>
        <button onClick={clearAll} style={{ background: "#6b7280" }}>
          🧹 Clear
        </button>
      </div>

      {/* Clause Output */}
      <div className="output-section">
        <h3 onClick={() => setShowClause(!showClause)} className="collapsible">
          📄 Generated Clause {showClause ? "▼" : "▶"}
        </h3>
        <div className={`collapsible-content ${showClause ? "open" : ""}`}>
          <pre>{clause}</pre>
        </div>
      </div>

      {/* Risk Analysis Output */}
      <div className="output-section">
        <h3 onClick={() => setShowRisk(!showRisk)} className="collapsible">
          🚨 Risk Analysis {showRisk ? "▼" : "▶"}
        </h3>
        <div className={`collapsible-content ${showRisk ? "open" : ""}`}>
          {risk.length > 0 ? (
            <ul>
              {risk.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No risk analysis yet.</p>
          )}

          <div className="legend">
            <span className="legend-item risk">⚠️ Risk</span>
            <span className="legend-item safe">✅ Safe</span>
            <span className="legend-item neutral">❓ Neutral</span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="button-row" style={{ marginTop: "15px" }}>
        <button onClick={() => exportFile("pdf")}>⬇️ Export PDF</button>
        <button onClick={() => exportFile("word")}>⬇️ Export Word</button>
        <button onClick={() => exportFile("excel")}>⬇️ Export Excel</button>
      </div>
    </div>
  );
}

export default MainApp;

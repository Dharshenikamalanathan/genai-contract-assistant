import json
import random
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(title="GenAI Contract Assistant - AI Service")

# Enable CORS so frontend (React) can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Request Models
# -----------------------------
class ClauseRequest(BaseModel):
    context: str

class RiskRequest(BaseModel):
    clause: str

# -----------------------------
# Dataset Loader
# -----------------------------
def load_json(filename):
    """Load dataset from JSON file (supports dict['documents'] or list format)."""
    with open(filename, "r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, dict) and "documents" in data:
            return data["documents"]
        elif isinstance(data, list):
            return data
        return []

# Load all dataset splits
try:
    train_data = load_json("train.json")
    dev_data = load_json("dev.json")
    test_data = load_json("test.json")
    all_documents = train_data + dev_data + test_data
except Exception as e:
    print(f"❌ Error loading dataset: {str(e)}")
    all_documents = []

# Debug logs to confirm dataset loading
print(f"📂 Dataset loaded: {len(train_data)} training docs, {len(dev_data)} dev docs, {len(test_data)} test docs")
print(f"📊 Total docs: {len(all_documents)}")
if all_documents:
    print(f"🔎 Example doc: {all_documents[0].get('file_name', 'unknown')}")
    print(f"📝 Sample text: {all_documents[0].get('text', '')[:150]}...")

# -----------------------------
# Root Endpoint (Health Check)
# -----------------------------
@app.get("/")
def root():
    return {"message": "AI service is running 🚀"}

# -----------------------------
# Generate Clause Endpoint
# -----------------------------
@app.post("/generate-clause")
def generate_clause(req: ClauseRequest):
    """Generate a contract clause based on provided context."""
    print(f"[DEBUG] Generate Clause called with context: {req.context}")
    context = req.context.lower()

    try:
        # Try to find relevant clause by keyword matching
        for doc in all_documents:
            text = doc.get("text", "").lower()
            if "confidential" in context and "confidential" in text:
                return {"generated_clause": doc.get("text", "")}
            if "terminate" in context and "terminate" in text:
                return {"generated_clause": doc.get("text", "")}
            if "payment" in context and "payment" in text:
                return {"generated_clause": doc.get("text", "")}

        # Fallback: return random clause
        if all_documents:
            random_doc = random.choice(all_documents)
            return {"generated_clause": random_doc.get("text", "No text found")}

        return {"generated_clause": "⚠️ No clause generated (dataset empty)"}

    except Exception as e:
        print(f"❌ Error in generate_clause: {str(e)}")
        return {"generated_clause": "⚠️ Internal error while generating clause"}

# -----------------------------
# Analyze Risk Endpoint
# -----------------------------
@app.post("/analyze-risk")
def analyze_risk(req: RiskRequest):
    """Analyze clause for potential risks using dataset annotations + keywords."""
    print(f"[DEBUG] Analyze Risk called with clause: {req.clause}")
    clause = req.clause.lower()
    risks = []

    try:
        # --- Step 1: Dataset annotation-based analysis ---
        for doc in all_documents:
            text = doc.get("text", "").lower()
            # Looser match: if at least 5 words from clause are in dataset text
            words = clause.split()
            match_count = sum(1 for w in words if w in text)
            if match_count >= 5:  
                for ann_set in doc.get("annotation_sets", []):
                    for key, ann in ann_set.get("annotations", {}).items():
                        choice = ann.get("choice", "")
                        if choice == "Contradiction":
                            risks.append(f"⚠️ Dataset Risk: {key} = Contradiction")
                        elif choice == "Entailment":
                            risks.append(f"✅ Dataset Safe: {key} = Entailment")
                        elif choice == "Neutral":
                            risks.append(f"❓ Dataset Neutral: {key} = Neutral")

        # --- Step 2: Keyword-based risk detection ---
        risky_keywords = [
            "terminate immediately",
            "without notice",
            "penalty",
            "indemnify",
            "unlimited liability",
            "breach",
        ]
        safe_keywords = ["confidential", "payment", "notice period"]

        for word in risky_keywords:
            if word in clause:
                risks.append(f"⚠️ Risk detected: contains '{word}'")

        for word in safe_keywords:
            if word in clause:
                risks.append(f"✅ Safe clause: contains '{word}'")

        # --- Step 3: Fallback ---
        if not risks:
            risks.append("No obvious risks found")

        return {"risk_analysis": risks}

    except Exception as e:
        print(f"❌ Error in analyze_risk: {str(e)}")
        return {"risk_analysis": ["⚠️ Internal error while analyzing risk"]}

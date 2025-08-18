// pages/api/analyze.js
import OpenAI from "openai";

const VISION_MODEL = "gpt-4o-mini";

// Keep the same 5 labels so the UI can style the pill
const SEVERITY_LABELS = [
  "No mould or damp",
  "Light mould/damp",
  "Moderate mould/damp",
  "Severe mould/damp",
  "Critical mould/damp",
];

const SYSTEM_PROMPT = `You are an EXPERT building surveyor in the UK with 20+ years experience specialising in damp and mould analysis. You have EXTREMELY HIGH accuracy in identifying exact locations and severity.

FIRST: Validate that the image shows a building interior/exterior with potential damp or mould issues. 
REJECT images that show: people, animals, food, vehicles, random objects, or anything not related to buildings/damp/mould.

If the image is NOT suitable for damp/mould analysis, respond with:
"INVALID_IMAGE: This image does not appear to show a building area suitable for damp and mould analysis. Please upload a photo of walls, ceilings, floors, windows, doors, or building corners that may have moisture damage, damp ingress, leaks, or mould growth."

ONLY if the image is suitable, proceed with ULTRA-PRECISE analysis:

**LOCATION IDENTIFICATION (CRITICAL):**
- Be EXTREMELY specific about EXACT locations
- If mould is on "wall" - specify: "upper wall", "lower wall", "wall near ceiling", "wall near floor", "wall behind radiator", "wall near window"
- If mould is on "floor" - specify: "floor near wall", "floor in corner", "floor under window", "floor near door"
- If mould is on "ceiling" - specify: "ceiling near wall", "ceiling in corner", "ceiling near light fitting"
- Use precise measurements when visible: "2 feet from floor", "6 inches from corner"

**DETAILED ANALYSIS:**
- Identify EXACT mould type: "black mould", "white mould", "green mould", "pink mould"
- Specify moisture source: "rising damp", "penetrating damp", "condensation", "leak from above"
- Note material damage: "plaster bubbling", "paint peeling", "wood rotting", "wallpaper lifting"
- Estimate extent: "small patch (2x3 inches)", "medium area (1x2 feet)", "large spread (3x4 feet)"

Use UK English and UK building terms (mould, plaster, skirting board, loft, radiator, flat, landlord, postcode).

Return a SINGLE detailed paragraph (4-7 lines) with precise location details. No headings, no lists, no JSON.

AFTER the paragraph, append EXACTLY two lines in this format (no extra text):
Affected areas: <comma-separated list from {"Walls","Ceiling","Floor","Windows","Doors","Corners"} (choose only relevant)>
Confidence: <number>%

Finally, on a NEW last line, append:
Severity: <one of ${SEVERITY_LABELS.join("; ")}>

Do NOT return anything else.`;

export async function POST(request) {
  try {
    const { images, notes } = await request.json() || {};
    if (!Array.isArray(images) || images.length === 0) {
      return Response.json({ error: "No images provided" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Clean the system prompt to ensure no problematic Unicode characters
    const cleanSystemPrompt = SYSTEM_PROMPT.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

    const content = [{ type: "text", text: cleanSystemPrompt }];
    
    for (const dataUrl of images) {
      content.push({ 
        type: "image_url", 
        image_url: { 
          url: dataUrl 
        } 
      });
    }
    
    if (notes && notes.trim()) {
      const cleanNotes = `Notes from user: ${notes.trim()}`.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      content.push({ type: "text", text: cleanNotes });
    }

    const resp = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [{ role: "user", content }],
      max_tokens: 1000,
      temperature: 0.1, // Lower temperature for more consistent, accurate results
      top_p: 0.9, // Focus on most likely responses
    });

    const fullText = resp.choices[0]?.message?.content || "";
    const parsed = parseFields(fullText);

    // Validate response quality
    if (parsed.confidence && parsed.confidence < 30) {
      console.warn(`Low confidence analysis: ${parsed.confidence}% - Response: ${fullText.substring(0, 100)}...`);
    }

    return Response.json({
      success: true,
      ...parsed,
      raw: fullText, // keep raw for debugging if you want (don't render to users)
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// --- helpers ---
function parseFields(text) {
  const clean = stripAnyJson(text || "");
  
  // Check if this is an invalid image response
  if (clean.includes("INVALID_IMAGE:")) {
    return {
      summary: clean.replace("INVALID_IMAGE:", "").trim(),
      confidence: 0,
      affected: [],
      severity: "Invalid Image",
      isInvalid: true
    };
  }
  
  const confidence = parseNumber(clean, /Confidence:\s*(\d{1,3})\s*%/i);
  const affectedLine = matchGroup(clean, /Affected\s*areas:\s*(.+)/i);
  const severityLine = matchGroup(clean, /Severity:\s*(.+)/i);
  const summary = clean
    .replace(/\n?Affected\s*areas:.*$/gim, "")
    .replace(/\n?Confidence:\s*\d{1,3}\s*%.*$/gim, "")
    .replace(/\n?Severity:.*$/gim, "")
    .trim();

  const affected = normaliseAffected(affectedLine);
  const severity = snapSeverity(severityLine);
  
  // Enhance confidence based on analysis quality
  const enhancedConfidence = enhanceConfidence(confidence, summary);

  return { summary, confidence: enhancedConfidence, affected, severity, isInvalid: false };
}

function stripAnyJson(text) {
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(0, start).trim();
  }
  return text.trim();
}

function parseNumber(text, regex) {
  const m = text.match(regex);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function enhanceConfidence(confidence, summary) {
  if (!confidence) return confidence;
  
  let enhancedConfidence = confidence;
  
  // Boost confidence if analysis is very detailed and specific
  if (summary.includes("near") || summary.includes("behind") || summary.includes("under")) {
    enhancedConfidence = Math.min(100, enhancedConfidence + 5);
  }
  
  // Boost confidence if specific measurements are mentioned
  if (summary.match(/\d+\s*(inch|foot|cm|m)/i)) {
    enhancedConfidence = Math.min(100, enhancedConfidence + 8);
  }
  
  // Boost confidence if mould type is specified
  if (summary.match(/(black|white|green|pink)\s*mould/i)) {
    enhancedConfidence = Math.min(100, enhancedConfidence + 3);
  }
  
  // Boost confidence if moisture source is identified
  if (summary.match(/(rising|penetrating|condensation|leak)/i)) {
    enhancedConfidence = Math.min(100, enhancedConfidence + 4);
  }
  
  return enhancedConfidence;
}

function matchGroup(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : null;
}

const AFFECTED_SET = new Set([
  "Walls", "Ceiling", "Floor", "Windows", "Doors", "Corners",
  "Upper Walls", "Lower Walls", "Wall Corners", "Wall Near Ceiling", "Wall Near Floor",
  "Floor Near Walls", "Floor Corners", "Floor Under Windows", "Floor Near Doors",
  "Ceiling Near Walls", "Ceiling Corners", "Ceiling Near Lights",
  "Window Frames", "Window Sills", "Door Frames", "Door Thresholds"
]);

function normaliseAffected(line) {
  if (!line) return [];
  const items = line.split(",").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let part of items) {
    let key = title(part);
    // quick singular/plural mapping
    const m = { Wall: "Walls", Window: "Windows", Door: "Doors", Corner: "Corners", Ceiling: "Ceiling", Floor: "Floor" };
    key = m[key] || key;
    if (AFFECTED_SET.has(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

function title(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function snapSeverity(line) {
  if (!line) return null;
  const s = line.trim().toLowerCase();
  for (const lab of SEVERITY_LABELS) {
    if (s === lab.toLowerCase()) return lab;
  }
  // loose prefix match
  for (const lab of SEVERITY_LABELS) {
    if (s.startsWith(lab.split(" ")[0].toLowerCase())) return lab;
  }
  return line;
}
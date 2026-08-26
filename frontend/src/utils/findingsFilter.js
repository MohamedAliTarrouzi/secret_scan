export const SEVERITIES = ["Critical","Medium","Low","Ambiguous"]

/**
 * Filters a list of findings by free-text search, severity, and category.
 * - search matches name, category, file_path, description, value, and the
 *   LLM verdict/reason, so a scan can be searched by what the LLM said too.
 * - severities: array of selected severities. Empty array = no filter (all pass).
 * - category: "all" or a specific category string.
 */


export const SOURCES = [
  { id: "all", label: "All" },
  { id: "regex", label: "Regex only" },
  { id: "llm", label: "Regex + LLM" },
]

/**
 * A finding was sent through the LLM layer if it has a verdict OR a
 * technical error recorded (llm_error is set even when llm_verdict stays
 * null, e.g. missing API key or timeout) — either way it was attempted.
 * Findings that were never Ambiguous skip the LLM entirely and have both
 * fields null.
 */

export function findingSource(f) {
  return f.llm_verdict != null || f.llm_error != null ? "llm" : "regex"
}

export function filterFindings(findings,{ search = "", severities = [], category = "all",  source = "all"} = {}){
    const list = findings || []
    const q = search.trim().toLowerCase()

    return list.filter((f)=>{
        if(severities.length > 0 && !severities.includes(f.severity)) return false
        if(category!=="all" && f.category !==category) return false
        if(source !== "all" && findingSource(f) !== source) return false

        if(!q) return true
        const haystack = [
            f.name,
            f.category,
            f.file_path,
            f.description,
            f.value,
            f.llm_verdict,
            f.llm_reason,
        ]
        .filter(Boolean).join(" ").toLowerCase()

        return haystack.includes(q)
    })
}

/** Unique, sorted list of categories present in a set of findings. */
export function extractCategories(findings){
    const set = new Set((findings || []).map((f)=>f.category).filter(Boolean))
    return Array.from(set).sort()
}
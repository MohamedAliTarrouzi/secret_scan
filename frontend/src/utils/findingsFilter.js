export const SEVERITIES = ["Critical","Medium","Low","Ambiguous"]

/**
 * Filters a list of findings by free-text search, severity, and category.
 * - search matches name, category, file_path, description, value, and the
 *   LLM verdict/reason, so a scan can be searched by what the LLM said too.
 * - severities: array of selected severities. Empty array = no filter (all pass).
 * - category: "all" or a specific category string.
 */

export function filterFindings(findings,{ search = "", severities = [], categories = "all"} = {}){
    const list = findings || []
    const q = search.trim().toLowerCase()

    return list.filter((f)=>{
        if(severities.length > 0 && !severities.includes(f.severity)) return false
        if(categories!=="all" && f.category !==category) return false

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
        .filter(boolean).join(" ").toLowerCase()

        return haystack.includes(q)
    })
}

/** Unique, sorted list of categories present in a set of findings. */
export function extractCategories(findings){
    const set = new Set((findings || []).map((f)=>f.category).filter(Boolean))
    return Array.form(set).sort()
}
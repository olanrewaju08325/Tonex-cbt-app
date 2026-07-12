import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { UploadCloud, FileText, AlertCircle, CheckCircle, Sparkles, BrainCircuit } from "lucide-react";
import Papa from "papaparse";
import { extractTextFromFile } from "../../../lib/fileParser";
import { extractQuestionsFromText, ExtractedQuestion } from "../../../lib/ai";
import { Subject, University } from "../../../types/database";

export function BulkUploadView() {
  const [activeTab, setActiveTab] = useState<"csv" | "ai">("ai");
  
  // CSV State
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // AI State
  const [aiText, setAiText] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<ExtractedQuestion[]>([]);
  
  // Selectors for AI
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");

  useEffect(() => {
    async function loadSelectors() {
      const { data: subData } = await supabase.from('subjects').select('*').eq('is_active', true);
      const { data: uniData } = await supabase.from('universities').select('*').eq('is_active', true);
      if (subData) setSubjects(subData);
      if (uniData) setUniversities(uniData);
    }
    loadSelectors();
  }, []);

  // -------------------------------------------------------------
  // AI EXTRACTION LOGIC
  // -------------------------------------------------------------
  const handleAiExtract = async () => {
    if (!selectedSubject) return toast.error("Please select a target Subject first.");
    if (!aiText.trim() && !aiFile) return toast.error("Please paste text or upload a document.");
    
    setAiLoading(true);
    try {
      let textToProcess = aiText;
      
      // If a file was uploaded, extract its raw text first
      if (aiFile) {
        toast.info("Reading document...");
        textToProcess = await extractTextFromFile(aiFile);
      }
      
      toast.info("AI is extracting questions...");
      const extracted = await extractQuestionsFromText(textToProcess);
      
      if (extracted.length === 0) {
        toast.warning("AI could not find any recognizable questions in the text.");
      } else {
        setAiPreview(extracted);
        toast.success(`AI successfully extracted ${extracted.length} questions!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to extract via AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiImport = async () => {
    if (aiPreview.length === 0) return;
    if (!selectedSubject) return toast.error("Subject is required.");
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = aiPreview.map(q => ({
        subject_id: selectedSubject,
        university_id: selectedUniversity || null,
        text: q.text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        year: q.year || null,
        // topic: q.topic // we can save this if we add a topic column to questions later
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc('bulk_insert_questions', {
        p_questions: payload
      });

      if (rpcError) throw rpcError;

      const inserted = rpcData?.inserted || 0;
      const skipped = rpcData?.skipped || 0;

      if (user?.id && inserted > 0) {
        await supabase.from("admin_logs").insert({
          admin_id: user.id,
          action: "AI_BULK_UPLOAD",
          target_type: "questions",
          details: { count: inserted, skipped_duplicates: skipped }
        });
      }

      toast.success(`Successfully uploaded ${inserted} new questions! (Skipped ${skipped})`);
      setAiPreview([]);
      setAiText("");
      setAiFile(null);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CSV UPLOAD LOGIC
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setValidationErrors([]);
      
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 5));
          
          const errors: string[] = [];
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            errors.push("The CSV file has no data rows.");
          } else {
            const firstRow = rows[0];
            const headers = Object.keys(firstRow);
            
            const hasText = headers.includes("text") || headers.includes("question");
            const hasSubject = headers.includes("subject_id");
            const hasCorrect = headers.includes("correct_answer") || headers.includes("correct_option");
            const hasOptions = headers.includes("option_a") && headers.includes("option_b") && headers.includes("option_c") && headers.includes("option_d");
            
            if (!hasText) errors.push("Missing column: 'text' or 'question'");
            if (!hasSubject) errors.push("Missing column: 'subject_id'");
            if (!hasCorrect) errors.push("Missing column: 'correct_answer' or 'correct_option'");
            if (!hasOptions) errors.push("Missing columns for options (option_a to option_d)");
            
            if (errors.length === 0) {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              
              rows.forEach((row, index) => {
                const rowNum = index + 2; 
                
                const qText = row.text || row.question;
                if (!qText || !String(qText).trim()) errors.push(`Row ${rowNum}: Question text is empty.`);
                
                if (!row.subject_id || !String(row.subject_id).trim()) {
                  errors.push(`Row ${rowNum}: subject_id is empty.`);
                } else if (!uuidRegex.test(row.subject_id.trim())) {
                  errors.push(`Row ${rowNum}: subject_id is not a valid UUID.`);
                }

                if (row.university_id && String(row.university_id).trim() && !uuidRegex.test(row.university_id.trim())) {
                  errors.push(`Row ${rowNum}: university_id is not a valid UUID.`);
                }
                
                const correct = (row.correct_answer || row.correct_option || "").trim().toUpperCase();
                if (!["A", "B", "C", "D"].includes(correct)) {
                  errors.push(`Row ${rowNum}: correct_answer must be 'A', 'B', 'C', or 'D'`);
                }
              });
            }
          }
          
          if (errors.length > 0) {
            setValidationErrors(errors);
            toast.error(`Pre-flight check failed with ${errors.length} error(s).`);
          } else {
            toast.success("Pre-flight check passed! Ready to import.");
          }
        }
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          const rawQuestions = rows.map(row => {
            const qText = row.text || row.question;
            return {
              subject_id: String(row.subject_id).trim(),
              university_id: row.university_id ? String(row.university_id).trim() : null,
              text: String(qText).trim(),
              option_a: String(row.option_a ?? "").trim(),
              option_b: String(row.option_b ?? "").trim(),
              option_c: String(row.option_c ?? "").trim(),
              option_d: String(row.option_d ?? "").trim(),
              correct_answer: String(row.correct_answer || row.correct_option || "").trim().toUpperCase(),
              explanation: row.explanation ? String(row.explanation).trim() : null,
              year: row.year ? parseInt(row.year) : null
            };
          });

          const uniqueCSVMap = new Map();
          rawQuestions.forEach(q => {
            const key = `${q.subject_id.toLowerCase()}:::${q.text.toLowerCase()}`;
            if (!uniqueCSVMap.has(key)) uniqueCSVMap.set(key, q);
          });
          const deduplicatedList = Array.from(uniqueCSVMap.values());

          const { data: rpcData, error: rpcError } = await supabase.rpc('bulk_insert_questions', {
            p_questions: deduplicatedList
          });

          if (rpcError) throw rpcError;

          const inserted = rpcData?.inserted || 0;
          const skipped = rpcData?.skipped || 0;

          if (user?.id && inserted > 0) {
            await supabase.from("admin_logs").insert({
              admin_id: user.id,
              action: "BULK_UPLOAD_QUESTIONS",
              target_type: "questions",
              details: { filename: file.name, count: inserted, skipped }
            });
          }

          toast.success(`Successfully uploaded ${inserted} new questions! (Skipped ${skipped})`);
          setFile(null);
          setPreview([]);
        } catch (error: any) {
          toast.error(`Upload failed: ${error.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex bg-[#0F172A] border border-white/10 rounded-xl p-1 w-fit">
        <button 
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "ai" ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-white"}`}
        >
          <Sparkles size={16} /> AI Smart Extract
        </button>
        <button 
          onClick={() => setActiveTab("csv")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "csv" ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-white"}`}
        >
          <FileText size={16} /> Legacy CSV Upload
        </button>
      </div>

      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        
        {activeTab === "ai" ? (
          // AI EXTRACTION VIEW
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <BrainCircuit size={20} className="text-[#8B5CF6]" /> AI Question Extractor
              </h2>
              <span className="text-xs bg-[#8B5CF6]/20 text-[#C4B5FD] px-3 py-1 rounded-full font-bold">Powered by Groq</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-semibold mb-2 block">Target Subject <span className="text-red-500">*</span></label>
                <select 
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white text-sm font-semibold mb-2 block">Target University (Optional)</label>
                <select 
                  value={selectedUniversity} 
                  onChange={e => setSelectedUniversity(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="">General (All Universities)</option>
                  {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-[#1E293B] hover:border-[#8B5CF6] rounded-2xl p-6 transition-colors">
              <label className="text-white text-sm font-semibold mb-2 block">Upload Document (PDF, DOCX, TXT)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setAiFile(e.target.files[0]);
                    setAiText("");
                  }
                }}
                className="text-[#64748B] text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#8B5CF6]/10 file:text-[#C4B5FD] hover:file:bg-[#8B5CF6]/20 cursor-pointer"
              />
              <div className="mt-4 flex items-center gap-4">
                <hr className="flex-1 border-white/5" />
                <span className="text-[#64748B] text-xs font-bold uppercase">OR PASTE RAW TEXT</span>
                <hr className="flex-1 border-white/5" />
              </div>
              <textarea 
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                placeholder="Paste messy questions here (e.g. 1. What is gravity? A. Force B. Mass...)"
                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 mt-4 text-white text-sm focus:border-[#8B5CF6] focus:outline-none min-h-[150px]"
                disabled={!!aiFile}
              />
            </div>

            {aiPreview.length === 0 ? (
              <button
                onClick={handleAiExtract}
                disabled={aiLoading || (!aiText && !aiFile) || !selectedSubject}
                className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-[#1E293B] disabled:text-[#64748B] text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? <><Sparkles className="animate-spin" size={18} /> Extracting Questions...</> : "Extract Questions with AI"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[#22C55E] font-bold flex items-center gap-2">
                    <CheckCircle size={18} /> Extraction Successful ({aiPreview.length})
                  </h3>
                  <button onClick={() => setAiPreview([])} className="text-[#EF4444] text-xs font-bold hover:underline">Discard & Start Over</button>
                </div>
                
                <div className="max-h-96 overflow-y-auto bg-[#1E293B] rounded-xl border border-white/5">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[#94A3B8] border-b border-white/5 bg-[#0F172A]">
                        <th className="p-3">Question</th>
                        <th className="p-3 text-center">Correct</th>
                        <th className="p-3">Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiPreview.map((q, i) => (
                        <tr key={i} className="text-white border-b border-white/5 last:border-0 hover:bg-white/5">
                          <td className="p-3">
                            <div className="font-semibold">{q.text}</div>
                            <div className="text-xs text-[#94A3B8] mt-1">A) {q.option_a} | B) {q.option_b} | C) {q.option_c} | D) {q.option_d}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-[#22C55E]">{q.correct_answer}</td>
                          <td className="p-3 text-[#C4B5FD] text-xs font-mono">{q.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleAiImport}
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#1E293B] text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? "Importing to Database..." : "Import Database"}
                </button>
              </div>
            )}
          </div>
        ) : (
          // CSV UPLOAD VIEW
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UploadCloud size={20} className="text-[#2563EB]" /> Bulk Upload Questions
              </h2>
              <a href="#" className="text-[#60A5FA] hover:text-white text-sm font-semibold transition-colors">
                Download CSV Template
              </a>
            </div>

            <div className="border-2 border-dashed border-[#1E293B] hover:border-[#2563EB] rounded-2xl p-8 text-center transition-colors">
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                <div className="bg-[#1E293B] p-4 rounded-full mb-4">
                  <FileText size={32} className="text-[#64748B]" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {file ? file.name : "Click to browse or drag and drop"}
                </p>
                <p className="text-[#64748B] text-sm">CSV files only</p>
              </label>
            </div>

            {preview.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-3">Preview (First 5 rows)</h3>
                <div className="overflow-x-auto bg-[#1E293B] rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[#94A3B8] border-b border-white/5">
                        <th className="p-3">Question</th>
                        <th className="p-3">Answer</th>
                        <th className="p-3">Subject ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="text-white border-b border-white/5 last:border-0">
                          <td className="p-3 truncate max-w-xs">{row.text || row.question}</td>
                          <td className="p-3">{row.correct_answer || row.correct_option}</td>
                          <td className="p-3 text-[#64748B] font-mono text-xs">{row.subject_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mt-6 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="text-[#EF4444] shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-white font-bold text-sm">CSV Validation Errors ({validationErrors.length})</h4>
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1 text-xs text-[#F87171] font-mono">
                      {validationErrors.slice(0, 30).map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading || validationErrors.length > 0}
              className="mt-6 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#1E293B] disabled:text-[#64748B] text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Uploading..." : "Import Database"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

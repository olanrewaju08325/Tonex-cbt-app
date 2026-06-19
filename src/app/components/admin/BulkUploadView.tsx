import { useState } from "react";
import { supabase, adminSupabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { UploadCloud, FileText, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";

export function BulkUploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
            // Check headers
            const firstRow = rows[0];
            const headers = Object.keys(firstRow);
            
            const hasText = headers.includes("text") || headers.includes("question");
            const hasSubject = headers.includes("subject_id");
            const hasCorrect = headers.includes("correct_answer") || headers.includes("correct_option");
            const hasOptions = headers.includes("option_a") && headers.includes("option_b") && headers.includes("option_c") && headers.includes("option_d");
            
            if (!hasText) errors.push("Missing compulsory column: 'text' or 'question'");
            if (!hasSubject) errors.push("Missing compulsory column: 'subject_id'");
            if (!hasCorrect) errors.push("Missing compulsory column: 'correct_answer' or 'correct_option'");
            if (!hasOptions) errors.push("Missing compulsory columns for options: 'option_a', 'option_b', 'option_c', and 'option_d'");
            
            // Validate each row
            if (errors.length === 0) {
              rows.forEach((row, index) => {
                const rowNum = index + 2; // +1 for 0-index, +1 for header row
                
                const qText = row.text || row.question;
                if (!qText || !String(qText).trim()) {
                  errors.push(`Row ${rowNum}: Question text is empty.`);
                }
                
                if (!row.subject_id || !String(row.subject_id).trim()) {
                  errors.push(`Row ${rowNum}: subject_id is empty.`);
                }
                
                const correct = (row.correct_answer || row.correct_option || "").trim().toUpperCase();
                if (!correct) {
                  errors.push(`Row ${rowNum}: correct_answer is empty.`);
                } else if (!["A", "B", "C", "D"].includes(correct)) {
                  errors.push(`Row ${rowNum}: correct_answer must be 'A', 'B', 'C', or 'D' (found '${correct}').`);
                }
                
                if (row.option_a === undefined || row.option_a === null || String(row.option_a).trim() === "") errors.push(`Row ${rowNum}: Option A is empty.`);
                if (row.option_b === undefined || row.option_b === null || String(row.option_b).trim() === "") errors.push(`Row ${rowNum}: Option B is empty.`);
                if (row.option_c === undefined || row.option_c === null || String(row.option_c).trim() === "") errors.push(`Row ${rowNum}: Option C is empty.`);
                if (row.option_d === undefined || row.option_d === null || String(row.option_d).trim() === "") errors.push(`Row ${rowNum}: Option D is empty.`);
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
    if (!file) return toast.error("Please select a CSV file first.");
    if (validationErrors.length > 0) {
      toast.error("Please resolve all CSV validation errors before uploading.");
      return;
    }
    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          const questionsToInsert = rows.map(row => {
            // Support both "question" and "text" headers
            const qText = row.text || row.question;
            if (!qText) throw new Error("Missing question text. CSV must have a 'text' or 'question' column.");
            if (!row.subject_id) throw new Error("Missing subject_id.");

            return {
              subject_id: row.subject_id,
              university_id: row.university_id || null,
              text: qText,
              option_a: row.option_a,
              option_b: row.option_b,
              option_c: row.option_c,
              option_d: row.option_d,
              correct_answer: (row.correct_answer || row.correct_option)?.toUpperCase(),
              explanation: row.explanation || null,
              year: row.year ? parseInt(row.year) : null,
              created_by: user?.id,
              is_published: true
            };
          });

          const { error } = await adminSupabase.from('questions').insert(questionsToInsert);
          
          if (error) {
            console.error("Batch insert error:", error);
            throw error;
          }
          
          // Log bulk upload action
          if (user?.id) {
            await supabase.from("admin_logs").insert({
              admin_id: user.id,
              action: "BULK_UPLOAD_QUESTIONS",
              target_type: "questions",
              details: {
                filename: file.name,
                count: questionsToInsert.length
              }
            });
          }

          toast.success(`Successfully uploaded ${questionsToInsert.length} questions!`);
          setFile(null);
          setPreview([]);
        } catch (error: any) {
          toast.error(`Upload failed: ${error.message}`);
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setLoading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const headers = "subject_id,university_id,text,option_a,option_b,option_c,option_d,correct_answer,explanation,year\n";
    const example = "uuid-of-subject,,What is 2+2?,3,4,5,6,B,Because math,2023";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'tonex_questions_template.csv');
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <UploadCloud size={20} className="text-[#2563EB]" /> Bulk Upload Questions
          </h2>
          <button onClick={downloadTemplate} className="text-[#60A5FA] hover:text-white text-sm font-semibold transition-colors">
            Download CSV Template
          </button>
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
                  {validationErrors.length > 30 && (
                    <div className="text-[#64748B] italic pt-1">...and {validationErrors.length - 30} more errors</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading || validationErrors.length > 0}
          className="mt-6 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#1E293B] disabled:text-[#64748B] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? "Uploading..." : "Import Database"}
        </button>
      </div>

      <div className="bg-[#1E293B]/50 border border-white/5 rounded-2xl p-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-white font-semibold mb-1">Important Note</h4>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Please ensure you use the exact UUIDs for <code className="text-[#60A5FA]">subject_id</code> and <code className="text-[#60A5FA]">university_id</code>. If the subject ID is incorrect, the upload will fail due to foreign key constraints. The <code className="text-[#60A5FA]">correct_answer</code> MUST be A, B, C, or D.
          </p>
        </div>
      </div>
    </div>
  );
}

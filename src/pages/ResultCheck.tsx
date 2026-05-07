import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamResult, SiteSettings } from '../types';
import { Search, Printer, AlertCircle, Share2, Copy, Twitter, Facebook, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';

const DEFAULT_SETTINGS: SiteSettings = {
  academyName: 'Velocygen Academy',
  subTitle: 'OF SECONDARY AND HIGHER SECONDARY EDUCATION',
  signatureUrl: 'https://velocygen.qzz.io/Signature.svg',
  logoUrl: 'https://velocygen.qzz.io/Velocygen.svg',
  viewCount: 0,
  countingEnabled: true
};

export default function ResultCheck() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoll = searchParams.get('roll') || '';
  
  const [rollNumber, setRollNumber] = useState(initialRoll);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let _settings = DEFAULT_SETTINGS;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'site');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           _settings = docSnap.data() as SiteSettings;
           setSettings(_settings);
        }
        
        // Always attempt increment view if counting enabled
        // Use a session storage flag to avoid double counting on re-renders
        if (!sessionStorage.getItem('viewCounted') && _settings.countingEnabled) {
           await updateDoc(docRef, { viewCount: _settings.viewCount + 1 });
           sessionStorage.setItem('viewCounted', 'true');
        }
      } catch (err) {
        console.error('Failed to update views/fetch settings:', err);
      }
    };
    fetchSettings();
    
    if (initialRoll) {
      handleSearchQuery(initialRoll);
    }
  }, []);

  const handleSearchQuery = async (roll: string) => {
    if (!roll.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);
    setSearchParams({ roll: roll.trim() });

    try {
      const q = query(
        collection(db, 'results'),
        where('rollNumber', '==', roll.trim()),
        where('published', '==', true),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No result found for this roll number.');
      } else {
        const doc = querySnapshot.docs[0];
        setResult({ id: doc.id, ...doc.data() } as ExamResult);
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while fetching the result. Please try again.');
      handleFirestoreError(err, OperationType.LIST, 'results');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchQuery(rollNumber);
  };

  const getRemark = (grade: string) => {
    switch(grade) {
      case 'A+': return 'Outstanding performance!';
      case 'A': return 'Excellent work!';
      case 'B+': return 'Very good!';
      case 'B': return 'Good job.';
      case 'C': return 'Satisfactory. Keep pushing.';
      case 'D': return 'Needs Improvement.';
      case 'F': return 'Fail. Please consult your teachers.';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 print:p-0 print:m-0">
      <div className="text-center mb-10 print:hidden">
        <h1 className="text-3xl font-heading font-bold text-gray-900 sm:text-4xl">Student Result Portal</h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          Enter your Roll Number to check your examination result.
        </p>
      </div>

      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10 print:hidden">
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Enter Roll Number / Registration ID"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Check'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="max-w-xl mx-auto rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex text-red-800 gap-3">
             <AlertCircle className="h-5 w-5 flex-shrink-0" />
             <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
           {/* Actions Header (hide in print) */}
           <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-end gap-3 print:hidden">
              <button onClick={() => setShowShareModal(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                 <Share2 className="h-4 w-4" /> Share
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                 <Printer className="h-4 w-4" /> Print Result
              </button>
           </div>
           
           {/* Marksheet Content - Print formatted */}
           <div className="bg-white m-0 sm:m-4 print:m-0 rounded-2xl print:rounded-none overflow-hidden relative">
              
              {/* Decorative top accent */}
              <div className="h-4 sm:h-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

              <div className="p-6 sm:p-10 print:p-8">
                 {/* Header */}
                 <div className="flex flex-col sm:flex-row justify-between items-center pb-8 mb-8 border-b border-gray-100">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                       <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                       <div>
                          <h1 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-gray-900">{settings.academyName}</h1>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">{settings.subTitle}</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-2">
                          {result.examName}
                       </div>
                       <p className="text-xs text-gray-400 font-mono">ID: {result.id.slice(0, 8).toUpperCase()}-{result.rollNumber}</p>
                    </div>
                 </div>

                 {/* Student Details Grid */}
                 <div className="mb-10 text-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Candidate Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                       <div>
                          <div className="grid grid-cols-3 gap-2">
                             <div className="col-span-1 text-gray-500 font-medium">Candidate Name</div>
                             <div className="col-span-2 font-semibold text-gray-900">{result.studentName}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                             <div className="col-span-1 text-gray-500 font-medium">Roll Number</div>
                             <div className="col-span-2 font-semibold text-gray-900">{result.rollNumber}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                             <div className="col-span-1 text-gray-500 font-medium">Class / Program</div>
                             <div className="col-span-2 font-semibold text-gray-900">{result.class}</div>
                          </div>
                       </div>
                       <div>
                          <div className="grid grid-cols-3 gap-2">
                             <div className="col-span-1 text-gray-500 font-medium">Father's Name</div>
                             <div className="col-span-2 font-semibold text-gray-900">{result.fatherName}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                             <div className="col-span-1 text-gray-500 font-medium">Mother's Name</div>
                             <div className="col-span-2 font-semibold text-gray-900">{result.mothersName || '-'}</div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Marks Table */}
                 <div className="mb-10 relative">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Academic Performance</h3>
                   <div className="overflow-hidden rounded-xl border border-gray-200">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                           <tr>
                              <th className="px-6 py-4 font-semibold text-gray-900 w-16">#</th>
                              <th className="px-6 py-4 font-semibold text-gray-900">Subject</th>
                              <th className="px-6 py-4 font-semibold text-gray-900 text-right">Max Marks</th>
                              <th className="px-6 py-4 font-semibold text-gray-900 text-right">Marks Obtained</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                           {result.subjects.map((sub, i) => (
                           <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                              <td className="px-6 py-4 font-medium text-gray-900">{sub.subjectName}</td>
                              <td className="px-6 py-4 text-gray-500 text-right">{sub.totalMarks}</td>
                              <td className="px-6 py-4 font-semibold text-gray-900 text-right">{sub.marksObtained}</td>
                           </tr>
                           ))}
                        </tbody>
                        <tbody className="bg-gray-50 border-t-2 border-gray-200">
                           <tr>
                              <td className="px-6 py-4 font-bold text-gray-900" colSpan={2}>
                                Overall Performance ({result.percentage.toFixed(2)}%)
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-right">{result.totalPossible}</td>
                              <td className="px-6 py-4 font-bold text-indigo-700 text-right text-lg">{result.totalObtained}</td>
                           </tr>
                        </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Result Summary & Footer */}
                 <div className="flex flex-col md:flex-row gap-8 justify-between items-end print:break-inside-avoid">
                    
                    {/* Left: Summary & QR */}
                    <div className="flex gap-6 items-center">
                       <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                          <QRCode value={`${window.location.origin}/?roll=${result.rollNumber}`} size={80} level="Q" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Final Result</p>
                          <div className="flex items-baseline gap-3">
                             <span className={`text-3xl font-black uppercase tracking-tight ${result.passStatus ? 'text-green-600' : 'text-red-600'} print:text-gray-900`}>
                                {result.passStatus ? 'PASSED' : 'FAILED'}
                             </span>
                             <span className="text-lg font-semibold text-gray-500">
                                Grade {result.grade}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Right: Signature & Barcode */}
                    <div className="flex flex-col items-end gap-6 text-right">
                       <div className="flex flex-col items-end">
                          <img src={settings.signatureUrl} alt="Signature" className="h-16 object-contain mix-blend-multiply opacity-80" />
                          <div className="w-48 border-t border-gray-300 mt-2 pt-2">
                             <p className="font-semibold text-sm text-gray-900">Authorized Signatory</p>
                             <p className="text-xs text-gray-500">{settings.academyName} Academic Board</p>
                             {result.place && <p className="text-xs text-gray-400 mt-1">Place: {result.place}</p>}
                             <p className="text-xs text-gray-400 mt-1">Date: {new Date(result.published ? result.updatedAt : result.createdAt).toLocaleDateString('en-GB')}</p>
                          </div>
                       </div>
                       
                       <div className="pt-2">
                          <Barcode value={result.rollNumber} height={30} width={1.2} fontSize={10} margin={0} background="transparent" lineColor="#9ca3af" />
                       </div>
                    </div>

                 </div>

              </div>
           </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">Share Result</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Share {result.studentName}'s result for {result.examName}.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const text = `Check out ${result.studentName}'s result for ${result.examName}: ${result.percentage}% (${result.grade})!`;
                    const url = `${window.location.origin}/?roll=${encodeURIComponent(result.rollNumber)}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#1DA1F2] hover:bg-[#1a91da] text-white rounded-lg font-medium transition-colors"
                >
                  <Twitter className="h-5 w-5 fill-current" />
                  Share on Twitter
                </button>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/?roll=${encodeURIComponent(result.rollNumber)}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg font-medium transition-colors"
                >
                  <Facebook className="h-5 w-5 fill-current" />
                  Share on Facebook
                </button>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                   <button 
                     onClick={() => {
                        const url = `${window.location.origin}/?roll=${encodeURIComponent(result.rollNumber)}`;
                        navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                     }}
                     className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                   >
                     {copied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                     {copied ? 'Link Copied!' : 'Copy Link'}
                   </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-end px-6 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

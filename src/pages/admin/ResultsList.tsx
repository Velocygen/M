import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { ExamResult } from '../../types';
import { Link } from 'react-router-dom';
import { Search, Edit2, Trash2, Eye, EyeOff, PlusCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

export default function ResultsList() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [publishFilter, setPublishFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const uniqueExams = Array.from(new Set(results.map(r => r.examName)));

  const fetchResults = async () => {
    try {
      const q = query(collection(db, 'results'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: ExamResult[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as ExamResult);
      });
      setResults(data);
      setFilteredResults(data);
    } catch (error) {
       console.error("Error fetching results", error);
       handleFirestoreError(error, OperationType.LIST, 'results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredResults(results.filter(r => {
      const matchSearch = r.studentName.toLowerCase().includes(term) || r.rollNumber.toLowerCase().includes(term);
      const matchPublish = publishFilter === 'all' || (publishFilter === 'published' && r.published) || (publishFilter === 'draft' && !r.published);
      const matchExam = examFilter === 'all' || r.examName === examFilter;
      return matchSearch && matchPublish && matchExam;
    }));
  }, [searchTerm, publishFilter, examFilter, results]);

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the result for ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'results', id)).catch(e => handleFirestoreError(e, OperationType.DELETE, 'results/' + id));
        setResults(results.filter(r => r.id !== id));
        Swal.fire('Deleted!', 'Result has been deleted.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to delete the result.', 'error');
      }
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean, name: string) => {
    const result = await Swal.fire({
       title: currentStatus ? 'Unpublish Result?' : 'Publish Result?',
       text: `Result for ${name} will be ${currentStatus ? 'hidden from' : 'visible to'} public.`,
       icon: 'question',
       showCancelButton: true,
       confirmButtonColor: currentStatus ? '#f59e0b' : '#10b981',
       cancelButtonColor: '#6b7280',
       confirmButtonText: currentStatus ? 'Unpublish' : 'Publish'
    });

    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'results', id), {
          published: !currentStatus,
          updatedAt: Date.now()
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'results/' + id));
        setResults(results.map(r => r.id === id ? { ...r, published: !currentStatus } : r));
        Swal.fire('Success', `Result ${currentStatus ? 'unpublished' : 'published'} successfully`, 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to update publish status.', 'error');
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const newSelect = new Set(selectedIds);
    if (newSelect.has(id)) {
      newSelect.delete(id);
    } else {
      newSelect.add(id);
    }
    setSelectedIds(newSelect);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${selectedIds.size} results? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all!'
    });

    if (result.isConfirmed) {
      setIsBulkLoading(true);
      try {
        const promises = Array.from(selectedIds as Set<string>).map((id: string) => deleteDoc(doc(db, 'results', id)));
        await Promise.all(promises);
        setResults(results.filter(r => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
        Swal.fire('Deleted!', `${selectedIds.size} results have been deleted.`, 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to delete some results.', 'error');
      } finally {
        setIsBulkLoading(false);
      }
    }
  };

  const handleBulkTogglePublish = async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    const result = await Swal.fire({
      title: publish ? 'Publish Selected?' : 'Unpublish Selected?',
      text: `${selectedIds.size} results will be ${publish ? 'visible to' : 'hidden from'} public.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: publish ? '#10b981' : '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: publish ? 'Publish All' : 'Unpublish All'
    });

    if (result.isConfirmed) {
      setIsBulkLoading(true);
      try {
        const promises = Array.from(selectedIds as Set<string>).map((id: string) => updateDoc(doc(db, 'results', id), {
          published: publish,
          updatedAt: Date.now()
        }));
        await Promise.all(promises);
        setResults(results.map(r => selectedIds.has(r.id) ? { ...r, published: publish } : r));
        setSelectedIds(new Set());
        Swal.fire('Success', `${selectedIds.size} results ${publish ? 'published' : 'unpublished'} successfully`, 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to update publish status for some results.', 'error');
      } finally {
        setIsBulkLoading(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Manage Results</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">A list of all examination results currently in the system.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/admin/results/add"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Result
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="w-full sm:max-w-md relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                 </div>
                 <input
                   type="text"
                   placeholder="Search by student name or roll no..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm dark:bg-gray-800 dark:text-white"
                 />
              </div>
              <div className="w-full sm:w-auto flex gap-4">
                 <select
                   value={examFilter}
                   onChange={(e) => setExamFilter(e.target.value)}
                   className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                 >
                    <option value="all">All Exams</option>
                    {uniqueExams.map((exam, i) => (
                       <option key={i} value={exam}>{exam}</option>
                    ))}
                 </select>
                 <select
                   value={publishFilter}
                   onChange={(e) => setPublishFilter(e.target.value)}
                   className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                 >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                 </select>
              </div>
           </div>
           
           {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                 <span className="text-sm text-gray-500 dark:text-gray-400 mr-2 whitespace-nowrap">{selectedIds.size} selected</span>
                 <button onClick={() => handleBulkTogglePublish(true)} disabled={isBulkLoading} className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 dark:bg-green-900/40 dark:hover:bg-green-800/60 transition-colors" title="Publish Selected">
                    <Eye className="h-4 w-4" />
                 </button>
                 <button onClick={() => handleBulkTogglePublish(false)} disabled={isBulkLoading} className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 transition-colors" title="Unpublish Selected">
                    <EyeOff className="h-4 w-4" />
                 </button>
                 <button onClick={handleBulkDelete} disabled={isBulkLoading} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800/60 transition-colors" title="Delete Selected">
                    <Trash2 className="h-4 w-4" />
                 </button>
              </div>
           )}
        </div>

        {loading || isBulkLoading ? (
           <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading results...</div>
        ) : (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                   <tr>
                      <th className="px-6 py-3 text-left w-12">
                         <input 
                           type="checkbox" 
                           checked={filteredResults.length > 0 && selectedIds.size === filteredResults.length}
                           onChange={handleSelectAll}
                           className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white"
                         />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roll No & Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class & Exam</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                   </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                   {filteredResults.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                         <td className="px-6 py-4 whitespace-nowrap">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(result.id)}
                              onChange={() => toggleSelect(result.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white"
                            />
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{result.rollNumber}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{result.studentName}</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{result.class}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{result.examName}</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{result.percentage.toFixed(2)}%</div>
                            <div className={`text-xs font-semibold ${result.passStatus ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{result.grade} - {result.passStatus ? 'PASS' : 'FAIL'}</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${result.published ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                               {result.published ? 'Published' : 'Draft'}
                            </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2 text-gray-400">
                               <button 
                                 onClick={() => togglePublish(result.id, result.published, result.studentName)}
                                 className="p-1 hover:text-primary-600 transition-colors tooltip"
                                 title={result.published ? "Unpublish" : "Publish"}
                               >
                                  {result.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                               </button>
                               <Link
                                 to={`/admin/results/edit/${result.id}`}
                                 className="p-1 hover:text-blue-600 transition-colors"
                                 title="Edit"
                               >
                                  <Edit2 className="h-4 w-4" />
                               </Link>
                               <button
                                 onClick={() => handleDelete(result.id, result.studentName)}
                                 className="p-1 hover:text-red-600 transition-colors"
                                 title="Delete"
                               >
                                  <Trash2 className="h-4 w-4" />
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                   {filteredResults.length === 0 && (
                      <tr>
                         <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                            {searchTerm ? 'No results found matching your search.' : 'No results found. Add your first result!'}
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ExamResult, Subject } from '../../types';
import { Trash2, PlusCircle, Save, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

const defaultSubject: Subject = { subjectName: '', marksObtained: 0, totalMarks: 100 };

export default function ResultForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mothersName, setMothersName] = useState('');
  const [place, setPlace] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [examName, setExamName] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([{...defaultSubject}, {...defaultSubject}, {...defaultSubject}]);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const fetchResult = async () => {
        try {
          const docRef = doc(db, 'results', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as ExamResult;
            setStudentName(data.studentName);
            setFatherName(data.fatherName);
            setMothersName(data.mothersName || '');
            setPlace(data.place || '');
            setRollNumber(data.rollNumber);
            setStudentClass(data.class);
            setExamName(data.examName);
            setSubjects(data.subjects);
            setPublished(data.published);
          } else {
             Swal.fire('Error', 'Result not found.', 'error');
             navigate('/admin/results');
          }
        } catch (error) {
           console.error(error);
           handleFirestoreError(error, OperationType.GET, 'results/' + id);
        } finally {
          setLoading(false);
        }
      };
      fetchResult();
    } else {
      // Fetch location via IP for new results
      const fetchLocation = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data.city) {
            setPlace(`${data.city}, ${data.country_name}`);
          }
        } catch (error) {
          console.error("Failed to fetch location", error);
        }
      };
      fetchLocation();
    }
  }, [id, isEdit, navigate]);

  const handleAddSubject = () => {
    setSubjects([...subjects, { ...defaultSubject }]);
  };

  const handleRemoveSubject = (index: number) => {
    if (subjects.length <= 3) {
      Swal.fire('Warning', 'Minimum 3 subjects are required.', 'warning');
      return;
    }
    const newSubjects = [...subjects];
    newSubjects.splice(index, 1);
    setSubjects(newSubjects);
  };

  const handleSubjectChange = (index: number, field: keyof Subject, value: string | number) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const validateForm = () => {
    if (!studentName || !fatherName || !mothersName || !rollNumber || !studentClass || !examName) {
      Swal.fire('Validation Error', 'Please fill all basic details.', 'error');
      return false;
    }
    
    for (let i = 0; i < subjects.length; i++) {
        const sub = subjects[i];
        if (!sub.subjectName.trim()) {
            Swal.fire('Validation Error', `Subject name at row ${i+1} cannot be empty.`, 'error');
            return false;
        }
        if (sub.totalMarks <= 0) {
            Swal.fire('Validation Error', `Total marks at row ${i+1} must be > 0.`, 'error');
            return false;
        }
        if (sub.marksObtained < 0 || sub.marksObtained > sub.totalMarks) {
            Swal.fire('Validation Error', `Invalid marks obtained at row ${i+1}. Must be between 0 and ${sub.totalMarks}.`, 'error');
            return false;
        }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // API call to our node express server for robust calculation
      const response = await fetch('/api/calculateAndValidateResult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjects })
      });
      
      if (!response.ok) throw new Error("Calculation failed server-side");
      const computedData = await response.json();

      const docId = isEdit ? id : doc(collection(db, 'temp')).id; // Generate random Id if not edit
      
      const resultData = {
        studentName,
        fatherName,
        mothersName,
        place,
        rollNumber,
        class: studentClass,
        examName,
        subjects: subjects.map(s => ({
           subjectName: s.subjectName,
           marksObtained: Number(s.marksObtained),
           totalMarks: Number(s.totalMarks)
        })),
        totalObtained: computedData.totalObtained,
        totalPossible: computedData.totalPossible,
        percentage: computedData.percentage,
        grade: computedData.grade,
        passStatus: computedData.passStatus,
        published,
        updatedAt: Date.now()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'results', id!), resultData).catch(e => handleFirestoreError(e, OperationType.UPDATE, 'results/' + id));
        Swal.fire('Success', 'Result updated successfully', 'success');
      } else {
        await setDoc(doc(db, 'results', docId), {
           ...resultData,
           createdAt: Date.now() // Only set on create
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'results/' + docId));
        Swal.fire('Success', 'Result created successfully', 'success');
      }
      
      navigate('/admin/results');
    } catch (error: any) {
      console.error(error);
      Swal.fire('Error', error.message || 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
         <Link to="/admin/results" className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
         </Link>
         <div>
            <h1 className="text-2xl font-bold font-heading text-gray-900">
               {isEdit ? 'Edit Result' : 'Add New Result'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Fill in the student info and marks carefully.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
         <div className="p-6 sm:p-8 space-y-6">
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Student Name *</label>
                      <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Father's Name *</label>
                      <input type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Mother's Name *</label>
                      <input type="text" value={mothersName} onChange={e => setMothersName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Creation Place (Auto-detected)</label>
                      <input type="text" value={place} onChange={e => setPlace(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="e.g. Mumbai, India" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Roll Number *</label>
                      <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Class *</label>
                      <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="e.g. 10th Science" />
                   </div>
                   <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Exam Name *</label>
                      <input type="text" value={examName} onChange={e => setExamName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="e.g. Mid-Term Examination 2026" />
                   </div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Subjects & Marks</h3>
                </div>
                
                <div className="space-y-4">
                   {subjects.map((subject, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-md border border-gray-200 shadow-sm relative">
                         <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-gray-500 sm:hidden mb-1">Subject Name</label>
                            <input type="text" placeholder="Subject Name" value={subject.subjectName} onChange={e => handleSubjectChange(index, 'subjectName', e.target.value)} required className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                         </div>
                         <div className="w-full sm:w-32">
                           <label className="block text-xs font-medium text-gray-500 sm:hidden mb-1">Total Marks</label>
                            <input type="number" placeholder="Total" value={subject.totalMarks} onChange={e => handleSubjectChange(index, 'totalMarks', Number(e.target.value))} required min="1" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                         </div>
                         <div className="w-full sm:w-32">
                            <label className="block text-xs font-medium text-gray-500 sm:hidden mb-1">Marks Obtained</label>
                            <input type="number" placeholder="Obtained" value={subject.marksObtained} onChange={e => handleSubjectChange(index, 'marksObtained', Number(e.target.value))} required min="0" max={subject.totalMarks} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                         </div>
                         <div className="absolute top-2 right-2 sm:static sm:w-auto">
                            <button type="button" onClick={() => handleRemoveSubject(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors tooltip" title="Remove Subject">
                               <Trash2 className="h-5 w-5" />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="mt-4">
                   <button type="button" onClick={handleAddSubject} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <PlusCircle className="mr-2 h-4 w-4 text-gray-500" />
                      Add Subject
                   </button>
                </div>
            </div>

            <div className="flex items-center">
                <input
                  id="published"
                  name="published"
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 focus:ring-primary-500 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-900 font-medium">
                  Publish Result immediately? <span className="font-normal text-gray-500">(It will be visible publicly)</span>
                </label>
            </div>

         </div>
         
         <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
            <Link to="/admin/results" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
               Cancel
            </Link>
            <button type="submit" disabled={submitting} className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
               <Save className="mr-2 h-4 w-4" />
               {submitting ? 'Saving...' : 'Save Result'}
            </button>
         </div>
      </form>

    </div>
  );
}

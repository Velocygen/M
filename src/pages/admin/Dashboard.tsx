import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { Users, FileCheck, Award, Clock, ArrowRight, Download } from 'lucide-react';
import { ExamResult } from '../../types';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444', '#64748b'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    topStudent: null as ExamResult | null,
  });
  const [recentResults, setRecentResults] = useState<ExamResult[]>([]);
  const [gradeData, setGradeData] = useState<{name: string, value: number}[]>([]);
  const [timelineData, setTimelineData] = useState<{month: string, Pass: number, Fail: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const resultsRef = collection(db, 'results');
        const [allSnap, publishedSnap, recentSnap] = await Promise.all([
          getDocs(resultsRef),
          getDocs(query(resultsRef, where('published', '==', true))),
          getDocs(query(resultsRef, orderBy('createdAt', 'desc'), limit(5)))
        ]);

        let topStudent: ExamResult | null = null;
        const recent: ExamResult[] = [];
        
        const gradesCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
        const timelineCounts: Record<string, { Pass: number, Fail: number }> = {};
        
        allSnap.forEach(doc => {
          const data = doc.data() as ExamResult;
          if (!topStudent || data.percentage > topStudent.percentage) {
            topStudent = { id: doc.id, ...data };
          }
        });

        publishedSnap.forEach(doc => {
          const data = doc.data() as ExamResult;
          
          if (gradesCounts[data.grade] !== undefined) {
             gradesCounts[data.grade]++;
          }

          // Compute timeline (Month-Year)
          const date = new Date(data.createdAt);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!timelineCounts[monthYear]) {
            timelineCounts[monthYear] = { Pass: 0, Fail: 0 };
          }
          if (data.passStatus) {
            timelineCounts[monthYear].Pass++;
          } else {
            timelineCounts[monthYear].Fail++;
          }
        });

        recentSnap.forEach(doc => {
          recent.push({ id: doc.id, ...doc.data() } as ExamResult);
        });

        const formattedGradeData = Object.keys(gradesCounts).map(k => ({ name: k, value: gradesCounts[k] })).filter(d => d.value > 0);
        
        const formattedTimelineData = Object.keys(timelineCounts).map(k => ({
          month: k,
          Pass: timelineCounts[k].Pass,
          Fail: timelineCounts[k].Fail
        }));

        setStats({
          total: allSnap.size,
          published: publishedSnap.size,
          topStudent,
        });
        setRecentResults(recent);
        setGradeData(formattedGradeData);
        setTimelineData(formattedTimelineData);
      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        handleFirestoreError(error, OperationType.LIST, 'results');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleExportCSV = async () => {
     try {
       const response = await fetch('/api/exportResultsToCSV');
       if (!response.ok) throw new Error('Export failed');
       
       const blob = await response.blob();
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = 'results.csv';
       document.body.appendChild(a);
       a.click();
       window.URL.revokeObjectURL(url);
     } catch (error) {
       console.error("Error exporting CSV:", error);
       alert("Failed to export data.");
     }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of the examination results</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <Link 
            to="/admin/results/add"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Add New Result
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Results</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileCheck className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Published Results</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.published}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Latest Addition</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1 truncate">
                    {recentResults.length > 0 ? recentResults[0].studentName : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Top Performer</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1 truncate">
                    {stats.topStudent ? `${stats.topStudent.studentName} (${stats.topStudent.percentage.toFixed(1)}%)` : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-medium font-heading text-gray-900 dark:text-white mb-6">Grade Distribution</h3>
          <div className="h-64">
            {gradeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {gradeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-medium font-heading text-gray-900 dark:text-white mb-6">Pass/Fail Over Time</h3>
          <div className="h-64">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="Pass" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Fail" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium font-heading text-gray-900">Recent Results</h3>
          <Link to="/admin/results" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentResults.map((result) => (
                <tr key={result.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                        <div className="text-sm text-gray-500">Roll No: {result.rollNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{result.examName}</div>
                    <div className="text-sm text-gray-500">Class: {result.class}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{result.percentage.toFixed(2)}%</div>
                    <div className="text-sm text-gray-500">Grade: {result.grade}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      result.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentResults.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No results found. Start by adding a new result.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

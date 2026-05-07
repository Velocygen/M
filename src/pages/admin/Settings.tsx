import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { SiteSettings } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import Swal from 'sweetalert2';
import { Settings as SettingsIcon, Save, RefreshCw, EyeOff, Eye } from 'lucide-react';

const DEFAULT_SETTINGS: SiteSettings = {
  academyName: 'Velocygen Academy',
  subTitle: 'OF SECONDARY AND HIGHER SECONDARY EDUCATION',
  signatureUrl: 'https://velocygen.qzz.io/Signature.svg',
  logoUrl: 'https://velocygen.qzz.io/Velocygen.svg',
  viewCount: 0,
  countingEnabled: true
};

export default function Settings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
       try {
         const docRef = doc(db, 'settings', 'site');
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
           setSettings(docSnap.data() as SiteSettings);
         } else {
           // Create default
           await setDoc(docRef, DEFAULT_SETTINGS);
           setSettings(DEFAULT_SETTINGS);
         }
       } catch (error) {
         handleFirestoreError(error, OperationType.GET, 'settings');
       } finally {
         setLoading(false);
       }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'site');
      await setDoc(docRef, settings, { merge: true });
      Swal.fire('Saved!', 'Settings have been updated.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will reset the total website view count to zero.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, reset it!'
    });

    if (result.isConfirmed) {
      try {
        const docRef = doc(db, 'settings', 'site');
        await updateDoc(docRef, { viewCount: 0 });
        setSettings(prev => ({ ...prev, viewCount: 0 }));
        Swal.fire('Reset!', 'The view count has been reset.', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings');
      }
    }
  };

  const handleToggleCounting = async () => {
     try {
       const docRef = doc(db, 'settings', 'site');
       const newValue = !settings.countingEnabled;
       await updateDoc(docRef, { countingEnabled: newValue });
       setSettings(prev => ({ ...prev, countingEnabled: newValue }));
       Swal.fire('Updated!', `View counting is now ${newValue ? 'Enabled' : 'Disabled'}.`, 'success');
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'settings');
     }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Site Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Academy Information</h2>
                  <p className="mt-1 text-sm text-gray-500">Update the name and branding that appears on the student results.</p>
               </div>
               <div className="p-6">
                  <form onSubmit={handleSave} className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Academy Name</label>
                        <input type="text" required value={settings.academyName} onChange={e => setSettings(p => ({...p, academyName: e.target.value}))} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle (e.g. Board of Education)</label>
                        <input type="text" required value={settings.subTitle} onChange={e => setSettings(p => ({...p, subTitle: e.target.value}))} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo Image URL</label>
                        <input type="url" required value={settings.logoUrl} onChange={e => setSettings(p => ({...p, logoUrl: e.target.value}))} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Signature Image URL</label>
                        <input type="url" required value={settings.signatureUrl} onChange={e => setSettings(p => ({...p, signatureUrl: e.target.value}))} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white" />
                     </div>
                     <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
                           <Save className="h-4 w-4 mr-2" />
                           {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Website Analytics</h2>
               </div>
               <div className="p-6">
                  <div className="text-center mb-6">
                     <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Total Page Views</span>
                     <span className="text-5xl font-black text-gray-900 dark:text-white">{settings.viewCount.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                     <button onClick={handleToggleCounting} className={`w-full inline-flex justify-center items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md ${settings.countingEnabled ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' : 'border-transparent text-white bg-green-600 hover:bg-green-700'}`}>
                        {settings.countingEnabled ? (
                          <><EyeOff className="h-4 w-4 mr-2" /> Disable Counting</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-2" /> Enable Counting</>
                        )}
                     </button>
                     <button onClick={handleResetCounter} className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Counter
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

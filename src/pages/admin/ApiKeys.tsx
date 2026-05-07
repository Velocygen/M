import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ApiKey } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import Swal from 'sweetalert2';
import { Key, Plus, Trash2, PauseCircle, PlayCircle, Copy } from 'lucide-react';

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    try {
      const q = query(collection(db, 'apiKeys'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKey));
      setKeys(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'apiKeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'vk_'; // velocygen key prefix
    for (let i = 0; i < 32; i++) {
       key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreate = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Generate New API Key',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Key Name (e.g. Website Integration)">' +
        '<input id="swal-input2" class="swal2-input" type="number" placeholder="Request Limit (0 = Unlimited)">',
      focusConfirm: false,
      preConfirm: () => {
         const nameInput = document.getElementById('swal-input1') as HTMLInputElement;
         const limitInput = document.getElementById('swal-input2') as HTMLInputElement;
         const name = nameInput.value;
         const limitStr = limitInput.value;
         if (!name) {
           Swal.showValidationMessage('Name is required');
         }
         return { name, limit: parseInt(limitStr) || 0 };
      }
    });

    if (formValues) {
      const newKeyStr = generateKey();
      const newKey: Omit<ApiKey, 'id'> = {
         key: newKeyStr,
         name: formValues.name,
         limit: formValues.limit,
         used: 0,
         disabled: false,
         expiresAt: null,
         createdAt: Date.now()
      };

      try {
         const docRef = doc(collection(db, 'apiKeys'));
         await setDoc(docRef, newKey);
         
         Swal.fire({
            title: 'API Key Created!',
            text: 'Please copy this key now. You will not be able to see the full key again for security.',
            input: 'text',
            inputValue: newKeyStr,
            icon: 'success',
            allowOutsideClick: false,
         });

         fetchKeys();
      } catch (error) {
         handleFirestoreError(error, OperationType.CREATE, 'apiKeys');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
       title: 'Delete API Key?',
       text: 'Any integrations using this key will immediately fail.',
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#d33',
       confirmButtonText: 'Yes, delete it!'
    });

    if (res.isConfirmed) {
       try {
         await deleteDoc(doc(db, 'apiKeys', id));
         setKeys(keys.filter(k => k.id !== id));
         Swal.fire('Deleted!', 'The API Key has been removed.', 'success');
       } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, 'apiKeys/' + id);
       }
    }
  };

  const handleToggleState = async (key: ApiKey) => {
    try {
       await updateDoc(doc(db, 'apiKeys', key.id), { disabled: !key.disabled });
       setKeys(keys.map(k => k.id === key.id ? { ...k, disabled: !k.disabled } : k));
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'apiKeys/' + key.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied to clipboard', showConfirmButton: false, timer: 1500 });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading API Keys...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-3">
          <Key className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Keys</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage keys for integrating Velocygen with external platforms.</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button onClick={handleCreate} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
             <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                   <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Name</th>
                   <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Prefix</th>
                   <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage</th>
                   <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {keys.map(key => (
                   <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {key.name}
                        <div className="text-xs text-gray-500">Created: {new Date(key.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono flex items-center gap-2">
                        {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                        <button onClick={() => copyToClipboard(key.key)} className="text-gray-400 hover:text-gray-600"><Copy className="h-4 w-4" /></button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.used} / {key.limit === 0 ? 'Unlimited' : key.limit}
                        {key.limit > 0 && key.used >= key.limit && <span className="ml-2 text-xs text-red-500 font-bold uppercase">Exceeded</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${key.disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                           {key.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                        <button onClick={() => handleToggleState(key)} className={`${key.disabled ? 'text-green-600 hover:text-green-900' : 'text-amber-600 hover:text-amber-900'}`} title={key.disabled ? "Enable Key" : "Disable Key"}>
                           {key.disabled ? <PlayCircle className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
                        </button>
                        <button onClick={() => handleDelete(key.id)} className="text-red-600 hover:text-red-900" title="Delete Key">
                           <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                   </tr>
                ))}
                {keys.length === 0 && (
                   <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                        No API Keys generated yet. Create one to allow external integrations.
                      </td>
                   </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30">
         <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">API Documentation</h3>
         <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">You can use your API key to fetch results (including draft/unpublished results) programmatically.</p>
         <div className="bg-gray-900 rounded-md p-4 overflow-x-auto text-sm text-gray-300 font-mono">
            <p><span className="text-pink-400">GET</span> {window.location.origin}/api/v1/results/:rollNumber</p>
            <p className="mt-2 text-gray-500">Headers:</p>
            <p>X-API-Key: vk_example_key_here</p>
         </div>
      </div>
    </div>
  );
}

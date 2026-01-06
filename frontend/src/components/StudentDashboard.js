import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, Clock, XCircle, FileText, LogOut } from 'lucide-react';
import StaffDashboard from './StaffDashboard';

const API_URL = 'http://localhost:5000/api';

const StudentDashboard = ({ user, onLogout }) => {
  const [clearance, setClearance] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [fileType, setFileType] = useState('Fees');

  useEffect(() => {
    // set auth header from stored token if present
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clearanceRes, docsRes] = await Promise.all([
        axios.get(`${API_URL}/clearances/my-clearance`),
        axios.get(`${API_URL}/documents/my-documents`)
      ]);
      setClearance(clearanceRes.data);
      setDocuments(docsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('fileType', fileType);

    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Document uploaded successfully!');
      setUploadFile(null);
      fetchData();
    } catch (error) {
      alert('Error uploading document');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If a staff/admin visits this route, render the staff dashboard
  if (user?.role && user.role !== 'student') {
    return <StaffDashboard user={user} onLogout={onLogout} />;
  }

  const departments = ['library', 'hostel', 'accounts', 'lab', 'department', 'placement'];
  const approvedCount = departments.filter(dept => 
    clearance?.departments?.[dept]?.status === 'approved'
  ).length;
  const progress = (approvedCount / departments.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">No Due System</h1>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome, {user.name}</h2>
          <p className="text-blue-100">{user.rollNo} • {user.course}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Clearance Progress</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span className="font-semibold">{approvedCount}/{departments.length} Approved</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Department Clearances</h3>
          <div className="space-y-3">
            {departments.map(dept => {
              const status = clearance?.departments?.[dept];
              return (
                <div key={dept} className={`border rounded-lg p-4 ${getStatusColor(status?.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status?.status)}
                      <div>
                        <p className="font-semibold capitalize">{dept}</p>
                        {status?.comment && (
                          <p className="text-sm mt-1">{status.comment}</p>
                        )}
                        {status?.approvedBy && (
                          <p className="text-xs mt-1">By {status.approvedBy} on {new Date(status.approvedDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium capitalize">{status?.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Document Type</label>
              <select 
                value={fileType} 
                onChange={(e) => setFileType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="Fees">Fee Receipt</option>
                <option value="Notes">Notes</option>
                <option value="Assignment">Assignment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Choose File</label>
              <input 
                type="file" 
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Upload Document
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <h4 className="font-semibold mb-2">Uploaded Documents</h4>
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center gap-3 p-3 border rounded-lg">
                <FileText className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">{doc.fileName}</p>
                  <p className="text-sm text-gray-500">{doc.fileType} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const StaffDashboard = ({ user, onLogout }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error('Error fetching students', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const viewClearance = async (student) => {
    try {
      const res = await axios.get(`${API_URL}/clearances/${student._id}`);
      setSelectedStudent({ ...student, clearance: res.data });
    } catch (err) {
      alert('Error fetching clearance');
    }
  };

  const updateDepartmentStatus = async (studentId, dept, status) => {
    try {
      await axios.post(`${API_URL}/clearances/${studentId}/departments/${dept}`, { status });
      alert('Updated successfully');
      // refresh
      if (selectedStudent && selectedStudent._id === studentId) {
        viewClearance(selectedStudent);
      }
      fetchStudents();
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">Staff Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm mr-4">{user.name} ({user.role})</div>
              <button onClick={onLogout} className="px-3 py-2 bg-red-500 text-white rounded">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Students</h3>
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{s.name} • {s.rollNo}</p>
                  <p className="text-sm text-gray-500">{s.course} • {s.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => viewClearance(s)} className="px-3 py-1 bg-blue-600 text-white rounded">View Clearances</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedStudent && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Clearances for {selectedStudent.name}</h3>
            <div className="space-y-3">
              {Object.entries(selectedStudent.clearance?.departments || {}).map(([dept, info]) => (
                <div key={dept} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold capitalize">{dept}</p>
                    <p className="text-sm">Status: {info.status}</p>
                    {info.comment && <p className="text-sm text-gray-500">{info.comment}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateDepartmentStatus(selectedStudent._id, dept, 'approved')} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => updateDepartmentStatus(selectedStudent._id, dept, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;

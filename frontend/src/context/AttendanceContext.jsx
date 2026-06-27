import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAttendance = () => useContext(AttendanceContext);

export const AttendanceProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // Date and Session State
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayDateString());
  const [session, setSession] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : 'Afternoon';
  });

  // Current session marking grid: { [studentId]: 'Present' | 'Absent' }
  const [attendanceGrid, setAttendanceGrid] = useState({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Toast helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch all students (supports search and filter if needed)
  const fetchStudents = async (search = '', section = '') => {
    setLoading(true);
    try {
      let url = `${API_URL}/students?limit=200`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (section) url += `&section=${encodeURIComponent(section)}`;
      
      const response = await axios.get(url);
      if (response.data.success) {
        setStudents(response.data.data);
        
        // Initialize attendance grid with Present by default
        const initialGrid = {};
        response.data.data.forEach((s) => {
          initialGrid[s._id] = 'Present';
        });
        setAttendanceGrid(initialGrid);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for a specific date and session
  const fetchAttendanceForSession = async (searchDate, searchSession) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/attendance/date/${searchDate}/session/${searchSession}`
      );
      return response.data.success ? response.data.data : [];
    } catch (error) {
      showToast('Failed to load history data', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Save current attendance session
  const saveAttendance = async (overwrite = false) => {
    setLoading(true);
    try {
      const records = Object.entries(attendanceGrid).map(([studentId, status]) => ({
        studentId,
        status
      }));

      if (records.length === 0) {
        showToast('No students loaded to mark attendance.', 'error');
        return { success: false };
      }

      const response = await axios.post(`${API_URL}/attendance`, {
        date,
        session,
        records,
        overwrite
      });

      if (response.data.success) {
        showToast(response.data.message || 'Attendance saved successfully!', 'success');
        setSavedSuccess(true);
        return { success: true };
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        // Requires overwrite confirmation
        return { 
          success: false, 
          conflict: true, 
          message: error.response.data.message 
        };
      }
      showToast(error.response?.data?.message || 'Failed to save attendance', 'error');
    } finally {
      setLoading(false);
    }
    return { success: false };
  };

  // Trigger Excel File Download with Authorization
  const downloadExcel = async (status, customDate, customSession) => {
    const targetDate = customDate || date;
    const targetSession = customSession || session;
    const endpoint = `${API_URL}/attendance/export/${status.toLowerCase()}?date=${targetDate}&session=${targetSession}`;
    
    showToast(`Downloading ${status} list Excel...`, 'success');
    try {
      const response = await axios.get(endpoint, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Attendance_${status}_${targetDate}_${targetSession}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download Excel file:', error);
      showToast('Failed to download Excel file.', 'error');
    }
  };

  // Upload student PDF
  const uploadStudentPDF = async (file) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post(`${API_URL}/students/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        showToast(response.data.message, 'success');
        await fetchStudents();
        return true;
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to process student PDF', 'error');
      return false;
    } finally {
      setLoading(false);
    }
    return false;
  };

  // Edit single student
  const editStudent = async (id, updatedData) => {
    try {
      const response = await axios.put(`${API_URL}/students/${id}`, updatedData);
      if (response.data.success) {
        showToast('Student details updated successfully.', 'success');
        setStudents((prev) =>
          prev.map((s) => (s._id === id ? { ...s, ...response.data.data } : s))
        );
        return true;
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update student', 'error');
    }
    return false;
  };

  // Delete student
  const deleteStudent = async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/students/${id}`);
      if (response.data.success) {
        showToast('Student deleted successfully.', 'success');
        setStudents((prev) => prev.filter((s) => s._id !== id));
        return true;
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete student', 'error');
    }
    return false;
  };

  // Load students when user is authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [isAuthenticated, token]);

  return (
    <AttendanceContext.Provider
      value={{
        students,
        setStudents,
        loading,
        setLoading,
        toasts,
        showToast,
        date,
        setDate,
        session,
        setSession,
        attendanceGrid,
        setAttendanceGrid,
        savedSuccess,
        setSavedSuccess,
        fetchStudents,
        fetchAttendanceForSession,
        saveAttendance,
        downloadExcel,
        uploadStudentPDF,
        editStudent,
        deleteStudent
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

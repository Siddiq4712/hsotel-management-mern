import React, { useState } from 'react';
import { Button, Upload, message, Modal, Table } from 'antd';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { wardenAPI } from '../../services/api';

const BulkImportButton = ({ sessionId, onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file) => {
    if (!sessionId) {
      message.error("Please select an Academic Session first!");
      return false;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel Columns to Database Fields
      const formattedData = json.map(row => ({
        userName: row['Name'] || row['name'],
        userMail: row['Email'] || row['email'],
        roll_number: String(row['Roll Number'] || row['roll_no']),
        college: row['College'] || 'nec',
        requires_bed: String(row['Hosteller']).toLowerCase() === 'yes'
      }));

      if (formattedData.length === 0) {
        message.error("The Excel sheet is empty.");
        return;
      }

      setLoading(true);
      try {
        const response = await wardenAPI.bulkEnrollStudents({
          students: formattedData,
          session_id: sessionId
        });
        
        const { successful, skipped, errors } = response.data.data;
        Modal.success({
          title: 'Import Completed',
          content: (
            <div>
              <p>Successfully Enrolled: <b>{successful}</b></p>
              <p>Skipped (Already exists): {skipped}</p>
              {errors.length > 0 && <p className="text-red-500">Errors: {errors.length}</p>}
            </div>
          )
        });
        if (onComplete) onComplete();
      } catch (error) {
        message.error("Bulk import failed.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload behavior
  };

  return (
    <Upload beforeUpload={handleFileUpload} showUploadList={false} accept=".xlsx, .xls">
      <Button 
        icon={<FileSpreadsheet size={18} />} 
        loading={loading}
        className="h-11 rounded-xl bg-green-600 text-white hover:bg-green-700 border-none"
      >
        Import from Excel
      </Button>
    </Upload>
  );
};

export default BulkImportButton;
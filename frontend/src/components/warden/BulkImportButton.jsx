import React, { useState } from 'react';
import { Button, Upload, message, Modal, Tag } from 'antd';
import { FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { wardenAPI } from '../../services/api';
import { downloadStudentBulkImportTemplate, getRequiredImportColumns, mapExcelRowToStudent, validateExcelImportHeaders } from '../../utils/bulkImportUtils';

const BulkImportButton = ({ sessionId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const requiredImportColumns = getRequiredImportColumns();

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
      const headers = json.length > 0 ? Object.keys(json[0]) : [];
      const validation = validateExcelImportHeaders(headers);

      if (!validation.isValid) {
        message.error(`Required columns missing: ${validation.missingColumns.join(', ')}. Please use the template.`);
        return;
      }

      const formattedData = json
        .map((row) => mapExcelRowToStudent(row, headers))
        .filter(Boolean);

      if (formattedData.length === 0) {
        message.error("The Excel sheet is empty or had no usable student rows.");
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
    <div className="flex flex-wrap items-center gap-2">
      <Upload beforeUpload={handleFileUpload} showUploadList={false} accept=".xlsx, .xls">
        <Button 
          icon={<FileSpreadsheet size={18} />} 
          loading={loading}
          className="h-11 rounded-xl bg-green-600 text-white hover:bg-green-700 border-none"
        >
          Import from Excel
        </Button>
      </Upload>
      <Button
        icon={<Download size={18} />}
        className="h-11 rounded-xl border-blue-200 text-blue-700 hover:border-blue-400"
        onClick={() => downloadStudentBulkImportTemplate()}
      >
        Download Template
      </Button>
      <div className="w-full">
        <div className="flex flex-wrap gap-2 mt-2">
          {requiredImportColumns.map((column) => (
            <Tag key={column.key} color="blue">{column.label}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkImportButton;
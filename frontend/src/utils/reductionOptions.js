export const reductionCategories = [
  { value: 'medical', label: 'Medical leave', document: 'Doctor’s prescription', attendance: 'Absent' },
  { value: 'od', label: 'OD — NSS / NCC camp / college participation', document: 'OD letter', attendance: 'OD' },
  { value: 'internship', label: 'Internship', document: 'Offer letter', attendance: 'OD' },
  { value: 'study_holiday', label: 'Study holiday', document: 'Reduction letter signed by tutor', attendance: 'Absent' }
];
export const categoryInfo = value => reductionCategories.find(c => c.value === value);
export const approvedReduction = row => ['approved_by_admin', 'approved_by_warden'].includes(row.status);
export const reductionStatus = row => ({ pending_admin: 'Pending review', approved_by_admin: 'Approved by admin',
  approved_by_warden: 'Approved by warden', rejected_by_admin: 'Rejected by admin', rejected_by_warden: 'Rejected by warden',
  needs_correction: 'Returned for correction', cancelled: 'Cancelled' }[row.status] || row.status);

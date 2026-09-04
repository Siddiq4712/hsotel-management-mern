import React, { useState } from 'react';
import StudentProfileCard from './StudentProfileCard';

const StudentListCard = ({ cards, hasMore, totalCount, onFollowUp }) => {
  const [expandedId, setExpandedId] = useState(
    cards && cards.length === 1 ? (cards[0].data?.id || cards[0].data?._id || 0) : null
  );

  if (!cards || cards.length === 0) {
    return (
      <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-5 text-center">
        <p className="text-2xl mb-1">🔍</p>
        <p className="text-slate-700 text-sm font-semibold">No students found</p>
        <p className="text-slate-500 text-xs mt-1">Try a different name or roll number</p>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm font-sans">
      {cards.length > 1 && (
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-800">
            Found {totalCount || cards.length} matching students
          </p>
        </div>
      )}

      <div className="flex flex-col gap-0">
        {cards.map((card, index) => {
          const student = card.data;
          const id = student.id || student._id || index;
          const isExpanded = expandedId === id;
          
          const name = student.name || student.username || student.userName || student.student_name || 'Unknown Student';
          const rollNumber = student.rollNumber || student.roll_number || student.registerNumber || '—';
          
          if (isExpanded) {
            return (
              <div key={id} className="mb-4 border border-indigo-100 rounded-xl p-3 bg-indigo-50/30">
                <button 
                  onClick={() => setExpandedId(null)}
                  className="w-full text-left text-xs font-bold text-indigo-600 mb-3 hover:underline"
                >
                  ← Back to list
                </button>
                <StudentProfileCard student={student} onFollowUp={onFollowUp} embedded={true} />
              </div>
            );
          }

          return (
            <div key={id}>
              <div 
                className="py-3 cursor-pointer hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg"
                onClick={() => setExpandedId(id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">👤</span>
                  <p className="text-sm font-bold text-slate-800 break-words whitespace-normal">{name}</p>
                </div>
                <div className="pl-7">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">Roll No : {rollNumber}</p>
                  <p className="text-[11px] font-medium text-slate-500">
                    {[student.department, student.year].filter(Boolean).join(' | ')}
                  </p>
                </div>
              </div>
              {index < cards.length - 1 && <hr className="border-slate-100 my-1" />}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Load More (+{totalCount - cards.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentListCard;

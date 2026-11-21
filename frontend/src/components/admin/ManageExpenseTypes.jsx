import React from 'react';
import { Receipt } from 'lucide-react';
import { adminAPI } from '../../services/api';
import CategoryDirectory from './CategoryDirectory';

const api = {
  list: adminAPI.getExpenseTypes,
  create: adminAPI.createExpenseType,
  update: adminAPI.updateExpenseType,
  deactivate: adminAPI.deleteExpenseType,
};

export default function ManageExpenseTypes() {
  return <CategoryDirectory title="Expense Ledger" description="Manage the categories used to record expenses."
    categoryLabel="expense" icon={Receipt} api={api} />;
}

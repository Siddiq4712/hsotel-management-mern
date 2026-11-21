import React from 'react';
import { Wallet } from 'lucide-react';
import { adminAPI } from '../../services/api';
import CategoryDirectory from './CategoryDirectory';

const api = {
  list: adminAPI.getIncomeTypes,
  create: adminAPI.createIncomeType,
  update: adminAPI.updateIncomeType,
  deactivate: adminAPI.deleteIncomeType,
};

export default function ManageIncomeTypes() {
  return <CategoryDirectory title="Revenue Ledger" description="Manage the categories used to record income."
    categoryLabel="income" icon={Wallet} api={api} />;
}

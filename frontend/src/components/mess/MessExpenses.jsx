import React, { useState, useEffect, useCallback } from 'react';
import { messAPI } from '../../services/api'; // API service for mess-related endpoints
import { format } from 'date-fns'; // Utility for date formatting
import { toast } from 'react-toastify'; // Library for displaying toast notifications
import { CreditCard, Plus, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react'; // Icon library

const MessExpenses = () => {
  // --- State for Daily Mess Expenses ---
  const [dailyExpenses, setDailyExpenses] = useState([]); // Holds the list of daily expense records
  const [dailyExpenseFormData, setDailyExpenseFormData] = useState({ // State for the daily expense form inputs
    expense_type_id: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });
  const [editingDailyExpenseId, setEditingDailyExpenseId] = useState(null); // Stores the ID of the expense being edited
  const [dailyExpenseFilters, setDailyExpenseFilters] = useState({ // State for filtering the expense list
    expense_type_id: 'all',
    from_date: '',
    to_date: '',
    search: ''
  });
  const [dailyExpenseLoading, setDailyExpenseLoading] = useState(true); // Loading state for fetching daily expenses
  const [dailyExpenseError, setDailyExpenseError] = useState(null); // Error state for daily expense fetch

  // --- State for Expense Types Management ---
  const [expenseTypes, setExpenseTypes] = useState([]); // Holds the list of expense categories/types
  const [showExpenseTypeModal, setShowExpenseTypeModal] = useState(false); // Controls visibility of the category management modal
  const [expenseTypeFormData, setExpenseTypeFormData] = useState({ // Form data for creating/editing categories
    name: '',
    description: ''
  });
  const [editingExpenseType, setEditingExpenseType] = useState(null); // Holds the category object being edited
  const [expenseTypeMessage, setExpenseTypeMessage] = useState({ type: '', text: '' }); // Stores success/error messages for category CRUD
  const [expenseTypeLoading, setExpenseTypeLoading] = useState(false); // Loading state for creating a new category
  const [expenseTypeUpdateLoading, setExpenseTypeUpdateLoading] = useState(false); // Loading state for updating a category

  // --- Callbacks for Expense Types ---
  // Fetches all available expense categories from the API
  const fetchExpenseTypes = useCallback(async () => {
    try {
      const response = await messAPI.getExpenseTypes(); 
      setExpenseTypes(response.data.data || []);
    } catch (err) {
      console.error('Error fetching expense types:', err);
      toast.error('Failed to load expense types.');
    }
  }, []);

  // Handles form submission to create a new expense category
  const handleCreateExpenseType = async (e) => {
    e.preventDefault();
    setExpenseTypeLoading(true);
    setExpenseTypeMessage({ type: '', text: '' });

    try {
      await messAPI.createExpenseType(expenseTypeFormData);
      setExpenseTypeMessage({ type: 'success', text: 'Expense type created successfully!' });
      resetExpenseTypeForm(); // Close modal and reset form
      fetchExpenseTypes(); // Refresh the list of types
    } catch (error) {
      console.error('Error creating expense type:', error);
      setExpenseTypeMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to create expense type'
      });
    } finally {
      setExpenseTypeLoading(false);
    }
  };

  // Handles form submission to update an existing expense category
  const handleUpdateExpenseType = async (e) => {
    e.preventDefault();
    if (!editingExpenseType) return;

    setExpenseTypeUpdateLoading(true);
    setExpenseTypeMessage({ type: '', text: '' });

    try {
      await messAPI.updateExpenseType(editingExpenseType.id, expenseTypeFormData);
      setExpenseTypeMessage({ type: 'success', text: 'Expense type updated successfully!' });
      resetExpenseTypeForm(); // Close modal and reset form
      fetchExpenseTypes(); // Refresh the list of types
    } catch (error) {
      console.error('Error updating expense type:', error);
      setExpenseTypeMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update expense type'
      });
    } finally {
      setExpenseTypeUpdateLoading(false);
    }
  };

  // Handles the deletion of an expense category
  const handleDeleteExpenseType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense type?')) {
      return;
    }
    setExpenseTypeMessage({ type: '', text: '' });

    try {
      await messAPI.deleteExpenseType(id);
      setExpenseTypeMessage({ type: 'success', text: 'Expense type deleted successfully!' });
      fetchExpenseTypes(); // Refresh the list of types
    } catch (error) {
      console.error('Error deleting expense type:', error);
      setExpenseTypeMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete expense type'
      });
    }
  };

  // Handles changes to the expense category form inputs
  const handleExpenseTypeFormChange = (e) => {
    setExpenseTypeFormData({
      ...expenseTypeFormData,
      [e.target.name]: e.target.value
    });
  };

  // Resets the expense category form and closes the modal
  const resetExpenseTypeForm = () => {
    setShowExpenseTypeModal(false);
    setExpenseTypeFormData({ name: '', description: '' });
    setEditingExpenseType(null);
    setExpenseTypeMessage({ type: '', text: '' }); // Clear message on modal close
  };

  // Opens the modal in "create" mode
  const openCreateExpenseTypeModal = () => {
    setEditingExpenseType(null); // Ensure no type is being edited
    setExpenseTypeFormData({ name: '', description: '' }); // Clear form for new creation
    setShowExpenseTypeModal(true);
  };

  // Opens the modal in "edit" mode with pre-filled data
  const openEditExpenseTypeModal = (type) => {
    setEditingExpenseType(type);
    setExpenseTypeFormData({
      name: type.name,
      description: type.description || ''
    });
    setShowExpenseTypeModal(true);
  };

  // --- Callbacks for Daily Mess Expenses ---
  // Fetches daily mess expenses from the API, applying filters
  const fetchDailyMessExpenses = useCallback(async () => {
    setDailyExpenseLoading(true);
    setDailyExpenseError(null);
    try {
      const response = await messAPI.getMessDailyExpenses(dailyExpenseFilters);
      setDailyExpenses(response.data.data);
    } catch (err) {
      console.error('Failed to fetch mess expenses:', err);
      setDailyExpenseError(err.message);
      toast.error('Failed to load mess expenses.');
    } finally {
      setDailyExpenseLoading(false);
    }
  }, [dailyExpenseFilters]);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchExpenseTypes(); // Fetch categories first
    fetchDailyMessExpenses(); // Then fetch daily expenses
  }, [fetchExpenseTypes, fetchDailyMessExpenses]); // Re-run effect when these dependencies change

  // Handles form input changes for the daily expense form
  const handleDailyExpenseChange = (e) => {
    const { name, value } = e.target;
    setDailyExpenseFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handles filter input changes for the daily expense list
  const handleDailyExpenseFilterChange = (e) => {
    const { name, value } = e.target;
    setDailyExpenseFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Handles form submission (add or update) for daily expenses
  const handleDailyExpenseSubmit = async (e) => {
    e.preventDefault();
    setDailyExpenseError(null);

    // Basic validation
    if (!dailyExpenseFormData.expense_type_id || !dailyExpenseFormData.amount || parseFloat(dailyExpenseFormData.amount) <= 0 || !dailyExpenseFormData.expense_date) {
      toast.error('Please fill all required fields correctly for the daily expense.');
      return;
    }

    try {
      if (editingDailyExpenseId) {
        await messAPI.updateMessDailyExpense(editingDailyExpenseId, dailyExpenseFormData);
        toast.success('Daily expense updated successfully!');
      } else {
        await messAPI.createMessDailyExpense(dailyExpenseFormData);
        toast.success('Daily expense added successfully!');
      }

      // Reset form and editing state after a successful submission
      setDailyExpenseFormData({
        expense_type_id: '',
        amount: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      });
      setEditingDailyExpenseId(null);
      fetchDailyMessExpenses(); // Refresh the list
    } catch (err) {
      console.error('Error submitting daily expense:', err);
      setDailyExpenseError(err.message);
      toast.error(err.message || 'Failed to submit daily expense.');
    }
  };

  // Populates form with data of daily expense to be edited
  const handleEditDailyExpense = (expense) => {
    setDailyExpenseFormData({
      expense_type_id: expense.expense_type_id,
      amount: parseFloat(expense.amount).toFixed(2),
      expense_date: format(new Date(expense.expense_date), 'yyyy-MM-dd'),
      description: expense.description || '',
    });
    setEditingDailyExpenseId(expense.id);
  };

  // Handles deletion of a daily expense
  const handleDeleteDailyExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this daily expense? This action cannot be undone.')) {
      setDailyExpenseError(null);
      try {
        await messAPI.deleteMessDailyExpense(id);
        toast.success('Daily expense deleted successfully!');
        fetchDailyMessExpenses();
      } catch (err) {
        console.error('Error deleting daily expense:', err);
        setDailyExpenseError(err.message);
        toast.error(err.message || 'Failed to delete daily expense.');
      }
    }
  };

  // Clears the daily expense form and cancels editing mode
  const handleClearDailyExpenseForm = () => {
    setDailyExpenseFormData({
      expense_type_id: '',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    });
    setEditingDailyExpenseId(null);
  };

  // Helper to get expense type name from its ID (for display)
  const getExpenseTypeName = (id) => {
    const type = expenseTypes.find((et) => et.id === id);
    return type ? type.name : 'Unknown';
  };

  // --- Overall Loading/Error for the main page ---
  if (dailyExpenseLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white shadow-md rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-lg text-gray-700">Loading mess expenses...</p>
      </div>
    );
  }

  if (dailyExpenseError) {
    return (
      <div className="flex items-center justify-center h-48 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline ml-2">{dailyExpenseError}</span>
      </div>
    );
  }

  // Main component JSX
  return (
    <div className="container mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Mess Operations</h2>
        {/* Button to open the category management modal */}
        <button
          onClick={openCreateExpenseTypeModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-md"
        >
          <Plus size={20} className="mr-2" />
          Manage Categories
        </button>
      </div>

      {/* --- Section for Daily Mess Expenses Form --- */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
        <h3 className="text-2xl font-semibold text-gray-700 mb-4">
          {editingDailyExpenseId ? 'Edit Daily Expense' : 'Add New Daily Expense'}
        </h3>
        {/* Form for adding/editing a daily expense record */}
        <form onSubmit={handleDailyExpenseSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Expense Type Dropdown */}
          <div>
            <label htmlFor="daily_expense_type_id" className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type <span className="text-red-500">*</span>
            </label>
            <select
              id="daily_expense_type_id"
              name="expense_type_id"
              value={dailyExpenseFormData.expense_type_id}
              onChange={handleDailyExpenseChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select Expense Type</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="daily_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="daily_amount"
              name="amount"
              value={dailyExpenseFormData.amount}
              onChange={handleDailyExpenseChange}
              required
              min="0.01"
              step="0.01"
              placeholder="e.g., 1500.00"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Date Input */}
          <div>
            <label htmlFor="daily_expense_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="daily_expense_date"
              name="expense_date"
              value={dailyExpenseFormData.expense_date}
              onChange={handleDailyExpenseChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Description Textarea */}
          <div className="lg:col-span-3">
            <label htmlFor="daily_description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="daily_description"
              name="description"
              value={dailyExpenseFormData.description}
              onChange={handleDailyExpenseChange}
              rows="2"
              placeholder="Add any relevant details about the expense"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
          </div>

          {/* Form Actions */}
          <div className="lg:col-span-3 flex justify-end space-x-3">
            {/* Button to clear the form */}
            <button
              type="button"
              onClick={handleClearDailyExpenseForm}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear
            </button>
            {/* Button to submit the form (Add or Update) */}
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editingDailyExpenseId ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>

      {/* --- Section for Daily Mess Expense List --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Daily Expense List</h3>

        {/* Filters for the list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Filter by Type dropdown */}
          <div>
            <label htmlFor="filter_daily_expense_type" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              id="filter_daily_expense_type"
              name="expense_type_id"
              value={dailyExpenseFilters.expense_type_id}
              onChange={handleDailyExpenseFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          {/* From Date filter */}
          <div>
            <label htmlFor="filter_daily_from_date" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="filter_daily_from_date"
              name="from_date"
              value={dailyExpenseFilters.from_date}
              onChange={handleDailyExpenseFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* To Date filter */}
          <div>
            <label htmlFor="filter_daily_to_date" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="filter_daily_to_date"
              name="to_date"
              value={dailyExpenseFilters.to_date}
              onChange={handleDailyExpenseFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Search input */}
          <div>
            <label htmlFor="filter_daily_search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="filter_daily_search"
              name="search"
              value={dailyExpenseFilters.search}
              onChange={handleDailyExpenseFilterChange}
              placeholder="Search by description or type"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Apply Filters button */}
          <div className="lg:col-span-4 flex justify-end">
            <button
              onClick={fetchDailyMessExpenses} // Trigger fetching with current filters
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {dailyExpenses.length === 0 ? (
          <p className="text-center text-gray-600">No mess expenses recorded for the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expense Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(expense.expense_date), 'dd-MM-yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.ExpenseType ? expense.ExpenseType.name : getExpenseTypeName(expense.expense_type_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.RecordedBy ? expense.RecordedBy.username : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Edit button */}
                      <button
                        onClick={() => handleEditDailyExpense(expense)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteDailyExpense(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Update Expense Type Modal */}
      {showExpenseTypeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-5 border w-full max-w-lg mx-4 shadow-lg rounded-md bg-white animate-fade-in-down">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingExpenseType ? "Edit Expense Category" : "Create Expense Category"}
              </h3>

              {expenseTypeMessage.text && ( // Display message within modal
                <div className={`mb-4 p-3 rounded-lg flex items-center ${
                  expenseTypeMessage.type === 'success'
                    ? 'bg-green-100 border border-green-400 text-green-700'
                    : 'bg-red-100 border border-red-400 text-red-700'
                }`}>
                  {expenseTypeMessage.type === 'success' ? (
                    <CheckCircle size={20} className="mr-2" />
                  ) : (
                    <AlertCircle size={20} className="mr-2" />
                  )}
                  {expenseTypeMessage.text}
                </div>
              )}

              {/* List of existing categories inside the modal */}
              <div className="mb-6 border-t border-gray-200 pt-4">
                <h4 className="text-lg font-medium text-gray-800 mb-3">Existing Categories:</h4>
                {expenseTypes.length === 0 ? (
                  <p className="text-gray-600 text-sm italic">No categories created yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-2"> {/* Scrollable list */}
                    {expenseTypes.map((type) => (
                      <li key={type.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200">
                        <span className="text-gray-800 font-medium">{type.name}</span>
                        <div className="flex space-x-1">
                          {/* Edit Category button */}
                          <button
                            type="button" 
                            onClick={() => openEditExpenseTypeModal(type)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-gray-100 rounded-md"
                            title="Edit Category"
                          >
                            <Edit size={16} />
                          </button>
                          {/* Delete Category button */}
                          <button
                            type="button" 
                            onClick={() => handleDeleteExpenseType(type.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-gray-100 rounded-md"
                            title="Delete Category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Form for adding/editing a category */}
              <form onSubmit={editingExpenseType ? handleUpdateExpenseType : handleCreateExpenseType} className="space-y-4">
                <div className="border-t border-gray-200 pt-4"> 
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={expenseTypeFormData.name}
                    onChange={handleExpenseTypeFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Utilities, Maintenance, Groceries"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={expenseTypeFormData.description}
                    onChange={handleExpenseTypeFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={expenseTypeLoading || expenseTypeUpdateLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {editingExpenseType
                      ? (expenseTypeUpdateLoading ? 'Updating...' : 'Update')
                      : (expenseTypeLoading ? 'Creating...' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetExpenseTypeForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessExpenses;

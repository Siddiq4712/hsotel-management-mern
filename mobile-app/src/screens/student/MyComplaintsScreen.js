import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { studentAPI } from '../../api/api';
import { MessageCircle, Calendar, CheckCircle, Clock, AlertCircle, XCircle, User, AlertTriangle, ChevronDown, ChevronUp, Search } from 'lucide-react-native';
import moment from 'moment';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge'; // Reusing common badge component

const ComplaintManagementScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({ status: 'all', category: 'all', priority: 'all', searchQuery: '' });
  const [appliedFilters, setAppliedFilters] = useState({ status: 'all', category: 'all', priority: 'all', searchQuery: '' });

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [complaints, appliedFilters]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyComplaints();
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      Alert.alert('Error', error.message || 'Failed to fetch complaints.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...complaints];
    
    if (appliedFilters.status !== 'all') {
      result = result.filter(c => c.status === appliedFilters.status);
    }
    if (appliedFilters.category !== 'all') {
      result = result.filter(c => c.category === appliedFilters.category);
    }
    if (appliedFilters.priority !== 'all') {
      result = result.filter(c => c.priority === appliedFilters.priority);
    }
    if (appliedFilters.searchQuery) {
      const query = appliedFilters.searchQuery.toLowerCase();
      result = result.filter(c => 
        c.subject.toLowerCase().includes(query) || 
        c.description.toLowerCase().includes(query)
      );
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredComplaints(result);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!formData.subject || !formData.description || !formData.category) {
        Alert.alert('Error', 'Subject, description, and category are required.');
        setSubmitting(false);
        return;
      }
      await studentAPI.createComplaint(formData);
      Alert.alert('Success', 'Complaint submitted successfully!');
      setFormData({
        subject: '',
        description: '',
        category: '',
        priority: 'medium'
      });
      fetchComplaints(); // Refresh list
    } catch (error) {
      console.error('Complaint creation error:', error);
      Alert.alert('Error', error.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      subject: '',
      description: '',
      category: '',
      priority: 'medium'
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setTempFilters({ status: 'all', category: 'all', priority: 'all', searchQuery: '' });
    setAppliedFilters({ status: 'all', category: 'all', priority: 'all', searchQuery: '' });
    setShowFilterModal(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'room': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'mess': return 'bg-green-50 text-green-700 border-green-200';
      case 'facility': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'maintenance': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'discipline': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const categories = [
    { value: 'room', label: 'Room Issues', description: 'Problems related to your room' },
    { value: 'mess', label: 'Mess Issues', description: 'Food quality or mess service problems' },
    { value: 'facility', label: 'Facility Issues', description: 'Problems with hostel facilities' },
    { value: 'maintenance', label: 'Maintenance', description: 'Repair or maintenance requests' },
    { value: 'discipline', label: 'Discipline Issues', description: 'Behavioral or rule-related issues' },
    { value: 'other', label: 'Other', description: 'Any other issues' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', description: 'Non-urgent issues' },
    { value: 'medium', label: 'Medium', description: 'Standard priority' },
    { value: 'high', label: 'High', description: 'Important issues requiring quick attention' },
    { value: 'urgent', label: 'Urgent', description: 'Critical issues requiring immediate attention' }
  ];

  const complaintStatuses = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Complaint Management</Text>
        <Text className="text-gray-600 mb-6">Submit and track complaints related to your hostel stay</Text>

        {/* Statistics */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-2">
            <View className="flex-row items-center">
              <MessageCircle className="text-gray-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Total</Text>
                <Text className="text-2xl font-bold text-gray-900">{complaints.length}</Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mb-2">
            <View className="flex-row items-center">
              <AlertCircle className="text-yellow-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Submitted</Text>
                <Text className="text-2xl font-bold text-yellow-900">
                  {complaints.filter(c => c.status === 'submitted').length}
                </Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mt-2">
            <View className="flex-row items-center">
              <Clock className="text-blue-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">In Progress</Text>
                <Text className="text-2xl font-bold text-blue-900">
                  {complaints.filter(c => c.status === 'in_progress').length}
                </Text>
              </View>
            </View>
          </View>
          <View className="w-[48%] bg-white rounded-lg shadow-md p-3 mt-2">
            <View className="flex-row items-center">
              <CheckCircle className="text-green-600" size={24} />
              <View className="ml-3">
                <Text className="text-sm text-gray-600">Resolved</Text>
                <Text className="text-2xl font-bold text-green-900">
                  {complaints.filter(c => c.status === 'resolved').length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Submit Complaint Form */}
        <View className="bg-white rounded-lg shadow-md p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <MessageCircle className="text-gray-500 mr-2" size={20} />
            <Text className="text-lg font-medium text-gray-900">Submit New Complaint</Text>
          </View>

          <View className="space-y-5">
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-1">Subject *</Text>
              <View className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <TextInput
                  value={formData.subject}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Brief summary of your complaint"
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-1">Category *</Text>
              <Picker
                selectedValue={formData.category}
                onValueChange={(itemValue) => setFormData(prev => ({ ...prev, category: itemValue }))}
                className="w-full border border-gray-300 rounded-lg h-12"
              >
                <Picker.Item label="Select Category" value="" />
                {categories.map(category => (
                  <Picker.Item key={category.value} label={category.label} value={category.value} />
                ))}
              </Picker>
              {formData.category && (
                <Text className="mt-1 text-xs text-gray-600">
                  {categories.find(cat => cat.value === formData.category)?.description}
                </Text>
              )}
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-1">Priority *</Text>
              <View className="flex-row flex-wrap justify-between">
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority.value}
                    onPress={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    className={`relative flex-col p-2 border rounded-lg w-[48%] mb-2 ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-3 h-3 rounded-full border-2 ${
                        formData.priority === priority.value
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`} />
                      <Text className="ml-2 text-sm font-medium text-gray-900">{priority.label}</Text>
                    </View>
                    <Text className="text-xs text-gray-600 mt-1">{priority.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-1">Description *</Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32 text-gray-900"
                placeholder="Provide detailed information about your complaint..."
                textAlignVertical="top"
              />
              <Text className="mt-1 text-xs text-gray-600">
                Be specific to help us address your concern effectively.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-row items-center justify-center disabled:opacity-50"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" className="mr-2" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Submit Complaint</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-gray-700 text-sm font-semibold">Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Guidelines */}
            <View className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <View className="flex-row items-start">
                <AlertTriangle className="text-amber-600 mt-0.5 mr-2" size={16} />
                <View className="flex-1">
                  <Text className="text-xs font-medium text-amber-800 mb-1">Guidelines</Text>
                  <Text className="text-xs text-amber-700 space-y-0.5">
                    • Be respectful and factual in your complaint{"\n"}
                    • Provide specific details when possible{"\n"}
                    • Use appropriate priority levels{"\n"}
                    • False complaints may result in action
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Complaints History */}
        <View className="bg-white shadow-md rounded-lg overflow-hidden h-full">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-row justify-between items-center">
            <View className="flex-row items-center">
              <MessageCircle className="text-gray-400 mr-2" size={20} />
              <Text className="text-lg font-medium text-gray-900">Complaint History</Text>
            </View>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} className="p-2 bg-gray-100 rounded-md">
                <Search size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="flex items-center justify-center h-64">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : filteredComplaints.length > 0 ? (
            <View className="divide-y divide-gray-200">
              {filteredComplaints.map((complaint) => (
                <View key={complaint.id} className="p-4 hover:bg-gray-50">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-medium text-gray-900 mb-1">
                        {complaint.subject}
                      </Text>
                      <View className="flex-row flex-wrap items-center mb-2">
                        <View className={`px-2 py-0.5 rounded-full text-xs font-medium border mr-2 mb-1 ${getCategoryColor(complaint.category)}`}>
                            <Text className={`text-xs font-medium ${getCategoryColor(complaint.category).split(' ').find(cls => cls.startsWith('text-'))}`}>
                                {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                            </Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded-full text-xs font-medium border mr-2 mb-1 ${getPriorityColor(complaint.priority)}`}>
                            <Text className={`text-xs font-medium ${getPriorityColor(complaint.priority).split(' ').find(cls => cls.startsWith('text-'))}`}>
                                {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)} Priority
                            </Text>
                        </View>
                      </View>
                    </View>
                    <StatusBadge status={complaint.status} type="complaint" />
                  </View>
                  <Text className="text-sm text-gray-700 mb-3">{complaint.description}</Text>
                  <View className="flex-row flex-wrap items-center text-xs text-gray-500">
                    <View className="flex-row items-center mr-4">
                      <Calendar className="mr-1" size={14} />
                      <Text>Submitted: {moment(complaint.createdAt).format('MMM DD, YYYY')}</Text>
                    </View>
                    {complaint.resolved_date && (
                      <View className="flex-row items-center">
                        <CheckCircle className="mr-1" size={14} />
                        <Text>Resolved: {moment(complaint.resolved_date).format('MMM DD, YYYY')}</Text>
                      </View>
                    )}
                  </View>
                  {complaint.resolution && (
                    <View className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Text className="text-xs font-medium text-green-800 mb-1">Resolution</Text>
                      <Text className="text-sm text-green-700">{complaint.resolution}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <Text className="mt-2 text-sm font-medium text-gray-900">No complaints found</Text>
              <Text className="mt-1 text-sm text-gray-500">
                {appliedFilters.status !== 'all' || appliedFilters.category !== 'all' || appliedFilters.priority !== 'all' || appliedFilters.searchQuery
                  ? "Try changing your filters or search criteria."
                  : "Your submitted complaints will appear here."}
              </Text>
              {(appliedFilters.status !== 'all' || appliedFilters.category !== 'all' || appliedFilters.priority !== 'all' || appliedFilters.searchQuery) && (
                  <TouchableOpacity
                    onPress={handleResetFilters}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Text className="text-blue-600">Clear all filters</Text>
                  </TouchableOpacity>
                )}
            </View>
          )}
        </View>

        {/* Filter Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilterModal}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-2xl font-bold">Filter Complaints</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <XCircle size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
                  <Picker
                    selectedValue={tempFilters.status}
                    onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, status: itemValue }))}
                    className="w-full border border-gray-300 rounded-lg h-12"
                  >
                    <Picker.Item label="All Statuses" value="all" />
                    {complaintStatuses.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
                  </Picker>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
                  <Picker
                    selectedValue={tempFilters.category}
                    onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, category: itemValue }))}
                    className="w-full border border-gray-300 rounded-lg h-12"
                  >
                    <Picker.Item label="All Categories" value="all" />
                    {categories.map(c => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
                  </Picker>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Priority</Text>
                  <Picker
                    selectedValue={tempFilters.priority}
                    onValueChange={(itemValue) => setTempFilters(prev => ({ ...prev, priority: itemValue }))}
                    className="w-full border border-gray-300 rounded-lg h-12"
                  >
                    <Picker.Item label="All Priorities" value="all" />
                    {priorities.map(p => <Picker.Item key={p.value} label={p.label} value={p.value} />)}
                  </Picker>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Search</Text>
                  <TextInput
                    value={tempFilters.searchQuery}
                    onChangeText={(text) => setTempFilters(prev => ({ ...prev, searchQuery: text }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="Search in subject or description..."
                  />
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <TouchableOpacity onPress={handleResetFilters} className="bg-gray-300 py-3 px-4 rounded-lg">
                  <Text className="font-semibold text-gray-700">Reset Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleApplyFilters} className="bg-blue-600 py-3 px-6 rounded-lg">
                  <Text className="text-white font-semibold text-lg">Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default ComplaintManagementScreen;

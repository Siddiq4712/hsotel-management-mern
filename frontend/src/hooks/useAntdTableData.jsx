import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

/**
 * A custom hook to manage Ant Design Table data fetching, pagination, sorting, and filtering.
 * @param {function} apiFunc - The async API function to call for fetching data.
 * @param {object} initialParams - Initial parameters for filters, etc.
 * @returns {object} - State and handlers for the Ant Design Table.
 */
export const useAntdTableData = (apiFunc, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
  });
  const [queryParams, setQueryParams] = useState(initialParams);

  const fetchData = useCallback(async (params) => {
    setLoading(true);
    try {
      // Combine current pagination, sorting, filters, and any external params
      const combinedParams = {
        page: params.pagination.current,
        limit: params.pagination.pageSize,
        ...params.filters,
        ...params.sorter,
        ...params.queryParams,
      };

      // Clean up params for the API call
      if (combinedParams.field && combinedParams.order) {
        combinedParams.sortBy = combinedParams.field;
        combinedParams.sortOrder = combinedParams.order === 'ascend' ? 'ASC' : 'DESC';
      }
      delete combinedParams.field;
      delete combinedParams.order;
      
      const response = await apiFunc(combinedParams);
      const responseData = response.data.data;
      
      setData(responseData.rows || responseData); // Support both paginated and non-paginated responses
      setPagination(prev => ({
        ...prev,
        current: params.pagination.current,
        pageSize: params.pagination.pageSize,
        total: responseData.count || 0, // Ensure your API returns a `count` property
      }));

    } catch (error) {
      console.error("Failed to fetch data:", error);
      message.error('Failed to fetch data. ' + (error.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  useEffect(() => {
    fetchData({ pagination, queryParams });
  }, [fetchData, queryParams]);

  const handleTableChange = (newPagination, filters, sorter) => {
    fetchData({
      pagination: newPagination,
      filters,
      sorter,
      queryParams,
    });
  };

  const refresh = (newParams = {}) => {
     const newQueryParams = { ...queryParams, ...newParams };
     // Reset to first page when filters change
     const newPagination = { ...pagination, current: 1 };
     setQueryParams(newQueryParams);
     // Note: The useEffect will trigger the refetch
  };

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    refresh,
  };
};

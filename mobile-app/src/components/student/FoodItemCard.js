import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Plus, Utensils } from 'lucide-react-native';
import { getCategoryColor } from '../../utils/layoutUtils'; // Assuming a helper for category colors

// Helper function to safely format price
const formatPrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) ? numPrice.toFixed(2) : price;
};

const FoodItemCard = ({ item, onAddToCart }) => {
  const getCategoryColor = (category) => {
    const colors = ['bg-pink-100 text-pink-700', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700', 'bg-yellow-100 text-yellow-700', 'bg-lime-100 text-lime-700', 'bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700', 'bg-purple-110 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700'];
    const hashCode = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    };
    const index = Math.abs(hashCode(category)) % colors.length;
    return colors[index];
  };

  return (
    <View className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          className="w-full h-40 object-cover"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-40 bg-gray-200 flex items-center justify-center">
          <Utensils size={48} className="text-gray-400" />
          <Text className="text-gray-500 mt-2">No Image</Text>
        </View>
      )}
      <View className="p-4">
        <Text className="text-xl font-semibold text-gray-900 mb-1">{item.name}</Text>
        <View className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)} self-start mb-2`}>
            <Text className={`text-xs font-medium ${getCategoryColor(item.category).split(' ').find(cls => cls.startsWith('text-'))}`}>{item.category}</Text>
        </View>
        <Text className="text-lg font-bold text-blue-600 mb-2">₹{formatPrice(item.price)}</Text>
        <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
          {item.description || 'No description available.'}
        </Text>
        {item.preparation_time_minutes && (
          <Text className="text-xs text-gray-500 mb-3">Prep Time: {item.preparation_time_minutes} min</Text>
        )}
        <TouchableOpacity
          onPress={() => onAddToCart(item)}
          className="bg-blue-600 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Plus size={18} color="white" className="mr-2" />
          <Text className="text-white font-semibold text-base">Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FoodItemCard;

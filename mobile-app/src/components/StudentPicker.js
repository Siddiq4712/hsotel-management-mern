import { Text } from "./common/ReferenceDesign";
import React from 'react';
import { View } from 'react-native';
import { Picker } from './common/Picker';

const StudentPicker = ({ students, selectedStudent, onChange }) => (
  <View>
    <Text>Select Student</Text>
    <Picker selectedValue={selectedStudent} onValueChange={onChange}>
      <Picker.Item label="-- Select --" value={null} />
      {students.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
    </Picker>
  </View>
);

export default StudentPicker;

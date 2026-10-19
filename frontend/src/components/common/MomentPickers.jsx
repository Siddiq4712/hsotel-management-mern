import { Calendar as AntCalendar, DatePicker as AntDatePicker } from 'antd';
import momentGenerateConfig from '@rc-component/picker/generate/moment';

// Moment setters mutate their input. Ant Design's default Day.js adapter
// assumes immutable setters, so using it with Moment can advance the calendar
// while it renders. Keep Moment values on the adapter that clones before edits.
export const DatePicker = AntDatePicker.generatePicker(momentGenerateConfig);
export const Calendar = AntCalendar.generateCalendar(momentGenerateConfig);

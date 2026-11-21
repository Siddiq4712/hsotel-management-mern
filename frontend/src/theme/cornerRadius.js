// Mess Overview reference. Use these values for Ant Design and custom web UI.
export const cornerRadius = {
  surface: 16,
  control: 12,
  compact: 8,
  tag: 4,
  pill: 9999,
};

const controlSizeRadii = {
  borderRadiusLG: cornerRadius.control,
  borderRadiusSM: cornerRadius.control,
};

export const cornerRadiusTheme = {
  token: {
    borderRadius: cornerRadius.control,
    borderRadiusLG: cornerRadius.surface,
    borderRadiusSM: cornerRadius.compact,
    borderRadiusXS: cornerRadius.tag,
  },
  components: {
    Button: controlSizeRadii,
    Input: controlSizeRadii,
    InputNumber: controlSizeRadii,
    Tag: { borderRadiusSM: cornerRadius.tag },
  },
};

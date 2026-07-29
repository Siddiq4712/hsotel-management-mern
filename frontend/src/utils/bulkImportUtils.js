import * as XLSX from 'xlsx';

const REQUIRED_STUDENT_IMPORT_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    aliases: ['name', 'student name', 'student_name']
  },
  {
    key: 'roll_number',
    label: 'Roll Number',
    aliases: ['roll number', 'roll_number', 'roll no', 'rollno', 'roll_no']
  },
  {
    key: 'college',
    label: 'College',
    aliases: ['college', 'college name', 'campus']
  },
  {
    key: 'requires_bed',
    label: 'Hosteller',
    aliases: ['hosteller', 'requires bed', 'requires_bed', 'is hosteller']
  }
];

const REQUIRED_ITEM_IMPORT_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    aliases: ['name', 'item name', 'material name']
  },
  {
    key: 'category_name',
    label: 'Category',
    aliases: ['category', 'category name', 'item category']
  },
  {
    key: 'unit',
    label: 'Unit',
    aliases: ['unit', 'uom', 'unit abbreviation', 'uom abbreviation']
  },
  {
    key: 'unit_price',
    label: 'Unit Price',
    aliases: ['unit price', 'price', 'unit_price', 'rate']
  },
  {
    key: 'description',
    label: 'Description',
    aliases: ['description', 'notes', 'remarks'],
    optional: true
  },
  {
    key: 'maximum_quantity',
    label: 'Maximum Quantity',
    aliases: ['maximum quantity', 'max quantity', 'maximum_quantity', 'max_quantity'],
    optional: true
  }
];

const REQUIRED_STORE_IMPORT_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    aliases: ['name', 'store name', 'provider name']
  },
  {
    key: 'address',
    label: 'Address',
    aliases: ['address', 'location', 'store address', 'provider address'],
    optional: true
  },
  {
    key: 'contact_number',
    label: 'Contact Number',
    aliases: ['contact number', 'phone', 'phone number', 'contact_number', 'mobile'],
    optional: true
  },
  {
    key: 'is_active',
    label: 'Is Active',
    aliases: ['is active', 'active', 'status'],
    optional: true
  }
];

const REQUIRED_STOCK_IMPORT_COLUMNS = [
  {
    key: 'item_name',
    label: 'Item Name',
    aliases: ['item name', 'material name', 'raw material']
  },
  {
    key: 'quantity',
    label: 'Quantity Received',
    aliases: ['quantity', 'quantity received', 'received quantity', 'qty']
  },
  {
    key: 'unit_price',
    label: 'Unit Price',
    aliases: ['unit price', 'price', 'unit_price', 'rate', 'cost per unit']
  },
  {
    key: 'purchase_date',
    label: 'Purchase Date',
    aliases: ['purchase date', 'date', 'received date'],
    optional: true
  },
  {
    key: 'expiry_date',
    label: 'Expiry Date',
    aliases: ['expiry date', 'expiration date', 'expiry', 'expiration'],
    optional: true
  }
];

const normalizeHeader = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getHeaderValue = (row = {}, aliases = []) => {
  const candidateKeys = Object.keys(row || {});
  const normalizedMap = new Map(candidateKeys.map((key) => [normalizeHeader(key), key]));

  for (const alias of aliases) {
    const matchedKey = normalizedMap.get(normalizeHeader(alias));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return row[matchedKey];
    }
  }

  return undefined;
};

export const getRequiredImportColumns = () => REQUIRED_STUDENT_IMPORT_COLUMNS.map((column) => ({ ...column }));
export const getRequiredItemImportColumns = () => REQUIRED_ITEM_IMPORT_COLUMNS.map((column) => ({ ...column }));
export const getRequiredStoreImportColumns = () => REQUIRED_STORE_IMPORT_COLUMNS.map((column) => ({ ...column }));
export const getRequiredStockImportColumns = () => REQUIRED_STOCK_IMPORT_COLUMNS.map((column) => ({ ...column }));

export const validateExcelImportHeaders = (headers = []) => {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  const missingColumns = REQUIRED_STUDENT_IMPORT_COLUMNS.filter((column) => {
    const found = column.aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
    return !found;
  }).map((column) => column.label);

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

export const validateItemExcelImportHeaders = (headers = []) => {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  const missingColumns = REQUIRED_ITEM_IMPORT_COLUMNS.filter((column) => column.optional !== true).filter((column) => {
    const found = column.aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
    return !found;
  }).map((column) => column.label);

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

export const validateStoreExcelImportHeaders = (headers = []) => {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  const missingColumns = REQUIRED_STORE_IMPORT_COLUMNS.filter((column) => column.optional !== true).filter((column) => {
    const found = column.aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
    return !found;
  }).map((column) => column.label);

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

export const validateStockExcelImportHeaders = (headers = []) => {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  const missingColumns = REQUIRED_STOCK_IMPORT_COLUMNS.filter((column) => column.optional !== true).filter((column) => {
    const found = column.aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
    return !found;
  }).map((column) => column.label);

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

export const mapExcelRowToStudent = (row = {}, headers = []) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const nameValue = getHeaderValue(row, REQUIRED_STUDENT_IMPORT_COLUMNS[0].aliases);
  const rollValue = getHeaderValue(row, REQUIRED_STUDENT_IMPORT_COLUMNS[1].aliases);
  const collegeValue = getHeaderValue(row, REQUIRED_STUDENT_IMPORT_COLUMNS[2].aliases);
  const hostellerValue = getHeaderValue(row, REQUIRED_STUDENT_IMPORT_COLUMNS[3].aliases);

  const normalizedRollNumber = String(rollValue ?? '').trim();
  const normalizedName = String(nameValue ?? '').trim();

  if (!normalizedName || !normalizedRollNumber) {
    return null;
  }

  const requiresBedValue = String(hostellerValue ?? '').trim().toLowerCase();
  const requiresBed = ['yes', 'y', 'true', '1', 'hosteller'].includes(requiresBedValue);

  return {
    userName: normalizedName,
    roll_number: normalizedRollNumber,
    college: String(collegeValue ?? 'nec').trim() || 'nec',
    requires_bed: requiresBed
  };
};

export const mapExcelRowToItem = (row = {}, headers = []) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const nameValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[0].aliases);
  const categoryValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[1].aliases);
  const unitValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[2].aliases);
  const priceValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[3].aliases);
  const descriptionValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[4].aliases);
  const maximumQuantityValue = getHeaderValue(row, REQUIRED_ITEM_IMPORT_COLUMNS[5].aliases);

  const name = String(nameValue ?? '').trim();
  const category_name = String(categoryValue ?? '').trim();
  const unit = String(unitValue ?? '').trim();

  if (!name || !category_name || !unit) {
    return null;
  }

  const unit_price = Number(priceValue ?? 0);
  const maximum_quantity = maximumQuantityValue !== undefined && maximumQuantityValue !== null && maximumQuantityValue !== ''
    ? Number(maximumQuantityValue)
    : null;

  return {
    name,
    category_name,
    unit,
    unit_price: Number.isNaN(unit_price) ? 0 : unit_price,
    description: descriptionValue ? String(descriptionValue).trim() : null,
    maximum_quantity: Number.isNaN(maximum_quantity) ? null : maximum_quantity
  };
};

export const mapExcelRowToStore = (row = {}, headers = []) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const nameValue = getHeaderValue(row, REQUIRED_STORE_IMPORT_COLUMNS[0].aliases);
  const addressValue = getHeaderValue(row, REQUIRED_STORE_IMPORT_COLUMNS[1].aliases);
  const contactValue = getHeaderValue(row, REQUIRED_STORE_IMPORT_COLUMNS[2].aliases);
  const activeValue = getHeaderValue(row, REQUIRED_STORE_IMPORT_COLUMNS[3].aliases);

  const name = String(nameValue ?? '').trim();
  if (!name) {
    return null;
  }

  const is_active = ['yes', 'y', 'true', '1', 'active'].includes(String(activeValue ?? 'true').trim().toLowerCase());

  return {
    name,
    address: addressValue ? String(addressValue).trim() : null,
    contact_number: contactValue ? String(contactValue).trim() : null,
    is_active
  };
};

export const mapExcelRowToStock = (row = {}, headers = []) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const itemNameValue = getHeaderValue(row, REQUIRED_STOCK_IMPORT_COLUMNS[0].aliases);
  const quantityValue = getHeaderValue(row, REQUIRED_STOCK_IMPORT_COLUMNS[1].aliases);
  const unitPriceValue = getHeaderValue(row, REQUIRED_STOCK_IMPORT_COLUMNS[2].aliases);
  const purchaseDateValue = getHeaderValue(row, REQUIRED_STOCK_IMPORT_COLUMNS[3].aliases);
  const expiryDateValue = getHeaderValue(row, REQUIRED_STOCK_IMPORT_COLUMNS[4].aliases);

  const item_name = String(itemNameValue ?? '').trim();
  const quantity = Number(quantityValue ?? NaN);
  const unit_price = Number(unitPriceValue ?? NaN);
  const purchase_date = purchaseDateValue ? String(purchaseDateValue).trim() : null;
  const expiry_date = expiryDateValue ? String(expiryDateValue).trim() : null;

  if (!item_name || Number.isNaN(quantity) || Number.isNaN(unit_price)) {
    return null;
  }

  return {
    item_name,
    quantity: Number.isNaN(quantity) ? 0 : quantity,
    unit_price: Number.isNaN(unit_price) ? 0 : unit_price,
    purchase_date: purchase_date || new Date().toISOString().split('T')[0],
    expiry_date: expiry_date || null
  };
};

const createWorkbookWithSheet = (data, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = data[0].map(() => ({ width: 20 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
};

export const downloadStudentBulkImportTemplate = (fileName = 'student-bulk-import-template.xlsx') => {
  const worksheetData = [
    ['Name', 'Roll Number', 'College', 'Hosteller'],
    ['John Doe', '20240001', 'NEC', 'Yes'],
    ['Jane Smith', '20240002', 'LAPC', 'No']
  ];

  const workbook = createWorkbookWithSheet(worksheetData, 'Students');
  XLSX.writeFile(workbook, fileName);
};

export const downloadItemBulkImportTemplate = (fileName = 'item-bulk-import-template.xlsx') => {
  const worksheetData = [
    ['Name', 'Category', 'Unit', 'Unit Price', 'Description', 'Maximum Quantity'],
    ['Rice', 'Grains', 'kg', 60, 'Premium rice for cooking', 100],
    ['Sugar', 'Groceries', 'kg', 45, 'Refined sugar', 50]
  ];

  const workbook = createWorkbookWithSheet(worksheetData, 'Items');
  XLSX.writeFile(workbook, fileName);
};

export const downloadStoreBulkImportTemplate = (fileName = 'store-bulk-import-template.xlsx') => {
  const worksheetData = [
    ['Name', 'Address', 'Contact Number', 'Is Active'],
    ['ABC Grocery Store', '123 Main Road, City', '+911234567890', 'Yes'],
    ['Fresh Provisions', '456 Market Street, City', '+919876543210', 'No']
  ];

  const workbook = createWorkbookWithSheet(worksheetData, 'Stores');
  XLSX.writeFile(workbook, fileName);
};

export const downloadStockBulkImportTemplate = (fileName = 'stock-bulk-import-template.xlsx') => {
  const worksheetData = [
    ['Item Name', 'Quantity Received', 'Unit Price', 'Purchase Date', 'Expiry Date'],
    ['Rice', 50, 60, '2026-07-01', '2027-07-01'],
    ['Sugar', 30, 45, '2026-07-10', '2027-01-10']
  ];

  const workbook = createWorkbookWithSheet(worksheetData, 'Stock');
  XLSX.writeFile(workbook, fileName);
};

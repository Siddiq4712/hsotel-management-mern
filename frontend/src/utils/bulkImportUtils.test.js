import { describe, expect, it } from 'vitest';
import {
  getRequiredImportColumns,
  mapExcelRowToStudent,
  validateExcelImportHeaders,
  getRequiredItemImportColumns,
  mapExcelRowToItem,
  validateItemExcelImportHeaders,
  getRequiredStoreImportColumns,
  mapExcelRowToStore,
  validateStoreExcelImportHeaders,
  getRequiredStockImportColumns,
  mapExcelRowToStock,
  validateStockExcelImportHeaders
} from './bulkImportUtils';

describe('bulk import helpers', () => {
  it('returns the required bulk import columns for the enrollment template', () => {
    const columns = getRequiredImportColumns();

    expect(columns.map(column => column.key)).toEqual(['name', 'roll_number', 'email', 'erp_batch_year']);
    expect(columns.find(column => column.key === 'erp_batch_year').aliases).toContain('batch');
  });

  it('reads admission year from Batch independently of the roll number', () => {
    const payload = mapExcelRowToStudent({ Name: 'Arun Kumar', 'Roll Number': '23104085', Email: 'arun@example.invalid', Batch: 2024 });
    expect(payload).toEqual(expect.objectContaining({ userName: 'Arun Kumar', roll_number: '23104085', email: 'arun@example.invalid', erp_batch_year: 2024, requires_bed: false }));
    expect(mapExcelRowToStudent({ Name: 'Arun', 'Roll Number': '24104085' }).erp_batch_year).toBeNull();
  });

  it('requires an explicit Batch column in student import sheets', () => {
    expect(validateExcelImportHeaders(['Name', 'Roll Number', 'Email'])).toEqual({ isValid: false, missingColumns: ['Batch'] });
    expect(validateExcelImportHeaders(['Name', 'Roll Number', 'Email', 'Batch']).isValid).toBe(true);
  });

  it('returns the item import template columns', () => {
    const itemColumns = getRequiredItemImportColumns();

    expect(itemColumns).toEqual([
      { key: 'name', label: 'Name', aliases: ['name', 'item name', 'material name'] },
      { key: 'category_name', label: 'Category', aliases: ['category', 'category name', 'item category'] },
      { key: 'unit', label: 'Unit', aliases: ['unit', 'uom', 'unit abbreviation', 'uom abbreviation'] },
      { key: 'unit_price', label: 'Unit Price', aliases: ['unit price', 'price', 'unit_price', 'rate'] },
      { key: 'description', label: 'Description', aliases: ['description', 'notes', 'remarks'], optional: true },
      { key: 'maximum_quantity', label: 'Maximum Quantity', aliases: ['maximum quantity', 'max quantity', 'maximum_quantity', 'max_quantity'], optional: true }
    ]);
  });

  it('maps Excel rows to the item payload expected by bulk import', () => {
    const row = {
      Name: 'Rice',
      Category: 'Grains',
      Unit: 'kg',
      'Unit Price': 65,
      Description: 'Long grain rice',
      'Maximum Quantity': 100
    };

    const payload = mapExcelRowToItem(row, ['Name', 'Category', 'Unit', 'Unit Price', 'Description', 'Maximum Quantity']);

    expect(payload).toEqual({
      name: 'Rice',
      category_name: 'Grains',
      unit: 'kg',
      unit_price: 65,
      description: 'Long grain rice',
      maximum_quantity: 100
    });
  });

  it('validates item import headers and reports missing columns', () => {
    const validation = validateItemExcelImportHeaders(['Name', 'Category', 'Unit', 'Description']);

    expect(validation.isValid).toBe(false);
    expect(validation.missingColumns).toEqual(['Unit Price']);
  });

  it('returns the store import template columns', () => {
    const storeColumns = getRequiredStoreImportColumns();

    expect(storeColumns).toEqual([
      { key: 'name', label: 'Name', aliases: ['name', 'store name', 'provider name'] },
      { key: 'address', label: 'Address', aliases: ['address', 'location', 'store address', 'provider address'], optional: true },
      { key: 'contact_number', label: 'Contact Number', aliases: ['contact number', 'phone', 'phone number', 'contact_number', 'mobile'], optional: true },
      { key: 'is_active', label: 'Is Active', aliases: ['is active', 'active', 'status'], optional: true }
    ]);
  });

  it('maps Excel rows to the store payload expected by bulk import', () => {
    const row = {
      Name: 'Supplier A',
      Address: '123 Main St',
      Phone: '9876543210',
      Active: 'Yes'
    };

    const payload = mapExcelRowToStore(row, ['Name', 'Address', 'Phone', 'Active']);

    expect(payload).toEqual({
      name: 'Supplier A',
      address: '123 Main St',
      contact_number: '9876543210',
      is_active: true
    });
  });

  it('validates store import headers and reports missing columns', () => {
    const validation = validateStoreExcelImportHeaders(['Name', 'Address', 'Phone']);

    expect(validation.isValid).toBe(true);
    expect(validation.missingColumns).toEqual([]);
  });

  it('returns the stock import template columns', () => {
    const stockColumns = getRequiredStockImportColumns();

    expect(stockColumns).toEqual([
      { key: 'item_name', label: 'Item Name', aliases: ['item name', 'material name', 'raw material'] },
      { key: 'quantity', label: 'Quantity Received', aliases: ['quantity', 'quantity received', 'received quantity', 'qty'] },
      { key: 'unit_price', label: 'Unit Price', aliases: ['unit price', 'price', 'unit_price', 'rate', 'cost per unit'] },
      { key: 'purchase_date', label: 'Purchase Date', aliases: ['purchase date', 'date', 'received date'], optional: true },
      { key: 'expiry_date', label: 'Expiry Date', aliases: ['expiry date', 'expiration date', 'expiry', 'expiration'], optional: true }
    ]);
  });

  it('maps Excel rows to the stock payload expected by bulk import', () => {
    const row = {
      'Item Name': 'Rice',
      'Quantity Received': 50,
      'Unit Price': 60,
      'Purchase Date': '2026-07-01',
      'Expiry Date': '2027-07-01'
    };

    const payload = mapExcelRowToStock(row, ['Item Name', 'Quantity Received', 'Unit Price', 'Purchase Date', 'Expiry Date']);

    expect(payload).toEqual({
      item_name: 'Rice',
      quantity: 50,
      unit_price: 60,
      purchase_date: '2026-07-01',
      expiry_date: '2027-07-01'
    });
  });

  it('validates stock import headers and reports missing columns', () => {
    const validation = validateStockExcelImportHeaders(['Item Name', 'Quantity Received', 'Unit Price']);

    expect(validation.isValid).toBe(true);
    expect(validation.missingColumns).toEqual([]);
  });
});

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

    expect(columns).toEqual([
      { key: 'name', label: 'Name', aliases: ['name', 'student name', 'student_name'] },
      { key: 'roll_number', label: 'Roll Number', aliases: ['roll number', 'roll_number', 'roll no', 'rollno', 'roll_no'] },
      { key: 'college', label: 'College', aliases: ['college', 'college name', 'campus'] },
      { key: 'requires_bed', label: 'Hosteller', aliases: ['hosteller', 'requires bed', 'requires_bed', 'is hosteller'] }
    ]);
  });

  it('maps Excel rows to the student payload expected by the backend', () => {
    const row = {
      Name: 'Arun Kumar',
      'Roll Number': '20240010',
      College: 'NEC',
      Hosteller: 'YES'
    };

    const payload = mapExcelRowToStudent(row, ['Name', 'Roll Number', 'College', 'Hosteller']);

    expect(payload).toEqual({
      userName: 'Arun Kumar',
      roll_number: '20240010',
      college: 'NEC',
      requires_bed: true
    });
  });

  it('validates the required Excel headers and reports missing ones', () => {
    const validation = validateExcelImportHeaders(['Name', 'Roll Number', 'Hosteller']);

    expect(validation.isValid).toBe(false);
    expect(validation.missingColumns).toEqual(['College']);
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

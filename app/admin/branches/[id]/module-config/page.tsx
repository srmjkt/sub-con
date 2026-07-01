"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

// --- Types Definition ---

/** Defines a single custom field schema. */
export type CustomField = {
  id: string // Unique ID (UUID) - DO NOT change this on reorder or name change
  fieldName: string // Key used to look up the data column (This can be edited)
  fieldLabel: string
  fieldType: "text" | "textarea" | "date" | "select" | "number"
  isRequired: boolean
  options?: string | null 
  order: number
  colSpan?: number
  optionColors?: Record<string, string> // Maps option value to color (e.g., { "Low": "#10b981", "High": "#ef4444" })
}

/** Defines the full module configuration schema. */
export interface ModuleConfig {
  id: string
  module: string 
  isEnabled: boolean
  customFields: CustomField[]
}

// --- Constants and Helpers ---

/**
 * Defines default schema fields for various modules. 
 * Used to initialize state if no data is found or when creating a new module structure.
 */
const DEFAULT_MODULE_FIELDS: Record<string, { fieldName: string; fieldLabel: string; fieldType: "text" | "textarea" | "date" | "select" | "number" ; isRequired: boolean; colSpan?: number; options?: string; optionColors?: Record<string, string> }[]> = {
  incidents: [
    { fieldName: "incidentReportNumber", fieldLabel: "Incident Report Number", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "title", fieldLabel: "Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "severity", fieldLabel: "Severity", fieldType: "select", isRequired: true, colSpan: 1, options: "Low\nMedium\nHigh\nCritical", optionColors: { 'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444', 'Critical': '#7f1d1d' } },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1, options: "Open\nInvestigating\nResolved\nClosed", optionColors: { 'Open': '#3b82f6', 'Investigating': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#6b7280' } },
    { fieldName: "location", fieldLabel: "Location", fieldType: "text", isRequired: false, colSpan: 1 },
  ],
  attendance: [
    { fieldName: "employeeName", fieldLabel: "Employee Name", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1, options: "Present\nAbsent\nLate\nExcused", optionColors: { 'Present': '#10b981', 'Absent': '#ef4444', 'Late': '#f59e0b', 'Excused': '#3b82f6' } },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  trainings: [
    { fieldName: "title", fieldLabel: "Training Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "duration", fieldLabel: "Duration", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "trainer", fieldLabel: "Trainer", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1, options: "Scheduled\nIn Progress\nCompleted\nCancelled", optionColors: { 'Scheduled': '#3b82f6', 'In Progress': '#f59e0b', 'Completed': '#10b981', 'Cancelled': '#ef4444' } },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "participants", fieldLabel: "Participants", fieldType: "number", isRequired: false, colSpan: 1 },
  ],
  simulations: [
    { fieldName: "title", fieldLabel: "Simulation Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "scenario", fieldLabel: "Scenario", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "participants", fieldLabel: "Participants", fieldType: "number", isRequired: false, colSpan: 1 },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false, colSpan: 1, options: "Pass\nFail\nPartial", optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  mock_drills: [
    { fieldName: "title", fieldLabel: "Drill Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "drillType", fieldLabel: "Drill Type", fieldType: "select", isRequired: true, colSpan: 1, options: "Fire\nEvacuation\nEarthquake\nFirst Aid\nSecurity", optionColors: { 'Fire': '#ef4444', 'Evacuation': '#f59e0b', 'Earthquake': '#dc2626', 'First Aid': '#3b82f6', 'Security': '#8b5cf6' } },
    { fieldName: "participants", fieldLabel: "Participants", fieldType: "number", isRequired: false, colSpan: 1 },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false, colSpan: 1, options: "Pass\nFail\nPartial", optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  inventory: [
    { fieldName: "itemName", fieldLabel: "Item Name", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "quantity", fieldLabel: "Quantity", fieldType: "number", isRequired: true, colSpan: 1 },
    { fieldName: "unit", fieldLabel: "Unit", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "category", fieldLabel: "Category", fieldType: "select", isRequired: false, colSpan: 1, options: "Equipment\nSupplies\nSafety\nMedical\nTools", optionColors: { 'Equipment': '#6b7280', 'Supplies': '#3b82f6', 'Safety': '#10b981', 'Medical': '#ef4444', 'Tools': '#f59e0b' } },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1, options: "Available\nLow Stock\nOut of Stock\nMaintenance", optionColors: { 'Available': '#10b981', 'Low Stock': '#f59e0b', 'Out of Stock': '#ef4444', 'Maintenance': '#8b5cf6' } },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
}

/**
 * Defines the input component based on the custom field's declared type.
 */
const FieldInputComponent: React.FC<{ customField: CustomField; initialValue?: string | number | null }> = ({ customField, initialValue }) => {
  const value = initialValue ?? null;

  // Handle basic input types (text, number)
  if (customField.fieldType === "text" || customField.fieldType === "number") {
    return <input 
      type={customField.fieldType} 
      value={String(value ?? '')} 
      onChange={(e) => console.log(`${customField.fieldName} change`, e.target.value)} 
      className="border border-gray-300 p-2 rounded w-full" 
      required={customField.isRequired}
    />;
  }

  // Handle Textarea type
  if (customField.fieldType === "textarea") {
    return <textarea 
      rows={1} 
      value={String(value ?? '')} 
      onChange={(e) => console.log(`${customField.fieldName} change`, e.target.value)} 
      className="border border-gray-300 p-2 rounded w-full" 
      required={customField.isRequired}
    />;
  }

  // Handle Date type
  if (customField.fieldType === "date") {
    return <input 
      type="date" 
      value={(value ? String(value) : '')} 
      onChange={(e) => console.log(`${customField.fieldName} change`, e.target.value)} 
      className="border border-gray-300 p-2 rounded w-full" 
      required={customField.isRequired}
    />;
  }

  // Handle Select type
  if (customField.fieldType === "select") {
    return (
      <select 
        value={String(value ?? '')} 
        onChange={(e) => console.log(`${customField.fieldName} change`, e.target.value)}
        className="border border-gray-300 p-2 rounded w-full" 
        required={customField.isRequired}
      >
        <option value="">Select an option</option>
        {/* Placeholder options - should be dynamically loaded */}
        {['Option A', 'Option B', 'Option C'].map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  // Fallback for unsupported types
  return <p className="text-red-500">Unsupported field type: {customField.fieldType}</p>;
};


/** 
 * Drag and Drop Context Menu/Header component (draggable) 
 */
const FieldDragItem: React.FC<{ customField: CustomField }> = ({ customField }) => {
    // Using a placeholder element for the drag source.
  return (
      <div 
        className="cursor-move p-2 border-b border-gray-100 hover:bg-blue-50 transition flex items-center justify-between group"
        data-id={customField.id}
      >
          <div className="flex items-center space-x-3">
            {/* Drag Handle */}
            <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
            <span className={`font-medium ${customField.fieldName === 'title' ? 'text-indigo-700' : ''}`}>{customField.fieldLabel}</span>
          </div>
          <div className="flex space-x-3 text-sm">
             {/* Placeholder for actions (e.g., delete/settings) */}
             <button 
                onClick={() => console.log('Settings clicked for', customField.fieldName)}
                className="text-gray-500 hover:text-indigo-600"
            >
                 ⚙️
            </button>
        </div>
      </div>
  );
};


/** 
 * Component for editing select options and their colors with a compact popup color picker.
 */
const SelectOptionsEditor: React.FC<{
  customField: CustomField;
  onOptionsChange: (id: string, options: string) => void;
  onOptionColorChange?: (fieldId: string, optionValue: string, color: string) => void;
  colorPickerFieldId: string | null;
  setColorPickerFieldId: (id: string | null) => void;
}> = ({ customField, onOptionsChange, onOptionColorChange, colorPickerFieldId, setColorPickerFieldId }) => {
  const isColorPickerOpen = colorPickerFieldId === customField.id;
  const options = (customField.options || '').split('\n').filter(opt => opt.trim());

  return (
    <div className="mb-3 p-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5">
      <label className="block text-xs font-medium text-cyan-300 mb-2">Select Options</label>

      <textarea
        value={customField.options || ''}
        onChange={(e) => onOptionsChange(customField.id, e.target.value)}
        placeholder="Option 1&#10;Option 2&#10;Option 3"
        rows={3}
        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none"
      />
      <p className="text-xs text-slate-500 mt-1">Enter each option on a new line.</p>

      {/* Compact Color Palette Button */}
      {options.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setColorPickerFieldId(customField.id)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition w-full"
          >
            <span className="flex items-center gap-1.5 flex-1 flex-wrap">
              {options.map((opt, i) => {
                const color = customField.optionColors?.[opt.trim()] || '#6b7280';
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium"
                    style={{ borderColor: color + '60', backgroundColor: color + '20', color }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {opt.trim()}
                  </span>
                );
              })}
            </span>
            <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        </div>
      )}

      {/* Color Picker Popup */}
      {isColorPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setColorPickerFieldId(null)}>
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">Customize Colors</h4>
              <button
                type="button"
                onClick={() => setColorPickerFieldId(null)}
                className="text-slate-400 hover:text-white transition text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {options.map((opt, i) => {
                const optionColor = customField.optionColors?.[opt.trim()] || '#6b7280';
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-white/10 bg-white/5">
                    <div className="relative">
                      <input
                        type="color"
                        value={optionColor}
                        onChange={(e) => onOptionColorChange && onOptionColorChange(customField.id, opt.trim(), e.target.value)}
                        className="h-9 w-9 rounded-lg border-2 border-white/20 cursor-pointer"
                      />
                      <div
                        className="absolute inset-0 rounded-lg pointer-events-none border-2 border-white/30"
                        style={{ backgroundColor: optionColor + '40' }}
                      />
                    </div>
                    <span
                      className="flex-1 px-3 py-1.5 rounded-lg border text-sm font-semibold"
                      style={{
                        backgroundColor: optionColor + '30',
                        borderColor: optionColor,
                        color: optionColor
                      }}
                    >
                      {opt.trim()}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setColorPickerFieldId(null)}
              className="mt-4 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** 
 * Component responsible for displaying, editing, and ordering the fields (Drop zone)
 * Matches the incident form layout with inline editing and integrated drag-and-drop
 */
const FieldListContainer: React.FC<{
    fields: CustomField[]; 
    onNameChange: (id: string, newName: string) => void;
    onFieldTypeChange?: (id: string, fieldType: CustomField['fieldType']) => void;
    onColSpanChange?: (id: string, colSpan: number) => void;
    onDeleteField?: (id: string) => void;
    onReorder?: (fields: CustomField[]) => void;
    onOptionsChange?: (id: string, options: string) => void;
    onOptionColorChange?: (fieldId: string, optionValue: string, color: string) => void;
}> = ({ fields, onNameChange, onFieldTypeChange, onColSpanChange, onDeleteField, onReorder, onOptionsChange, onOptionColorChange }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [colorPickerFieldId, setColorPickerFieldId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || !onReorder) return;
    
    const draggedIndex = fields.findIndex(f => f.id === draggedId);
    const targetIndex = fields.findIndex(f => f.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newFields = [...fields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, removed);
    
    // Update order property
    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index
    }));
    
    onReorder(reorderedFields);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const fieldTypes: CustomField['fieldType'][] = ['text', 'textarea', 'date', 'select', 'number'];

  return (
      <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden">
          {fields.length === 0 && (
              <div className='p-8 text-center'>
                  <p className='text-slate-400'>No custom fields configured for this module.</p>
              </div>
          )}
          
          {/* Form Fields Grid - Matching incidents page layout with 2 columns */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((customField) => {
                const colSpan = customField.colSpan === 2 ? 'md:col-span-2' : '';
                const isDragging = draggedId === customField.id;
                const isDragOver = dragOverId === customField.id;
                
                return (
                  <div 
                    key={customField.id} 
                    className={colSpan}
                    draggable
                    onDragStart={(e) => handleDragStart(e, customField.id)}
                    onDragOver={(e) => handleDragOver(e, customField.id)}
                    onDrop={(e) => handleDrop(e, customField.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={`rounded-xl border p-4 transition ${
                      isDragging ? 'border-cyan-400/50 bg-cyan-400/10 opacity-50' : 
                      isDragOver ? 'border-cyan-400/50 bg-cyan-400/10' : 
                      'border-white/10 bg-white/5 hover:border-white/20'
                    }`}>
                      {/* Top Controls */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="cursor-move flex items-center space-x-2 text-slate-500 hover:text-cyan-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                          <span className="text-xs">Drag to reorder</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Column Span Toggle Button */}
                          {onColSpanChange && (
                            <button
                              onClick={() => onColSpanChange(customField.id, customField.colSpan === 2 ? 1 : 2)}
                              className="text-xs px-2 py-1 rounded border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                              title={customField.colSpan === 2 ? "Switch to 1 column" : "Switch to 2 columns"}
                            >
                              {customField.colSpan === 2 ? "1 Col" : "2 Col"}
                            </button>
                          )}
                          
                          {/* Delete Button */}
                          {onDeleteField && (
                            <button
                              onClick={() => onDeleteField(customField.id)}
                              className="text-xs px-2 py-1 rounded border border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20 transition"
                              title="Delete field"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field Label */}
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {customField.fieldLabel}{customField.isRequired ? " *" : ""}
                      </label>
                      
                      {/* Field Name Editor */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2">
                          <input 
                            id={`field-name-${customField.id}`}
                            type="text" 
                            value={customField.fieldName} 
                            onChange={(e) => onNameChange(customField.id, e.target.value)} 
                            className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-white flex-grow focus:border-cyan-400/50 focus:outline-none"
                            placeholder="Field name (used in database)"
                          />
                          <span className="text-xs text-cyan-400 whitespace-nowrap">({customField.fieldName})</span>
                        </div>
                      </div>

                      {/* Field Type Selector */}
                      {onFieldTypeChange && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Field Type</label>
                          <select
                            value={customField.fieldType}
                            onChange={(e) => onFieldTypeChange(customField.id, e.target.value as CustomField['fieldType'])}
                            className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                          >
                            {fieldTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Select Options Editor - Only shown when field type is "select" */}
                      {customField.fieldType === 'select' && onOptionsChange && (
                        <SelectOptionsEditor
                          customField={customField}
                          onOptionsChange={onOptionsChange}
                          onOptionColorChange={onOptionColorChange}
                          colorPickerFieldId={colorPickerFieldId}
                          setColorPickerFieldId={setColorPickerFieldId}
                        />
                      )}
                      
                      {/* Field Type Badge and Info (shown when not editing) */}
                      {!onFieldTypeChange && (
                        <div className="flex items-center space-x-2">
                          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300">
                            {customField.fieldType}
                          </span>
                          <span className="text-xs text-slate-500">
                            Required: {String(customField.isRequired) === 'true' ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
  );
};


/** 
 * The main component handling module configuration for a specific branch.
 */
const BranchModuleConfigPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    // We use the UUID from params if available, otherwise default to 'unknown' or pass it down.
    const branchId = Array.isArray(params.id) ? params.id[0] : (typeof params.id === 'string' && params.id) || "UNKNOWN_BRANCH";

    // --- State Initialization and Lifecycle ---
    const [allModuleConfigs, setAllModuleConfigs] = useState<ModuleConfig[]>([]);
    const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleName, setNewModuleName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all module configs for this branch
    useEffect(() => {
        if (branchId === "UNKNOWN_BRANCH") return;

        const fetchModuleConfigs = async () => {
            try {
                const response = await fetch(`/api/admin/branches/${branchId}/module-config`);
                if (response.ok) {
                    const data = await response.json();
                    let configs = data.configs || [];
                    
                    // Merge with default field definitions to ensure options and colors are populated
                    // Also add any missing default fields so admin has full control over all fields
                    configs = configs.map((config: ModuleConfig) => {
                        const defaultFields = DEFAULT_MODULE_FIELDS[config.module];
                        if (defaultFields && defaultFields.length > 0) {
                            // Create a map of existing custom fields by fieldName
                            const existingFieldsMap = new Map(
                                config.customFields.map(f => [f.fieldName, f])
                            );
                            
                            // Merge defaults with existing fields, adding any missing defaults
                            const allFields = defaultFields.map((defaultField, index) => {
                                const existingField = existingFieldsMap.get(defaultField.fieldName);
                                if (existingField) {
                                    // Merge existing field with defaults (preserve customizations but enforce default order)
                                    return {
                                        ...existingField,
                                        options: defaultField.options || existingField.options,
                                        optionColors: existingField.optionColors || defaultField.optionColors || {},
                                        order: index
                                    };
                                } else {
                                    // Create new field from default (admin hasn't customized it yet)
                                    return {
                                        id: `default-${Date.now()}-${Math.random()}-${index}`,
                                        fieldName: defaultField.fieldName,
                                        fieldLabel: defaultField.fieldLabel,
                                        fieldType: defaultField.fieldType,
                                        isRequired: defaultField.isRequired,
                                        options: defaultField.options || null,
                                        optionColors: defaultField.optionColors || {},
                                        order: index,
                                        colSpan: defaultField.colSpan || 1
                                    };
                                }
                            });
                            
                            return { ...config, customFields: allFields };
                        }
                        return config;
                    });
                    
                    setAllModuleConfigs(configs);
                    
                    // Select the first module by default if available
                    if (configs.length > 0) {
                        setSelectedModule(configs[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch module configs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModuleConfigs();
    }, [branchId]);

    // Update selected module when allModuleConfigs changes
    useEffect(() => {
        if (allModuleConfigs.length > 0 && !selectedModule) {
            setSelectedModule(allModuleConfigs[0]);
        }
    }, [allModuleConfigs, selectedModule]);

    // --- Handlers ---

    /** Handles module toggle state change */
    const handleModuleToggle = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedModule) return;

        const updatedConfig = { ...selectedModule, isEnabled: event.target.checked };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));

        // Save to backend
        try {
            await fetch(`/api/admin/branches/${branchId}/module-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module: updatedConfig.module,
                    isEnabled: updatedConfig.isEnabled,
                    customFields: updatedConfig.customFields
                })
            });
        } catch (error) {
            console.error('Failed to save module toggle:', error);
        }
    }, [selectedModule, branchId]);

    /** Updates a custom field's name */
    const handleFieldNameChange = useCallback((id: string, newName: string) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.map(field => 
                field.id === id ? { ...field, fieldName: newName } : field
            )
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Handles field reordering */
    const handleFieldReorder = useCallback((reorderedFields: CustomField[]) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: reorderedFields
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Updates a custom field's column span */
    const handleColSpanChange = useCallback((id: string, colSpan: number) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.map(field => 
                field.id === id ? { ...field, colSpan } : field
            )
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Updates a custom field's type */
    const handleFieldTypeChange = useCallback((id: string, fieldType: CustomField['fieldType']) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.map(field => 
                field.id === id ? { ...field, fieldType } : field
            )
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Updates select options for a custom field */
    const handleOptionsChange = useCallback((id: string, options: string) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.map(field => 
                field.id === id ? { ...field, options } : field
            )
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Updates color for a specific option in a select field */
    const handleOptionColorChange = useCallback((fieldId: string, optionValue: string, color: string) => {
        if (!selectedModule) return;

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.map(field => 
                field.id === fieldId 
                    ? { 
                        ...field, 
                        optionColors: { 
                            ...(field.optionColors || {}), 
                            [optionValue]: color 
                        } 
                    } 
                    : field
            )
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Deletes a custom field */
    const handleDeleteField = useCallback((fieldId: string) => {
        if (!selectedModule) return;
        
        if (!confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
            return;
        }

        const updatedConfig = {
            ...selectedModule,
            customFields: selectedModule.customFields.filter(field => field.id !== fieldId)
        };
        setSelectedModule(updatedConfig);
        
        // Update in the list
        setAllModuleConfigs(prev => prev.map(m => 
            m.id === updatedConfig.id ? updatedConfig : m
        ));
    }, [selectedModule]);

    /** Save current module configuration */
    const handleSave = useCallback(async () => {
        if (!selectedModule) return;

        try {
            const response = await fetch(`/api/admin/branches/${branchId}/module-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module: selectedModule.module,
                    isEnabled: selectedModule.isEnabled,
                    customFields: selectedModule.customFields
                })
            });

            if (response.ok) {
                alert(`Module configuration for ${selectedModule.module} saved successfully!`);
                // Refresh the list
                const data = await response.json();
                setAllModuleConfigs(prev => prev.map(m => 
                    m.id === data.config.id ? data.config : m
                ));
            } else {
                alert('Failed to save module configuration');
            }
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save module configuration');
        }
    }, [selectedModule, branchId]);

    /** Add a new module */
    const handleAddModule = useCallback(async () => {
        if (!newModuleName.trim()) return;

        try {
            const response = await fetch(`/api/admin/branches/${branchId}/module-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module: newModuleName.toLowerCase().replace(/\s+/g, '_'),
                    isEnabled: true,
                    customFields: []
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAllModuleConfigs(prev => [...prev, data.config]);
                setSelectedModule(data.config);
                setNewModuleName('');
                setIsAddingModule(false);
            } else {
                alert('Failed to add module');
            }
        } catch (error) {
            console.error('Failed to add module:', error);
            alert('Failed to add module');
        }
    }, [newModuleName, branchId]);

    /** Delete all modules */
    const handleDeleteAllModules = useCallback(async () => {
        if (!confirm(`Are you sure you want to delete ALL ${allModuleConfigs.length} modules? This action cannot be undone.`)) {
            return;
        }

        try {
            const deletePromises = allModuleConfigs.map(config => 
                fetch(`/api/admin/branches/${branchId}/module-config?module=${config.module}`, {
                    method: 'DELETE'
                })
            );

            const responses = await Promise.all(deletePromises);
            const allSuccessful = responses.every(res => res.ok);

            if (allSuccessful) {
                setAllModuleConfigs([]);
                setSelectedModule(null);
                alert('All modules deleted successfully');
            } else {
                alert('Failed to delete some modules');
            }
        } catch (error) {
            console.error('Failed to delete all modules:', error);
            alert('Failed to delete all modules');
        }
    }, [branchId, allModuleConfigs]);

    /** Delete a module */
    const handleDeleteModule = useCallback(async (moduleConfigToDelete: ModuleConfig) => {
        if (!confirm(`Are you sure you want to delete the "${moduleConfigToDelete.module}" module? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/branches/${branchId}/module-config?module=${moduleConfigToDelete.module}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setAllModuleConfigs(prev => prev.filter(m => m.id !== moduleConfigToDelete.id));
                if (selectedModule?.id === moduleConfigToDelete.id) {
                    setSelectedModule(allModuleConfigs.find(m => m.id !== moduleConfigToDelete.id) || null);
                }
            } else {
                alert('Failed to delete module');
            }
        } catch (error) {
            console.error('Failed to delete module:', error);
            alert('Failed to delete module');
        }
    }, [branchId, selectedModule, allModuleConfigs]);

    const handleCancel = useCallback(() => {
      // Navigate back to the branches list
      router.push('/admin/branches');
    }, [router]);

  // Drag and drop handlers removed


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading module configurations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role="ADMIN" />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Module Configuration</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Configure and manage modules across all branches
                </p>
              </div>
            </div>
          </section>

          {/* Module List Section */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Modules</h2>
              <div className="flex space-x-2">
                {allModuleConfigs.length > 1 && (
                  <button
                    onClick={handleDeleteAllModules}
                    className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 font-medium text-red-200 transition hover:bg-red-400/20"
                  >
                    Delete All
                  </button>
                )}
                {!isAddingModule ? (
                  <button
                    onClick={() => setIsAddingModule(true)}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    + Add Module
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newModuleName}
                      onChange={(e) => setNewModuleName(e.target.value)}
                      placeholder="Module name (e.g., reports)"
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddModule()}
                    />
                    <button
                      onClick={handleAddModule}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingModule(false);
                        setNewModuleName('');
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-slate-400 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {allModuleConfigs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No modules configured yet. Add your first module to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allModuleConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={`rounded-2xl border p-4 cursor-pointer transition ${
                      selectedModule?.id === config.id
                        ? 'border-cyan-400/50 bg-cyan-400/10'
                        : 'border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedModule(config)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-white capitalize">{config.module}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {config.customFields.length} custom field{config.customFields.length !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-block rounded-full border px-2 py-1 text-xs font-semibold ${
                            config.isEnabled
                              ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300'
                              : 'border-slate-700/50 bg-slate-900/30 text-slate-300'
                          }`}>
                            {config.isEnabled ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(config);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete module"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Module Editor Section */}
          {selectedModule ? (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white capitalize">Configure: {selectedModule.module}</h2>
              </div>

              {/* Global Module Toggle */}
              <div className="flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-white/5 mb-8">
                <div>
                    <h3 className='text-xl font-medium text-white'>Module Status</h3>
                    <p className='text-slate-400'>Toggle the visibility and editability of this module's configuration.</p>
                </div>
                <div className="flex items-center space-x-4">
                  <label htmlFor="moduleEnabled" className="cursor-pointer text-slate-300">Module Active</label>
                  <input 
                    id="moduleEnabled"
                    type="checkbox" 
                    checked={selectedModule.isEnabled}
                    onChange={handleModuleToggle} 
                    className="h-5 w-5 rounded border-white/10 bg-slate-950/50 text-cyan-400 focus:ring-cyan-400/50"
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                {/* Left Column: Configuration/Editor (Takes 2/3 width on large screens) */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">Configure Custom Fields</h3>
                  
                  {/* Field List Container - Now with 2-column grid layout, inline editing, drag-and-drop, delete, type change, and options editor */}
                   <FieldListContainer 
                      fields={selectedModule.customFields} 
                      onNameChange={handleFieldNameChange}
                      onFieldTypeChange={handleFieldTypeChange}
                      onColSpanChange={handleColSpanChange}
                      onDeleteField={handleDeleteField}
                      onReorder={handleFieldReorder}
                      onOptionsChange={handleOptionsChange}
                      onOptionColorChange={handleOptionColorChange}
                  />

                  {/* Display/Actions related to the module's configuration */} 
                  <div className='mt-10 p-6 border border-white/10 rounded-2xl bg-white/5'>
                      <h4 className='text-lg font-medium text-white mb-4'>Data Preview (Simulation)</h4>
                      <p className='text-slate-400'>This area would typically display a preview of how the fields appear in data forms or tables.</p>
                  </div>
                </div>

                {/* Right Column: Actions/Summary (Takes 1/3 width on large screens) */}
                <div className="lg:col-span-1">
                  <div className='sticky top-6 space-y-4'> 
                    {/* Save Button */}
                    <button 
                        onClick={handleSave} 
                        className={`w-full py-3 text-white rounded-2xl transition font-medium ${
                          selectedModule.isEnabled 
                            ? 'border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20' 
                            : 'border border-slate-700/50 bg-slate-900/30 cursor-not-allowed opacity-50'
                        }`}
                        disabled={!selectedModule.isEnabled} 
                    >
                        Save Changes
                    </button>
                    {/* Cancel Button */}
                    <button 
                        onClick={handleCancel} 
                        className="w-full py-3 text-white rounded-2xl border border-red-400/30 bg-red-400/10 transition hover:bg-red-400/20 font-medium"
                    >
                        Cancel
                    </button>
                    {/* Placeholder for module switching/settings tabs */} 
                     <div className="border border-white/10 rounded-2xl bg-white/5 p-4">
                         <h4 className='font-semibold text-white mb-2'>Module Actions</h4>
                         <p className='text-sm text-slate-400'>Review dependencies and publishing status here.</p>
                      </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-12 backdrop-blur">
              <div className="text-center">
                <p className="text-slate-400 text-lg">Select a module from the list above to configure its custom fields, or add a new module to get started.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default BranchModuleConfigPage;
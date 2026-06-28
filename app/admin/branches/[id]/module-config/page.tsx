"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from "next/navigation"

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
}

/** Defines the full module configuration schema. */
interface ModuleConfig {
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
const DEFAULT_MODULE_FIELDS: Record<string, { fieldName: string; fieldLabel: string; fieldType: "text" | "textarea" | "date" | "select" | "number" ; isRequired: boolean; colSpan?: number }[]> = {
  incidents: [
    { fieldName: "title", fieldLabel: "Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "severity", fieldLabel: "Severity", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "location", fieldLabel: "Location", fieldType: "text", isRequired: false, colSpan: 1 },
  ],
  attendance: [
    { fieldName: "employeeName", fieldLabel: "Employee Name", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  // ... (rest of DEFAULT_MODULE_FIELDS remain unchanged)
}

/**
 * Defines the input component based on the custom field's declared type.
 */
const FieldInputComponent: React.FC<{ customField: CustomField; initialValue?: any }> = ({ customField, initialValue }) => {
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
 * Component responsible for displaying, editing, and ordering the fields (Drop zone)
 */
const FieldListContainer: React.FC<{
    fields: CustomField[]; 
    onNameChange: (id: string, newName: string) => void;
}> = ({ fields, onNameChange }) => {

  return (
      <div className="border border-gray-200 rounded-lg shadow overflow-hidden bg-white">
          {fields.length === 0 && (
              <p className='p-4 text-center text-gray-500'>No custom fields configured for this module.</p>
          )}
          
          {fields.map((customField, index) => (
              <div 
                  key={customField.id}
                  className="group transition-colors hover:bg-blue-50/50"
                  data-id={customField.id}
                  data-order={index}
              >
                  {/* Actual Field Display and Editing */}
                  <div className="p-4 border-b flex justify-between items-start">
                      {/* Editable Name (Bug Fix 1) */}
                       <div className='flex-grow min-w-[200px]'>
                          <label htmlFor={`field-name-${customField.id}`} className='text-xs font-semibold text-gray-500 block mb-1'>
                              Display Name: {customField.fieldLabel} 
                          </label>
                          <div className="flex items-center space-x-2">
                              <input 
                                  id={`field-name-${customField.id}`}
                                  type="text" 
                                  value={customField.fieldName} 
                                  onChange={(e) => onNameChange(customField.id, e.target.value)} 
                                  className="border border-gray-300 p-1 rounded text-sm flex-grow max-w-[250px]"
                              />
                              <span className='text-xs text-indigo-600'>({customField.fieldName})</span>
                          </div>
                      </div>

                      {/* Field Type and Settings */}
                       <div className="flex flex-col items-end space-y-1 ml-4">
                          <p className='text-sm font-medium'>{customField.fieldType}</p>
                          <p className='text-xs text-gray-500'>Required: {String(customField.isRequired) === 'true' ? 'Yes' : 'No'}</p>
                      </div>
                  </div>

                  {/* Draggable Item (Visual representation of the drag source, for visual feedback only) */}
                   <FieldDragItem 
                       customField={customField} 
                   />
              </div>
          ))}
      </div>
  );
};


/** 
 * The main component handling module configuration for a specific branch.
 */
const BranchModuleConfigPage: React.FC = () => {
    const params = useParams();
    // We use the UUID from params if available, otherwise default to 'unknown' or pass it down.
    const branchId = Array.isArray(params.id) ? params.id[0] : (typeof params.id === 'string' && params.id) || "UNKNOWN_BRANCH";

    // --- State Initialization and Lifecycle ---
    const [moduleConfig, setModuleConfig] = useState<ModuleConfig>({ 
        id: "", 
        module: "incidents", 
        isEnabled: true, 
        customFields: [] 
    });
    // isEditing state removed - not currently used

    // Simulating data fetch based on the branch ID. Use this dependency array instead of just params!
    useEffect(() => {
        if (branchId === "UNKNOWN_BRANCH") return;

      // Simulate loading the configuration for the 'incidents' module based on current branch context.
      const initialIncidentFields: CustomField[] = [
          { id: "uuid-1", fieldName: "title", fieldLabel: "Title", fieldType: "text", isRequired: true, options: null, order: 1, colSpan: 2 },
          { id: "uuid-2", fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: true, options: null, order: 2, colSpan: 2 },
          { id: "uuid-3", fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, options: null, order: 3, colSpan: 1 },
          { id: "uuid-4", fieldName: "severity", fieldLabel: "Severity", fieldType: "select", isRequired: true, options: "Low, Medium, High", order: 4, colSpan: 1 },
          { id: "uuid-5", fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, options: "Open, Closed, Pending", order: 5, colSpan: 1 },
          { id: "uuid-6", fieldName: "location", fieldLabel: "Location", fieldType: "text", isRequired: false, options: null, order: 6, colSpan: 1 },
      ];

      setModuleConfig({
        id: `config-${moduleConfig.module}-main`, // Use a default ID structure for stability
        module: "incidents", 
        isEnabled: true, 
        customFields: initialIncidentFields,
    });
    // Key fix: The dependency array must include branchId to ensure the correct data loads when navigating branches.
  }, [branchId]);


    // --- Handlers (Bug Fixes implemented here) ---

    /** Handles module toggle state change */
    const handleModuleToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setModuleConfig(prev => ({ ...prev, isEnabled: event.target.checked }));
    }, []);

    /** Updates a custom field's name (Bug Fix 2) */
    const handleFieldNameChange = useCallback((id: string, newName: string) => {
        setModuleConfig(prev => ({
            ...prev,
            customFields: prev.customFields.map(field => 
                field.id === id ? { ...field, fieldName: newName } : field
            )
        }));
    }, []);

    // handleUpdateFields removed - drag and drop not fully implemented


    const handleSave = useCallback(async () => {
      // API call to save module config changes (e.g., using /api/admin/branches/[id]/module-config/route.ts)
      console.log("Saving Module Config:", JSON.stringify(moduleConfig, null, 2));
      alert(`Module configuration for ${moduleConfig.module} saved successfully!`);
    }, [moduleConfig]);

    const handleCancel = useCallback(() => {
      // Reload the page or navigate back to reset any changes
      window.location.reload();
    }, []);

  // Drag and drop handlers removed


  return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{`Module Configuration (${moduleConfig.module}/Details)`}</h1>

        {/* Global Module Toggle */}
        <div className="flex items-center justify-between p-4 border rounded bg-white shadow mb-8">
          <div>
              <h2 className='text-xl font-medium'>Module Status</h2>
              <p className='text-gray-500'>Toggle the visibility and editability of this module's configuration.</p>
          </div>
          <div className="flex items-center space-x-4">
            <label htmlFor="moduleEnabled" className="cursor-pointer">Module Active</label>
            <input 
              id="moduleEnabled"
              type="checkbox" 
              checked={moduleConfig.isEnabled}
              onChange={handleModuleToggle} 
              className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column: Configuration/Editor (Takes 2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Configure Custom Fields</h2>
            
            {/* Field List Container - Using a simplified approach for writing the file content */}
             <FieldListContainer 
                fields={moduleConfig.customFields} 
                onNameChange={handleFieldNameChange}
            />

            {/* Display/Actions related to the module's configuration */} 
            <div className='mt-10 p-6 border rounded bg-white shadow'>
                <h3 className='text-xl font-medium mb-4'>Data Preview (Simulation)</h3>
                <p className='text-gray-600'>This area would typically display a preview of how the fields appear in data forms or tables.</p>
            </div>
          </div>

          {/* Right Column: Actions/Summary (Takes 1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <div className='sticky top-6 space-y-4'> 
              {/* Save Button */}
              <button 
                  onClick={handleSave} 
                  className={`w-full py-3 text-white rounded transition ${moduleConfig.isEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'} font-medium`}
                  disabled={!moduleConfig.isEnabled} 
              >
                  Save Changes
              </button>
              {/* Cancel Button */}
              <button 
                  onClick={handleCancel} 
                  className="w-full py-3 text-white rounded transition bg-red-500 hover:bg-red-600 font-medium"
              >
                  Cancel
              </button>
              {/* Placeholder for module switching/settings tabs */} 
               <div className="border p-3 rounded bg-white shadow">
                   <h4 className='font-semibold mb-2'>Module Actions</h4>
                   <p className='text-sm text-gray-500'>Review dependencies and publishing status here.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default BranchModuleConfigPage;

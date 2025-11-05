import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  id: string;
  onFileChange: (file: File) => void;
  disabled?: boolean;
  acceptedFileTypes: string;
  label: string;
  description: string;
  Icon: React.FC;
}

export const UploadIcon: React.FC = () => (
    <svg className="w-12 h-12 mb-4 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2l2-2h4l2 2h2a4 4 0 014 4v5a4 4 0 01-4 4H7z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
    </svg>
);

export const ImageIcon: React.FC = () => (
    <svg className="w-12 h-12 mb-4 text-dark-text-secondary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 1H2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1Z"/>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 13 5.5-5.5a.96.96 0 0 1 1.344 0l1.343 1.343a.96.96 0 0 0 1.343 0L19 7"/>
    </svg>
);


export const FileUpload: React.FC<FileUploadProps> = ({ id, onFileChange, disabled, acceptedFileTypes, label, description, Icon }) => {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file) {
      onFileChange(file);
      setFileName(file.name);
    } else {
        alert('Bitte wählen Sie eine gültige Datei aus.');
    }
  }, [onFileChange]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!disabled) {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
  };

  const baseClasses = "flex justify-center items-center w-full px-8 py-10 border-2 border-dark-border border-dashed rounded-lg cursor-pointer transition-colors duration-200";
  const draggingClasses = "border-brand-purple bg-brand-light/10";
  const defaultClasses = "hover:border-gray-500 hover:bg-dark-border/20";
  const disabledClasses = "cursor-not-allowed bg-gray-800 opacity-50";

  const getClassName = () => {
    if (disabled) return `${baseClasses} ${disabledClasses}`;
    if (dragging) return `${baseClasses} ${draggingClasses}`;
    return `${baseClasses} ${defaultClasses}`;
  }

  return (
    <label
      htmlFor={id}
      className={getClassName()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <Icon />
        <p className="mb-2 text-base text-dark-text-secondary">
          <span className="font-semibold text-brand-light">{label}</span> oder per Drag & Drop ziehen
        </p>
        <p className="text-sm text-dark-text-secondary">{description}</p>
        {fileName && !disabled && <p className="mt-4 text-base font-medium text-green-400">Ausgewählt: {fileName}</p>}
      </div>
      <input id={id} type="file" className="hidden" accept={acceptedFileTypes} onChange={handleChange} disabled={disabled} />
    </label>
  );
};
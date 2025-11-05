import React, { useState, useEffect } from 'react';

interface PromptDisplayProps {
  title: string;
  text: string;
  onTextChange: (newText: string) => void;
  editable?: boolean;
}

const CopyIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
);

const EditIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path>
    </svg>
);

const SaveIcon: React.FC = () => (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
);


export const PromptDisplay: React.FC<PromptDisplayProps> = ({ title, text, onTextChange, editable = true }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  useEffect(() => {
    if (!isEditing) {
      setEditText(text);
    }
  }, [text, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      onTextChange(editText);
    }
    setIsEditing(!isEditing);
  }

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-brand-light">{title}</h3>
        <div className="flex items-center space-x-2">
          {editable && (
             <button
                onClick={handleEditToggle}
                className="p-2 rounded-md bg-dark-border hover:bg-gray-600 text-dark-text transition-colors duration-200"
                aria-label={isEditing ? "Speichern" : "Bearbeiten"}
              >
                {isEditing ? <SaveIcon /> : <EditIcon />}
              </button>
          )}
          <button
            onClick={handleCopy}
            className="p-2 rounded-md bg-dark-border hover:bg-gray-600 text-dark-text transition-colors duration-200"
            aria-label="In die Zwischenablage kopieren"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>
     
      {isEditing ? (
        <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-dark-bg border border-brand-purple rounded-lg p-4 text-dark-text-secondary whitespace-pre-wrap font-mono text-base focus:ring-2 focus:ring-brand-purple focus:outline-none flex-grow"
        />
      ) : (
         <div className="bg-dark-bg border border-dark-border rounded-lg p-4 text-dark-text-secondary whitespace-pre-wrap font-mono text-base flex-grow overflow-y-auto">
            {text}
        </div>
      )}
    </div>
  );
};
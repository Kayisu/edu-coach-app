import React from 'react'; // icons

export const FileAddIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h4.9L13 4.6V13.5A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-11Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M9 1.1V4a1 1 0 0 0 1 1h2.9" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const FolderAddIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M2.5 4.5A1.5 1.5 0 0 1 4 3h2l1 1.5h4.5A1.5 1.5 0 0 1 13 6v5.5A1.5 1.5 0 0 1 11.5 13h-7A1.5 1.5 0 0 1 3 11.5v-7Z" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const RefreshIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.5 8a5.5 5.5 0 0 1-9.4 3.9M2.5 8a5.5 5.5 0 0 1 9.4-3.9" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M11 11v2h-2" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5 5V3h2" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const RenameIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="m9.5 3 3.5 3.5-7 7H2.5v-3.5l7-7Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="m8 4.5 3.5 3.5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const DuplicateIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="3" y="3" width="9" height="9" rx="1.3" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="6" y="6" width="7" height="7" rx="1.1" stroke="currentColor" strokeWidth={strokeWidth} fill="none" />
  </svg>
);

export const DeleteIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 3h4m-6 1h8l-.7 8.2a1 1 0 0 1-1 .9H6.7a1 1 0 0 1-1-.9L5 4Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7 6.5v4m2-4v4" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const CollapseIcon = ({ size = 16, strokeWidth = 1.2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4 4h8" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4 8h8" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4 12h8" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const SearchIcon = ({ size = 14, strokeWidth = 1.1, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M11.5 11.5 14 14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const HomeIcon = ({ size = 20, strokeWidth = 1.5, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    <path d="M9 21V14h6v7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon = ({ size = 20, strokeWidth = 1.5, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    <rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" />
  </svg>
);

export const ExplorerIcon = ({ size = 20, strokeWidth = 1.5, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7 13h4M7 16h7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 16, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon = ({ size = 16, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = ({ size = 16, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const SaveIcon = ({ size = 16, strokeWidth = 1.5, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12.5 14H3.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7l3 3v8a1 1 0 0 1-1 1Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5 14v-4h6v4M5 2v3h4" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

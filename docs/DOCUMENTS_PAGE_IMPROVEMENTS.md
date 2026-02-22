# Documents Page - Text File Filtering Implementation

## Overview

This document describes the improvements made to the Documents page to accept and view only text-based files, excluding images, videos, and binary documents.

## Changes Made

### 1. File Type Validation Utility

**File:** `/src/main/utils/file-type-validator.ts`

A comprehensive validation utility that categorizes files and ensures only text-based formats are accepted:

#### Supported Text File Types

- **Plain Text**: `.txt`, `.text`
- **Markdown**: `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`
- **JavaScript**: `.js`, `.jsx`, `.mjs`, `.cjs`
- **TypeScript**: `.ts`, `.tsx`
- **Web Files**: `.html`, `.htm`, `.css`, `.scss`, `.sass`, `.less`
- **Config Files**: `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`, `.env`
- **XML**: `.xml`, `.xhtml`
- **Python**: `.py`, `.pyw`, `.pyx`, `.pyi`
- **Java**: `.java`, `.class`, `.jar`
- **C#**: `.cs`, `.csx`
- **C/C++**: `.cpp`, `.c`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hxx`
- **Go**: `.go`
- **Rust**: `.rs`
- **PHP**: `.php`, `.phtml`
- **Ruby**: `.rb`, `.rake`, `.gemspec`
- **Shell Scripts**: `.sh`, `.bash`, `.zsh`, `.fish`
- **Data Formats**: `.csv`, `.tsv`, `.sql`
- **Other**: `.rtf`, `.tex`, `.log`, `.gitignore`, `.editorconfig`, etc.

#### Rejected File Types

- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`, `.ico`, `.tiff`, `.psd`, `.raw`, `.heic`, etc.
- **Videos**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`, `.webm`, `.m4v`, `.mpg`, `.mpeg`, etc.
- **Audio**: `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`, `.wma`, `.opus`, etc.
- **Binary Documents**: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, etc.
- **Archives**: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, etc.
- **Executables**: `.exe`, `.dll`, `.so`, `.dylib`, `.bin`, `.iso`

#### Key Functions

```typescript
// Validate a single file
validateTextFile(filePath: string): FileTypeValidationResult

// Validate multiple files
validateTextFiles(filePaths: string[]): { validFiles: string[], invalidFiles: Array<...> }

// Get all supported text extensions
getAllTextExtensions(): string[]

// Get rejected extensions
getRejectedExtensions(): string[]

// Check if an extension is a text file
isTextFileExtension(extension: string): boolean

// Get file type category
getFileTypeCategory(filePath: string): string
```

#### Important Design Decisions

1. **Text files are checked FIRST**: This handles conflicts like `.ts` (TypeScript vs MPEG Transport Stream) by prioritizing code files over media files.

2. **Conservative approach**: Unknown file types are rejected by default for safety.

3. **Clear error messages**: Each rejected file includes a reason explaining why it was rejected.

### 2. Backend IPC Handler Updates

**File:** `/src/main/ipc/DocumentsIpc.ts`

#### Import File Dialog
- Updated file picker filters to show only text file extensions
- Added validation before importing files
- Shows user-friendly error dialog when invalid files are selected
- Logs rejected files with reasons

#### Drag & Drop Import
- Validates all dropped files before import
- Rejects invalid files with detailed error messages
- Provides feedback on which files were rejected and why

#### Key Changes

```typescript
// File picker now filters to text files only
const textExtensions = getAllTextExtensions().map(ext => ext.replace('.', ''))

dialog.showOpenDialog({
  filters: [
    { name: 'Text Files', extensions: textExtensions },
    { name: 'All Files', extensions: ['*'] }
  ]
})

// Validation before import
const { validFiles, invalidFiles } = validateTextFiles(result.filePaths)

// User feedback for rejected files
if (invalidFiles.length > 0) {
  await dialog.showMessageBox({
    type: 'warning',
    title: 'Invalid File Types',
    message: `${invalidFiles.length} file(s) were rejected`,
    detail: fileList
  })
}
```

### 3. Frontend UI Updates

**File:** `/src/renderer/src/pages/DocumentsPage.tsx`

#### Empty State
- Updated to clearly indicate only text files are supported
- Added informative section listing supported file types
- Shows note about rejected file types

#### Drag & Drop Overlay
- Updated messaging to indicate text-only files are accepted
- Added warning about rejected file types

#### Header Section
- Changed subtitle to indicate "Text files only"
- Added error notification component for import failures
- Shows detailed error messages when file validation fails

#### File Type Info Banner
- Added persistent info banner showing:
  - Supported file types (text, code files, etc.)
  - Not supported file types (images, videos, audio, binary)

#### Enhanced File Icons
- Added specific icons for different file types:
  - `FileText` for text and markdown files
  - `FileCode` for programming language files
  - `FileJson` for JSON and config files
  - `Code2` for web files (HTML, CSS)

#### Error Handling
- Added `importError` state to track import failures
- Shows dismissible error notifications
- Clear error messages explaining what went wrong

### 4. Comprehensive Test Suite

**File:** `/tests/unit/main/utils/file-type-validator.test.ts`

- 30 comprehensive test cases covering:
  - All supported text file types
  - All rejected file types (images, videos, audio, binary)
  - Edge cases (no extension, hidden files, multiple dots)
  - Validation functions
  - Helper utilities
  - Error messages

**Test Results**: ✅ All 30 tests passing

## User Experience Flow

### 1. File Picker Import
```
User clicks "Import Files"
  → File dialog opens with text file filter
  → User selects files
  → System validates file types
  → Valid files are imported
  → Invalid files are rejected with error dialog
  → List updates with imported files
```

### 2. Drag & Drop Import
```
User drags files into the page
  → Overlay appears with "text files only" message
  → User drops files
  → System validates file types
  → Valid files are imported
  → Invalid files are rejected with error notification
  → List updates with imported files
```

### 3. Error Feedback
When invalid files are selected/dropped:
- **File Picker**: Modal dialog listing each rejected file with reason
- **Drag & Drop**: Error banner at top of page with detailed message
- **Both**: Clear indication of supported vs rejected file types

## Benefits

### 1. **Data Safety**
- Prevents binary files from corrupting the text-based document system
- Ensures only readable text content is stored

### 2. **User Clarity**
- Clear messaging about what files are supported
- Helpful error messages when unsupported files are selected
- Visual indicators throughout the UI

### 3. **Developer Experience**
- Well-tested validation logic (30 test cases)
- Reusable validation utilities
- Clear separation of concerns
- Comprehensive documentation

### 4. **Performance**
- Fast extension-based validation
- No file content reading required
- Efficient batch validation for multiple files

### 5. **Maintainability**
- Centralized file type definitions
- Easy to add new file types
- Consistent validation across all entry points

## File Structure

```
src/
├── main/
│   ├── ipc/
│   │   └── DocumentsIpc.ts           # Updated with validation
│   └── utils/
│       └── file-type-validator.ts    # New validation utility
└── renderer/
    └── src/
        └── pages/
            └── DocumentsPage.tsx      # Updated UI with feedback

tests/
└── unit/
    └── main/
        └── utils/
            └── file-type-validator.test.ts  # Comprehensive tests
```

## API Documentation

### `validateTextFile(filePath: string)`

Validates if a file is a text-based file by checking its extension.

**Returns:**
```typescript
{
  isValid: boolean
  fileType?: 'text' | 'image' | 'video' | 'audio' | 'binary'
  extension: string
  reason?: string  // Only present if isValid is false
}
```

**Examples:**
```typescript
validateTextFile('script.js')
// { isValid: true, fileType: 'text', extension: '.js' }

validateTextFile('photo.jpg')
// { isValid: false, fileType: 'image', extension: '.jpg',
//   reason: 'Image files (.jpg) are not supported...' }
```

### `validateTextFiles(filePaths: string[])`

Validates multiple files and separates them into valid and invalid groups.

**Returns:**
```typescript
{
  validFiles: string[]
  invalidFiles: Array<{
    path: string
    reason: string
    fileType?: string
  }>
}
```

## Testing

Run the validation tests:
```bash
npm test -- file-type-validator
```

Run all tests:
```bash
npm test
```

## Future Enhancements

### Potential Improvements

1. **MIME Type Detection**
   - Add actual file content analysis for more accurate detection
   - Use libraries like `file-type` for binary inspection

2. **Custom File Type Configuration**
   - Allow users to configure additional allowed extensions
   - Per-workspace file type settings

3. **File Size Limits**
   - Add maximum file size validation
   - Warn users about very large text files

4. **Preview System**
   - Add text file preview in the UI
   - Syntax highlighting for code files

5. **Batch Operations**
   - Bulk import with progress tracking
   - Batch validation with detailed reports

6. **Advanced Filtering**
   - Filter documents by file type category
   - Search within file contents

## Troubleshooting

### File Extension Conflicts

Some extensions have multiple meanings:
- `.ts`: TypeScript (text) vs MPEG Transport Stream (video)
- Solution: Text files are prioritized over media files

### Hidden Files

Files like `.gitignore`, `.env` are treated as text files by default.

### Unknown Extensions

Files with unknown extensions are rejected by default for safety.
To allow new file types, add them to the appropriate category in `TEXT_FILE_EXTENSIONS`.

## Summary

The Documents page now provides a robust, user-friendly system for managing text-based files while clearly excluding images, videos, and binary documents. The implementation includes comprehensive validation, clear user feedback, and extensive test coverage to ensure reliability.

## Key Files Modified

1. **NEW**: `/src/main/utils/file-type-validator.ts` - File validation logic
2. **UPDATED**: `/src/main/ipc/DocumentsIpc.ts` - Backend validation integration
3. **UPDATED**: `/src/renderer/src/pages/DocumentsPage.tsx` - UI improvements and feedback
4. **NEW**: `/tests/unit/main/utils/file-type-validator.test.ts` - Comprehensive test suite

All changes maintain backward compatibility while adding essential validation and user feedback features.

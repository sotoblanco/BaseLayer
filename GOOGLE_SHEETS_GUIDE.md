# Google Sheets Integration Guide

## How to Add Spreadsheet Exercises

The application now supports embedding Google Sheets for spreadsheet-based exercises. This allows students to practice with predefined Excel/Sheets exercises that require them to fill in formulas and complete calculations.

## Setup Instructions

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet with your exercise
3. Pre-fill the necessary data and structure for students
4. Share the sheet with "Anyone with the link can edit" permissions
5. Get the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
   ```

### 2. Add metadata.json to Your Lesson

Create a `metadata.json` file in your lesson directory:

```json
{
  "exercise_type": "spreadsheet",
  "google_sheet_id": "YOUR_SHEET_ID_HERE",
  "copy_on_open": true
}
```

### 3. Directory Structure

```
courses/
└── tinytorch/
    └── chapter1/
        └── lesson_name/
            ├── README.md           # Exercise instructions
            ├── metadata.json       # ← Add this file
            ├── main.py            # Optional: for reference
            └── test.py            # Optional: for reference
```

## Example metadata.json

### For Code Exercises (Default)
```json
{
  "exercise_type": "code",
  "google_sheet_id": null
}
```

### For Spreadsheet Exercises
```json
{
  "exercise_type": "spreadsheet",
  "google_sheet_id": "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P",
  "copy_on_open": true
}
```

### No Google Cloud / Quick Copy Mode
If you don't want to use Google Cloud or a service account, set `copy_on_open: true` and the UI will show a "Make a private copy" button. Clicking it opens Google Sheets' native copy dialog (`https://docs.google.com/spreadsheets/d/{SHEET_ID}/copy`), letting each student save an editable copy to their own Drive.

## Features

✅ **Code Exercises**: Traditional Python/Rust code with tests
✅ **Spreadsheet Exercises**: Embedded Google Sheets for Excel-based learning
✅ **Automatic Detection**: System automatically detects exercise type from metadata.json
✅ **Fallback**: If metadata.json is missing, defaults to "code" exercise type
✅ **Easy Sharing**: Google Sheets link works with any Google account

## Architecture

- **Backend** (`backend/routers/file_courses.py`):
  - Reads `metadata.json` from lesson directories
  - Includes `exercise_type` and `google_sheet_id` in the API response
  
- **Frontend** (`frontend/src/pages/FileCodingPage.tsx`):
  - Detects exercise type from lesson data
  - Displays code editor for "code" type
  - Displays Google Sheets iframe for "spreadsheet" type
  
## Example Spreadsheet Exercise

Create a sheet with:
- **Column A**: inputs or variable names
- **Column B**: student should fill in formulas
- **Column C**: expected outputs (hidden or for reference)

Students then:
1. View the embedded Google Sheet in the exercise panel
2. Fill in the required formulas
3. The sheet auto-calculates as they work

## Tips

- **Pre-populate data** to guide students on what to do
- **Use cell comments** to add hints
- **Lock cells** you don't want students to modify
- **Test all formulas** before sharing with students
- **Use data validation** to help guide correct inputs

## Troubleshooting

### Sheet not showing?
- Verify the `google_sheet_id` is correct
- Ensure the sheet is shared publicly (Anyone with the link)
- Check browser console for iframe errors

### Can't edit the sheet?
- Make sure the sheet permissions allow "edit" access
- Try using the actual Google Sheets link and ensure it works

### Metadata not being read?
- Check the JSON syntax in `metadata.json`
- Ensure the file is in the lesson directory
- Look for console errors in the browser dev tools

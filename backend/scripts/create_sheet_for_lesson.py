"""Create a Google Sheets copy for a lesson and write metadata.json.

Usage:
    python3 create_sheet_for_lesson.py --template TEMPLATE_ID --lesson-path courses/tinytorch/chapter1/lesson0 --title "TinyTorch Lesson 0 Template"

Environment:
    GOOGLE_SERVICE_ACCOUNT_FILE (or SERVICE_ACCOUNT_FILE) must point to a service account JSON key.

This script copies the given template sheet, optionally makes it editable by anyone with the link,
then writes `metadata.json` into the lesson directory with `exercise_type: spreadsheet`,
`google_sheet_id: <new id>`, and `copy_on_open: true`.

Note: You must enable Drive API and Sheets API in the Google Cloud project for the service account,
and share the template sheet with the service account email or make it viewable to the service account.
"""

import os
import json
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", required=True, help="Template spreadsheet ID to copy")
    parser.add_argument("--lesson-path", required=True, help="Path to lesson directory to write metadata.json")
    parser.add_argument("--title", default=None, help="Optional title for the copied sheet")
    parser.add_argument("--make-public", action="store_true", help="Make the copied sheet editable by anyone with the link")
    args = parser.parse_args()

    sa_file = os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE') or os.environ.get('SERVICE_ACCOUNT_FILE')
    if not sa_file:
        print("ERROR: Set GOOGLE_SERVICE_ACCOUNT_FILE or SERVICE_ACCOUNT_FILE to your service account JSON key")
        return

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
    except Exception as e:
        print("ERROR: Missing google client libs. Install: pip install google-api-python-client google-auth")
        print(e)
        return

    creds = Credentials.from_service_account_file(sa_file, scopes=["https://www.googleapis.com/auth/drive"])
    drive = build('drive', 'v3', credentials=creds)

    new_title = args.title or f"copy-{args.template}"
    print(f"Creating copy of template {args.template} as '{new_title}'...")
    copied = drive.files().copy(fileId=args.template, body={"name": new_title}).execute()
    new_id = copied.get('id')
    print(f"Created sheet id: {new_id}")

    if args.make_public:
        try:
            drive.permissions().create(fileId=new_id, body={"type": "anyone", "role": "writer"}).execute()
            print("Made copied sheet editable by anyone with link")
        except Exception as e:
            print(f"Warning: failed to change permissions: {e}")

    # Write metadata.json into lesson path
    lesson_dir = Path(args.lesson_path)
    lesson_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = lesson_dir / 'metadata.json'
    metadata = {
        "exercise_type": "spreadsheet",
        "google_sheet_id": new_id,
        "copy_on_open": True
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    print(f"Wrote metadata.json to {metadata_path}")
    print(f"Open URL: https://docs.google.com/spreadsheets/d/{new_id}/edit")


if __name__ == '__main__':
    main()

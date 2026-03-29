import sqlite3
import os
from pathlib import Path

def get_db_path():
    """Find the database path — works both locally and in Modal/Docker."""
    # Modal/Docker path
    if os.path.exists("/data/database.db"):
        return "/data/database.db"
    # Local dev path (one level up from this scripts directory)
    local_path = Path(__file__).parent.parent / "database.db"
    if local_path.exists():
        return str(local_path)
    return None

def migrate():
    db_path = get_db_path()
    
    if not db_path:
        print("Database not found. Nothing to migrate.")
        return

    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(exercise)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "language" not in columns:
            print("Adding 'language' column to 'exercise' table...")
            cursor.execute("ALTER TABLE exercise ADD COLUMN language VARCHAR DEFAULT 'python'")
            conn.commit()
            print("Migration successful: Added 'language' column.")
        else:
            print("'language' column already exists.")

        if "passing_rule" not in columns:
            print("Adding 'passing_rule' column to 'exercise' table...")
            cursor.execute("ALTER TABLE exercise ADD COLUMN passing_rule VARCHAR DEFAULT 'tests_pass'")
            conn.commit()
            print("Migration successful: Added 'passing_rule' column.")
        else:
            print("'passing_rule' column already exists.")
            
        print("Migration complete.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

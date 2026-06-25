import os
import json
import uuid
import hashlib
from datetime import datetime
from typing import Dict, List, Optional

class UserDatabase:
    """
    Manages the user registration, login, profile updates, and secure hashing.
    Stored in backend/data/users.json
    """
    def __init__(self, data_dir="backend/data"):
        self.data_dir = data_dir
        self.file_path = os.path.join(data_dir, "users.json")
        os.makedirs(data_dir, exist_ok=True)
        if not os.path.exists(self.file_path):
            self._write_db({})

    def _read_db(self) -> dict:
        try:
            with open(self.file_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_db(self, data: dict):
        with open(self.file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def _hash_password(self, password: str, salt: str) -> str:
        # Secure password hashing using SHA256 and unique salt
        salted = (password + salt).encode('utf-8')
        return hashlib.sha256(salted).hexdigest()

    def signup(self, name: str, email: str, password: str) -> Optional[dict]:
        db = self._read_db()
        email_lower = email.strip().lower()
        
        # Check if email exists
        for uid, udata in db.items():
            if udata.get("email", "").lower() == email_lower:
                return None  # Email already registered
        
        user_id = f"usr-{uuid.uuid4().hex[:12]}"
        salt = uuid.uuid4().hex
        hashed_pw = self._hash_password(password, salt)
        
        new_user = {
            "user_id": user_id,
            "name": name,
            "email": email_lower,
            "salt": salt,
            "password_hash": hashed_pw,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_login": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "settings": {
                "theme": "dark",
                "units": "m",
                "exportFormat": "CSV"
            }
        }
        
        db[user_id] = new_user
        self._write_db(db)
        
        # Return user info without salt and password hash
        return {
            "user_id": user_id,
            "name": name,
            "email": email_lower,
            "created_at": new_user["created_at"],
            "last_login": new_user["last_login"],
            "settings": new_user["settings"]
        }

    def login(self, email: str, password: str) -> Optional[dict]:
        db = self._read_db()
        email_lower = email.strip().lower()
        
        for user_id, udata in db.items():
            if udata.get("email", "").lower() == email_lower:
                salt = udata.get("salt", "")
                hashed_input = self._hash_password(password, salt)
                if udata.get("password_hash") == hashed_input:
                    # Update last login
                    udata["last_login"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    db[user_id] = udata
                    self._write_db(db)
                    
                    return {
                        "user_id": user_id,
                        "name": udata["name"],
                        "email": udata["email"],
                        "created_at": udata["created_at"],
                        "last_login": udata["last_login"],
                        "settings": udata["settings"]
                    }
        return None

    def update_profile(self, user_id: str, name: str = None, email: str = None,
                       theme: str = None, units: str = None, role: str = None,
                       company: str = None, old_password: str = None, new_password: str = None) -> bool:
        db = self._read_db()
        if user_id not in db:
            return False
        
        udata = db[user_id]
        
        # Handle optional password change
        if old_password and new_password:
            salt = udata.get("salt", "")
            if udata.get("password_hash") != self._hash_password(old_password, salt):
                return False  # Wrong current password
            new_salt = uuid.uuid4().hex
            udata["salt"] = new_salt
            udata["password_hash"] = self._hash_password(new_password, new_salt)
        
        # Update fields if provided
        if name is not None:
            udata["name"] = name
        if email is not None:
            udata["email"] = email.strip().lower()
        
        # Settings fields
        settings = udata.get("settings", {})
        if theme is not None:
            settings["theme"] = theme
        if units is not None:
            settings["units"] = units
        if role is not None:
            settings["role"] = role
        if company is not None:
            settings["company"] = company
        udata["settings"] = settings
        
        db[user_id] = udata
        self._write_db(db)
        return True

    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        db = self._read_db()
        if user_id in db:
            udata = db[user_id]
            salt = udata.get("salt", "")
            if udata.get("password_hash") == self._hash_password(old_password, salt):
                # Update hash
                new_salt = uuid.uuid4().hex
                db[user_id]["salt"] = new_salt
                db[user_id]["password_hash"] = self._hash_password(new_password, new_salt)
                self._write_db(db)
                return True
        return False

    def reset_password(self, email: str, new_password: str) -> bool:
        db = self._read_db()
        email_lower = email.strip().lower()
        for user_id, udata in db.items():
            if udata.get("email", "").lower() == email_lower:
                new_salt = uuid.uuid4().hex
                db[user_id]["salt"] = new_salt
                db[user_id]["password_hash"] = self._hash_password(new_password, new_salt)
                self._write_db(db)
                return True
        return False

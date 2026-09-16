from pathlib import Path

p = Path('/app/server.py')
s = p.read_text()

s = s.replace(
    'is_admin = user.get("role") == "admin"',
    'is_admin = user.get("role") in {"admin", "super"}'
)

s = s.replace(
    'if user["role"] != "admin":\n        raise HTTPException(403, "Admin access required")',
    'if user["role"] not in {"admin", "super"}:\n        raise HTTPException(403, "Admin access required")'
)

s = s.replace(
    'if target["role"] == "admin":\n            raise HTTPException(403, "Another admin cannot be banned here")',
    'if target["role"] == "super":\n            raise HTTPException(403, "Super account cannot be banned")\n        if target["role"] == "admin":\n            raise HTTPException(403, "Another admin cannot be banned here")'
)

seed = '''        if ADMIN_USERNAME and ADMIN_PASSWORD:\n            cur.execute("SELECT id FROM chat_users WHERE lower(username)=lower(%s)", (ADMIN_USERNAME,))'''
replacement = '''        # Enforce one protected highest-privilege account. Existing admins remain admins.\n        cur.execute("UPDATE chat_users SET role='admin' WHERE role='super' AND lower(username)<>lower('Kyresearcher')")\n        cur.execute("UPDATE chat_users SET role='super' WHERE lower(username)=lower('Kyresearcher')")\n\n        if ADMIN_USERNAME and ADMIN_PASSWORD:\n            cur.execute("SELECT id FROM chat_users WHERE lower(username)=lower(%s)", (ADMIN_USERNAME,))'''
s = s.replace(seed, replacement)

p.write_text(s)

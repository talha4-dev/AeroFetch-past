#!/usr/bin/env python3
"""
EMERGENCY YouTube cookie refresh for Pakistan
"""
import os
import time
from datetime import datetime

def emergency_cookie_refresh():
    print("🔄 EMERGENCY YouTube Cookie Refresh for Pakistan")
    print("==============================================")
    
    # Backup existing cookies
    cookie_file = 'cookies.txt'
    if os.path.exists(cookie_file):
        backup_name = f'cookies_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        os.rename(cookie_file, backup_name)
        print(f"📦 Backed up existing cookies to: {backup_name}")
    
    # Create fresh Pakistan-specific cookies
    with open(cookie_file, 'w') as f:
        f.write("""# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	2147483647	CONSENT	YES+pk+20210328-17-p0.en+FX+100
.youtube.com	TRUE	/	TRUE	2147483647	PREF	f4=4000000&tz=Asia.Karachi&f7=100&gl=PK&hl=en&c=PK
.youtube.com	TRUE	/	TRUE	2147483647	GPS	1
.youtube.com	TRUE	/	TRUE	2147483647	VISITOR_INFO1_LIVE	CkYKUVNFUkNoWk
.youtube.com	TRUE	/	TRUE	2147483647	YSC	AbCDefGHiJKl
""")
    
    print("✅ Fresh Pakistan-specific cookies created")
    print("⚠️  IMPORTANT: You must LOGIN to YouTube and export FRESH cookies")
    print("   using the 'Get cookies.txt' browser extension")
    print("   Replace the auto-generated cookies with your actual login cookies")
    
    return True

if __name__ == "__main__":
    emergency_cookie_refresh()

#!/usr/bin/env python3
"""
Quick test to verify YouTube cookies are working
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.downloader import validate_cookies, get_cookies_path
from config import Config

def test_cookies():
    print("🧪 Testing YouTube cookies configuration...")
    
    cookie_path = get_cookies_path()
    if not cookie_path:
        print("❌ No cookies file found")
        return False
        
    print(f"📁 Cookies file: {cookie_path}")
    
    if validate_cookies(cookie_path):
        print("✅ Cookies validation PASSED - all essential cookies present")
        print("🎯 You should be able to download YouTube videos now!")
        return True
    else:
        print("❌ Cookies validation FAILED - check your cookies file")
        return False

if __name__ == "__main__":
    test_cookies()

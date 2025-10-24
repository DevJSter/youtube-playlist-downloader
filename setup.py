#!/usr/bin/env python3
"""
Setup script for YouTube Playlist Downloader
Automatically installs required dependencies and tools
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            return True
        else:
            print(f"❌ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ {description} failed: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required. Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python version: {version.major}.{version.minor}.{version.micro}")
    return True

def install_python_dependencies():
    """Install Python packages from requirements.txt"""
    requirements_file = Path(__file__).parent / "requirements.txt"
    if not requirements_file.exists():
        print(f"❌ requirements.txt not found")
        return False
    
    command = f"{sys.executable} -m pip install -r {requirements_file}"
    return run_command(command, "Installing Python dependencies")

def install_system_dependencies():
    """Install system dependencies based on the operating system"""
    system = platform.system().lower()
    
    if system == "darwin":  # macOS
        print(f"🍎 Detected macOS")
        # Check if Homebrew is installed
        if run_command("which brew", "Checking for Homebrew"):
            # Install ChromeDriver
            if not run_command("brew list chromedriver", "Checking ChromeDriver"):
                run_command("brew install chromedriver", "Installing ChromeDriver via Homebrew")
            
            # Install yt-dlp
            if not run_command("which yt-dlp", "Checking yt-dlp"):
                run_command("brew install yt-dlp", "Installing yt-dlp via Homebrew")
        else:
            print(f"⚠️  Homebrew not found. Please install manually:")
            print(f"   1. ChromeDriver: Download from https://chromedriver.chromium.org/")
            print(f"   2. yt-dlp: pip install yt-dlp")
    
    elif system == "linux":
        print(f"🐧 Detected Linux")
        # Try to install via apt (Ubuntu/Debian)
        if run_command("which apt", "Checking for apt package manager"):
            run_command("sudo apt update", "Updating package list")
            run_command("sudo apt install -y chromium-chromedriver", "Installing ChromeDriver")
            
            # Install yt-dlp via pip since apt version might be outdated
            run_command(f"{sys.executable} -m pip install --upgrade yt-dlp", "Installing/Upgrading yt-dlp")
        else:
            print(f"⚠️  Please install manually:")
            print(f"   1. ChromeDriver: Use your distribution's package manager")
            print(f"   2. yt-dlp: pip install yt-dlp")
    
    elif system == "windows":
        print(f"🪟 Detected Windows")
        print(f"⚠️  Please install manually:")
        print(f"   1. ChromeDriver: Download from https://chromedriver.chromium.org/")
        print(f"   2. Add ChromeDriver to your PATH")
        print(f"   3. yt-dlp will be installed via pip")
        
        # Install yt-dlp via pip
        run_command(f"{sys.executable} -m pip install --upgrade yt-dlp", "Installing/Upgrading yt-dlp")
    
    else:
        print(f"❓ Unknown operating system: {system}")
        print(f"⚠️  Please install manually:")
        print(f"   1. ChromeDriver for your system")
        print(f"   2. yt-dlp: pip install yt-dlp")

def verify_installation():
    """Verify that all required tools are installed and working"""
    print(f"\n🔍 Verifying installation...")
    
    tools = {
        'chromedriver': 'chromedriver --version',
        'yt-dlp': 'yt-dlp --version'
    }
    
    all_good = True
    for tool, command in tools.items():
        if run_command(command, f"Checking {tool}"):
            continue
        else:
            all_good = False
            print(f"❌ {tool} not found or not working")
    
    # Check Python packages
    try:
        import selenium
        import yt_dlp
        from bs4 import BeautifulSoup
        print(f"✅ All Python packages imported successfully")
    except ImportError as e:
        print(f"❌ Python package import failed: {e}")
        all_good = False
    
    return all_good

def create_example_config():
    """Create an example configuration file"""
    config_content = '''# YouTube Playlist Downloader Configuration
# Edit the playlist URLs below and run: python playlist_downloader.py

PLAYLIST_URLS = [
    "https://youtube.com/playlist?list=YOUR_PLAYLIST_ID_1",
    "https://youtube.com/playlist?list=YOUR_PLAYLIST_ID_2",
    # Add more playlist URLs here
]

# Download options
OPTIONS = {
    "max_retries": 3,
    "delay_between_downloads": 3000,  # milliseconds
    "delay_between_playlists": 5000,  # milliseconds
    "continue_on_error": True,
    "continue_on_playlist_error": True,
    "headless": True,  # Set to False to see browser
    "max_videos": None,  # Set number to limit downloads
    "create_playlist_folder": True,
    "sort_order": "upload"  # "playlist", "upload", "reverse"
}
'''
    
    config_file = Path(__file__).parent / "config_example.py"
    with open(config_file, 'w') as f:
        f.write(config_content)
    print(f"📝 Created example configuration: {config_file}")

def main():
    """Main setup function"""
    print("🎵 YouTube Playlist Downloader - Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install Python dependencies
    if not install_python_dependencies():
        print("❌ Failed to install Python dependencies")
        sys.exit(1)
    
    # Install system dependencies
    install_system_dependencies()
    
    # Verify installation
    if verify_installation():
        print(f"\n🎉 Setup completed successfully!")
        print(f"\n📖 Usage:")
        print(f"   1. Edit playlist URLs in playlist_downloader.py")
        print(f"   2. Run: python playlist_downloader.py")
        print(f"\n💡 Tips:")
        print(f"   - Set headless=False to see the browser in action")
        print(f"   - Use sort_order='upload' for chronological download")
        print(f"   - Check downloads/ folder for your videos")
        
        # Create example config
        create_example_config()
        
    else:
        print(f"\n⚠️  Setup completed with some issues.")
        print(f"Please check the error messages above and install missing components manually.")

if __name__ == "__main__":
    main()
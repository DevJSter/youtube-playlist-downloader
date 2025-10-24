# YouTube Playlist Downloader (Python Version)

A comprehensive Python script for downloading multiple YouTube playlists with advanced features including batch processing, metadata extraction, and robust error handling.

## 🚀 Features

- **Multi-Playlist Batch Download**: Download multiple playlists in a single run
- **Smart Video Extraction**: Uses Selenium WebDriver for reliable playlist parsing
- **High-Quality Downloads**: Uses yt-dlp for best quality video downloads (≤720p)
- **Organized Storage**: Creates individual folders for each playlist
- **Metadata Preservation**: Saves playlist information and video metadata
- **Multiple Sort Orders**: Original playlist order, upload date, or reverse order
- **Resume Capability**: Skips already downloaded videos
- **Progress Tracking**: Real-time download progress and comprehensive summaries
- **Error Resilience**: Continues downloading even if individual videos fail
- **Cleanup Management**: Automatic cleanup of temporary files

## 📋 Prerequisites

### Required Software
- **Python 3.8+**
- **Google Chrome** (for Selenium WebDriver)
- **ChromeDriver** (automatically installed via setup script)
- **yt-dlp** (automatically installed via setup script)

### Required Python Packages
- `selenium` (≥4.15.0)
- `yt-dlp` (≥2023.10.13)
- `beautifulsoup4` (≥4.12.0)
- `lxml` (≥4.9.0)

## 🛠 Installation

### Method 1: Automatic Setup (Recommended)

1. **Clone or download** the script files
2. **Run the setup script**:
   ```bash
   python setup.py
   ```
   This will automatically:
   - Check Python version compatibility
   - Install required Python packages
   - Install system dependencies (ChromeDriver, yt-dlp)
   - Verify the installation
   - Create example configuration files

### Method 2: Manual Installation

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Install ChromeDriver**:
   
   **macOS (with Homebrew)**:
   ```bash
   brew install chromedriver
   ```
   
   **Linux (Ubuntu/Debian)**:
   ```bash
   sudo apt update
   sudo apt install chromium-chromedriver
   ```
   
   **Windows**:
   - Download ChromeDriver from [official site](https://chromedriver.chromium.org/)
   - Add to your system PATH

3. **Install yt-dlp**:
   ```bash
   pip install yt-dlp
   # or via homebrew on macOS:
   brew install yt-dlp
   ```

## 🎯 Usage

### Basic Usage

1. **Edit the playlist URLs** in `playlist_downloader.py`:
   ```python
   playlist_urls = [
       "https://youtube.com/playlist?list=YOUR_PLAYLIST_ID_1",
       "https://youtube.com/playlist?list=YOUR_PLAYLIST_ID_2",
       # Add more URLs here
   ]
   ```

2. **Run the script**:
   ```bash
   python playlist_downloader.py
   ```

### Advanced Configuration

Customize the download behavior by modifying the `options` dictionary:

```python
options = {
    'max_retries': 3,                    # Retry attempts for failed downloads
    'delay_between_downloads': 3000,     # Delay between videos (ms)
    'delay_between_playlists': 5000,     # Delay between playlists (ms)
    'continue_on_error': True,           # Continue if a video fails
    'continue_on_playlist_error': True,  # Continue if a playlist fails
    'headless': True,                    # Hide browser window
    'max_videos': None,                  # Limit videos per playlist
    'create_playlist_folder': True,      # Create individual playlist folders
    'sort_order': 'upload'               # Sort order (see below)
}
```

### Sort Orders

- **`'playlist'`**: Original playlist order (default)
- **`'upload'`**: Chronological order (oldest videos first)
- **`'reverse'`**: Reverse playlist order (newest videos first)

### Download Methods

**Method 1: Multiple Playlists (Recommended)**
```python
result = await downloader.download_multiple_playlists(playlist_urls, **options)
```

**Method 2: Single Playlist**
```python
result = await downloader.download_playlist(playlist_urls[0], **options)
```

## 📁 Output Structure

```
downloads/
├── Playlist Name 1/
│   ├── playlist_info.json          # Playlist metadata
│   ├── Video Title 1.mp4
│   ├── Video Title 2.mp4
│   └── ...
├── Playlist Name 2/
│   ├── playlist_info.json
│   ├── Another Video.mp4
│   └── ...
└── ...
```

### Metadata Files

Each playlist folder contains a `playlist_info.json` with:
- Playlist title and channel information
- Total video count and extraction timestamp
- Complete video list with original indices
- Sort order used for downloads

## 🔧 Troubleshooting

### Common Issues

1. **ChromeDriver not found**:
   ```bash
   # Install ChromeDriver
   brew install chromedriver  # macOS
   sudo apt install chromium-chromedriver  # Linux
   ```

2. **Permission denied (macOS)**:
   ```bash
   # Allow ChromeDriver to run
   xattr -d com.apple.quarantine /usr/local/bin/chromedriver
   ```

3. **yt-dlp download failures**:
   - Update yt-dlp: `pip install --upgrade yt-dlp`
   - Check if videos are available/public
   - Try reducing `max_videos` for testing

4. **Browser automation detection**:
   - Set `headless=False` to see what's happening
   - Check if playlist URLs are correct and public
   - Some playlists may have region restrictions

### Debug Mode

Set `headless=False` to see the browser in action:
```python
options = {
    'headless': False,  # Shows browser window
    # ... other options
}
```

### Log Analysis

The script provides detailed console output:
- 🚀 Browser launch and navigation
- 📜 Video extraction progress
- 🔧 Download method attempts
- ✅ Success/failure counts
- 📊 Final statistics

## 🎨 Features Comparison

| Feature | Python Version | JavaScript Version |
|---------|---------------|-------------------|
| Multi-playlist batch download | ✅ | ✅ |
| Selenium WebDriver | ✅ | ❌ (Uses Puppeteer) |
| yt-dlp integration | ✅ | ✅ |
| Async/await support | ✅ | ✅ |
| Metadata preservation | ✅ | ✅ |
| Sort orders | ✅ | ✅ |
| Progress tracking | ✅ | ✅ |
| Error resilience | ✅ | ✅ |
| Cross-platform | ✅ | ✅ |

## 📊 Performance Tips

1. **Reduce delay times** for faster downloads (but risk rate limiting):
   ```python
   'delay_between_downloads': 1000,  # 1 second instead of 3
   ```

2. **Limit video count** for testing:
   ```python
   'max_videos': 5,  # Download only first 5 videos
   ```

3. **Use headless mode** for better performance:
   ```python
   'headless': True,  # Default setting
   ```

4. **Parallel processing** (advanced users can modify the script for concurrent downloads)

## 🛡 Legal Notice

- Respect YouTube's Terms of Service
- Only download content you have permission to download
- Use responsibly and don't overload YouTube's servers
- Consider supporting content creators through official means

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the script.

## 📜 License

This project is provided as-is for educational purposes. Users are responsible for compliance with applicable laws and terms of service.

---

## 🎉 Quick Start Example

```bash
# 1. Clone/download the files
git clone <repository-url>
cd youtube-playlist-downloader

# 2. Run automatic setup
python setup.py

# 3. Edit playlist URLs in playlist_downloader.py
# 4. Run the downloader
python playlist_downloader.py

# 5. Check the downloads/ folder for your videos!
```

Happy downloading! 🎬
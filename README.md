# YouTube Playlist Downloader

## Description

YouTube Playlist Downloader is a Node.js utility designed to download entire YouTube playlists. It uses Puppeteer to extract video URLs from playlists and **yt-dlp** to download the videos reliably. Videos are organized into folders based on the playlist title and can be downloaded in various orders (playlist order, upload order, or reverse).

## Features

- ✅ Downloads entire YouTube playlists automatically
- 📁 Organizes videos into folders by playlist name
- 📅 Multiple sort options: playlist order, upload date, or reverse
- 🔄 Automatic retry logic with exponential backoff
- 📊 Progress tracking and detailed download statistics
- 🎥 High-quality video downloads (up to 1080p)
- 🧹 Automatic cleanup of temporary files
- 💾 Saves playlist metadata in JSON format
- ⚡ Concurrent fragment downloads for faster speeds
- 🛡️ Robust error handling with helpful messages

## Requirements

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **Node.js**: Version 14.0.0 or higher
- **NPM**: Version 6.0.0 or higher (comes with Node.js)
- **Python**: 3.7+ (for yt-dlp)
- **Browser**: Chromium or Google Chrome (automatically managed by Puppeteer)

### Required Software

1. **yt-dlp** (REQUIRED):
   ```bash
   # macOS (using Homebrew - recommended)
   brew install yt-dlp
   
   # OR using pip
   pip install -U yt-dlp
   
   # Linux (using pip)
   pip install -U yt-dlp
   
   # Windows (using pip)
   pip install -U yt-dlp
   ```
   
   Verify installation: `yt-dlp --version`

2. **Node.js Installation**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

### Node.js Dependencies

The following Node.js packages are required:

- `@distube/ytdl-core`: Backup library (not actively used)
- `puppeteer`: For browser automation to extract playlist data

### Hardware Requirements

- Sufficient disk space for downloaded videos
- Stable internet connection for downloading
- At least 4GB RAM recommended for large playlists

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/DevJSter/youtube-playlist-downloader.git
   cd youtube-playlist-downloader
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. (Optional) If using Bun instead of NPM:
   ```
   bun install
   ```

## Usage

1. Edit the `playlistUrl` variable in `index.js` to the desired YouTube playlist URL.

2. Run the downloader:
   ```
   npm start
   ```
   or
   ```
   node index.js
   ```

3. Videos will be downloaded to the `downloads` folder, organized by playlist name.

### Configuration Options

The script supports the following options (modify in `index.js`):

- `headless`: Set to `false` to run browser in non-headless mode (default: `true`)
- `timeout`: Timeout for page operations in milliseconds (default: `60000`)
- `maxVideos`: Limit the number of videos to download (default: `null` for all)

### Example

```javascript
const options = {
  headless: true,
  timeout: 60000,
  maxVideos: 10  // Download only first 10 videos
};

await extractPlaylistUrls(playlistUrl, options);
```

## Troubleshooting

### Common Issues

1. **Playlist not loading**: Ensure the playlist URL is public and accessible.

2. **Download failures**: Check internet connection and YouTube access.

3. **Browser launch errors**: Ensure sufficient permissions and no conflicting browser instances.

4. **Filename issues**: The script sanitizes filenames, but very long titles may be truncated.

### Error Handling

The script includes retry logic for video info retrieval and handles common YouTube API limitations.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Contributions are welcome. Please fork the repository and submit a pull request.

## Disclaimer

This tool is for educational purposes only. Ensure you comply with YouTube's Terms of Service and copyright laws when downloading content.
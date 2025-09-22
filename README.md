# YouTube Playlist Downloader

## Description

YouTube Playlist Downloader is a Node.js utility designed to download entire YouTube playlists. It uses Puppeteer to extract video URLs from playlists and ytdl-core to download the videos. Videos are organized into folders based on the playlist title and downloaded in the order they appear on YouTube.

## Features

- Downloads entire YouTube playlists automatically
- Organizes videos into folders by playlist name
- Downloads videos in upload order
- Handles large playlists with automatic scrolling to load all videos
- Includes retry logic for robust downloading
- Sanitizes filenames to avoid filesystem issues
- Saves playlist metadata in JSON format

## Requirements

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **Node.js**: Version 14.0.0 or higher
- **NPM**: Version 6.0.0 or higher (comes with Node.js)
- **Browser**: Chromium or Google Chrome (automatically managed by Puppeteer)

### Dependencies

The following Node.js packages are required:

- `@distube/ytdl-core`: For downloading YouTube videos
- `puppeteer`: For browser automation to extract playlist data

### Hardware Requirements

- Sufficient disk space for downloaded videos
- Stable internet connection for downloading
- At least 4GB RAM recommended for large playlists

### Software Prerequisites

1. **Node.js Installation**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **Browser Setup**:
   - Puppeteer automatically downloads Chromium
   - Ensure no firewall blocks browser automation

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
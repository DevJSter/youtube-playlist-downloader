const ytdl = require('@distube/ytdl-core');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Method 1: Download multiple playlists with Puppeteer in upload order with organized folders
const playlistUrls = [
  "https://youtube.com/playlist?list=PLO5VPQH6OWdX-Rh7RonjZhOd9pb9zOnHW&si=fordeuy3g3xBkVqI",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdXR8NlZt0jRbC39W_IyzS-v&si=KQ19RFSLhMBJQ6K3",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdW9b6GKJR4Dt9XZxQlJuVp_&si=mvumkzxglMOSf1Gd",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdVKZKJtTGTB10dDXyMVvPR5&si=Jqu-8Pp_z6glGIG5",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdXp2_Nk8U7V-zh7suI05i0E&si=8MpQLKxLd0563z8U",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdULDcret0S0EYQ7YcKzrigz&si=LoYClaBb6074Ap9t",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdVfvNOaEhBtA53XHyHo_oJo&si=gX31bbmjW8XKq1H6",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdXxQc_1YPa63Ody9LknKW4k&si=u2C4E1wquoSZy9s_",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdXhkOvoptGTyQk3KI2EawUc&si=FuqOQE916BYpyqZQ",
  "https://youtube.com/playlist?list=PLO5VPQH6OWdXFEiSgfL0GoS2fZ3ZNoC0_&si=jKJ1SwF5YUl2UBOD",
  // Add more playlist URLs here
  // "https://youtube.com/playlist?list=ANOTHER_PLAYLIST_ID",
  // "https://youtube.com/playlist?list=YET_ANOTHER_PLAYLIST_ID",
];

// Single playlist URL (for backwards compatibility)
const playlistUrl = playlistUrls[0];

// Folder to save videos
const downloadFolder = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder);

// Helper function to sanitize filename
function sanitizeFilename(filename) {
  return filename.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

// Create temp directory for debug files and clean it up
const tempDir = path.join(__dirname, '.temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Helper function to clean up debug files
function cleanupDebugFiles() {
  try {
    // Clean up HTML and JS debug files from root directory
    const files = fs.readdirSync(__dirname);
    files.forEach(file => {
      if (file.match(/^\d+-.*\.(html|js)$/)) {
        fs.unlinkSync(path.join(__dirname, file));
        console.log(`🧹 Cleaned up: ${file}`);
      }
    });
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir);
      tempFiles.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Helper function to get video info with retry logic
async function getVideoInfo(url, retries = 3) {
  // Change to temp directory to contain debug files
  const originalCwd = process.cwd();
  
  for (let i = 0; i < retries; i++) {
    try {
      process.chdir(tempDir);
      
      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          }
        }
      });
      
      process.chdir(originalCwd);
      return info;
    } catch (error) {
      process.chdir(originalCwd);
      console.log(`Attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i === retries - 1) {
        // Clean up debug files after failure
        cleanupDebugFiles();
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // exponential backoff
    }
  }
}

// Alternative download function using yt-dlp as fallback
async function downloadVideoWithYtDlp(videoUrl, customTitle = null, playlistFolder = null) {
  const { spawn } = require('child_process');
  
  try {
    const outputDir = playlistFolder || downloadFolder;
    const sanitizedTitle = customTitle ? sanitizeFilename(customTitle) : '%(title)s';
    const outputTemplate = path.join(outputDir, `${sanitizedTitle}.%(ext)s`);
    
    console.log(`\n🔧 Trying yt-dlp for: ${videoUrl}`);
    
    return new Promise((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', [
        '--format', 'best[height<=720]',
        '--output', outputTemplate,
        '--no-playlist',
        '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        videoUrl
      ]);
      
      let output = '';
      let errorOutput = '';
      
      ytDlp.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });
      
      ytDlp.on('close', (code) => {
        if (code === 0) {
          console.log(`\n✅ Downloaded with yt-dlp: ${customTitle || 'video'}`);
          resolve({ success: true, skipped: false, title: customTitle || 'video' });
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`yt-dlp failed: ${error.message}`);
  }
}
async function extractPlaylistUrls(playlistUrl, options = {}) {
  const { headless = true, timeout = 60000, maxVideos = null } = options;

  console.log(`🚀 Launching browser to extract playlist URLs...`);
  
  const browser = await puppeteer.launch({ 
    headless,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set a longer timeout for all operations
    page.setDefaultTimeout(timeout);
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Set viewport to desktop size
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`🌐 Navigating to playlist...`);
    await page.goto(playlistUrl, { waitUntil: 'networkidle0', timeout });
    
    // Wait for the playlist to load with increased timeout
    console.log(`⏳ Waiting for playlist content to load...`);
    await page.waitForSelector('ytd-playlist-video-renderer', { timeout: 20000 });
    
    // Also wait for any additional elements that might indicate full loading
    try {
      await page.waitForSelector('[role="main"]', { timeout: 5000 });
    } catch (e) {
      console.log(`ℹ️  Main content selector not found, continuing...`);
    }
    
    // Additional wait for playlist header to load
    try {
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForFunction(() => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.trim().length > 0;
      }, { timeout: 10000 });
    } catch (e) {
      console.log('Playlist title elements not found, proceeding anyway...');
    }
    
    console.log(`📜 Scrolling to load all videos...`);
    
    // Auto-scroll to load all videos - improved version
    let previousVideoCount = 0;
    let currentVideoCount = 0;
    let scrollAttempts = 0;
    let noChangeCount = 0;
    const maxScrollAttempts = 100; // Increased limit
    const maxNoChangeAttempts = 10; // Stop if no new videos for 10 attempts
    
    do {
      previousVideoCount = currentVideoCount;
      
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load - increased wait time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Count current videos
      currentVideoCount = await page.evaluate(() => {
        return document.querySelectorAll('ytd-playlist-video-renderer').length;
      });
      
      scrollAttempts++;
      
      // Check if we got new videos
      if (currentVideoCount === previousVideoCount) {
        noChangeCount++;
        console.log(`📊 No new videos found (attempt ${noChangeCount}/10). Current count: ${currentVideoCount}`);
      } else {
        noChangeCount = 0; // Reset counter if we found new videos
        console.log(`📊 Loaded ${currentVideoCount} videos (+${currentVideoCount - previousVideoCount} new)`);
      }
      
      // Break conditions
      if (maxVideos && currentVideoCount >= maxVideos) {
        console.log(`🔴 Reached maximum video limit (${maxVideos})`);
        break;
      }
      
      if (scrollAttempts >= maxScrollAttempts) {
        console.log(`⚠️  Reached maximum scroll attempts (${maxScrollAttempts})`);
        break;
      }
      
      if (noChangeCount >= maxNoChangeAttempts) {
        console.log(`✅ No new videos found for ${maxNoChangeAttempts} attempts. Assuming all videos loaded.`);
        break;
      }
      
      // Additional scroll technique: try scrolling to specific position
      if (scrollAttempts % 5 === 0) {
        await page.evaluate(() => {
          // Try alternative scrolling methods
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
          // Also try clicking "Show more" button if it exists
          const showMoreButton = document.querySelector('tp-yt-paper-button[aria-label*="Show more"]');
          if (showMoreButton) {
            showMoreButton.click();
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } while (currentVideoCount > previousVideoCount || noChangeCount < maxNoChangeAttempts);
    
    console.log(`✅ Found ${currentVideoCount} videos total.`);
    
    // If we suspect there might be more videos, try one final aggressive scroll
    if (scrollAttempts >= maxScrollAttempts) {
      console.log(`🔄 Attempting final aggressive scroll to ensure all videos are loaded...`);
      
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          // Try multiple scroll methods
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
          window.scrollBy(0, 1000);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newCount = await page.evaluate(() => {
          return document.querySelectorAll('ytd-playlist-video-renderer').length;
        });
        
        if (newCount > currentVideoCount) {
          currentVideoCount = newCount;
          console.log(`📊 Found additional videos! New total: ${currentVideoCount}`);
        }
      }
    }
    
    // Extract video information
    console.log(`🔍 Extracting video URLs and metadata...`);
    
    const videoData = await page.evaluate(() => {
      const videoElements = document.querySelectorAll('ytd-playlist-video-renderer');
      const videos = [];
      
      videoElements.forEach((element, index) => {
        try {
          const linkElement = element.querySelector('a#video-title');
          if (!linkElement) return;
          
          const href = linkElement.getAttribute('href');
          if (!href || !href.includes('/watch?v=')) return;
          
          const videoUrl = 'https://www.youtube.com' + href.split('&')[0];
          const title = linkElement.textContent.trim();
          
          // Try to get upload date or playlist index for sorting
          const metadataElement = element.querySelector('#metadata');
          let uploadInfo = null;
          
          if (metadataElement) {
            const spans = metadataElement.querySelectorAll('span');
            for (const span of spans) {
              const text = span.textContent.trim();
              // Look for dates like "2 years ago", "1 month ago", etc.
              if (text.match(/\d+\s+(year|month|week|day|hour)s?\s+ago/i)) {
                uploadInfo = text;
                break;
              }
            }
          }
          
          videos.push({
            playlistIndex: index + 1, // Original playlist order
            url: videoUrl,
            title: title,
            uploadInfo: uploadInfo
          });
        } catch (error) {
          console.error(`Error extracting video ${index + 1}:`, error);
        }
      });
      
      return videos;
    });
    
    // Get playlist metadata with improved selector logic
    const playlistInfo = await page.evaluate(() => {
      console.log('DEBUG: Starting playlist info extraction...');
      console.log('DEBUG: Current page title:', document.title);
      
      // Try multiple selectors for playlist title
      let title = null;
      const selectors = [
        // Primary selectors for current YouTube layout
        'h1.style-scope.ytd-playlist-header-renderer',
        'h1.ytd-playlist-header-renderer',
        'yt-formatted-string.style-scope.ytd-playlist-header-renderer',
        'h1 yt-formatted-string',
        'ytd-playlist-header-renderer #title',
        
        // Fallback selectors
        'yt-formatted-string.title',
        'yt-dynamic-sizing-formatted-string.ytd-playlist-header-renderer',
        'h1',
        '.title',
        'yt-formatted-string#title',
        
        // Additional selectors for different playlist layouts
        '[data-title]',
        '.playlist-header-title',
        '.ytd-playlist-header-renderer h1',
        'ytd-playlist-header-renderer h1 *',
        '.playlist-title',
        '#title',
        
        // More specific YouTube selectors
        'ytd-playlist-header-renderer .metadata-wrapper h1',
        'ytd-playlist-header-renderer .title',
        '#page-manager ytd-playlist-header-renderer h1'
      ];
      
      console.log('DEBUG: Available h1 elements:');
      document.querySelectorAll('h1').forEach((h1, i) => {
        console.log(`DEBUG: H1 ${i}:`, h1.textContent?.trim());
      });
      
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 0) {
            const text = el.textContent.trim();
            // Skip generic YouTube text
            if (!text.toLowerCase().includes('youtube') && 
                !text.toLowerCase().includes('subscribe') && 
                text.length > 3 && text.length < 200) {
              title = text;
              console.log(`DEBUG: Found title with selector: ${sel} -> ${title}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Additional fallback methods
      if (!title) {
        // Try to find title in meta tags
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle && metaTitle.content && !metaTitle.content.includes('YouTube')) {
          title = metaTitle.content.replace(/ - YouTube.*$/, '').trim();
          console.log(`DEBUG: Found title in meta tag: ${title}`);
        }
      }
      
      if (!title) {
        // Try document title as last resort
        if (document.title && !document.title.includes('YouTube')) {
          title = document.title.replace(/ - YouTube.*$/, '').trim();
          console.log(`DEBUG: Found title in document.title: ${title}`);
        }
      }
      
      // Extract from URL if all else fails
      if (!title) {
        const urlMatch = window.location.href.match(/list=([^&]+)/);
        if (urlMatch) {
          title = `Playlist_${urlMatch[1]}`;
          console.log(`DEBUG: Using URL-based title: ${title}`);
        }
      }
      
      if (!title) title = 'Unknown Playlist';
      console.log(`DEBUG: Final title: ${title}`);

      // Try multiple selectors for channel/owner with improved logic
      let channel = null;
      const channelSelectors = [
        // Primary channel selectors
        'ytd-video-owner-renderer a.yt-simple-endpoint yt-formatted-string',
        'ytd-video-owner-renderer a yt-formatted-string',
        'ytd-channel-name a yt-formatted-string',
        '.ytd-channel-name a',
        'ytd-video-owner-renderer .yt-simple-endpoint',
        'ytd-playlist-header-renderer .owner-text a',
        
        // Fallback selectors
        'a.yt-simple-endpoint.style-scope.yt-formatted-string',
        'yt-formatted-string.ytd-channel-name',
        '.owner-text a',
        '.playlist-owner a',
        'ytd-playlist-header-renderer a[href*="/channel/"]',
        'ytd-playlist-header-renderer a[href*="/@"]'
      ];
      
      for (const sel of channelSelectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 0) {
            channel = el.textContent.trim();
            console.log(`DEBUG: Found channel with selector: ${sel} -> ${channel}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Try to find channel info in different locations
      if (!channel) {
        // Look for "by [channel name]" patterns
        const byElements = document.querySelectorAll('*');
        for (const el of byElements) {
          const text = el.textContent;
          if (text && text.includes('by ') && text.length < 100) {
            const match = text.match(/by\s+([^•\n]+)/i);
            if (match) {
              channel = match[1].trim();
              console.log(`DEBUG: Found channel using 'by' pattern: ${channel}`);
              break;
            }
          }
        }
      }
      
      if (!channel) channel = 'Unknown';
      console.log(`DEBUG: Final channel: ${channel}`);

      return { title, channel };
    });
    
    console.log(`\n📋 Playlist: ${playlistInfo.title}`);
    console.log(`📺 Channel: ${playlistInfo.channel}`);
    console.log(`🎬 Videos Found: ${videoData.length}`);
    
    return { playlistInfo, videos: videoData };
    
  } catch (error) {
    console.error(`❌ Error during playlist extraction: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

// Function to download a single video with progress tracking
async function downloadVideo(videoUrl, customTitle = null, playlistFolder = null) {
  try {
    console.log(`\n🔍 Getting video info for: ${videoUrl}`);
    
    // Get video info first
    const info = await getVideoInfo(videoUrl);
    const title = customTitle || sanitizeFilename(info.videoDetails.title);
    
    // Determine output folder - either playlist folder or default downloads folder
    const outputDir = playlistFolder || downloadFolder;
    const outputPath = path.join(outputDir, `${title}.mp4`);
    
    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping (already exists): ${title}`);
      return { success: true, skipped: true, title };
    }
    
    console.log(`📥 Downloading: ${title}`);
    console.log(`📊 Duration: ${Math.floor(info.videoDetails.lengthSeconds / 60)}:${String(info.videoDetails.lengthSeconds % 60).padStart(2, '0')}`);
    
    // Choose the best quality available with both video and audio
    let format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestvideo',
      filter: 'videoandaudio'
    });
    
    // If no combined format available, try highest quality overall
    if (!format) {
      format = ytdl.chooseFormat(info.formats, { 
        quality: 'highest'
      });
    }
    
    // If still no format, try any available format
    if (!format) {
      const availableFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);
      if (availableFormats.length > 0) {
        format = availableFormats.sort((a, b) => {
          const aQuality = parseInt(a.qualityLabel) || 0;
          const bQuality = parseInt(b.qualityLabel) || 0;
          return bQuality - aQuality;
        })[0];
      }
    }
    
    if (!format) {
      throw new Error('No suitable format found');
    }
    
    console.log(`🎥 Quality: ${format.qualityLabel || format.quality} - ${format.container}`);
    console.log(`📁 Saving to: ${outputDir}`);
    
    // Change to temp directory before downloading to contain debug files
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    
    const videoStream = ytdl.downloadFromInfo(info, { 
      format: format,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        }
      }
    });
    
    // Return to original directory
    process.chdir(originalCwd);
    const writeStream = fs.createWriteStream(outputPath);
    
    let downloadedBytes = 0;
    const totalBytes = parseInt(format.contentLength) || 0;
    
    videoStream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r📊 Progress: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB/${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
      }
    });
    
    videoStream.pipe(writeStream);
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`\n✅ Downloaded: ${title}`);
        resolve({ success: true, skipped: false, title });
      });
      
      videoStream.on('error', (err) => {
        console.error(`\n❌ Error downloading ${title}: ${err.message}`);
        // Clean up partial file
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(err);
      });
      
      writeStream.on('error', (err) => {
        console.error(`\n❌ Write error for ${title}: ${err.message}`);
        reject(err);
      });
    });
    
  } catch (error) {
    console.error(`\n❌ Failed to download ${videoUrl}: ${error.message}`);
    throw error;
  }
}

// Function to download a playlist using Puppeteer
async function downloadPlaylist(playlistUrl, options = {}) {
  const { 
    maxRetries = 3, 
    delayBetweenDownloads = 1000,
    continueOnError = true,
    headless = true,
    maxVideos = null,
    createPlaylistFolder = true,
    sortOrder = 'playlist' // 'playlist', 'upload', 'reverse'
  } = options;
  
  try {
    console.log(`🔍 Extracting playlist with Puppeteer...`);
    
    // Extract playlist using Puppeteer
    const { playlistInfo, videos } = await extractPlaylistUrls(playlistUrl, {
      headless,
      maxVideos
    });
    
    if (videos.length === 0) {
      console.log(`❌ No videos found in playlist!`);
      return;
    }
    
    // Sort videos based on the specified order
    let sortedVideos = [...videos];
    switch (sortOrder) {
      case 'upload':
        // Sort by upload date (oldest first) - reverse the playlist order typically
        sortedVideos = videos.slice().reverse();
        console.log(`📅 Sorting videos by upload date (oldest first)`);
        break;
      case 'reverse':
        // Reverse playlist order (newest first if playlist is chronological)
        sortedVideos = videos.slice().reverse();
        console.log(`🔄 Reversing playlist order`);
        break;
      case 'playlist':
      default:
        // Keep original playlist order
        console.log(`📋 Keeping original playlist order`);
        break;
    }
    
    // Update indices after sorting
    sortedVideos = sortedVideos.map((video, index) => ({
      ...video,
      downloadIndex: index + 1
    }));
    
    // Create playlist folder if enabled
    let playlistFolder = downloadFolder;
    if (createPlaylistFolder) {
      const sanitizedPlaylistName = sanitizeFilename(playlistInfo.title);
      playlistFolder = path.join(downloadFolder, sanitizedPlaylistName);
      
      if (!fs.existsSync(playlistFolder)) {
        fs.mkdirSync(playlistFolder, { recursive: true });
        console.log(`📁 Created playlist folder: ${playlistFolder}`);
      }
      
      // Save playlist metadata
      const playlistMetadata = {
        title: playlistInfo.title,
        channel: playlistInfo.channel,
        url: playlistUrl,
        totalVideos: videos.length,
        extractedAt: new Date().toISOString(),
        videos: videos.map(v => ({ title: v.title, url: v.url, playlistIndex: v.playlistIndex, uploadInfo: v.uploadInfo })),
        sortOrder: sortOrder,
        sortedVideos: sortedVideos.map(v => ({ title: v.title, url: v.url, downloadIndex: v.downloadIndex, playlistIndex: v.playlistIndex }))
      };
      
      const metadataPath = path.join(playlistFolder, 'playlist_info.json');
      fs.writeFileSync(metadataPath, JSON.stringify(playlistMetadata, null, 2));
      console.log(`💾 Saved playlist metadata: ${metadataPath}`);
    }
    
    console.log(`\n📋 Playlist: ${playlistInfo.title}`);
    console.log(`📺 Channel: ${playlistInfo.channel}`);
    console.log(`🎬 Videos Found: ${videos.length}`);
    console.log(`📁 Download Location: ${playlistFolder}`);
    console.log(`🎥 Target Quality: Best available quality with video and audio`);
    console.log(`📊 Sort Order: ${sortOrder}`);
    console.log(`\n🎬 Starting download...`);
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < sortedVideos.length; i++) {
      const video = sortedVideos[i];
      console.log(`\n[${i + 1}/${sortedVideos.length}] Processing: ${video.title}`);
      if (video.uploadInfo) {
        console.log(`📅 Upload Info: ${video.uploadInfo}`);
      }
      console.log(`📋 Original Position: #${video.playlistIndex}`);
      
      try {
        // Try yt-dlp first since it's more reliable and doesn't create debug files
        console.log(`🔧 Using yt-dlp (primary method)`);
        const result = await downloadVideoWithYtDlp(video.url, sanitizeFilename(video.title), playlistFolder);
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ yt-dlp failed for "${video.title}": ${error.message}`);
        
        // Try fallback method with ytdl-core
        try {
          console.log(`🔄 Trying fallback method (ytdl-core)...`);
          const result = await downloadVideo(video.url, sanitizeFilename(video.title), playlistFolder);
          if (result.skipped) {
            skippedCount++;
          } else {
            successCount++;
            console.log(`✅ Fallback download successful!`);
          }
        } catch (fallbackError) {
          failCount++;
          console.error(`❌ Both methods failed for "${video.title}": ${fallbackError.message}`);
          
          if (!continueOnError) {
            throw fallbackError;
          }
        }
      }
      
      // Add delay between downloads to avoid rate limiting
      if (i < sortedVideos.length - 1 && delayBetweenDownloads > 0) {
        console.log(`⏳ Waiting ${delayBetweenDownloads}ms before next download...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenDownloads));
      }
    }
    
    console.log(`\n🎉 Download Summary:`);
    console.log(`📋 Playlist: ${playlistInfo.title}`);
    console.log(`✅ Successfully downloaded: ${successCount}`);
    console.log(`⏭️  Skipped (already existed): ${skippedCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 All files saved to: ${playlistFolder}`);
    
    // Clean up debug files
    console.log(`🧹 Cleaning up temporary files...`);
    cleanupDebugFiles();
    
    return {
      playlistInfo,
      successCount,
      skippedCount,
      failCount,
      totalVideos: sortedVideos.length,
      playlistFolder,
      sortOrder
    };
    
  } catch (error) {
    console.error(`\n💥 Playlist download failed: ${error.message}`);
    console.log(`\n💡 If this continues to fail, try:`);
    console.log(`1. Set headless: false to see what's happening`);
    console.log(`2. Check if the playlist URL is correct and public`);
    console.log(`3. Try downloading individual videos manually`);
    
    // Clean up debug files even on error
    console.log(`🧹 Cleaning up temporary files...`);
    cleanupDebugFiles();
  }
}

// Function to download a single video by URL
async function downloadSingleVideo(videoUrl) {
  try {
    await downloadVideo(videoUrl);
  } catch (error) {
    console.error(`Failed to download video: ${error.message}`);
  }
}

// Function to download multiple playlists
async function downloadMultiplePlaylists(playlistUrls, options = {}) {
  const { 
    delayBetweenPlaylists = 5000, // 5 seconds between playlists
    continueOnPlaylistError = true,
    ...playlistOptions 
  } = options;
  
  console.log(`🎵 Starting batch download of ${playlistUrls.length} playlists...`);
  
  const results = [];
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalPlaylistsFailed = 0;
  
  for (let i = 0; i < playlistUrls.length; i++) {
    const url = playlistUrls[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Processing Playlist ${i + 1}/${playlistUrls.length}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const result = await downloadPlaylist(url, playlistOptions);
      
      if (result) {
        results.push({
          url,
          success: true,
          playlistInfo: result.playlistInfo,
          successCount: result.successCount,
          skippedCount: result.skippedCount,
          failCount: result.failCount,
          totalVideos: result.totalVideos,
          playlistFolder: result.playlistFolder
        });
        
        totalSuccess += result.successCount;
        totalSkipped += result.skippedCount;
        totalFailed += result.failCount;
        
        console.log(`\n✅ Playlist "${result.playlistInfo.title}" completed successfully!`);
        console.log(`   📊 Videos: ${result.successCount} downloaded, ${result.skippedCount} skipped, ${result.failCount} failed`);
      }
      
    } catch (error) {
      totalPlaylistsFailed++;
      const errorResult = {
        url,
        success: false,
        error: error.message,
        playlistInfo: null
      };
      results.push(errorResult);
      
      console.error(`\n❌ Playlist ${i + 1} failed: ${error.message}`);
      
      if (!continueOnPlaylistError) {
        console.log(`🛑 Stopping batch download due to playlist error.`);
        break;
      }
    }
    
    // Add delay between playlists (except for the last one)
    if (i < playlistUrls.length - 1 && delayBetweenPlaylists > 0) {
      console.log(`\n⏳ Waiting ${delayBetweenPlaylists}ms before next playlist...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenPlaylists));
    }
  }
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 BATCH DOWNLOAD COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📋 Total Playlists: ${playlistUrls.length}`);
  console.log(`✅ Successful Playlists: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed Playlists: ${totalPlaylistsFailed}`);
  console.log(`\n📊 Total Videos Across All Playlists:`);
  console.log(`   ✅ Downloaded: ${totalSuccess}`);
  console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`\n📁 Downloaded Playlists:`);
  
  results.filter(r => r.success).forEach((result, i) => {
    console.log(`   ${i + 1}. "${result.playlistInfo.title}" (${result.successCount} videos)`);
    console.log(`      📁 ${result.playlistFolder}`);
  });
  
  if (totalPlaylistsFailed > 0) {
    console.log(`\n❌ Failed Playlists:`);
    results.filter(r => !r.success).forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.url}`);
      console.log(`      Error: ${result.error}`);
    });
  }
  
  return {
    totalPlaylists: playlistUrls.length,
    successfulPlaylists: results.filter(r => r.success).length,
    failedPlaylists: totalPlaylistsFailed,
    totalVideosDownloaded: totalSuccess,
    totalVideosSkipped: totalSkipped,
    totalVideosFailed: totalFailed,
    results
  };
}

// Export functions for use in other files
module.exports = {
  downloadVideo: downloadSingleVideo,
  downloadPlaylist,
  downloadMultiplePlaylists,
  extractPlaylistUrls,
  downloadFolder
};

// Example Usage - Choose one of the methods below:

// Method 1: Download multiple playlists in batch
downloadMultiplePlaylists(playlistUrls, {
  maxRetries: 3,
  delayBetweenDownloads: 3000, // 3 seconds between downloads within each playlist
  delayBetweenPlaylists: 5000, // 5 seconds between playlists
  continueOnError: true, // Continue if a video fails
  continueOnPlaylistError: true, // Continue if an entire playlist fails
  headless: "new", // Set to false to see browser in action //true for mac & new for linux 
  maxVideos: null, // Set a number to limit downloads per playlist
  createPlaylistFolder: true, // Creates folder with playlist name
  sortOrder: 'upload' // 'playlist' (original order), 'upload' (oldest first), 'reverse' (newest first)
});

// Method 2: Download single playlist (original behavior)
/*
downloadPlaylist(playlistUrl, {
  maxRetries: 3,
  delayBetweenDownloads: 3000, // 3 seconds between downloads
  continueOnError: true,
  headless: "new", // Set to false to see browser in action //true for mac & new for linux 
  maxVideos: null, // Set a number to limit downloads
  createPlaylistFolder: true, // Creates folder with playlist name
  sortOrder: 'upload' // 'playlist' (original order), 'upload' (oldest first), 'reverse' (newest first)
});
*/
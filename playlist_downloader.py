#!/usr/bin/env python3
"""
YouTube Playlist Downloader - Python Version
Multi-playlist batch downloader with comprehensive error handling and progress tracking
"""

import os
import re
import json
import time
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs

# Third-party imports (install with: pip install selenium yt-dlp beautifulsoup4 lxml)
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.common.exceptions import TimeoutException, WebDriverException
    import yt_dlp
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"❌ Missing required packages. Please install with:")
    print("pip install selenium yt-dlp beautifulsoup4 lxml")
    print(f"Error: {e}")
    exit(1)

@dataclass
class VideoInfo:
    """Data class for video information"""
    title: str
    url: str
    playlist_index: int
    upload_info: Optional[str] = None
    download_index: Optional[int] = None

@dataclass
class PlaylistInfo:
    """Data class for playlist information"""
    title: str
    channel: str
    url: str
    total_videos: int

@dataclass
class DownloadResult:
    """Data class for download results"""
    success: bool
    skipped: bool
    title: str
    error: Optional[str] = None

class YouTubePlaylistDownloader:
    """Main class for downloading YouTube playlists"""
    
    def __init__(self, download_folder: str = "downloads"):
        self.download_folder = Path(download_folder)
        self.download_folder.mkdir(exist_ok=True)
        self.temp_dir = Path(".temp")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Chrome options for Selenium
        self.chrome_options = Options()
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-setuid-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        self.chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        self.chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem compatibility"""
        # Remove invalid characters and replace with safe alternatives
        sanitized = re.sub(r'[\\/:*?"<>|]', '', filename)
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        return sanitized[:255]  # Limit length
    
    def cleanup_debug_files(self):
        """Clean up debug files created during download"""
        try:
            # Clean up temporary files
            for file_path in self.temp_dir.glob("*"):
                if file_path.is_file():
                    file_path.unlink()
                    print(f"🧹 Cleaned up: {file_path.name}")
        except Exception:
            pass  # Ignore cleanup errors
    
    async def extract_playlist_urls(self, playlist_url: str, headless: bool = True, 
                                  max_videos: Optional[int] = None) -> Dict[str, Any]:
        """Extract video URLs and metadata from a YouTube playlist"""
        print(f"🚀 Launching browser to extract playlist URLs...")
        
        if headless:
            self.chrome_options.add_argument("--headless=new")
        
        driver = None
        try:
            # Initialize Chrome driver
            driver = webdriver.Chrome(options=self.chrome_options)
            driver.set_page_load_timeout(60)
            
            print(f"🌐 Navigating to playlist...")
            driver.get(playlist_url)
            
            # Wait for playlist content to load
            print(f"⏳ Waiting for playlist content to load...")
            wait = WebDriverWait(driver, 20)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "ytd-playlist-video-renderer")))
            
            # Scroll to load all videos
            print(f"📜 Scrolling to load all videos...")
            previous_count = 0
            current_count = 0
            scroll_attempts = 0
            no_change_count = 0
            max_scroll_attempts = 100
            max_no_change_attempts = 10
            
            while scroll_attempts < max_scroll_attempts and no_change_count < max_no_change_attempts:
                previous_count = current_count
                
                # Scroll to bottom
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3)  # Wait for content to load
                
                # Count current videos
                video_elements = driver.find_elements(By.CSS_SELECTOR, "ytd-playlist-video-renderer")
                current_count = len(video_elements)
                
                scroll_attempts += 1
                
                if current_count == previous_count:
                    no_change_count += 1
                    print(f"📊 No new videos found (attempt {no_change_count}/10). Current count: {current_count}")
                else:
                    no_change_count = 0
                    print(f"📊 Loaded {current_count} videos (+{current_count - previous_count} new)")
                
                # Break conditions
                if max_videos and current_count >= max_videos:
                    print(f"🔴 Reached maximum video limit ({max_videos})")
                    break
                
                # Try alternative scrolling methods every 5 attempts
                if scroll_attempts % 5 == 0:
                    driver.execute_script("document.documentElement.scrollTop = document.documentElement.scrollHeight;")
                    time.sleep(2)
            
            print(f"✅ Found {current_count} videos total.")
            
            # Extract video information
            print(f"🔍 Extracting video URLs and metadata...")
            video_data = []
            
            video_elements = driver.find_elements(By.CSS_SELECTOR, "ytd-playlist-video-renderer")
            for index, element in enumerate(video_elements):
                try:
                    # Get video link
                    link_element = element.find_element(By.CSS_SELECTOR, "a#video-title")
                    href = link_element.get_attribute("href")
                    
                    if not href or "/watch?v=" not in href:
                        continue
                    
                    # Clean URL (remove extra parameters)
                    video_url = href.split('&')[0] if '&' in href else href
                    title = link_element.text.strip()
                    
                    # Try to get upload info
                    upload_info = None
                    try:
                        metadata_element = element.find_element(By.CSS_SELECTOR, "#metadata")
                        spans = metadata_element.find_elements(By.TAG_NAME, "span")
                        for span in spans:
                            text = span.text.strip()
                            if re.search(r'\d+\s+(year|month|week|day|hour)s?\s+ago', text, re.IGNORECASE):
                                upload_info = text
                                break
                    except:
                        pass
                    
                    video_data.append(VideoInfo(
                        title=title,
                        url=video_url,
                        playlist_index=index + 1,
                        upload_info=upload_info
                    ))
                    
                except Exception as e:
                    print(f"Error extracting video {index + 1}: {e}")
                    continue
            
            # Extract playlist metadata
            playlist_info = await self._extract_playlist_metadata(driver)
            
            print(f"\n📋 Playlist: {playlist_info.title}")
            print(f"📺 Channel: {playlist_info.channel}")
            print(f"🎬 Videos Found: {len(video_data)}")
            
            return {
                "playlist_info": playlist_info,
                "videos": video_data
            }
            
        except Exception as e:
            print(f"❌ Error during playlist extraction: {e}")
            raise
        finally:
            if driver:
                driver.quit()
    
    async def _extract_playlist_metadata(self, driver) -> PlaylistInfo:
        """Extract playlist title and channel information"""
        # Try multiple selectors for playlist title
        title_selectors = [
            "h1.style-scope.ytd-playlist-header-renderer",
            "h1.ytd-playlist-header-renderer",
            "yt-formatted-string.style-scope.ytd-playlist-header-renderer",
            "h1 yt-formatted-string",
            "ytd-playlist-header-renderer #title",
            "yt-formatted-string.title",
            "h1",
            ".title",
            "yt-formatted-string#title"
        ]
        
        title = None
        for selector in title_selectors:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                text = element.text.strip()
                if (text and len(text) > 3 and len(text) < 200 and 
                    "youtube" not in text.lower() and "subscribe" not in text.lower()):
                    title = text
                    break
            except:
                continue
        
        # Fallback to URL-based title
        if not title:
            current_url = driver.current_url
            parsed = urlparse(current_url)
            params = parse_qs(parsed.query)
            if 'list' in params:
                title = f"Playlist_{params['list'][0]}"
        
        if not title:
            title = "Unknown Playlist"
        
        # Try multiple selectors for channel
        channel_selectors = [
            "ytd-video-owner-renderer a.yt-simple-endpoint yt-formatted-string",
            "ytd-channel-name a yt-formatted-string",
            ".ytd-channel-name a",
            "ytd-playlist-header-renderer .owner-text a",
            ".owner-text a"
        ]
        
        channel = None
        for selector in channel_selectors:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                channel = element.text.strip()
                if channel:
                    break
            except:
                continue
        
        if not channel:
            channel = "Unknown"
        
        return PlaylistInfo(
            title=title,
            channel=channel,
            url=driver.current_url,
            total_videos=0  # Will be updated later
        )
    
    def download_video_with_ytdlp(self, video_url: str, custom_title: str, 
                                 output_dir: Path) -> DownloadResult:
        """Download video using yt-dlp"""
        try:
            sanitized_title = self.sanitize_filename(custom_title)
            output_path = output_dir / f"{sanitized_title}.%(ext)s"
            
            # Check if file already exists
            existing_files = list(output_dir.glob(f"{sanitized_title}.*"))
            if existing_files:
                print(f"⏭️  Skipping (already exists): {sanitized_title}")
                return DownloadResult(success=True, skipped=True, title=sanitized_title)
            
            print(f"\n🔧 Trying yt-dlp for: {video_url}")
            
            # yt-dlp options
            ydl_opts = {
                'format': 'best[height<=720]',
                'outtmpl': str(output_path),
                'noplaylist': True,
                'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'quiet': False,
                'no_warnings': False
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            
            print(f"\n✅ Downloaded with yt-dlp: {sanitized_title}")
            return DownloadResult(success=True, skipped=False, title=sanitized_title)
            
        except Exception as e:
            error_msg = str(e)
            print(f"\n❌ yt-dlp failed: {error_msg}")
            return DownloadResult(success=False, skipped=False, title=custom_title, error=error_msg)
    
    async def download_playlist(self, playlist_url: str, **options) -> Optional[Dict[str, Any]]:
        """Download a complete playlist"""
        # Default options
        config = {
            'max_retries': 3,
            'delay_between_downloads': 3000,
            'continue_on_error': True,
            'headless': True,
            'max_videos': None,
            'create_playlist_folder': True,
            'sort_order': 'playlist'  # 'playlist', 'upload', 'reverse'
        }
        config.update(options)
        
        try:
            print(f"🔍 Extracting playlist with Selenium...")
            
            # Extract playlist using Selenium
            result = await self.extract_playlist_urls(
                playlist_url, 
                headless=config['headless'],
                max_videos=config['max_videos']
            )
            
            playlist_info = result['playlist_info']
            videos = result['videos']
            
            if not videos:
                print(f"❌ No videos found in playlist!")
                return None
            
            # Sort videos based on specified order
            if config['sort_order'] == 'upload':
                videos = list(reversed(videos))
                print(f"📅 Sorting videos by upload date (oldest first)")
            elif config['sort_order'] == 'reverse':
                videos = list(reversed(videos))
                print(f"🔄 Reversing playlist order")
            else:
                print(f"📋 Keeping original playlist order")
            
            # Update download indices
            for i, video in enumerate(videos):
                video.download_index = i + 1
            
            # Create playlist folder
            playlist_folder = self.download_folder
            if config['create_playlist_folder']:
                sanitized_name = self.sanitize_filename(playlist_info.title)
                playlist_folder = self.download_folder / sanitized_name
                playlist_folder.mkdir(exist_ok=True)
                print(f"📁 Created playlist folder: {playlist_folder}")
                
                # Save playlist metadata
                metadata = {
                    'title': playlist_info.title,
                    'channel': playlist_info.channel,
                    'url': playlist_url,
                    'total_videos': len(videos),
                    'extracted_at': datetime.now().isoformat(),
                    'videos': [
                        {
                            'title': v.title,
                            'url': v.url,
                            'playlist_index': v.playlist_index,
                            'upload_info': v.upload_info
                        } for v in videos
                    ],
                    'sort_order': config['sort_order']
                }
                
                metadata_path = playlist_folder / 'playlist_info.json'
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
                print(f"💾 Saved playlist metadata: {metadata_path}")
            
            print(f"\n📋 Playlist: {playlist_info.title}")
            print(f"📺 Channel: {playlist_info.channel}")
            print(f"🎬 Videos Found: {len(videos)}")
            print(f"📁 Download Location: {playlist_folder}")
            print(f"🎥 Target Quality: Best available quality ≤720p")
            print(f"📊 Sort Order: {config['sort_order']}")
            print(f"\n🎬 Starting download...")
            
            # Download videos
            success_count = 0
            fail_count = 0
            skipped_count = 0
            
            for i, video in enumerate(videos):
                print(f"\n[{i + 1}/{len(videos)}] Processing: {video.title}")
                if video.upload_info:
                    print(f"📅 Upload Info: {video.upload_info}")
                print(f"📋 Original Position: #{video.playlist_index}")
                
                # Download with yt-dlp
                result = self.download_video_with_ytdlp(
                    video.url, 
                    video.title, 
                    playlist_folder
                )
                
                if result.success:
                    if result.skipped:
                        skipped_count += 1
                    else:
                        success_count += 1
                else:
                    fail_count += 1
                    if not config['continue_on_error']:
                        break
                
                # Add delay between downloads
                if i < len(videos) - 1 and config['delay_between_downloads'] > 0:
                    delay_seconds = config['delay_between_downloads'] / 1000
                    print(f"⏳ Waiting {delay_seconds:.1f}s before next download...")
                    await asyncio.sleep(delay_seconds)
            
            # Summary
            print(f"\n🎉 Download Summary:")
            print(f"📋 Playlist: {playlist_info.title}")
            print(f"✅ Successfully downloaded: {success_count}")
            print(f"⏭️  Skipped (already existed): {skipped_count}")
            print(f"❌ Failed: {fail_count}")
            print(f"📁 All files saved to: {playlist_folder}")
            
            # Cleanup
            print(f"🧹 Cleaning up temporary files...")
            self.cleanup_debug_files()
            
            return {
                'playlist_info': playlist_info,
                'success_count': success_count,
                'skipped_count': skipped_count,
                'fail_count': fail_count,
                'total_videos': len(videos),
                'playlist_folder': str(playlist_folder),
                'sort_order': config['sort_order']
            }
            
        except Exception as e:
            print(f"\n💥 Playlist download failed: {e}")
            print(f"\n💡 If this continues to fail, try:")
            print(f"1. Set headless=False to see what's happening")
            print(f"2. Check if the playlist URL is correct and public")
            print(f"3. Try downloading individual videos manually")
            
            # Cleanup even on error
            print(f"🧹 Cleaning up temporary files...")
            self.cleanup_debug_files()
            return None
    
    async def download_multiple_playlists(self, playlist_urls: List[str], **options) -> Dict[str, Any]:
        """Download multiple playlists in batch"""
        # Default options
        config = {
            'delay_between_playlists': 5000,  # 5 seconds between playlists
            'continue_on_playlist_error': True
        }
        config.update(options)
        
        print(f"🎵 Starting batch download of {len(playlist_urls)} playlists...")
        
        results = []
        total_success = 0
        total_skipped = 0
        total_failed = 0
        total_playlists_failed = 0
        
        for i, url in enumerate(playlist_urls):
            print(f"\n{'=' * 60}")
            print(f"📋 Processing Playlist {i + 1}/{len(playlist_urls)}")
            print(f"🔗 URL: {url}")
            print(f"{'=' * 60}")
            
            try:
                result = await self.download_playlist(url, **config)
                
                if result:
                    results.append({
                        'url': url,
                        'success': True,
                        'playlist_info': result['playlist_info'],
                        'success_count': result['success_count'],
                        'skipped_count': result['skipped_count'],
                        'fail_count': result['fail_count'],
                        'total_videos': result['total_videos'],
                        'playlist_folder': result['playlist_folder']
                    })
                    
                    total_success += result['success_count']
                    total_skipped += result['skipped_count']
                    total_failed += result['fail_count']
                    
                    print(f"\n✅ Playlist \"{result['playlist_info'].title}\" completed successfully!")
                    print(f"   📊 Videos: {result['success_count']} downloaded, {result['skipped_count']} skipped, {result['fail_count']} failed")
                
            except Exception as e:
                total_playlists_failed += 1
                error_result = {
                    'url': url,
                    'success': False,
                    'error': str(e),
                    'playlist_info': None
                }
                results.append(error_result)
                
                print(f"\n❌ Playlist {i + 1} failed: {e}")
                
                if not config['continue_on_playlist_error']:
                    print(f"🛑 Stopping batch download due to playlist error.")
                    break
            
            # Add delay between playlists
            if i < len(playlist_urls) - 1 and config['delay_between_playlists'] > 0:
                delay_seconds = config['delay_between_playlists'] / 1000
                print(f"\n⏳ Waiting {delay_seconds:.1f}s before next playlist...")
                await asyncio.sleep(delay_seconds)
        
        # Final summary
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        print(f"\n{'=' * 60}")
        print(f"🎉 BATCH DOWNLOAD COMPLETE")
        print(f"{'=' * 60}")
        print(f"📋 Total Playlists: {len(playlist_urls)}")
        print(f"✅ Successful Playlists: {len(successful_results)}")
        print(f"❌ Failed Playlists: {total_playlists_failed}")
        print(f"\n📊 Total Videos Across All Playlists:")
        print(f"   ✅ Downloaded: {total_success}")
        print(f"   ⏭️  Skipped: {total_skipped}")
        print(f"   ❌ Failed: {total_failed}")
        print(f"\n📁 Downloaded Playlists:")
        
        for i, result in enumerate(successful_results, 1):
            print(f"   {i}. \"{result['playlist_info'].title}\" ({result['success_count']} videos)")
            print(f"      📁 {result['playlist_folder']}")
        
        if failed_results:
            print(f"\n❌ Failed Playlists:")
            for i, result in enumerate(failed_results, 1):
                print(f"   {i}. {result['url']}")
                print(f"      Error: {result['error']}")
        
        return {
            'total_playlists': len(playlist_urls),
            'successful_playlists': len(successful_results),
            'failed_playlists': total_playlists_failed,
            'total_videos_downloaded': total_success,
            'total_videos_skipped': total_skipped,
            'total_videos_failed': total_failed,
            'results': results
        }


async def main():
    """Main function to run the playlist downloader"""
    
    # Multiple playlists configuration
    playlist_urls = [
        "https://youtube.com/playlist?list=PLO5VPQH6OWdX-Rh7RonjZhOd9pb9zOnHW&si=fordeuy3g3xBkVqI",
        "https://youtube.com/playlist?list=PLO5VPQH6OWdXR8NlZt0jRbC39W_IyzS-v&si=KQ19RFSLhMBJQ6K3",
        "https://youtube.com/playlist?list=PLO5VPQH6OWdW9b6GKJR4Dt9XZxQlJuVp_&si=mvumkzxglMOSf1Gd",
        # Add more playlist URLs here
        # "https://youtube.com/playlist?list=ANOTHER_PLAYLIST_ID",
    ]
    
    # Initialize downloader
    downloader = YouTubePlaylistDownloader()
    
    # Configuration options
    options = {
        'max_retries': 3,
        'delay_between_downloads': 3000,  # 3 seconds between downloads within each playlist
        'delay_between_playlists': 5000,  # 5 seconds between playlists
        'continue_on_error': True,  # Continue if a video fails
        'continue_on_playlist_error': True,  # Continue if an entire playlist fails
        'headless': True,  # Set to False to see browser in action
        'max_videos': None,  # Set a number to limit downloads per playlist
        'create_playlist_folder': True,  # Creates folder with playlist name
        'sort_order': 'upload'  # 'playlist' (original order), 'upload' (oldest first), 'reverse' (newest first)
    }
    
    # Choose download method:
    
    # Method 1: Download multiple playlists in batch
    result = await downloader.download_multiple_playlists(playlist_urls, **options)
    
    # Method 2: Download single playlist (uncomment to use)
    # result = await downloader.download_playlist(playlist_urls[0], **options)
    
    print(f"\n🎉 Download process completed!")


if __name__ == "__main__":
    # Check for required dependencies
    required_tools = ['chromedriver', 'yt-dlp']
    missing_tools = []
    
    for tool in required_tools:
        try:
            subprocess.run([tool, '--version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing_tools.append(tool)
    
    if missing_tools:
        print(f"❌ Missing required tools: {', '.join(missing_tools)}")
        print(f"📦 Install instructions:")
        if 'chromedriver' in missing_tools:
            print(f"   - ChromeDriver: brew install chromedriver (macOS) or download from https://chromedriver.chromium.org/")
        if 'yt-dlp' in missing_tools:
            print(f"   - yt-dlp: pip install yt-dlp or brew install yt-dlp")
        exit(1)
    
    # Run the main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n🛑 Download interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
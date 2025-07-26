# External File Storage

This directory contains files accessible by external applications via direct HTTP requests.

## Available Files

### Executable Files (.exe)
- **HW_Install.exe** (1.5MB) - HandyWorks installation executable
- **HW_Upgrade_02_25.exe** (7.6MB) - HandyWorks upgrade executable (February 2025)
- **HW_Upgrade_2_25.exe** (7.6MB) - HandyWorks upgrade executable (February 2025)
- **HW_Upgrade_12_24.exe** (7.4MB) - HandyWorks upgrade executable (December 2024)
- **ClickSend.exe** (185KB) - ClickSend application

### PDF Documents
- **HandyWorks.pdf** (2.0MB) - HandyWorks documentation
- **BitcoinWhitePaper.pdf** (180KB) - Bitcoin whitepaper

### Database Files
- **HWDATA_MT.accdb** (3.0MB) - HandyWorks database file

### Archive Files
- **HW_Install.zip** (1.4MB) - HandyWorks installation archive

## Access URLs

Files in this directory are accessible at:
```
https://jetlagpro.com/data/external/filename.ext
```

### Direct Access Links
- https://jetlagpro.com/data/external/HW_Install.exe
- https://jetlagpro.com/data/external/HW_Upgrade_02_25.exe
- https://jetlagpro.com/data/external/HW_Upgrade_2_25.exe
- https://jetlagpro.com/data/external/HW_Upgrade_12_24.exe
- https://jetlagpro.com/data/external/ClickSend.exe
- https://jetlagpro.com/data/external/HandyWorks.pdf
- https://jetlagpro.com/data/external/BitcoinWhitePaper.pdf
- https://jetlagpro.com/data/external/HWDATA_MT.accdb
- https://jetlagpro.com/data/external/HW_Install.zip

## Supported File Types

- **.exe files**: Executable files for Windows applications
- **.pdf files**: PDF documents
- **.accdb files**: Microsoft Access database files
- **.zip files**: Compressed archive files

## CORS Configuration

This directory is configured with CORS headers to allow cross-origin requests from external applications:

- `Access-Control-Allow-Origin: *` - Allows requests from any origin
- `Access-Control-Allow-Methods: GET, OPTIONS` - Allows GET and OPTIONS requests
- `Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Range` - Allows common headers

## Usage Examples

### JavaScript (Fetch API)
```javascript
fetch('https://jetlagpro.com/data/external/HW_Install.exe')
  .then(response => response.blob())
  .then(blob => {
    // Handle the file download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HW_Install.exe';
    a.click();
  });
```

### cURL
```bash
curl -O https://jetlagpro.com/data/external/HandyWorks.pdf
```

### Python
```python
import requests

response = requests.get('https://jetlagpro.com/data/external/HWDATA_MT.accdb')
with open('HWDATA_MT.accdb', 'wb') as f:
    f.write(response.content)
```

## Security Notes

- Files in this directory are publicly accessible
- Only place files here that are intended for public download
- Monitor file access and usage as needed
- Consider implementing access controls if needed for sensitive files

## File Management

- Keep files organized and well-named
- Update this README when adding new file types
- Consider versioning for files that change over time
- Monitor file sizes to ensure reasonable download times 
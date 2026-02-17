import { writeAsStringAsync, deleteAsync } from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { JournalEntry } from '../database/database';
import XLSX from 'xlsx';

// Get cache directory as string
function getCacheDirectory(): string {
  const paths = Paths as any;
  console.log('Paths object:', paths);
  console.log('Paths.cache:', paths.cache);
  
  // Try different ways to access the cache path
  if (typeof paths.cache === 'string') {
    return paths.cache;
  }
  
  // If it's an object, try to get the path property
  if (paths.cache && typeof paths.cache === 'object') {
    return paths.cache.path || paths.cache.uri || '';
  }
  
  return '';
}

// Export journal entries to PDF (as HTML then share)
export async function exportJournalToPDF(entries: JournalEntry[]): Promise<void> {
  let fileUri: string | null = null;
  
  try {
    const htmlContent = generatePDFHTML(entries);
    const fileName = `spiritual_journal_${new Date().toISOString().split('T')[0]}.html`;
    const cacheDir = getCacheDirectory();
    
    if (!cacheDir) {
      throw new Error('Cache directory not available');
    }
    
    fileUri = `${cacheDir}/${fileName}`;
    console.log('Writing PDF to:', fileUri);

    // Write file using legacy API
    await writeAsStringAsync(fileUri, htmlContent);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Export Journal as PDF',
        UTI: 'public.html',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  } finally {
    // Clean up
    if (fileUri) {
      try {
        await deleteAsync(fileUri, { idempotent: true });
      } catch (cleanupError) {
        console.log('Cleanup error (ignored):', cleanupError);
      }
    }
  }
}

// Export journal entries to Excel spreadsheet
export async function exportJournalToExcel(entries: JournalEntry[]): Promise<void> {
  let fileUri: string | null = null;
  
  try {
    // Prepare data for spreadsheet
    const data = entries.map(entry => ({
      Date: new Date(entry.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      Content: entry.content,
      Tags: entry.tags || '',
      'Created At': new Date(entry.createdAt).toLocaleString('en-US'),
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Date
      { wch: 60 }, // Content
      { wch: 30 }, // Tags
      { wch: 25 }, // Created At
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Journal Entries');

    // Generate file as base64
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `spiritual_journal_${new Date().toISOString().split('T')[0]}.xlsx`;
    const cacheDir = getCacheDirectory();
    
    if (!cacheDir) {
      throw new Error('Cache directory not available');
    }
    
    fileUri = `${cacheDir}/${fileName}`;
    console.log('Writing Excel to:', fileUri);

    // Write file using legacy API with base64 encoding
    await writeAsStringAsync(fileUri, wbout, {
      encoding: 'base64' as any,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Journal to Excel',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  } finally {
    // Clean up
    if (fileUri) {
      try {
        await deleteAsync(fileUri, { idempotent: true });
      } catch (cleanupError) {
        console.log('Cleanup error (ignored):', cleanupError);
      }
    }
  }
}

// Generate HTML for PDF export
function generatePDFHTML(entries: JournalEntry[]): string {
  const entriesHTML = entries
    .map(
      entry => `
    <div class="entry">
      <div class="entry-header">
        <h2>${new Date(entry.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</h2>
        ${entry.tags ? `<div class="tags">${entry.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}</div>` : ''}
      </div>
      <div class="entry-content">
        ${entry.content.replace(/\n/g, '<br>')}
      </div>
      <div class="entry-footer">
        Created: ${new Date(entry.createdAt).toLocaleString('en-US')}
      </div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spiritual Journal</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background: #f7fafc;
      padding: 20px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      font-size: 32px;
      font-weight: bold;
      color: #2d3748;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .subtitle {
      text-align: center;
      color: #718096;
      margin-bottom: 40px;
      font-size: 14px;
    }
    
    .entry {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .entry:last-child {
      border-bottom: none;
    }
    
    .entry-header {
      margin-bottom: 15px;
    }
    
    .entry-header h2 {
      font-size: 20px;
      color: #2d3748;
      margin-bottom: 8px;
    }
    
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    
    .tag {
      display: inline-block;
      background: #edf2f7;
      color: #4a5568;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
    }
    
    .entry-content {
      font-size: 15px;
      line-height: 1.8;
      color: #2d3748;
      margin-bottom: 15px;
      white-space: pre-wrap;
    }
    
    .entry-footer {
      font-size: 12px;
      color: #a0aec0;
      font-style: italic;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
      
      .entry {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🙏 Spiritual Journal</h1>
    <div class="subtitle">
      Exported on ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </div>
    ${entriesHTML}
  </div>
</body>
</html>
  `;
}
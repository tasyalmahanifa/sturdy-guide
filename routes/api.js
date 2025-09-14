import express from 'express';
import path from 'path';
import { upload } from '../middleware/upload.js';
import ExcelProcessor from '../utils/excelProcessor.js';

const router = express.Router();
const processor = new ExcelProcessor();

// Upload and process Excel file
router.post('/upload', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await processor.processExcelFile(req.file.path);
    
    res.json({
      success: true,
      message: 'File processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
});

// Download processed file
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.download(filePath, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found' });
        }
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// Get current rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await processor.getRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({
      error: 'Failed to get rules',
      message: error.message
    });
  }
});

// Update rules
router.put('/rules', async (req, res) => {
  try {
    const newRules = req.body;
    
    // Basic validation
    if (typeof newRules !== 'object' || newRules === null) {
      return res.status(400).json({ error: 'Invalid rules format' });
    }

    // Validate each team entry
    for (const [team, routes] of Object.entries(newRules)) {
      if (!Array.isArray(routes)) {
        return res.status(400).json({ 
          error: `Invalid routes for team ${team}: must be an array` 
        });
      }
    }

    await processor.saveRules(newRules);
    
    res.json({
      success: true,
      message: 'Rules updated successfully',
      data: newRules
    });

  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({
      error: 'Failed to update rules',
      message: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;
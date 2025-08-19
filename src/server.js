const express = require('express');
const fs = require('fs');
const tmp = require('tmp');
const { execSync } = require('child_process');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/pptx', async (req, res) => {
  const md = req.body.markdown;
  if (!md) {
    return res.status(400).json({ error: 'Missing markdown field in request body.' });
  }

  // Create a temporary markdown file
  tmp.file({ postfix: '.md' }, (err, mdPath, fd, cleanupMd) => {
    if (err) {
      return res.status(500).json({ error: 'Temp file error for markdown.' });
    }
    fs.writeFileSync(mdPath, md);

    // Create a temporary pptx output file
    tmp.file({ postfix: '.pptx' }, (err2, pptxPath, fd2, cleanupPptx) => {
      if (err2) {
        cleanupMd();
        return res.status(500).json({ error: 'Temp file error for pptx.' });
      }

      try {
        // Run marp synchronously (use absolute path and --no-sandbox)
        execSync(`/usr/local/bin/marp --pptx ${mdPath} -o ${pptxPath} --no-sandbox`, {
          stdio: 'inherit'
        });

        // Check if PPTX was written and is not empty
        const stats = fs.statSync(pptxPath);
        if (stats.size === 0) throw new Error('Empty PPTX output!');

        // Stream the pptx file to the client
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', 'attachment; filename="slides.pptx"');
        const stream = fs.createReadStream(pptxPath);
        stream.pipe(res);
        stream.on('close', () => {
          cleanupMd();
          cleanupPptx();
        });
        stream.on('error', (streamErr) => {
          cleanupMd();
          cleanupPptx();
          console.error('Stream error:', streamErr);
        });
      } catch (err) {
        cleanupMd();
        cleanupPptx();
        console.error('Marp conversion failed:', err);
        res.status(500).json({ error: 'Marp conversion failed.', details: err.toString() });
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
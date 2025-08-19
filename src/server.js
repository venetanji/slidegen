const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const app = express();

app.use(express.json({ limit: '5mb' }));

app.post('/pptx', async (req, res) => {
  const md = req.body.markdown;
  if (!md) {
    return res.status(400).json({ error: 'Missing markdown field in request body.' });
  }

  // Write markdown to a temp file
  tmp.file({ postfix: '.md' }, (err, mdPath, fd, cleanupCallback) => {
    if (err) return res.status(500).json({ error: 'Temp file error.' });

    fs.writeFileSync(mdPath, md);

    // Prepare output PPTX file path
    tmp.file({ postfix: '.pptx' }, (err2, pptxPath, fd2, cleanupCallback2) => {
      if (err2) {
        cleanupCallback();
        return res.status(500).json({ error: 'Temp file error.' });
      }

      // Call Marp CLI to convert
      execFile('marp', ['--pptx', mdPath, '-o', pptxPath], (error, stdout, stderr) => {
        cleanupCallback(); // Remove md temp

        if (error) {
          cleanupCallback2();
          return res.status(500).json({ error: 'Marp conversion failed.', details: stderr });
        }

        // Stream pptx back
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentation.presentation');
        res.setHeader('Content-Disposition', 'attachment; filename="slides.pptx"');
        const stream = fs.createReadStream(pptxPath);
        stream.pipe(res);
        stream.on('end', cleanupCallback2);
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`slidegen server running on port ${PORT}`);
});

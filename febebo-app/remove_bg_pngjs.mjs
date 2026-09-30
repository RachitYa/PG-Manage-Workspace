import fs from 'fs';
import { PNG } from 'pngjs';

fs.createReadStream('./assets/logo.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];

        // if white or off-white, make transparent
        if (r > 230 && g > 230 && b > 230) {
          this.data[idx + 3] = 0; // alpha = 0
        }
      }
    }

    this.pack().pipe(fs.createWriteStream('./src/assets/logo.png'))
      .on('finish', () => {
        console.log("Successfully created transparent logo!");
      });
  })
  .on('error', (err) => {
    console.error("Error reading PNG:", err);
  });

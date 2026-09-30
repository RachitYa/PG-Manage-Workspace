const sharp = require('./node_modules/sharp');
const fs = require('fs');

async function removeWhiteBg(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Iterate through pixels and make white/near-white transparent
        for (let i = 0; i < data.length; i += info.channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // If pixel is very close to white (threshold 235)
            if (r > 235 && g > 235 && b > 235) {
                data[i + 3] = 0; // Set alpha to 0
            }
        }

        await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }
        })
        .png()
        .toFile(outputPath);
        
        console.log('Successfully removed white background from admin logo.');
    } catch (error) {
        console.error('Error:', error);
    }
}

removeWhiteBg('public/admin_logo.png', 'public/admin_logo_transparent.png');

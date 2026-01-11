#!/usr/bin/env node

/**
 * Generate placeholder extension icons
 * Creates simple colored square icons for development purposes
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 purple pixel PNG as base64 (we'll scale it conceptually)
// In a real project, you'd use sharp or canvas to generate proper icons
const createPlaceholderPNG = (size) => {
  // PNG header for a simple colored image
  // This creates a minimal valid PNG file
  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc,
  ]);

  // IDAT chunk - create image data with purple color
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Purple color: RGB(128, 90, 213) - similar to extension theme
      rawData.push(128, 90, 213);
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawBuffer);

  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLength, Buffer.from('IDAT'), compressed, idatCrc]);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), iendCrc]);

  return Buffer.concat([signature, ihdr, idat, iend]);
};

// CRC32 implementation for PNG chunks
function crc32(data) {
  let crc = 0xffffffff;
  const table = [];

  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  crc = crc ^ 0xffffffff;
  const result = Buffer.alloc(4);
  result.writeUInt32BE(crc >>> 0, 0);
  return result;
}

// Generate icons
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach((size) => {
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  const iconData = createPlaceholderPNG(size);
  fs.writeFileSync(iconPath, iconData);
  console.log(`Created ${iconPath} (${size}x${size})`);
});

console.log('\\nPlaceholder icons generated successfully!');
console.log('Note: Replace these with proper icons before publishing.');

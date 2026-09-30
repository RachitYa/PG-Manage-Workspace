import Cocoa

if CommandLine.arguments.count < 3 {
    print("Usage: swift remove_white.swift <input> <output>")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]

guard let image = NSImage(contentsOfFile: imagePath),
      let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData) else {
    print("Could not load image")
    exit(1)
}

let width = bitmap.pixelsWide
let height = bitmap.pixelsHigh
guard let newBitmap = NSBitmapImageRep(bitmapDataPlanes: nil,
                                 pixelsWide: width,
                                 pixelsHigh: height,
                                 bitsPerSample: 8,
                                 samplesPerPixel: 4,
                                 hasAlpha: true,
                                 isPlanar: false,
                                 colorSpaceName: .deviceRGB,
                                 bytesPerRow: 0,
                                 bitsPerPixel: 0) else {
    print("Could not create bitmap")
    exit(1)
}

for x in 0..<width {
    for y in 0..<height {
        if let color = bitmap.colorAt(x: x, y: y) {
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            
            // colorAt returns NSColor which might be in a different color space. 
            // Convert to RGB space safely
            if let rgbColor = color.usingColorSpace(.deviceRGB) {
                rgbColor.getRed(&r, green: &g, blue: &b, alpha: &a)
                
                // If it's practically white, make it clear
                if r > 0.93 && g > 0.93 && b > 0.93 {
                    newBitmap.setColor(NSColor.clear, atX: x, y: y)
                } else {
                    newBitmap.setColor(rgbColor, atX: x, y: y)
                }
            } else {
                newBitmap.setColor(color, atX: x, y: y)
            }
        }
    }
}

guard let pngData = newBitmap.representation(using: .png, properties: [:]) else {
    print("Could not create PNG data")
    exit(1)
}

do {
    try pngData.write(to: URL(fileURLWithPath: outPath))
    print("Saved transparent PNG to \(outPath)")
} catch {
    print("Error saving file: \(error)")
    exit(1)
}

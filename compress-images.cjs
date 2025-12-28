const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');
const backupDir = path.join(__dirname, 'public', 'images-backup');

async function compressImages() {
  // Créer un dossier de backup
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✓ Dossier de backup créé');
  }

  const files = fs.readdirSync(imagesDir);
  const imageFiles = files.filter(file =>
    /\.(jpg|jpeg|png|webp)$/i.test(file)
  );

  console.log(`\nTrouvé ${imageFiles.length} images à compresser...\n`);

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(imagesDir, file);
    const backupPath = path.join(backupDir, file);
    const outputPath = inputPath;

    try {
      // Sauvegarder l'original
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
      }

      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      totalOriginalSize += originalSize;

      // Déterminer le format de sortie
      const ext = path.extname(file).toLowerCase();
      let sharpInstance = sharp(inputPath);

      if (ext === '.jpg' || ext === '.jpeg') {
        // Compression JPEG optimisée
        await sharpInstance
          .jpeg({
            quality: 75,
            progressive: true,
            mozjpeg: true
          })
          .toFile(outputPath + '.tmp');
      } else if (ext === '.png') {
        // Compression PNG optimisée
        await sharpInstance
          .png({
            compressionLevel: 9,
            quality: 80
          })
          .toFile(outputPath + '.tmp');
      } else if (ext === '.webp') {
        // Compression WebP
        await sharpInstance
          .webp({
            quality: 80
          })
          .toFile(outputPath + '.tmp');
      }

      // Remplacer l'original par la version compressée
      fs.renameSync(outputPath + '.tmp', outputPath);

      const compressedStats = fs.statSync(outputPath);
      const compressedSize = compressedStats.size;
      totalCompressedSize += compressedSize;

      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      const originalMB = (originalSize / 1024 / 1024).toFixed(2);
      const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);

      console.log(`✓ ${file}`);
      console.log(`  ${originalMB} MB → ${compressedMB} MB (économie: ${savings}%)`);

    } catch (error) {
      console.error(`✗ Erreur avec ${file}:`, error.message);
    }
  }

  const totalSavings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1);
  const totalOriginalMB = (totalOriginalSize / 1024 / 1024).toFixed(2);
  const totalCompressedMB = (totalCompressedSize / 1024 / 1024).toFixed(2);
  const savedMB = (totalOriginalMB - totalCompressedMB).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('RÉSUMÉ DE LA COMPRESSION');
  console.log('='.repeat(60));
  console.log(`Taille originale totale  : ${totalOriginalMB} MB`);
  console.log(`Taille compressée totale : ${totalCompressedMB} MB`);
  console.log(`Économie totale          : ${savedMB} MB (${totalSavings}%)`);
  console.log('='.repeat(60));
  console.log(`\n✓ Images sauvegardées dans: ${backupDir}`);
}

compressImages().catch(console.error);

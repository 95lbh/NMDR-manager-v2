// PWA 아이콘 생성 스크립트
// 이 스크립트는 icon.svg 파일을 다양한 크기의 PNG 파일로 변환합니다.
// 실행하려면 sharp 패키지가 필요합니다: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512
];

const inputLogo = path.join(__dirname, '../public/icons/logo.png');
const outputDir = path.join(__dirname, '../public/icons');

// 출력 디렉토리가 없으면 생성
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('PWA 아이콘 생성 시작...');
  console.log('입력 파일:', inputLogo);

  // 입력 파일 존재 확인
  if (!fs.existsSync(inputLogo)) {
    console.error('❌ logo.jpg 파일을 찾을 수 없습니다:', inputLogo);
    return;
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(inputLogo)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png({
          quality: 90,
          compressionLevel: 9
        })
        .toFile(outputPath);

      console.log(`✓ ${size}x${size} 아이콘 생성 완료`);
    } catch (error) {
      console.error(`✗ ${size}x${size} 아이콘 생성 실패:`, error.message);
    }
  }

  // favicon.ico 생성
  try {
    await sharp(inputLogo)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.ico'));

    console.log('✓ favicon.ico 생성 완료');
  } catch (error) {
    console.error('✗ favicon.ico 생성 실패:', error.message);
  }

  console.log('PWA 아이콘 생성 완료!');
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };

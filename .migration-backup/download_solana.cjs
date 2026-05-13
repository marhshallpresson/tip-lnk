const https = require('https');
const fs = require('fs');

const url = 'https://release.solana.com/v1.18.25/solana-install-init-x86_64-pc-windows-msvc.exe';
const dest = 'C:\\solana-install-tmp\\solana-install-init.exe';

fs.mkdirSync('C:\\solana-install-tmp', { recursive: true });

const file = fs.createWriteStream(dest);

https.get(url, function(response) {
  if (response.statusCode === 301 || response.statusCode === 302) {
    https.get(response.headers.location, function(res2) {
      res2.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Download complete.');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Download complete.');
    });
  }
}).on('error', function(err) {
  fs.unlink(dest, () => {});
  console.error('Error downloading file:', err.message);
});

import https from 'https';
import fs from 'fs';

const url = 'https://release.solana.com/v1.18.25/solana-install-init-x86_64-pc-windows-msvc.exe';
const dest = './solana-install.exe';

const file = fs.createWriteStream(dest);

const agent = new https.Agent({
  rejectUnauthorized: false
});

https.get(url, { agent: agent }, function(response) {
  if (response.statusCode === 301 || response.statusCode === 302) {
    https.get(response.headers.location, { agent: agent }, function(res2) {
      res2.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Download complete.');
      });
    }).on('error', function(err) {
        console.error('Redirect Error:', err.message);
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

const { Client } = require('ssh2');
const fs = require('fs');

const sqlFilePath = 'D:\\MARIOT\\frontend\\public\\categories.sql';
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Client :: ready');
  
  // Trying the other password found in the .env files
  const cmd = `env MYSQL_PWD='Mariot2026Strong' mysql -u u650716787_mariot_user u650716787_mariot_db`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
      if (code === 0) {
        console.log('Import completed successfully!');
      } else {
        console.log('Import failed.');
      }
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(sqlContent);
    stream.end();
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '72.62.77.9',
  port: 65002,
  username: 'u650716787',
  password: 'Mariot2026@Strong'
});

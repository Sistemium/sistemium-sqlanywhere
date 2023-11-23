const iq = require('@sap/iq-client');

const conn = iq.createConnection();

const { SQLA_CONNECTION } = process.env;
// var connOptions = {
//   host: 'XXX-XXX.iq.hdl.us10.hanacloud.ondemand.com:443',
//   uid: 'XXXXXXX',
//   pwd: 'XXXXXXX',
//   ENC: 'TLS{tls_type=rsa;direct=yes}'
// };

conn.connect(SQLA_CONNECTION, function (err) {
  if (err) throw err;
  conn.exec('SELECT Name FROM ch.Measure WHERE ID > ?', [100],
    function (err, result) {
      if (err) throw err;
      console.log('Result: ', result.length, result[0]);
      conn.disconnect();
    })
});

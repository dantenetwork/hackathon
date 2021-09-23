const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');

const pubkey =
    '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
const timestamp = 1632303751;
const plot_size = 109951162777600;
const added_files =
    [['QmdHUb7ttiCvFGqf8D3L5PH7iomPx86ZAarH8xKrjwgqZT', 123456]];
const deleted_files =
    [['QmRDgkoY5w9ot2qpe2NN1KCqJNwGJihZpb95hhXNNgKRAv', 654321]];


(async function() {
  let param = pubkey + timestamp + plot_size;
  param += added_files[0][0] + added_files[0][1] + deleted_files[0][0] +
      deleted_files[0][1];
  console.log(param);

  const privateKey =
      '0000000000000000000000000000000000000000000000000000000000000001';
  const testAccount =
      web3.platon.accounts.privateKeyToAccount(privateKey).address;
  console.log('testAccount: ' + testAccount);

  const signed = await web3.platon.accounts.sign(param, privateKey);
  console.log(signed);
})();
